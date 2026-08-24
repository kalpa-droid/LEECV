/**
 * MOTOR CANÓNICO DE VALIDACIÓN DE DATOS (Capa de Utilidades / Non-blocking Soft Validation)
 * 
 * Regla de oro: Ninguna función de validación de este motor bloquea el guardado local ni
 * impide la persistencia en el CV. Su rol es proveer avisos visuales útiles y sugerencias
 * de formato sin romper la experiencia local-first.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{6,25}$/;
const DNI_REGEX = /^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}$/;

/**
 * Valida un correo electrónico según estándar RFC 5322 simplificado.
 */
export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return true; // Vacío es permitido (campo opcional)
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Valida un formato de teléfono / WhatsApp nacional o internacional.
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || !phone.trim()) return true;
  return PHONE_REGEX.test(phone.trim());
}

/**
 * Valida un DNI argentino (con o sin puntos, entre 7 y 8 dígitos).
 */
export function isValidDni(dni: string): boolean {
  if (!dni || !dni.trim()) return true;
  const cleanDni = dni.trim().replace(/\./g, '');
  if (!/^[0-9]{7,8}$/.test(cleanDni)) return false;
  const num = parseInt(cleanDni, 10);
  return num >= 1000000 && num <= 99999999;
}

/**
 * Valida un CUIT/CUIL argentino mediante el algoritmo de Módulo 11.
 */
export function isValidCuit(cuit: string): boolean {
  if (!cuit || !cuit.trim()) return true;
  const cleanCuit = cuit.trim().replace(/[-_]/g, '');
  if (cleanCuit.length !== 11 || !/^[0-9]{11}$/.test(cleanCuit)) return false;

  const type = parseInt(cleanCuit.substring(0, 2), 10);
  const validTypes = [20, 23, 24, 27, 30, 33, 34];
  if (!validTypes.includes(type)) return false;

  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCuit[i], 10) * multipliers[i];
  }

  const mod = sum % 11;
  let verifier = 11 - mod;
  if (verifier === 11) verifier = 0;
  if (verifier === 10) verifier = 9;

  return verifier === parseInt(cleanCuit[10], 10);
}

/**
 * Valida una URL o enlace web (LinkedIn, GitHub, Portfolio).
 */
export function isValidUrl(url: string): boolean {
  if (!url || !url.trim()) return true;
  try {
    const formatted = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    new URL(formatted);
    return true;
  } catch {
    return false;
  }
}

export interface FieldValidationResult {
  isValid: boolean;
  helperMessage?: string;
}

/**
 * Evaluador universal de campo por nombre o tipo. Provee mensajes sugeridos no bloqueantes.
 */
export function validateFieldValue(fieldName: string, value: string): FieldValidationResult {
  if (!value || !value.trim()) return { isValid: true };

  const nameLower = fieldName.toLowerCase();

  if (nameLower.includes('email') || nameLower.includes('correo')) {
    const valid = isValidEmail(value);
    return {
      isValid: valid,
      helperMessage: valid ? undefined : 'Formato de correo inusual (ejemplo: usuario@correo.com)'
    };
  }

  if (nameLower.includes('phone') || nameLower.includes('telefono') || nameLower.includes('whatsapp') || nameLower.includes('celular')) {
    const valid = isValidPhone(value);
    return {
      isValid: valid,
      helperMessage: valid ? undefined : 'Verifica el número de teléfono ingresado'
    };
  }

  if (nameLower.includes('dni')) {
    const valid = isValidDni(value);
    return {
      isValid: valid,
      helperMessage: valid ? undefined : 'Sugerencia: El DNI suele contener entre 7 y 8 números'
    };
  }

  if (nameLower.includes('cuit') || nameLower.includes('cuil')) {
    const valid = isValidCuit(value);
    return {
      isValid: valid,
      helperMessage: valid ? undefined : 'Sugerencia: El CUIT/CUIL consta de 11 dígitos verificados'
    };
  }

  if (nameLower.includes('linkedin') || nameLower.includes('github') || nameLower.includes('portfolio') || nameLower.includes('web') || nameLower.includes('url')) {
    const valid = isValidUrl(value);
    return {
      isValid: valid,
      helperMessage: valid ? undefined : 'Revisa que la dirección web o enlace sea correcta'
    };
  }

  if (nameLower.includes('token') || nameLower.includes('invitacion')) {
    const valid = /^[A-Za-z0-9_-]{16,64}$/.test(value.trim());
    return {
      isValid: valid,
      helperMessage: valid ? undefined : 'El token no tiene el formato esperado (16-64 caracteres alfanuméricos)'
    };
  }

  if (nameLower.includes('nombre') || nameLower.includes('titulo') || nameLower.includes('name')) {
    const valid = value.trim().length >= 2;
    return {
      isValid: valid,
      helperMessage: valid ? undefined : 'Elegí un nombre un poco más descriptivo (al menos 2 caracteres)'
    };
  }

  return { isValid: true };
}
