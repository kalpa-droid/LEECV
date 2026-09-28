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

  return JSON.stringify(sanitized, null, 2);
}
