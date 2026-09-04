import { CVData } from '../../../types/cv';
import { sanitizeCvData } from './cvDataSchema';
import { downloadBlob } from './downloadUtils';
import JSZip from 'jszip';
import { splitCvDataForDrive, reconstructCvDataFromParts } from '../storage/driveDocumentPackager';
import { migrateCvData } from '../storage/cvMigrationEngine';

export function exportCVToJson(cvData: CVData | null | undefined): void {
  if (!cvData) return;

  const candidateName = (
    cvData?.personalInfo?.fullName || 
    'Postulante'
  ).trim();

  const exportPayload = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    id: cvData.id || `cv_${Date.now()}`,
    cvData: cvData
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const fileName = `LEECV_${candidateName.replace(/\s+/g, '_')}_v2.json`;
  downloadBlob(blob, fileName);
}

export function importCVFromJsonFile(file: File): Promise<CVData> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No se seleccionó ningún archivo JSON.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        let targetData: any = null;
        if (parsed && typeof parsed === 'object') {
          if (parsed.cvData && typeof parsed.cvData === 'object') {
            targetData = parsed.cvData;
          } else {
            targetData = parsed;
          }
        }

        if (targetData && typeof targetData === 'object') {
          const migrated = migrateCvData(targetData);
          resolve(migrated as CVData);
        } else {
          reject(new Error('El archivo no contiene un formato de CV válido.'));
        }
      } catch (err: any) {
        reject(new Error('Error al procesar el archivo JSON: ' + (err?.message || err)));
      }
    };
    reader.onerror = () => {
      reject(new Error('No se pudo leer el archivo.'));
    };
    reader.readAsText(file);
  });
}

export async function exportCVToZip(cvData: CVData | null | undefined): Promise<void> {
  if (!cvData) return;

  const candidateName = (
    cvData?.personalInfo?.fullName || 
    'Postulante'
  ).trim();

  const { cleanCvData, binaryAssets } = await splitCvDataForDrive(cvData);
  const zip = new JSZip();

  const exportPayload = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    id: cvData.id || `cv_${Date.now()}`,
    cvData: cleanCvData
  };

  zip.file('datos.json', JSON.stringify(exportPayload, null, 2));

  const imgFolder = zip.folder('imagenes');
  if (imgFolder) {
    binaryAssets.forEach(asset => {
      imgFolder.file(asset.filename.replace(/^certificados\//, ''), asset.blob);
    });
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const fileName = `LEECV_${candidateName.replace(/\s+/g, '_')}_paquete.zip`;
  downloadBlob(zipContent, fileName);
}

export function importCVFromZipFile(file: File): Promise<CVData> {
  return new Promise(async (resolve, reject) => {
    try {
      const zip = await JSZip.loadAsync(file);
      const jsonFile = zip.file('datos.json');
      if (!jsonFile) {
        reject(new Error('El paquete ZIP no contiene el archivo datos.json'));
        return;
      }

      const text = await jsonFile.async('string');
      const parsed = JSON.parse(text);
      const rawCvData = parsed.cvData || parsed;

      const binaryAssets: Record<string, Blob> = {};
      const imgFolder = zip.folder('imagenes');
      if (imgFolder) {
        const files = imgFolder.file(/.+/);
        for (const f of files) {
          const relativeName = f.name.replace(/^imagenes\//, '');
          const blob = await f.async('blob');
          binaryAssets[relativeName] = blob;
          binaryAssets[`certificados/${relativeName}`] = blob;
        }
      }

      const reconstructed = await reconstructCvDataFromParts(rawCvData, binaryAssets);
      const migrated = migrateCvData(reconstructed);
      resolve(migrated as CVData);
    } catch (err: any) {
      reject(new Error('Error al importar archivo ZIP: ' + (err?.message || err)));
    }
  });
}

export async function exportAllCVsToZip(cvList: any[], candidateName: string = 'Usuario'): Promise<void> {
  if (!cvList || cvList.length === 0) return;

  const zip = new JSZip();
  const manifest = {
    exportedAt: new Date().toISOString(),
    totalCVs: cvList.length,
    candidateName,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const rootFolder = zip.folder('cvs');
  for (let i = 0; i < cvList.length; i++) {
    const item = cvList[i];
    const cvData = item.cv_data || item;
    const title = (item.title || cvData?.personalInfo?.fullName || `CV_${i + 1}`).replace(/[^\w\s-]/gi, '_');

    if (cvData) {
      const { cleanCvData, binaryAssets } = await splitCvDataForDrive(cvData);
      const cvSubfolder = rootFolder?.folder(title);

      if (cvSubfolder) {
        cvSubfolder.file('datos.json', JSON.stringify(cleanCvData, null, 2));
        if (binaryAssets && binaryAssets.length > 0) {
          const imgSubfolder = cvSubfolder.folder('imagenes');
          binaryAssets.forEach(asset => {
            imgSubfolder?.file(asset.filename.replace(/^certificados\//, ''), asset.blob);
          });
        }
      }
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const fileName = `LEECV_backup_completo_${candidateName.replace(/\s+/g, '_')}.zip`;
  downloadBlob(zipContent, fileName);
}


