export interface ValidateFileOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
}

export interface ValidateFileResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(
  file: File | Blob | null | undefined, 
  options: ValidateFileOptions = {}
): ValidateFileResult {
  const {
    maxSizeBytes = 12 * 1024 * 1024,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']
  } = options;

  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo.' };
  }

  const fileType = (file as File).type?.toLowerCase() || '';
  const isTypeValid = allowedTypes.some(type => fileType.includes(type.replace('image/', '')) || fileType === type);

  if (fileType && !isTypeValid) {
    return {
      valid: false,
      error: 'Formato de archivo no soportado. Por favor selecciona una imagen (JPG, PNG, WEBP).'
    };
  }

  if (file.size > maxSizeBytes) {
    const sizeMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `El archivo supera el tamaño máximo permitido de ${sizeMb} MB.`
    };
  }

  return { valid: true };
}
