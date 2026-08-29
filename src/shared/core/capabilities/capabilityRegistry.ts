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
    name: 'Formato de Papel',
    description: 'Dimensiones físicas de hoja (A4, Carta, Oficio, Legal) y orientación.',
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
    description: 'Documento editorial profesional multi-hoja A4/Carta/Oficio con anexo de certificados.',
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
      'json_backup'
    ],
    defaultPaperSize: 'a4',
    defaultActivePresetId: 'cv-clasico'
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
      'json_backup'
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
      'json_backup'
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
