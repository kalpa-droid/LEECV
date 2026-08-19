/**
 * Unified Portable JSON Import/Export Service (Schema Version 2)
 * Exports complete, versioned CV drafts including layout, custom sections, and assets
 */

export function exportCVToJson(cvData) {
  if (!cvData) return;

  const candidateName = (
    cvData?.personalInfo?.fullName || 
    `${cvData?.personalInfo?.surname || ''} ${cvData?.personalInfo?.givenNames || ''}`.trim() || 
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

export function importCVFromJsonFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No se seleccionó ningún archivo JSON.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed?.schemaVersion === 2 && parsed?.cvData) {
          resolve(parsed.cvData);
        } else if (parsed && typeof parsed === 'object') {
          // Fallback legacy schema v1
          resolve(parsed.cvData || parsed);
        } else {
          reject(new Error('El archivo no contiene un formato de CV válido.'));
        }
      } catch (err) {
        reject(new Error('Error al leer el archivo JSON: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsText(file);
  });
}
