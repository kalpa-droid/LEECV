export function buildCandidateContext(cvData: any): string {
  if (!cvData) return 'No context available';

  // Deep clone para evitar mutar el objeto original en memoria (por si acaso, aunque en el server es stateless por request)
  const sanitized = JSON.parse(JSON.stringify(cvData));

  // Redactar datos personales
  if (sanitized.personalInfo) {
    if (sanitized.personalInfo.dni) sanitized.personalInfo.dni = '[DATO_PROTEGIDO]';
    if (sanitized.personalInfo.cuit) sanitized.personalInfo.cuit = '[DATO_PROTEGIDO]';
    if (sanitized.personalInfo.phone) sanitized.personalInfo.phone = '[DATO_PROTEGIDO]';
    if (sanitized.personalInfo.email) sanitized.personalInfo.email = '[DATO_PROTEGIDO]';
    
    // Ocultar calle, pero dejar ciudad/provincia
    if (sanitized.personalInfo.address) sanitized.personalInfo.address = '[DATO_PROTEGIDO]';
    if (sanitized.personalInfo.location) sanitized.personalInfo.location = '[DATO_PROTEGIDO]'; // Puede contener calle
    
    // Ocultar edad/estado civil para evitar sesgos
    if (sanitized.personalInfo.birthDate) sanitized.personalInfo.birthDate = '[DATO_PROTEGIDO]';
    if (sanitized.personalInfo.estadoCivil) sanitized.personalInfo.estadoCivil = '[DATO_PROTEGIDO]';
    if (sanitized.personalInfo.nacionalidad) sanitized.personalInfo.nacionalidad = '[DATO_PROTEGIDO]';

    // Eliminar base64 de imagenes (irrelevante para texto y pesa mucho)
    delete sanitized.personalInfo.photoUrl;
    delete sanitized.personalInfo.profilePhoto;
    delete sanitized.personalInfo.signatureUrl;
  }

  // Eliminar imágenes de los certificados escaneados para ahorrar tokens
  if (Array.isArray(sanitized.certificatesScanned)) {
    sanitized.certificatesScanned.forEach((cert: any) => {
      delete cert.dataUrl;
      delete cert.imageUrl;
    });
  }

  // Eliminar config visual para ahorrar tokens
  delete sanitized.theme;
  delete sanitized.layout;
  delete sanitized.config;

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

  redactFreeText(sanitized);

  return JSON.stringify(sanitized, null, 2);
}
