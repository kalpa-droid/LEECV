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

/** Tips por pestaña del editor (docType 'cv'). Cada uno es independiente y desordenable. */
export const TAB_TIPS: Record<string, AssistantTip[]> = {
  personales: [
    {
      id: 'tip-personales-1',
      title: 'Nombre y contacto al día',
      body: 'Empezá por esta parte: si el teléfono o el correo tienen un error, todo lo demás se lee en vano. Verificalos antes de exportar.',
    },
  ],
  redes: [
    {
      id: 'tip-redes-1',
      title: 'Menos perfiles, mejor',
      body: 'Dejá solo los perfiles que tengas al día (por ejemplo LinkedIn). Un enlace vacío o viejo resta más que no poner nada.',
    },
  ],
  resumen: [
    {
      id: 'tip-resumen-1',
      title: '3 o 4 líneas reales',
      body: 'En vez de “proactivo y orientado a resultados”: tu rol + tu fuerte con algo comprobable, por ejemplo “Vendedor B2B, 8 años, cartera de 40 cuentas”.',
    },
  ],
  objetivo: [
    {
      id: 'tip-objetivo-1',
      title: 'Solo si cambiás de rumbo',
      body: 'El objetivo profesional sirve cuando cambiás de rubro o buscás tu primer empleo. Si tu perfil ya es claro, podés dejarlo vacío sin problema.',
    },
  ],
  vacante: [
    {
      id: 'tip-vacante-1',
      title: 'Pegá la oferta acá',
      body: 'Cargá el puesto y la empresa de la oferta: la pestaña de postulación se llama “Puesto · Empresa” y la carta se escribe contra esa vacante.',
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
      body: 'Contá en 3 párrafos por qué este puesto es para vos: quién sos, qué lograste y qué aportás ahí. Nada de copiar viñetas.',
      targetTab: 'carta',
    },
    {
      id: 'tip-carta-2',
      title: 'Primer borrador con IA',
      body: 'Con el botón de IA podés generar un primer borrador de la carta y después ajustarlo con tu voz. Nunca se guarda sin que lo confirmes.',
      targetTab: 'carta',
    },
  ],
  experiencia: [
    {
      id: 'tip-experiencia-1',
      title: 'Verbo + número',
      body: 'Empezá cada viñeta con un verbo en pasado y, si podés, un número: “Reduje 20% la mora”, “Coordiné 6 personas”.',
      targetTab: 'experiencia',
    },
  ],
  logros: [
    {
      id: 'tip-logros-1',
      title: 'Logros medibles',
      body: 'Un logro con número vale más que tres responsabilidades. Si no tenés número, usá alcance: “en 3 sucursales”, “con equipo de 6”.',
      targetTab: 'logros',
    },
  ],
  habilidades: [
    {
      id: 'tip-habilidades-1',
      title: 'Las de la oferta primero',
      body: 'Poné arriba las habilidades que pedía la oferta: el Diagnóstico ATS compara tu CV contra esas palabras.',
      targetTab: 'habilidades',
    },
  ],
  idiomas: [
    {
      id: 'tip-idiomas-1',
      title: 'Nivel honesto',
      body: 'Una entrevista te puede exponer: poné el nivel real (por ejemplo “Inglés B2 — conversación fluida”) y no uno inflado.',
      targetTab: 'idiomas',
    },
  ],
  diseno: [
    {
      id: 'tip-diseno-1',
      title: 'Plantilla primero, ajuste después',
      body: 'Elegí la plantilla y el espacio entre bloques antes de retoques finos: cambiar la estructura después desordena tus ajustes.',
      targetTab: 'diseno',
    },
  ],
  importar_datos: [
    {
      id: 'tip-importar-1',
      title: '¿Tenés un CV viejo?',
      body: 'Subilo en Importar datos y la IA trae tu información a estas secciones; después revisás y guardás.',
      targetTab: 'importar_datos',
    },
  ],
};

/** Tips transversales (aparecen en cualquier pestaña). Incluye el bloque de columnas aprobado. */
export const ALWAYS_TIPS: AssistantTip[] = [
  {
    id: 'tip-columnas-1',
    title: '2 columnas, un CV',
    body: 'Tu CV se arma en Columna Principal (derecha, lectura prioritaria) y Barra Lateral (izquierda, escaneo rápido). En cada sección, “Ubicación y Orden Relativo” te mueve de una a otra y cambia el orden.',
  },
  {
    id: 'tip-columnas-2',
    title: 'En la principal siempre',
    body: 'Experiencia, Resumen/Extracto y Objetivo: es lo primero que el reclutador lee. Si hay espacio, sumá Formación y Proyectos.',
  },
  {
    id: 'tip-columnas-3',
    title: 'Lo que rinde en la barra lateral',
    body: 'Habilidades, Idiomas, Informática, Cursos y Redes se leen rápido y van perfectos a un costado: liberás espacio en la principal sin perder información.',
  },
  {
    id: 'tip-columnas-4',
    title: 'Dos secciones tienen candado',
    body: 'Certificados escaneados y Firma digital no se pueden mover de columna: van al final del CV por su propio formato, y el candado te lo avisa.',
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
