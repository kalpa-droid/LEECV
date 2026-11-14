/**
 * Construye el contexto que se le manda a la IA: solo la trayectoria útil,
 * serializada en una sola línea para gastar el mínimo de tokens.
 *
 * Diseño deliberado: ALLOWLIST explícita de lo que puede viajar al modelo.
 * Nada de metadata de UI/presentación (visibilidad, overrides, plantilla,
 * tema, layout) ni de preferencias — antes se mandaba todo cvData con
 * indentación, quemando cuota y distrayendo al modelo.
 */

const ALLOWLISTED_TOP_KEYS = [
  'personalInfo',
  'jobTarget',
  'summary',
  'objective',
  'frase',
  'experience',
  'education',
  'profession',
  'achievements',
  'portfolio',
  'projects',
  'publications',
  'coursesAndCertificates',
  'informatics',
  'hardSkills',
  'skills',
  'languages',
  'redes',
  'references',
  'certificatesScanned',
  'customSections',
  'personalizada-1',
  'personalizada-2',
  'personalizada-3',
  'personalizada-4',
  'personalizada-5'
] as const;

function isMeaningful(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

export function buildCandidateContext(cvData: any): string {
  if (!cvData) return 'No context available';

  // Allowlist + deep clone por sección (no se muta el objeto original)
  const compact: Record<string, any> = {};
  for (const key of ALLOWLISTED_TOP_KEYS) {
    const raw = cvData[key];
    if (!isMeaningful(raw)) continue;
    try {
      compact[key] = JSON.parse(JSON.stringify(raw));
    } catch {
      // Si una sección no serializa (p. ej. ciclos), se omite sin romper la request
    }
  }

  // Redactar datos personales (deep clone ya hecho)
  if (compact.personalInfo) {
    const p = compact.personalInfo;
    if (p.dni) p.dni = '[DATO_PROTEGIDO]';
    if (p.cuit) p.cuit = '[DATO_PROTEGIDO]';
    if (p.phone) p.phone = '[DATO_PROTEGIDO]';
    if (p.email) p.email = '[DATO_PROTEGIDO]';

    // Ocultar calle, pero dejar ciudad/provincia
    if (p.address) p.address = '[DATO_PROTEGIDO]';
    if (p.location) p.location = '[DATO_PROTEGIDO]'; // Puede contener calle

    // Ocultar edad/estado civil para evitar sesgos
    if (p.birthDate) p.birthDate = '[DATO_PROTEGIDO]';
    if (p.estadoCivil) p.estadoCivil = '[DATO_PROTEGIDO]';
    if (p.nacionalidad) p.nacionalidad = '[DATO_PROTEGIDO]';

    // Eliminar base64 de imágenes (irrelevante para texto y pesa mucho)
    delete p.photoUrl;
    delete p.profilePhoto;
    delete p.signatureUrl;
  }

  // Eliminar imágenes de los certificados escaneados para ahorrar tokens
  if (Array.isArray(compact.certificatesScanned)) {
    compact.certificatesScanned.forEach((cert: any) => {
      if (cert && typeof cert === 'object') {
        delete cert.dataUrl;
        delete cert.imageUrl;
      }
    });
  }

  // Tachar emails y teléfonos en textos libres
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/g;

  function redactFreeText(obj: any): any {
    if (typeof obj === 'string') {
      let redacted = obj.replace(emailRegex, '[DATO_PROTEGIDO]');
      redacted = redacted.replace(phoneRegex, (match) => {
        const trimmed = match.trim();
        // Evitar tachar rangos de años comunes como 2020-2022 o fechas simples
        if (/^(19|20)\d{2}[-\s./]?(19|20)\d{2}$/.test(trimmed)) return match;
        if (/^\d{1,4}$/.test(trimmed)) return match;
        // Evitar tachar números de versión o fechas aisladas
        if (trimmed.length < 8 && !trimmed.startsWith('+')) return match;
        return '[DATO_PROTEGIDO]';
      });
      return redacted;
    }
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        obj[index] = redactFreeText(item);
      });
    } else if (obj !== null && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        obj[key] = redactFreeText(obj[key]);
      }
    }
    return obj;
  }

  redactFreeText(compact);

  return JSON.stringify(compact);
}
