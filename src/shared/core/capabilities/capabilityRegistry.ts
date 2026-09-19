import { CapabilityConfig, DocumentTypeConfig } from '../../../types/document';

/**
 * CAPABILITY_REGISTRY
 * Single source of truth for all modular document capabilities.
 * Every capability is defined ONCE here and reused across document types.
 */
export const CAPABILITY_REGISTRY: Record<string, CapabilityConfig> = {
  theme: {
    id: 'theme',
    name: 'Color y Tipografía',
    description: 'Personalización de paleta de colores (primario, secundario, acento) y familia tipográfica.',
    category: 'styling',
    defaultData: {
      primaryColor: '#ab5ba1',
      secondaryColor: '#888888',
      accentColor: '#40a08e',
      textColor: '#333333',
      bgCorridor: '#aa57a4',
      fontFamily: 'Helvetica'
    }
  },
  paper_size: {
    id: 'paper_size',
    name: 'Tipo de hoja',
    description: 'Tipo de hoja (común, carta, oficio, legal) y orientación.',
    category: 'styling',
    defaultData: {
      paperSize: 'a4',
      orientation: 'portrait'
    }
  },
  personal_info: {
    id: 'personal_info',
    name: 'Datos Personales',
    description: 'Información de contacto, identificación (DNI/CUIT), domicilio y foto de perfil.',
    category: 'content',
    defaultData: {
      fullName: '',
      surname: '',
      givenNames: '',
      dni: '',
      cuit: '',
      email: '',
      phone: '',
      address: '',
      cityProvince: '',
      birthDate: '',
      profilePhoto: '',
      quote: ''
    }
  },
  education: {
    id: 'education',
    name: 'Formación Académica',
    description: 'Títulos universitarios, secundarios y terciarios acreditados.',
    category: 'content',
    defaultData: []
  },
  profession: {
    id: 'profession',
    name: 'Títulos Profesionales',
    description: 'Grados profesionales, matriculaciones y especializaciones.',
    category: 'content',
    defaultData: []
  },
  experience: {
    id: 'experience',
    name: 'Experiencia Laboral',
    description: 'Trayectoria docente, cargos institucionales y antecedentes de trabajo.',
    category: 'content',
    defaultData: []
  },
  courses: {
    id: 'courses',
    name: 'Cursos y Capacitaciones',
    description: 'Certificaciones de cursos, jornadas y capacitaciones continuas.',
    category: 'content',
    defaultData: []
  },
  scanned_certificates: {
    id: 'scanned_certificates',
    name: 'Anexo de Certificados Escaneados',
    description: 'Adjuntos de imágenes comprobatorias de títulos y certificados.',
    category: 'attachments',
    defaultData: []
  },
  digital_signature: {
    id: 'digital_signature',
    name: 'Firma Digital',
    description: 'Trazo manual o imagen de firma digital institucional/personal.',
    category: 'branding',
    defaultData: {
      dataUrl: '',
      signerName: '',
      signerRole: '',
      date: ''
    }
  },
  qr_code: {
    id: 'qr_code',
    name: 'Código QR',
    description: 'Generación de código QR para vCard, portfolio o validación web.',
    category: 'branding',
    defaultData: {
      payloadUrl: '',
      enabled: false
    }
  },
  logo_upload: {
    id: 'logo_upload',
    name: 'Logo Institucional / Empresa',
    description: 'Carga de isotipo o logotipo de empresa/institución.',
    category: 'branding',
    defaultData: {
      logoUrl: ''
    }
  },
  json_backup: {
    id: 'json_backup',
    name: 'Respaldo Portable JSON',
    description: 'Exportación e importación directa de datos en formato abierto .JSON.',
    category: 'utility',
    defaultData: {}
  },
  cloud_backup: {
    id: 'cloud_backup',
    name: 'Respaldo en la Nube (Google Drive)',
    description: 'Guarda el documento en la lista de borradores y sincroniza con Google Drive.',
    category: 'utility',
    defaultData: {}
  },
  web_publish: {
    id: 'web_publish',
    name: 'Publicación Web',
    description: 'Genera una versión web interactiva pública con enlace compartible.',
    category: 'utility',
    defaultData: {}
  },
  cover_letter_body: {
    id: 'cover_letter_body',
    name: 'Cuerpo de Carta de Presentación',
    description: 'Estructura narrativa (gancho, evidencia, cierre, saludo y despedida).',
    category: 'content',
    defaultData: {
      salutation: 'Estimado/a responsable de selección,',
      hookParagraph: '',
      evidenceParagraph: '',
      closingParagraph: '',
      signoff: 'Atentamente,'
    }
  },
  job_target: {
    id: 'job_target',
    name: 'Datos de la Vacante',
    description: 'Empresa, puesto objetivo, persona de contacto y descripción del empleo.',
    category: 'content',
    defaultData: {
      companyName: '',
      jobTitle: '',
      recipientName: '',
      jobDescription: ''
    }
  },
  ai_generation: {
    id: 'ai_generation',
    name: 'Generación Asistida por IA',
    description: 'Asistente de IA para redacción personalizada por vacante.',
    category: 'utility',
    defaultData: {
      tone: 'professional'
    }
  },
  job_versioning: {
    id: 'job_versioning',
    name: 'Versionado por Puesto',
    description: 'Permite guardar versiones específicas del documento asociadas a diferentes vacantes o empresas.',
    category: 'utility',
    defaultData: {}
  },
  nameable_title: {
    id: 'nameable_title',
    name: 'Título Editable',
    description: 'Permite que el usuario asigne un título o nombre personalizado al documento.',
    category: 'utility',
    defaultData: {}
  }
};

/**
 * DOCUMENT_TYPE_REGISTRY
 * Declarative specification of supported document types and the capabilities each includes.
 */
export const DOCUMENT_TYPE_REGISTRY: Record<string, DocumentTypeConfig> = {
  cv: {
    id: 'cv',
    name: 'Currículum Vitae',
    description: 'Documento profesional de una o varias hojas, con anexo de certificados.',
    iconName: 'FileText',
    capabilities: [
      'theme',
      'paper_size',
      'personal_info',
      'education',
      'profession',
      'experience',
      'courses',
      'scanned_certificates',
      'digital_signature',
      'json_backup',
      'cloud_backup',
      'web_publish',
      'job_versioning',
      'nameable_title'
    ],
    defaultPaperSize: 'a4',
    defaultActivePresetId: 'cv-clasico'
  },
  cover_letter: {
    id: 'cover_letter',
    name: 'Carta de Presentación',
    description: 'Carta personalizada por vacante, generada con IA desde tu CV y la descripción del puesto.',
    iconName: 'Mail',
    capabilities: [
      'theme',
      'paper_size',
      'personal_info',
      'digital_signature',
      'json_backup',
      'cloud_backup',
      'cover_letter_body',
      'job_target',
      'ai_generation',
      'job_versioning',
      'nameable_title'
    ],
    defaultPaperSize: 'a4',
    defaultActivePresetId: 'carta-clasica'
  },
  business_card: {
    id: 'business_card',
    name: 'Tarjeta Profesional vCard',
    description: 'Tarjeta de presentación digital e impresa compacta con código QR e identidad visual.',
    iconName: 'CreditCard',
    capabilities: [
      'theme',
      'personal_info',
      'qr_code',
      'logo_upload',
      'json_backup',
      'cloud_backup',
      'nameable_title'
    ]
  },
  portfolio: {
    id: 'portfolio',
    name: 'Portafolio de Proyectos',
    description: 'Presentación visual de proyectos, acreditaciones y muestras de trabajo.',
    iconName: 'Briefcase',
    capabilities: [
      'theme',
      'paper_size',
      'personal_info',
      'education',
      'profession',
      'scanned_certificates',
      'logo_upload',
      'json_backup',
      'cloud_backup'
    ],
    defaultPaperSize: 'a4'
  },
  certificate: {
    id: 'certificate',
    name: 'Certificado Acreditativo',
    description: 'Documento formal de acreditación o diploma con firma digital e isotipo.',
    iconName: 'Award',
    capabilities: [
      'theme',
      'paper_size',
      'personal_info',
      'digital_signature',
      'logo_upload',
      'json_backup'
    ],
    defaultPaperSize: 'a4'
  },
  book: {
    id: 'book',
    name: 'Libro / Folleto',
    description: 'Libro, folleto o manual listo para imprimir, doblar y armar.',
    iconName: 'BookOpen',
    capabilities: [
      'theme',
      'paper_size',
      'json_backup'
    ],
    defaultPaperSize: 'a4'
  }
};

/**
 * Get configuration for a specific document type.
 */
export function getDocumentTypeConfig(docTypeId: string = 'cv'): DocumentTypeConfig {
  return DOCUMENT_TYPE_REGISTRY[docTypeId] || DOCUMENT_TYPE_REGISTRY.cv;
}

/**
 * Get capability configurations for a specific document type.
 */
export function getCapabilitiesForDocument(docTypeId: string = 'cv'): CapabilityConfig[] {
  const config = getDocumentTypeConfig(docTypeId);
  return config.capabilities
    .map(capId => CAPABILITY_REGISTRY[capId])
    .filter(Boolean);
}

/**
 * Check if a document type has a specific capability.
 */
export function hasCapability(docTypeId: string = 'cv', capabilityId: string): boolean {
  const config = getDocumentTypeConfig(docTypeId);
  return config.capabilities.includes(capabilityId);
}

/**
 * Motor Declarativo de Mapeo Ruta <-> Tipo de Documento <-> Título por Defecto
 */
export function getDocTypeForRoute(route: string = '/'): 'cv' | 'business_card' | 'book' | 'cover_letter' {
  const cleanRoute = (route || '/').toLowerCase().trim();
  if (cleanRoute === '/crear-tarjeta' || cleanRoute.includes('tarjeta')) return 'business_card';
  if (cleanRoute === '/crear-libro' || cleanRoute.includes('libro')) return 'book';
  if (cleanRoute === '/crear-carta' || cleanRoute.includes('carta')) return 'cover_letter';
  return 'cv';
}

export function getRouteForDocType(docTypeId: string = 'cv'): string {
  switch (docTypeId) {
    case 'business_card':
      return '/crear-tarjeta';
    case 'book':
      return '/crear-libro';
    case 'cover_letter':
      return '/crear-carta';
    case 'cv':
    default:
      return '/crear-cv';
  }
}

export function getDefaultTitleForDocType(docTypeId: string = 'cv'): string {
  switch (docTypeId) {
    case 'business_card':
      return 'Mi Tarjeta Personal';
    case 'book':
      return 'Mi Libro / Folleto';
    case 'cover_letter':
      return 'Mi Carta de Presentación';
    case 'cv':
    default:
      return 'Mi Currículum Vitae';
  }
}

export function inferDocumentTypeId(docData: any): 'cv' | 'business_card' | 'book' | 'cover_letter' {
  if (!docData || typeof docData !== 'object') return 'cv';

  const docTypeId = docData.doc_type_id || docData.docType;
  if (docTypeId === 'business_card' || docTypeId === 'book' || docTypeId === 'cover_letter' || docTypeId === 'cv') {
    return docTypeId;
  }
  if (docTypeId === 'carta') return 'cover_letter';
  if (docTypeId === 'tarjeta') return 'business_card';
  if (docTypeId === 'libro') return 'book';

  const id = String(docData.id || '').toLowerCase();
  if (id.startsWith('card_') || id.startsWith('doc_business_card_') || id === 'draft_card') return 'business_card';
  if (id.startsWith('book_') || id.startsWith('doc_book_') || id === 'draft_book') return 'book';
  if (id.startsWith('cover_letter_') || id.startsWith('doc_cover_letter_') || id === 'draft_cover_letter') return 'cover_letter';
  if (id === 'draft_cv') return 'cv';

  const presetId = String(docData.activePresetId || '').toLowerCase();
  if (presetId === 'tarjeta-personal') return 'business_card';
  if (presetId === 'carta-clasica' || presetId === 'carta-presentacion') return 'cover_letter';
  if (docData.bookMode) return 'book';

  return 'cv';
}
