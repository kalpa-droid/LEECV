/**
 * NÚCLEO — ASISTENTE FLOTANTE LIDIO (assistantTips.ts)
 *
 * Reglas del producto (aprobadas por Kalpa):
 * - Tips 100% LOCALES. NUNCA llaman a IA: aparecen por inactividad y por contexto
 *   de la pestaña del editor, y se detienen tras MAX_TIPS_PER_SESSION tips por sesión
 *   sin interacción. La IA solo responde preguntas explícitas del chat.
 * - Idioma sencillo (zona app: nombre técnico entre paréntesis tras la explicación).
 * - Las CTAs a pestañas se validan SIEMPRE client-side con isValidPanelTab antes de navegar.
 *
 * Este módulo es PURO (sin DOM, sin timers, sin red) para ser testeable en node.
 * La orquestación (timers de inactividad, localStorage/sessionStorage, timers)
 * vive en FloatingAssistant.tsx.
 */
import { isValidPanelTab } from '../recruiter-rules/ruleTargetTabs';
import { isApplicationVariant } from '../documents/applicationVariant';
import { resolveActiveFormatId } from '../formats/cvFormatRegistry';
import { getRegisteredStepIds } from '../studio-host/stepSequenceRegistry';
import type { RegisteredDocumentTypeId } from '../capabilities/capabilityRegistry';
import type { MetadataOnlyContext } from '../../contracts/assistantContract';

/** Tipo de documento del editor que monta a Lidio: derivado del registro central (7/7 apps). */
export type AssistantDocType = RegisteredDocumentTypeId;

/**
 * Crea un resumen estructural seguro del estado del editor.
 * NO contiene PII (datos personales sensibles).
 */
export interface AssistantEditorSnapshot {
  isBaseCV: boolean;
  activeFormatId: string;
  visibleSections: string[];
  hasVacante: boolean;
  atsScore?: number;
}

export function buildAssistantEditorSnapshot(
  cvData: any,
  activeTab: string,
  atsScore?: number,
): AssistantEditorSnapshot {
  const isBaseCV = !isApplicationVariant(cvData);
  let activeFormatId = 'modern-corporate';
  try {
    activeFormatId = resolveActiveFormatId(cvData) || activeFormatId;
  } catch {
    /* derivación defensiva: si falla, queda el formato por defecto */
  }
  const orders = cvData?.layout?.sectionOrders || {};
  const ids: string[] = [
    ...(Array.isArray(orders.primaria) ? orders.primaria : []),
    ...(Array.isArray(orders.secundaria) ? orders.secundaria : []),
  ];
  const visibility = cvData?.sectionVisibility || {};
  const visibleSections = ids.filter((id: string) => visibility[id] !== false);

  const hasVacante = !!(cvData?.jobTarget?.position || cvData?.jobTarget?.company);

  return {
    isBaseCV,
    activeFormatId,
    visibleSections,
    hasVacante,
    atsScore,
  };
}

/**
 * Resumen estructural seguro del estado de un libro (Book Studio).
 * NO contiene PII: sin nombre de archivo, sin texto libre, sin assetIds.
 */
export interface AssistantBookSnapshot {
  docType: 'book';
  activeStepId: string;
  mode: string;
  hasCustomCover: boolean;
  hasCustomBackCover: boolean;
  hasRefCalibration: boolean;
  destination: string;
  exportMode: string;
  applyCreep: boolean;
  zipByBooklet: boolean;
  showGuides: boolean;
  readingDirection: string;
  pdfPageCount: number;
}

export function buildAssistantBookSnapshot(
  options: any,
  activeStepId?: string | null,
  pdfPageCount?: number,
): AssistantBookSnapshot {
  return {
    docType: 'book',
    activeStepId: activeStepId || 'book_source_type',
    mode: options?.mode === 'fotocopia' ? 'fotocopia' : 'normal',
    hasCustomCover: !!(options?.customCover && (options.customCover.type || options.customCover.assetId)),
    hasCustomBackCover: !!(options?.customBackCover && (options.customBackCover.type || options.customBackCover.assetId)),
    hasRefCalibration: !!(options?.refPdfPage > 0 && options?.refBookPage > 0),
    destination: options?.destination || 'A',
    exportMode: options?.exportMode || 'vector',
    applyCreep: options?.applyCreep ?? true,
    zipByBooklet: options?.zipByBooklet ?? false,
    showGuides: options?.showGuides ?? false,
    readingDirection: options?.readingDirection || 'ltr',
    pdfPageCount: Number.isFinite(pdfPageCount) ? Number(pdfPageCount) : 0,
  };
}

/**
 * Resumen estructural seguro del estado del facturador (FacturLee).
 * Modo `metadata-only`: NO contiene PII ni montos ni valores cargados.
 * Solo incluye el paso activo, si la bóveda está cerrada y qué campos obligatorios faltan o son inválidos.
 */
export interface AssistantInvoiceSnapshot {
  mode: 'metadata-only';
  docType: 'invoice';
  activeStepId: string;
  stepId: string;
  vaultLocked?: boolean;
  totalRequired?: number;
  completedRequired?: number;
  issues?: MetadataOnlyContext['issues'];
}

export function buildAssistantInvoiceSnapshot(
  activeStepId?: string | null,
  metadataContext?: MetadataOnlyContext | null,
): AssistantInvoiceSnapshot {
  const ids = getValidStepIds('invoice', DEFAULT_INVOICE_STEP_IDS);
  const resolvedStep =
    (metadataContext?.stepId && ids.has(metadataContext.stepId) ? metadataContext.stepId : null) ||
    (activeStepId && ids.has(activeStepId) ? String(activeStepId) : 'fact_comprobante');
  return {
    mode: 'metadata-only',
    docType: 'invoice',
    activeStepId: resolvedStep,
    stepId: resolvedStep,
    ...(metadataContext
      ? {
          vaultLocked: metadataContext.vaultLocked,
          totalRequired: metadataContext.totalRequired,
          completedRequired: metadataContext.completedRequired,
          issues: metadataContext.issues,
        }
      : {}),
  };
}

export const ASSISTANT_NAME = 'Lidio';
export const ASSISTANT_TAGLINE = 'Te doy una mano con tu CV';

export const ASSISTANT_STORAGE_KEY = 'leecv.assistant';
export const ASSISTANT_SESSION_KEY = 'leecv.assistant.session';

const STORAGE_KEY_BY_TYPE: Record<AssistantDocType, string> = {
  cv: ASSISTANT_STORAGE_KEY,
  cover_letter: 'leecv.assistant.cover_letter',
  business_card: 'leecv.assistant.business_card',
  book: 'leecv.assistant.book',
  planner: 'leecv.assistant.planner',
  invoice: 'leecv.assistant.invoice',
  editorial: 'leecv.assistant.editorial',
};

const SESSION_KEY_BY_TYPE: Record<AssistantDocType, string> = {
  cv: ASSISTANT_SESSION_KEY,
  cover_letter: 'leecv.assistant.session.cover_letter',
  business_card: 'leecv.assistant.session.business_card',
  book: 'leecv.assistant.session.book',
  planner: 'leecv.assistant.session.planner',
  invoice: 'leecv.assistant.session.invoice',
  editorial: 'leecv.assistant.session.editorial',
};

/** Keys de storage por tipo de documento: cada docType tiene su propio estado de tips. */
export const getAssistantStorageKey = (docType: AssistantDocType = 'cv'): string =>
  STORAGE_KEY_BY_TYPE[docType] || ASSISTANT_STORAGE_KEY;
export const getAssistantSessionKey = (docType: AssistantDocType = 'cv'): string =>
  SESSION_KEY_BY_TYPE[docType] || ASSISTANT_SESSION_KEY;

export const FIRST_TIP_IDLE_MS = 20_000;
export const NEXT_TIP_IDLE_MS = 90_000;
export const MAX_TIPS_PER_SESSION = 3;

export interface AssistantTip {
  id: string;
  title: string;
  body: string;
  /** Pestaña del editor a la que lleva la CTA "Ir". Opcional y validada con isValidPanelTab (cv) o contra los pasos reales (book). */
  targetTab?: string;
}

export interface AssistantStoredState {
  seenTipIds: string[];
  doNotDisturb: boolean;
}

export const DEFAULT_ASSISTANT_STATE: AssistantStoredState = {
  seenTipIds: [],
  doNotDisturb: false,
};

const DEFAULT_BOOK_STEP_IDS = [
  'book_source_type',
  'book_organize',
  'book_cover',
  'book_back_cover',
  'book_foliado',
  'book_imposition',
  'book_preview_export',
] as const;

const DEFAULT_INVOICE_STEP_IDS = [
  'fact_emisor',
  'fact_comprobante',
  'fact_items',
  'fact_catalogo',
  'fact_clientes',
  'fact_historial',
  'fact_diseno',
  'fact_respaldo',
] as const;

const DEFAULT_PLANNER_STEP_IDS = [
  'planner_design',
  'planner_background',
  'planner_structure',
  'planner_sections',
  'planner_months',
  'planner_personal',
] as const;

const EDITORIAL_STEP_IDS = [
  'editorial_inicio',
  'editorial_portada',
  'editorial_secciones',
  'editorial_diseño',
  'editorial_toc',
  'editorial_metadata',
  'editorial_import_ai',
  'editorial_historial',
] as const;
const CARD_STEP_IDS = new Set(['source_data', 'personales', 'redes', 'diseno', 'guardados']);

function getValidStepIds(
  docType: AssistantDocType,
  fallback: readonly string[],
): Set<string> {
  const registered = getRegisteredStepIds(docType);
  return new Set(registered && registered.length > 0 ? registered : fallback);
}

const TARGET_VALIDATOR_BY_TYPE: Record<AssistantDocType, (tab: string, cvData?: any) => boolean> = {
  cv: (tab, cvData) => isValidPanelTab(tab, cvData),
  cover_letter: (tab, cvData) => isValidPanelTab(tab, cvData),
  business_card: (tab, cvData) => CARD_STEP_IDS.has(tab) || isValidPanelTab(tab, cvData),
  book: (tab) => getValidStepIds('book', DEFAULT_BOOK_STEP_IDS).has(tab),
  planner: (tab) => getValidStepIds('planner', DEFAULT_PLANNER_STEP_IDS).has(tab),
  invoice: (tab) => getValidStepIds('invoice', DEFAULT_INVOICE_STEP_IDS).has(tab),
  editorial: (tab) => getValidStepIds('editorial', EDITORIAL_STEP_IDS).has(tab),
};

/** Pestaña validada para navegar. Devuelve null si no es un destino real del editor. */
export function validateAssistantTargetTab(
  targetTab: string | null | undefined,
  cvData?: any,
  docType: AssistantDocType = 'cv',
): string | null {
  if (!targetTab) return null;
  const validator = TARGET_VALIDATOR_BY_TYPE[docType] || TARGET_VALIDATOR_BY_TYPE.cv;
  return validator(targetTab, cvData) ? String(targetTab) : null;
}

export interface SuggestedAssistantAction {
  label: string;
  targetTab?: string | null;
}

/**
 * Filtra las acciones sugeridas por la IA: conserva targetTabs válidos y descarta
 * los inventados (la IA puede sugerir destinos que no existen; jamás se navega a ellos).
 */
export function filterSuggestedActions(
  actions: SuggestedAssistantAction[] | null | undefined,
  cvData?: any,
  docType: AssistantDocType = 'cv',
): SuggestedAssistantAction[] {
  if (!Array.isArray(actions)) return [];
  const out: SuggestedAssistantAction[] = [];
  for (const raw of actions) {
    if (!raw || typeof raw.label !== 'string' || !raw.label.trim()) continue;
    const label = raw.label.trim().slice(0, 80);
    const tab = validateAssistantTargetTab(raw.targetTab, cvData, docType);
    out.push(tab ? { label, targetTab: tab } : { label });
    if (out.length >= 2) break;
  }
  return out;
}

/** Tips por pestaña del editor (docType 'cv'). */
export const TAB_TIPS: Record<string, AssistantTip[]> = {
  personales: [
    {
      id: 'tip-personales-1',
      title: 'Nombre y contacto',
      body: 'Verificá que el teléfono y el correo estén al día.',
    },
    {
      id: 'tip-privacidad-1',
      title: 'Privacidad de datos',
      body: 'Podés ocultar DNI, fecha de nacimiento o estado civil en el PDF desde los interruptores de esta sección.',
    },
  ],
  redes: [
    {
      id: 'tip-redes-1',
      title: 'Menos perfiles, mejor',
      body: 'Dejá solo los que tengas al día, como LinkedIn.',
    },
  ],
  resumen: [
    {
      id: 'tip-resumen-1',
      title: 'Tu esencia en 4 líneas',
      body: 'Tu rol + tu fuerte con algo comprobable (ej. "Vendedor B2B, 8 años, 40 cuentas").',
    },
  ],
  objetivo: [
    {
      id: 'tip-objetivo-1',
      title: 'Solo para cambios de rumbo',
      body: 'Si tu perfil ya es claro, podés dejarlo vacío.',
    },
  ],
  vacante: [
    {
      id: 'tip-vacante-1',
      title: 'Pegá la oferta acá',
      body: 'Cargá puesto y empresa: la carta se escribirá contra esta vacante.',
      targetTab: 'vacante',
    },
    {
      id: 'tip-vacante-2',
      title: 'Tu CV base no se toca',
      body: 'Cada oferta merece su copia independiente: creá la postulación y adaptá esa copia. Tu CV base queda intacto siempre.',
      targetTab: 'vacante',
    },
  ],
  carta: [
    {
      id: 'tip-carta-1',
      title: 'La carta no repite el CV',
      body: 'Contá en 3 párrafos por qué este puesto es para vos: quién sos, qué lograste y qué aportás.',
      targetTab: 'carta',
    },
    {
      id: 'tip-carta-2',
      title: 'Primer borrador con IA',
      body: 'Generá una base con IA y después ajustala con tu voz.',
      targetTab: 'carta',
    },
  ],
  experiencia: [
    {
      id: 'tip-experiencia-1',
      title: 'Verbo + número',
      body: 'Empezá con verbos en pasado y números: “Reduje 20% los costos”.',
      targetTab: 'experiencia',
    },
    {
      id: 'tip-experiencia-2',
      title: 'IA en Experiencia',
      body: 'Probá "Sugerir Logros ACR" o "Reescritura por foco" en cada registro.',
      targetTab: 'experiencia',
    },
  ],
  portada: [
    {
      id: 'tip-portada-1',
      title: 'Portada sí o no',
      body: 'Podés activar o desactivar la portada desde acá y elegir un estilo que destaque tus títulos.',
      targetTab: 'portada',
    },
  ],
  diseno: [
    {
      id: 'tip-diseno-1',
      title: 'Ajustes finos',
      body: 'Usá los tiradores de "Ajustar tamaños y espacio" para darle tu toque personal a la tipografía y densidad.',
      targetTab: 'diseno',
    },
    {
      id: 'tip-diseno-2',
      title: 'Formato regional',
      body: 'Podés cambiar entre 6 formatos regionales (como ATS o Europass) desde el selector.',
      targetTab: 'diseno',
    },
  ],
  nueva_seccion: [
    {
      id: 'tip-secciones-1',
      title: 'Secciones a Medida',
      body: 'Creá hasta 5 secciones personalizadas (como Patentes o Ponencias) desde el botón +.',
      targetTab: 'nueva_seccion',
    },
  ],
  importar_datos: [
    {
      id: 'tip-importar-1',
      title: '¿Tenés un CV viejo?',
      body: 'Subilo acá y la IA traerá tu información a las secciones.',
      targetTab: 'importar_datos',
    },
  ],
};

/** Tips por paso del libro (docType 'book'). Destinos son pasos reales registrados para Book Studio. */
export const BOOK_STEP_IDS: string[] = [...DEFAULT_BOOK_STEP_IDS];
export const BOOK_TAB_TIPS: Record<string, AssistantTip[]> = {
  book_source_type: [
    {
      id: 'tip-book-source-1',
      title: 'Tu archivo y dónde lo vas a imprimir',
      body: 'Elegí imprimir en tu impresora de casa o llevalo a una imprenta. No guardamos una copia del PDF: solo recordamos dónde está. Si lo movés, te avisamos y lo podés volver a elegir.',
      targetTab: 'book_source_type',
    },
    {
      id: 'tip-book-source-2',
      title: 'Impresión en hojas comunes o grandes',
      body: 'Hoja común (A4): libro chico, cómodo de llevar. Hoja grande (A3): libro más grande, ideal para llevar a una imprenta.',
      targetTab: 'book_source_type',
    },
  ],
  book_organize: [
    {
      id: 'tip-book-organize-1',
      title: 'Organizá las páginas',
      body: 'Revisá el orden visual, rotá páginas desalineadas o insertá hojas en blanco para completar el libro.',
      targetTab: 'book_organize',
    },
  ],
  book_cover: [
    {
      id: 'tip-book-cover-1',
      title: 'Diseño de tapa',
      body: 'Podés usar un diseño preset, subir tu propia imagen o dejar la tapa sin diseño especial.',
      targetTab: 'book_cover',
    },
  ],
  book_back_cover: [
    {
      id: 'tip-book-back-cover-1',
      title: 'Contratapa',
      body: 'La contratapa es opcional: podés agregar un texto descriptivo o una imagen para el cierre del libro.',
      targetTab: 'book_back_cover',
    },
  ],
  book_foliado: [
    {
      id: 'tip-book-foliado-1',
      title: 'Calibrar un número',
      body: 'Solo necesitás encontrar un número de página en una miniatura y escribirlo. No necesitás más.',
      targetTab: 'book_foliado',
    },
  ],
  book_imposition: [
    {
      id: 'tip-book-imposition-1',
      title: 'Destino de la cubierta',
      body: 'Seleccioná si la cubierta va en el mismo archivo, en un archivo aparte o si es continua con el lomo.',
      targetTab: 'book_imposition',
    },
    {
      id: 'tip-book-imposition-2',
      title: 'Grosor de lomo',
      body: 'Elegí el grosor del papel para el lomo: sin grosor (guillotina/anillado) o valores como 0.10 mm y 0.12 mm.',
      targetTab: 'book_imposition',
    },
    {
      id: 'tip-book-imposition-3',
      title: 'Modo de exportación',
      body: 'Elegí máxima calidad (sin pérdida, conserva el archivo original) o rasterizado (JPEG) para impresión doméstica.',
      targetTab: 'book_imposition',
    },
    {
      id: 'tip-book-imposition-4',
      title: 'Cuadernillos al doblar',
      body: 'Al doblar muchas hojas, las del medio sobresalen un poco. "Compensar páginas internas (creep)" corre los márgenes para que el texto vuelva a quedar centrado. Déjalo activado en libros de muchas hojas.',
      targetTab: 'book_imposition',
    },
    {
      id: 'tip-book-imposition-5',
      title: 'Guías para doblar y recortar',
      body: '"Guías de doblez y recorte (marcas de corte)" dibuja líneas finas en los bordes: marcan por dónde doblar y por dónde cortar. Útiles si llevás el libro a una imprenta con guillotina; para armarlo a mano en casa podés dejarlas apagadas.',
      targetTab: 'book_imposition',
    },
  ],
  book_preview_export: [
    {
      id: 'tip-book-preview-1',
      title: 'Revisá el resumen',
      body: 'Antes de descargar, verificá que el número de páginas y el tipo de armado sean correctos.',
      targetTab: 'book_preview_export',
    },
    {
      id: 'tip-book-preview-2',
      title: 'Doble cara: voltear por el borde corto',
      body: 'Si imprimís en casa a doble cara, configurá la impresora en "Voltear por el borde corto": así las páginas del dorso no quedan al revés. Hacé una prueba con 2 hojas antes de imprimir todo.',
      targetTab: 'book_preview_export',
    },
  ],
};

/** Tips por paso del facturador (docType 'invoice'). Destinos son pasos reales registrados para FacturLee. */
export const INVOICE_STEP_IDS: string[] = [...DEFAULT_INVOICE_STEP_IDS];
export const FACT_TAB_TIPS: Record<string, AssistantTip[]> = {
  fact_emisor: [
    {
      id: 'tip-fact-emisor-1',
      title: 'Tus datos, solo en tu compu',
      body: 'Completá tu negocio: nombre, CUIT y condición ante el fisco. El logo se convierte solo a imagen y viaja incrustado en el comprobante. Nada de esto sale a internet.',
      targetTab: 'fact_emisor',
    },
  ],
  fact_comprobante: [
    {
      id: 'tip-fact-comprobante-1',
      title: '¿Qué vas a emitir?',
      body: 'Elegí la letra del comprobante, la numeración y el cliente. Mientras no lo emitas, es un presupuesto.',
      targetTab: 'fact_comprobante',
    },
    {
      id: 'tip-fact-comprobante-2',
      title: 'Fecha y vencimiento',
      body: 'Cargá la fecha del comprobante y, si corresponde, la fecha de vencimiento del pago.',
      targetTab: 'fact_comprobante',
    },
  ],
  fact_items: [
    {
      id: 'tip-fact-items-1',
      title: 'Descripción y precio',
      body: 'Escribí qué estás cobrando, cantidad y precio unitario. El total y el IVA se calculan solos.',
      targetTab: 'fact_items',
    },
  ],
  fact_catalogo: [
    {
      id: 'tip-fact-catalogo-1',
      title: 'Tus productos frecuentes',
      body: 'Cargá una vez tus productos o servicios y elegilos del catálogo al armar el comprobante.',
      targetTab: 'fact_catalogo',
    },
    {
      id: 'tip-fact-catalogo-2',
      title: 'El stock se descuenta al emitir',
      body: 'Cuando emitís el comprobante, el stock del catálogo se descuenta una sola vez.',
      targetTab: 'fact_catalogo',
    },
  ],
  fact_clientes: [
    {
      id: 'tip-fact-clientes-1',
      title: 'Tus clientes, a mano',
      body: 'Guardá nombre, CUIT y condición de tus clientes para elegirlos rápido. Quedan solo en tu computadora.',
      targetTab: 'fact_clientes',
    },
  ],
  fact_historial: [
    {
      id: 'tip-fact-historial-1',
      title: 'Quién te debe',
      body: 'Marcá qué comprobantes están cobrados y cuáles pendientes para ver quién te falta cobrar.',
      targetTab: 'fact_historial',
    },
    {
      id: 'tip-fact-historial-2',
      title: 'Volver a mirar un comprobante',
      body: 'Desde el historial podés abrir cualquier comprobante ya emitido y ver su detalle.',
      targetTab: 'fact_historial',
    },
  ],
  fact_diseno: [
    {
      id: 'tip-fact-diseno-1',
      title: 'Estilo y hoja del PDF',
      body: 'Hay 3 diseños de comprobante para elegir, y la hoja del PDF (común o grande) se elige en esta misma pestaña.',
      targetTab: 'fact_diseno',
    },
  ],
  fact_respaldo: [
    {
      id: 'tip-fact-respaldo-1',
      title: 'Tu copia de seguridad',
      body: 'Bajá el respaldo cifrado o el Excel para tener una copia fuera del navegador. El archivo cifrado se abre solo con tu clave.',
      targetTab: 'fact_respaldo',
    },
    {
      id: 'tip-fact-respaldo-2',
      title: 'Clave olvidada',
      body: 'Si olvidaste la clave y no tenés la Llave de Rescate, no hay forma de abrir la bóveda. Guardá la Llave en un lugar seguro.',
      targetTab: 'fact_respaldo',
    },
  ],
};

/** Tips transversales (aparecen en cualquier pestaña del CV). */
export const ALWAYS_TIPS: AssistantTip[] = [
  {
    id: 'tip-columnas-1',
    title: '2 columnas',
    body: 'Tu CV se arma en Columna Principal (derecha, lectura prioritaria) y Barra Lateral (izquierda, escaneo rápido). En cada sección, “Ubicación y Orden Relativo” te mueve de una a otra y cambia el orden.',
  },
  {
    id: 'tip-columnas-2',
    title: 'Orden estratégico',
    body: 'Experiencia y Resumen SIEMPRE en la principal. Habilidades y Cursos van perfecto en la lateral.',
  },
  {
    id: 'tip-columnas-3',
    title: 'Candado en Certificados',
    body: 'Certificados y Firma van al final del CV por su propio formato: no se pueden mover.',
  },
  {
    id: 'tip-ats-1',
    title: 'Diagnóstico ATS',
    body: 'Revisá la píldora en vivo en la barra superior: si marca baja, seguí el consejo para mejorar tu puntaje.',
  },
];

/** Tips transversales del libro (aparecen en cualquier paso del Book Studio). */
export const BOOK_ALWAYS_TIPS: AssistantTip[] = [
  {
    id: 'tip-book-privacidad-1',
    title: 'Tu PDF no sale de tu equipo',
    body: 'Todo el trabajo se hace en tu navegador: el PDF nunca se sube a internet y no guardamos una copia, solo recordamos dónde está.',
  },
  {
    id: 'tip-book-resumir-1',
    title: 'El libro sigue acá',
    body: 'Si cerrás y volvés al estudio, tu proyecto está intacto: opciones de tapa, contratapa y armado se recuerdan.',
  },
];

/** Tips transversales del facturador (aparecen en cualquier paso de FacturLee). */
export const FACT_ALWAYS_TIPS: AssistantTip[] = [
  {
    id: 'tip-fact-fiscal-1',
    title: 'Esto no es una factura fiscal',
    body: 'FacturLee arma presupuestos y comprobantes internos. Para una factura fiscal con CAE hace falta el sistema de ARCA.',
  },
  {
    id: 'tip-fact-local-1',
    title: 'Todo queda en tu compu',
    body: 'Sin cuenta y sin internet: los datos se guardan cifrados en esta computadora. Si cambiás de máquina, llevá el respaldo.',
  },
  {
    id: 'tip-fact-pdf-1',
    title: 'El PDF usa 1 crédito',
    body: 'Descargar el comprobante en PDF consume 1 crédito de tu cuenta. El respaldo (Excel o el archivo cifrado) es gratis.',
  },
];

export const ALL_TIPS: AssistantTip[] = [
  ...Object.values(TAB_TIPS).flat(),
  ...ALWAYS_TIPS,
];

export const ALL_BOOK_TIPS: AssistantTip[] = [
  ...Object.values(BOOK_TAB_TIPS).flat(),
  ...BOOK_ALWAYS_TIPS,
];

export const ALL_INVOICE_TIPS: AssistantTip[] = [
  ...Object.values(FACT_TAB_TIPS).flat(),
  ...FACT_ALWAYS_TIPS,
];

/** Tips de Carta de Presentación (docType 'cover_letter'). */
export const COVER_LETTER_TAB_TIPS: Record<string, AssistantTip[]> = {
  carta: [
    {
      id: 'tip-carta-estructura-1',
      title: 'Tres párrafos cortos alcanzan',
      body: 'Arrancá diciendo por qué te interesa ese puesto, sumá un logro concreto de tu experiencia y cerrá invitando a conversar.',
      targetTab: 'carta',
    },
    {
      id: 'tip-carta-relleno-1',
      title: 'Evitá frases genéricas',
      body: 'Reemplazá frases vacías como "soy proactivo" por un hecho medible o un proyecto real que hayas resuelto.',
      targetTab: 'carta',
    },
  ],
  vacante: [
    {
      id: 'tip-carta-vacante-1',
      title: 'Cargá la vacante primero',
      body: 'Con el puesto y la empresa cargados, la carta se adapta a esa búsqueda sin tocar tu CV base.',
      targetTab: 'vacante',
    },
  ],
};

export const COVER_LETTER_ALWAYS_TIPS: AssistantTip[] = [
  {
    id: 'tip-carta-export-1',
    title: 'Lista en PDF o en Word',
    body: 'Podés descargar tu carta en PDF para adjuntar o en Word si el formulario de la empresa te pide archivo editable.',
  },
];

export const ALL_COVER_LETTER_TIPS: AssistantTip[] = [
  ...Object.values(COVER_LETTER_TAB_TIPS).flat(),
  ...COVER_LETTER_ALWAYS_TIPS,
];

/** Tips de Tarjeta Personal (docType 'business_card'). */
export const CARD_TAB_TIPS: Record<string, AssistantTip[]> = {
  source_data: [
    {
      id: 'tip-card-import-1',
      title: 'Traé tus datos desde un CV',
      body: 'Podés elegir qué datos importar desde un CV guardado en tu computadora y ajustar o borrar cualquier campo antes de imprimir.',
      targetTab: 'source_data',
    },
  ],
  diseno: [
    {
      id: 'tip-card-clean-1',
      title: 'Menos texto, más impacto',
      body: 'Dejá solo nombre, especialidad, 2 o 3 datos de contacto y el código QR: así se lee rápido incluso en formato chico.',
      targetTab: 'diseno',
    },
  ],
};

export const CARD_ALWAYS_TIPS: AssistantTip[] = [
  {
    id: 'tip-card-sheet-1',
    title: 'Hoja lista para cortar',
    body: 'Al exportar podés elegir una hoja común con varias tarjetas acomodadas para imprimir y cortar sin desperdiciar papel.',
  },
];

export const ALL_CARD_TIPS: AssistantTip[] = [
  ...Object.values(CARD_TAB_TIPS).flat(),
  ...CARD_ALWAYS_TIPS,
];

/** Tips de Agenda / Planificador (docType 'planner'). */
export const PLANNER_TAB_TIPS: Record<string, AssistantTip[]> = {
  planner_design: [
    {
      id: 'tip-planner-design-1',
      title: 'Elegí el tamaño según cómo la vas a usar',
      body: 'El tamaño chico es cómodo para llevar en la mochila; el tamaño común da más espacio para escribir cada día.',
      targetTab: 'planner_design',
    },
  ],
  planner_months: [
    {
      id: 'tip-planner-months-1',
      title: 'Personalizá mes a mes',
      body: 'Podés activar solo los meses y bloques que usás para no imprimir hojas de más.',
      targetTab: 'planner_months',
    },
  ],
};

export const PLANNER_ALWAYS_TIPS: AssistantTip[] = [
  {
    id: 'tip-planner-local-1',
    title: 'Tu agenda queda en esta computadora',
    body: 'Los cambios se guardan localmente mientras editás y podés exportar el PDF listo para imprimir y anillar.',
  },
];

export const ALL_PLANNER_TIPS: AssistantTip[] = [
  ...Object.values(PLANNER_TAB_TIPS).flat(),
  ...PLANNER_ALWAYS_TIPS,
];

/** Tips de EditorLee (docType 'editorial'). */
export const EDITORIAL_TAB_TIPS: Record<string, AssistantTip[]> = {
  editorial_portada: [
    {
      id: 'tip-editorial-portada-1',
      title: 'Portada editorial o académica',
      body: 'Podés alternar entre tapa de libro, carátula académica con cátedra e integrantes, o portada ejecutiva limpia.',
      targetTab: 'editorial_portada',
    },
  ],
  editorial_secciones: [
    {
      id: 'tip-editorial-secciones-1',
      title: 'Combiná bloques dentro de cada capítulo',
      body: 'Cada sección acepta subtítulos, párrafos, citas destacadas, recuadros, tablas y bibliografía ordenados.',
      targetTab: 'editorial_secciones',
    },
  ],
  editorial_toc: [
    {
      id: 'tip-editorial-toc-1',
      title: 'El índice se calcula solo',
      body: 'Activá el índice automático y elegí si querés incluir subtítulos: los números de página se actualizan al exportar.',
      targetTab: 'editorial_toc',
    },
  ],
};

export const EDITORIAL_ALWAYS_TIPS: AssistantTip[] = [
  {
    id: 'tip-editorial-backup-1',
    title: 'Guardado local y copia de respaldo',
    body: 'Tu obra se guarda en esta computadora y podés bajar una copia de respaldo en cualquier momento desde la barra superior.',
  },
];

export const ALL_EDITORIAL_TIPS: AssistantTip[] = [
  ...Object.values(EDITORIAL_TAB_TIPS).flat(),
  ...EDITORIAL_ALWAYS_TIPS,
];

interface AssistantCatalogBundle {
  readonly tabTips: Record<string, AssistantTip[]>;
  readonly alwaysTips: AssistantTip[];
  readonly allTips: AssistantTip[];
}

const ASSISTANT_CATALOG_BY_TYPE: Record<AssistantDocType, AssistantCatalogBundle> = {
  cv: { tabTips: TAB_TIPS, alwaysTips: ALWAYS_TIPS, allTips: ALL_TIPS },
  cover_letter: {
    tabTips: COVER_LETTER_TAB_TIPS,
    alwaysTips: COVER_LETTER_ALWAYS_TIPS,
    allTips: ALL_COVER_LETTER_TIPS,
  },
  business_card: { tabTips: CARD_TAB_TIPS, alwaysTips: CARD_ALWAYS_TIPS, allTips: ALL_CARD_TIPS },
  book: { tabTips: BOOK_TAB_TIPS, alwaysTips: BOOK_ALWAYS_TIPS, allTips: ALL_BOOK_TIPS },
  planner: { tabTips: PLANNER_TAB_TIPS, alwaysTips: PLANNER_ALWAYS_TIPS, allTips: ALL_PLANNER_TIPS },
  invoice: { tabTips: FACT_TAB_TIPS, alwaysTips: FACT_ALWAYS_TIPS, allTips: ALL_INVOICE_TIPS },
  editorial: {
    tabTips: EDITORIAL_TAB_TIPS,
    alwaysTips: EDITORIAL_ALWAYS_TIPS,
    allTips: ALL_EDITORIAL_TIPS,
  },
};

function getCatalogForDocType(docType: AssistantDocType = 'cv'): AssistantCatalogBundle {
  return ASSISTANT_CATALOG_BY_TYPE[docType] || ASSISTANT_CATALOG_BY_TYPE.cv;
}

export const getAllTips = (docType: AssistantDocType = 'cv'): AssistantTip[] =>
  getCatalogForDocType(docType).allTips;

/** Tips para la pestaña activa (primero los específicos, después los transversales). */
export function getTipsForTab(
  activeTab?: string | null,
  docType: AssistantDocType = 'cv',
): AssistantTip[] {
  const { tabTips, alwaysTips } = getCatalogForDocType(docType);
  const specific = (activeTab && tabTips[activeTab]) || [];
  return [...specific, ...alwaysTips];
}

/** Próximo tip sin ver: específico de la pestaña (en orden declarado) y después los transversales. */
export function pickNextTip(
  activeTab: string | null | undefined,
  seenTipIds: string[],
  docType: AssistantDocType = 'cv',
): AssistantTip | null {
  const seen = new Set(seenTipIds || []);
  const candidates = getTipsForTab(activeTab, docType);
  return candidates.find((tip) => !seen.has(tip.id)) ?? null;
}

/**
 * LIDIO SIEMPRE CON TIP: devuelve un tip JAMÁS null.
 * Prioridad: (1) primer tip no visto de la pestaña/paso activo, (2) primer
 * transversal no visto, (3) repaso: rota por los tips de la pestaña activa
 * (o los transversales si esa pestaña no tiene). Con afterTipId, en repaso
 * devuelve el tip siguiente al actual dentro del ciclo (para que "Entendido"
 * precargue uno distinto incluso con todo el catálogo ya visto).
 */
export function pickAlwaysTip(
  activeTab: string | null | undefined,
  seenTipIds: string[],
  docType: AssistantDocType = 'cv',
  afterTipId?: string | null,
): AssistantTip {
  const seen = new Set(seenTipIds || []);
  const { tabTips, alwaysTips } = getCatalogForDocType(docType);
  const specific = (activeTab && tabTips[activeTab]) || [];
  const always = alwaysTips;

  const unseenSpecific = specific.find((tip) => !seen.has(tip.id));
  if (unseenSpecific) return unseenSpecific;
  const unseenAlways = always.find((tip) => !seen.has(tip.id));
  if (unseenAlways) return unseenAlways;

  const cycle = specific.length > 0 ? specific : always;
  if (afterTipId) {
    const idx = cycle.findIndex((tip) => tip.id === afterTipId);
    if (idx >= 0) return cycle[(idx + 1) % cycle.length];
  }
  const offset = (seenTipIds?.length || 0) % cycle.length;
  return cycle[offset];
}

/**
 * Avance manual ("Otro tip" / precarga tras "Entendido"): siguiente tip del
 * catálogo completo del docType, circular y preferentemente no visto. Con
 * catálogos de 2+ tips nunca repite el actual de inmediato.
 */
export function pickNextTipCycled(
  currentTipId: string | null | undefined,
  seenTipIds: string[],
  docType: AssistantDocType = 'cv',
): AssistantTip | null {
  const catalog = getAllTips(docType);
  if (catalog.length === 0) return null;
  const seen = new Set(seenTipIds || []);
  const start = currentTipId ? catalog.findIndex((tip) => tip.id === currentTipId) : -1;
  if (start >= 0) {
    for (let step = 1; step <= catalog.length; step++) {
      const candidate = catalog[(start + step) % catalog.length];
      if (!seen.has(candidate.id)) return candidate;
    }
  }
  const unseen = catalog.find((tip) => !seen.has(tip.id));
  if (unseen) return unseen;
  if (start >= 0) return catalog[(start + 1) % catalog.length];
  return catalog[0];
}

export function markTipSeen(seenTipIds: string[], tipId: string): string[] {
  const seen = new Set(seenTipIds || []);
  seen.add(tipId);
  return Array.from(seen);
}

/** ¿Corresponde mostrar tips? (modo "silenciar tips" o límite de tips por sesión alcanzado) */
export function canShowMoreTips(doNotDisturb: boolean, sessionTipCount: number): boolean {
  if (doNotDisturb) return false;
  return sessionTipCount < MAX_TIPS_PER_SESSION;
}

export function countSeen(seenTipIds: string[]): number {
  return new Set(seenTipIds || []).size;
}

/** Serialización defensiva del estado persistido. */
export function parseAssistantState(raw: string | null | undefined): AssistantStoredState {
  if (!raw) return { ...DEFAULT_ASSISTANT_STATE };
  try {
    const parsed = JSON.parse(raw);
    const seenTipIds = Array.isArray(parsed?.seenTipIds)
      ? parsed.seenTipIds.filter((v: unknown) => typeof v === 'string')
      : [];
    return {
      seenTipIds,
      doNotDisturb: Boolean(parsed?.doNotDisturb),
    };
  } catch {
    return { ...DEFAULT_ASSISTANT_STATE };
  }
}

export function serializeAssistantState(state: AssistantStoredState): string {
  return JSON.stringify({
    seenTipIds: Array.from(new Set(state.seenTipIds || [])),
    doNotDisturb: Boolean(state.doNotDisturb),
  });
}

export function parseSessionCount(raw: string | null | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
