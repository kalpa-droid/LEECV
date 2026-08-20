import { CVData } from '../../../types/cv';

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
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `LEECV_${candidateName.replace(/\s+/g, '_')}_v2.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
        if (parsed?.schemaVersion === 2 && parsed?.cvData) {
          resolve(parsed.cvData as CVData);
        } else if (parsed && typeof parsed === 'object') {
          resolve((parsed.cvData || parsed) as CVData);
        } else {
          reject(new Error('El archivo no contiene un formato de CV válido.'));
        }
      } catch (err: any) {
        reject(new Error('Error al leer el archivo JSON: ' + (err?.message || err)));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsText(file);
  });
}
