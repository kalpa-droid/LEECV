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

export const ASSISTANT_NAME = 'Lidio';
export const ASSISTANT_TAGLINE = 'Te doy una mano con tu CV';

export const ASSISTANT_STORAGE_KEY = 'leecv.assistant';
export const ASSISTANT_SESSION_KEY = 'leecv.assistant.session';

export const FIRST_TIP_IDLE_MS = 20_000;
export const NEXT_TIP_IDLE_MS = 90_000;
export const MAX_TIPS_PER_SESSION = 3;

export interface AssistantTip {
  id: string;
  title: string;
  body: string;
  /** Pestaña del editor a la que lleva la CTA "Ir". Opcional y validada con isValidPanelTab. */
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

/** Pestaña validada para navegar. Devuelve null si no es un destino real del editor. */
export function validateAssistantTargetTab(
  targetTab: string | null | undefined,
  cvData?: any,
): string | null {
  if (!targetTab) return null;
  return isValidPanelTab(targetTab, cvData) ? String(targetTab) : null;
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
): SuggestedAssistantAction[] {
  if (!Array.isArray(actions)) return [];
  const out: SuggestedAssistantAction[] = [];
  for (const raw of actions) {
    if (!raw || typeof raw.label !== 'string' || !raw.label.trim()) continue;
    const label = raw.label.trim().slice(0, 80);
    const tab = validateAssistantTargetTab(raw.targetTab, cvData);
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

/** Tips transversales (aparecen en cualquier pestaña). */
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

export const ALL_TIPS: AssistantTip[] = [
  ...Object.values(TAB_TIPS).flat(),
  ...ALWAYS_TIPS,
];

/** Tips para la pestaña activa (primero los específicos, después los transversales). */
export function getTipsForTab(activeTab?: string | null): AssistantTip[] {
  const specific = (activeTab && TAB_TIPS[activeTab]) || [];
  return [...specific, ...ALWAYS_TIPS];
}

/** Próximo tip sin ver: específico de la pestaña (en orden declarado) y después los transversales. */
export function pickNextTip(
  activeTab: string | null | undefined,
  seenTipIds: string[],
): AssistantTip | null {
  const seen = new Set(seenTipIds || []);
  const candidates = getTipsForTab(activeTab);
  return candidates.find((tip) => !seen.has(tip.id)) ?? null;
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
