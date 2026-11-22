import type { CapabilityConfig, DocumentTypeManifest } from '../../contracts/appContract';
import { PORT_CONTACT_PROFILE_V1 } from '../../contracts/ports/contactProfile';
import { reportSilentError } from '../utils/errorHandler';

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
    description: 'Guarda el documento en la lista de borradores. La sincronización con Google Drive estará disponible próximamente.',
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
  },
  planner_grid: {
    id: 'planner_grid',
    name: 'Retícula y Guías de Fondo',
    description: 'Patrón de fondo para las hojas (puntos guía, renglones, cuadrícula o blanco).',
    category: 'styling',
    defaultData: {
      gridType: 'dot-grid',
      gridColor: '#CBD5E1'
    }
  },
  planner_time: {
    id: 'planner_time',
    name: 'Arquitectura de Tiempo Anual',
    description: 'Configuración del año objetivo, vista temporal y día de inicio de semana.',
    category: 'content',
    defaultData: {
      year: new Date().getFullYear(),
      temporalView: 'monthly',
      weeklyLayout: 'horizontal',
      weekStart: 'monday'
    }
  },
  planner_months: {
    id: 'planner_months',
    name: 'Personalización por Mes',
    description: 'Ajustes y notas personalizadas mes a mes.',
    category: 'content',
    defaultData: {
      monthOverrides: {}
    }
  }
};

/**
 * DOCUMENT_TYPE_REGISTRY (Contrato v2 — fuente única de verdad)
 * Declarative specification of all active document types, their storage policy,
 * privacy policy for Lidio, routes, prefixes, presets, ports and capabilities.
 */
export const DOCUMENT_TYPE_REGISTRY = {
  cv: {
    id: 'cv',
    capsuleId: 'cv-builder',
    name: 'Currículum Vitae',
    description: 'Documento profesional de una o varias hojas, con anexo de certificados.',
    iconName: 'FileText',
    route: '/crear-cv',
    defaultTitle: 'Mi Currículum Vitae',
    titlePrefix: 'CV',
    draftIdPrefix: 'draft_cv',
    storage: {
      kind: 'local',
      cloudBackup: { projection: 'structured-text', maxBytes: 65536 },
    },
    assistant: {
      knowledgeId: 'cv',
      privacy: 'full-summary',
    },
    creationStrategy: 'blank',
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
      'job_versioning',
      'nameable_title',
    ],
    exportFormats: ['pdf', 'json'],
    stepSequenceId: 'cv_steps',
    defaultPaperSize: 'a4',
    defaultActivePresetId: 'cv-clasico',
    legacyAliases: [],
    idPrefixes: ['doc_cv_'],
    presetPrefixes: ['cv-'],
    ports: {
      provides: [PORT_CONTACT_PROFILE_V1],
    },
  },
  cover_letter: {
    id: 'cover_letter',
    capsuleId: 'cv-builder',
    name: 'Carta de Presentación',
    description: 'Carta personalizada por vacante, generada con IA desde tu CV y la descripción del puesto.',
    iconName: 'Mail',
    route: '/crear-carta',
    studioRoute: '/crear-cv',
    defaultTitle: 'Mi Carta de Presentación',
    titlePrefix: 'Carta',
    draftIdPrefix: 'draft_cover_letter',
    storage: {
      kind: 'local',
      cloudBackup: { projection: 'structured-text', maxBytes: 32768 },
    },
    assistant: {
      knowledgeId: 'cover_letter',
      privacy: 'full-summary',
    },
    creationStrategy: 'variant',
    capabilities: [
      'theme',
      'paper_size',
      'personal_info',
      'digital_signature',
      'json_backup',
      'cover_letter_body',
      'job_target',
      'ai_generation',
      'job_versioning',
      'nameable_title',
    ],
    exportFormats: ['pdf', 'docx', 'json'],
    stepSequenceId: 'cover_letter_steps',
    defaultPaperSize: 'a4',
    defaultActivePresetId: 'carta-clasica',
    legacyAliases: ['carta'],
    idPrefixes: ['cover_letter_', 'doc_cover_letter_'],
    presetPrefixes: ['carta-'],
  },
  business_card: {
    id: 'business_card',
    capsuleId: 'card-studio',
    name: 'Tarjeta Profesional vCard',
    description: 'Tarjeta de presentación digital e impresa compacta con código QR e identidad visual.',
    iconName: 'CreditCard',
    route: '/crear-tarjeta',
    defaultTitle: 'Mi Tarjeta Personal',
    titlePrefix: 'Tarjeta',
    draftIdPrefix: 'draft_card',
    storage: {
      kind: 'local',
      cloudBackup: { projection: 'structured-text', maxBytes: 16384 },
    },
    assistant: {
      knowledgeId: 'business_card',
      privacy: 'full-summary',
    },
    creationStrategy: 'blank',
    capabilities: [
      'theme',
      'personal_info',
      'qr_code',
      'logo_upload',
      'json_backup',
      'nameable_title',
    ],
    exportFormats: ['pdf', 'json'],
    stepSequenceId: 'card_steps',
    defaultPaperSize: 'a4',
    defaultActivePresetId: 'tarjeta-personal',
    legacyAliases: ['tarjeta'],
    idPrefixes: ['card_', 'doc_business_card_'],
    presetPrefixes: ['tarjeta-'],
    ports: {
      consumes: [PORT_CONTACT_PROFILE_V1],
    },
  },
  book: {
    id: 'book',
    capsuleId: 'book-studio',
    name: 'Libro / Folleto',
    description: 'Libro, folleto o manual listo para imprimir, doblar y armar.',
    iconName: 'BookOpen',
    route: '/crear-libro',
    defaultTitle: 'Mi Libro / Folleto',
    titlePrefix: 'Libro',
    draftIdPrefix: 'draft_book',
    storage: {
      kind: 'local',
    },
    assistant: {
      knowledgeId: 'book',
      privacy: 'full-summary',
    },
    creationStrategy: 'blank',
    capabilities: ['theme', 'paper_size', 'json_backup'],
    exportFormats: ['pdf', 'json'],
    stepSequenceId: 'book_steps',
    defaultPaperSize: 'a4',
    defaultActivePresetId: 'libro-standard',
    legacyAliases: ['libro'],
    idPrefixes: ['book_', 'doc_book_'],
    presetPrefixes: ['libro-', 'book'],
    legacyBooleanFlag: 'bookMode',
  },
  planner: {
    id: 'planner',
    capsuleId: 'planner-studio',
    name: 'Agenda / Planificador',
    description: 'Organizador personal, diario, semanal o mensual.',
    iconName: 'CalendarCheck',
    route: '/crear-agenda',
    defaultTitle: 'Mi Agenda / Planificador',
    titlePrefix: 'Agenda',
    draftIdPrefix: 'draft_planner',
    storage: {
      kind: 'local',
    },
    assistant: {
      knowledgeId: 'planner',
      privacy: 'full-summary',
    },
    creationStrategy: 'blank',
    capabilities: [
      'theme',
      'paper_size',
      'planner_grid',
      'planner_time',
      'planner_months',
      'json_backup',
      'nameable_title',
    ],
    exportFormats: ['pdf', 'json'],
    stepSequenceId: 'planner_steps',
    defaultPaperSize: 'b5',
    defaultActivePresetId: 'planner-clasico',
    legacyAliases: ['agenda'],
    idPrefixes: ['planner_', 'doc_planner_'],
    presetPrefixes: ['planner-'],
  },
  invoice: {
    id: 'invoice',
    capsuleId: 'facturador-studio',
    name: 'Presupuesto / Factura',
    description: 'Comprobante interno o presupuesto. 100% local y cifrado; no es una factura fiscal con CAE.',
    iconName: 'ReceiptText',
    route: '/crear-factura',
    defaultTitle: 'Presupuesto / Factura',
    titlePrefix: 'Factura',
    draftIdPrefix: 'draft_invoice',
    storage: {
      kind: 'local-encrypted',
    },
    assistant: {
      knowledgeId: 'invoice',
      privacy: 'metadata-only',
    },
    creationStrategy: 'vault',
    capabilities: ['theme', 'paper_size', 'json_backup', 'nameable_title'],
    exportFormats: ['pdf', 'xlsx', 'zip'],
    stepSequenceId: 'invoice_steps',
    defaultPaperSize: 'a4',
    defaultActivePresetId: 'fact-clasico-fiscal',
    legacyAliases: ['factura'],
    idPrefixes: ['invoice_', 'doc_invoice_'],
    presetPrefixes: ['fact-'],
  },
  editorial: {
    id: 'editorial',
    capsuleId: 'editor-lee-studio',
    name: 'Publicación Editorial / Zine',
    description: 'Edición y maquetación de textos, zines, ensayos y publicaciones con índice y notas.',
    iconName: 'BookMarked',
    route: '/crear-editor',
    defaultTitle: 'Mi Publicación Editorial',
    titlePrefix: 'EditorLee',
    draftIdPrefix: 'draft_editorial',
    storage: {
      kind: 'local',
    },
    assistant: {
      knowledgeId: 'editorial',
      privacy: 'full-summary',
    },
    creationStrategy: 'blank',
    capabilities: ['theme', 'paper_size', 'json_backup', 'nameable_title'],
    exportFormats: ['pdf', 'docx', 'json'],
    stepSequenceId: 'editorial_steps',
    defaultPaperSize: 'a4',
    defaultActivePresetId: 'libro-ensayo-novela',
    legacyAliases: ['editor'],
    idPrefixes: ['editorial_', 'doc_editorial_'],
    presetPrefixes: ['edit-', 'libro-ensayo-novela', 'trabajo-practico-monografia-tesis'],
  },
} as const satisfies Record<string, DocumentTypeManifest>;

export type RegisteredDocumentTypeId = keyof typeof DOCUMENT_TYPE_REGISTRY;
export type RegisteredDocumentTypeConfig = (typeof DOCUMENT_TYPE_REGISTRY)[RegisteredDocumentTypeId];

export const ALL_DOCUMENT_TYPE_IDS: readonly RegisteredDocumentTypeId[] = Object.keys(
  DOCUMENT_TYPE_REGISTRY
) as RegisteredDocumentTypeId[];

const ALL_DOCUMENT_TYPE_CONFIGS: readonly RegisteredDocumentTypeConfig[] = Object.values(DOCUMENT_TYPE_REGISTRY);

export function isRegisteredDocumentTypeId(value: unknown): value is RegisteredDocumentTypeId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DOCUMENT_TYPE_REGISTRY, value);
}

/**
 * Get configuration for a specific document type.
 * En desarrollo lanza error ante un ID inexistente; en producción reporta y cae a `cv`.
 */
export function getDocumentTypeConfig(docTypeId: string = 'cv'): RegisteredDocumentTypeConfig {
  const key = docTypeId || 'cv';
  if (isRegisteredDocumentTypeId(key)) {
    return DOCUMENT_TYPE_REGISTRY[key];
  }
  const err = new Error(`DocumentTypeId desconocido en DOCUMENT_TYPE_REGISTRY: "${docTypeId}"`);
  if ((import.meta as any)?.env?.DEV) {
    throw err;
  }
  reportSilentError(err, `capabilityRegistry.getDocumentTypeConfig[${docTypeId}]`);
  return DOCUMENT_TYPE_REGISTRY.cv;
}

/** Devuelve los tipos habilitados para respaldo opt-in en la nube (texto estructurado). */
export function getCloudBackupDocumentTypeIds(): RegisteredDocumentTypeId[] {
  return ALL_DOCUMENT_TYPE_CONFIGS.filter(
    (entry) => entry.storage.kind === 'local' && 'cloudBackup' in entry.storage && Boolean(entry.storage.cloudBackup)
  ).map((entry) => entry.id);
}

/** Verdadero si el tipo nunca sincroniza con la nube (local puro o bóveda cifrada). */
export function isLocalOnlyDocumentType(docTypeId: string): boolean {
  const cfg = getDocumentTypeConfig(docTypeId);
  return cfg.storage.kind === 'local-encrypted' || !('cloudBackup' in cfg.storage && cfg.storage.cloudBackup);
}

/** Verdadero si el tipo exige bóveda cifrada local sin red. */
export function isEncryptedVaultDocumentType(docTypeId: string): boolean {
  return getDocumentTypeConfig(docTypeId).storage.kind === 'local-encrypted';
}

/**
 * Get capability configurations for a specific document type.
 */
export function getCapabilitiesForDocument(docTypeId: string = 'cv'): CapabilityConfig[] {
  const config = getDocumentTypeConfig(docTypeId);
  return config.capabilities
    .map((capId) => CAPABILITY_REGISTRY[capId])
    .filter(Boolean);
}

/**
 * Check if a document type has a specific capability.
 */
export function hasCapability(docTypeId: string = 'cv', capabilityId: string): boolean {
  const config = getDocumentTypeConfig(docTypeId);
  return (config.capabilities as readonly string[]).includes(capabilityId);
}

/**
 * Motor Declarativo de Mapeo Ruta <-> Tipo de Documento <-> Título por Defecto
 * 100% derivado de DOCUMENT_TYPE_REGISTRY (0 condicionales por docType).
 */
export function getDocTypeForRoute(route: string = '/'): RegisteredDocumentTypeId {
  const cleanRoute =
    (route || '/')
      .split(/[?#]/, 1)[0]
      .toLowerCase()
      .trim()
      .replace(/\/+$/, '') || '/';

  const directStudioMatch = ALL_DOCUMENT_TYPE_CONFIGS.find((entry) => {
    const effectiveRoute = 'studioRoute' in entry ? entry.studioRoute : entry.route;
    return entry.route === effectiveRoute && effectiveRoute === cleanRoute;
  });
  if (directStudioMatch) return directStudioMatch.id;

  return 'cv';
}

export function getRouteForDocType(docTypeId: string = 'cv'): string {
  const config = getDocumentTypeConfig(docTypeId);
  return 'studioRoute' in config && config.studioRoute ? config.studioRoute : config.route;
}

export function getDefaultTitleForDocType(docTypeId: string = 'cv'): string {
  return getDocumentTypeConfig(docTypeId).defaultTitle;
}

export function inferDocumentTypeId(docData: any): RegisteredDocumentTypeId {
  if (!docData || typeof docData !== 'object') return 'cv';

  const rawType = docData.doc_type_id || docData.docType;
  if (isRegisteredDocumentTypeId(rawType)) {
    return rawType;
  }
  if (typeof rawType === 'string') {
    const normalized = rawType.toLowerCase();
    const byAlias = ALL_DOCUMENT_TYPE_CONFIGS.find((entry) =>
      (entry.legacyAliases as readonly string[]).includes(normalized)
    );
    if (byAlias) return byAlias.id;
  }

  const id = String(docData.id || '').toLowerCase();
  if (id) {
    const byId = ALL_DOCUMENT_TYPE_CONFIGS.find(
      (entry) =>
        id === entry.draftIdPrefix ||
        (entry.idPrefixes as readonly string[]).some((prefix) => id.startsWith(prefix))
    );
    if (byId) return byId.id;
  }

  const presetId = String(docData.activePresetId || '').toLowerCase();
  if (presetId) {
    // Priorizar coincidencias exactas de preset antes que prefijos generales (ej. 'libro-ensayo-novela' antes de 'libro-').
    const exactPresetMatch = ALL_DOCUMENT_TYPE_CONFIGS.find((entry) =>
      (entry.presetPrefixes as readonly string[]).some((p) => presetId === p)
    );
    if (exactPresetMatch) return exactPresetMatch.id;

    const prefixPresetMatch = ALL_DOCUMENT_TYPE_CONFIGS.find((entry) =>
      (entry.presetPrefixes as readonly string[]).some((p) => p.endsWith('-') && presetId.startsWith(p))
    );
    if (prefixPresetMatch) return prefixPresetMatch.id;
  }

  const byLegacyFlag = ALL_DOCUMENT_TYPE_CONFIGS.find(
    (entry) => 'legacyBooleanFlag' in entry && entry.legacyBooleanFlag && Boolean(docData[entry.legacyBooleanFlag])
  );
  if (byLegacyFlag) return byLegacyFlag.id;

  return 'cv';
}
