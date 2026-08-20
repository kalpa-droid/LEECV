/**
 * validateFile.js
 * Validates uploaded image files for type and size constraints.
 */

export function validateImageFile(file, options = {}) {
  const {
    maxSizeBytes = 12 * 1024 * 1024, // 12MB limit
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']
  } = options;

  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo.' };
  }

  // Type validation
  const fileType = file.type?.toLowerCase();
  const isTypeValid = allowedTypes.some(type => fileType.includes(type.replace('image/', '')) || fileType === type);

  if (fileType && !isTypeValid) {
    return {
      valid: false,
      error: 'Formato de archivo no soportado. Por favor selecciona una imagen (JPG, PNG, WEBP).'
    };
  }

  // Size validation
  if (file.size > maxSizeBytes) {
    const sizeMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `El archivo supera el tamaño máximo permitido de ${sizeMb} MB.`
    };
  }

  return { valid: true };
}
