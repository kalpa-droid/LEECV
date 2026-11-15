/**
 * NÚCLEO — MAPA CANÓNICO: REGLA ATS → PESTAÑA DEL EDITOR (ruleTargetTabs.ts)
 *
 * Antes de este módulo, los botones "Ir a corregir" / "Ir a Experiencia" /
 * "Guía ACR" de los modales ATS saltaban a pestañas inexistentes
 * ('experience' en inglés, 'frase' absorbida en Datos Personales) y el
 * panel quedaba en blanco. Este archivo es la ÚNICA fuente de verdad de
 * "¿a qué pestaña lleva cada regla?" y la consume tanto AtsLiveAuditorPanel
 * como AppModals (AtsCheckModal).
 *
 * Garantía anti-panel-vacío: todo destino se valida contra las pestañas
 * reales que renderiza EditorPanel (VALID_CV_PANEL_TABS + secciones
 * personalizadas dinámicas). Si algo no existe, cae en FALLBACK_TAB.
 */
import { CVData } from '../../../types/cv';
import { FILLER_WORDS } from './rulesCatalog';

/** Pestañas estáticas que renderiza EditorPanel para docType 'cv'. */
const VALID_CV_PANEL_TABS = new Set([
  'personales', 'redes', 'competencias', 'resumen', 'objetivo', 'vacante', 'carta',
  'importar_datos', 'logros', 'portafolio', 'habilidades', 'idiomas', 'proyectos',
  'publicaciones', 'referencias', 'formacion', 'profesion', 'experiencia', 'cursos',
  'informatica', 'certificados', 'firma', 'nueva_seccion', 'guardados', 'diseno', 'portada',
]);

/** Pestañas de utilidad (no son secciones del CV ni destino de una regla). */
const UTILITY_TABS = new Set(['guardados', 'diseno', 'portada', 'carta', 'vacante', 'importar_datos']);

/** Pestaña segura cuando nada más aplica: donde vive la mayoría del contenido corregible. */
export const FALLBACK_TAB = 'experiencia';

/** ¿Es una pestaña que EditorPanel realmente renderiza (estática o personalizada)? */
export function isValidPanelTab(tab: string | null | undefined, cvData?: CVData | any): boolean {
  if (!tab || typeof tab !== 'string') return false;
  if (VALID_CV_PANEL_TABS.has(tab)) return true;
  if (tab.startsWith('personalizada-')) return true;
  const custom = cvData?.customSections;
  if (Array.isArray(custom)) {
    return custom.some((cs: any) => cs && cs.id === tab);
  }
  return false;
}

/** ¿El resumen contiene frases de relleno? (mismo criterio que la regla filler_words) */
function summaryHasFiller(cvData?: CVData | any): boolean {
  if (!cvData) return false;
  const summary = String(cvData.summary || cvData.personalInfo?.summary || '').toLowerCase();
  if (!summary) return false;
  return FILLER_WORDS.some((fw) => summary.includes(fw));
}

/** ¿Alguna viñeta/descripción de experiencia contiene frases de relleno? */
function experienceHasFiller(cvData?: CVData | any): boolean {
  if (!cvData) return false;
  for (const exp of cvData.experience || []) {
    const textToCheck = ((exp.description || '') + ' ' + (exp.bulletPoints?.join(' ') || '')).toLowerCase();
    if (FILLER_WORDS.some((fw) => textToCheck.includes(fw))) return true;
  }
  return false;
}

/**
 * Reglas dinámicas `non_standard_section_<secId>` (atsPreflightCheck.ts):
 * si <secId> es una sección editable del CV (personalizada-* o customSections)
 * o una pestaña de sección válida, va directo a ella; si es legacy o un id
 * sin panel fijo, cae en 'nueva_seccion' (desde donde se renombra/edita).
 */
function resolveDynamicSectionTarget(secId: string, cvData?: CVData | any): string {
  if (secId.startsWith('personalizada-')) return secId;
  const custom = cvData?.customSections;
  if (Array.isArray(custom) && custom.some((cs: any) => cs && cs.id === secId)) return secId;
  if (VALID_CV_PANEL_TABS.has(secId) && !UTILITY_TABS.has(secId)) return secId;
  return 'nueva_seccion';
}

/**
 * Resuelve la pestaña del editor a la que debe llevar el botón
 * "Ir a corregir" de una regla ATS. Siempre devuelve una pestaña válida
 * (cinturón y tirantes: última validación contra isValidPanelTab).
 */
export function resolveRuleTargetTab(ruleId: string | null | undefined, cvData?: CVData | any): string {
  const id = typeof ruleId === 'string' ? ruleId : '';
  if (id.startsWith('non_standard_section_')) {
    return resolveDynamicSectionTarget(id.slice('non_standard_section_'.length), cvData);
  }

  let target: string;
  switch (id) {
    case 'missing_contact':
    case 'sensitive_data':
    case 'document_title':
      target = 'personales';
      break;
    case 'summary_length':
      target = 'resumen';
      break;
    case 'experience_action_verbs':
    case 'short_jobs_unexplained':
    case 'no_experience_tips':
      target = 'experiencia';
      break;
    case 'filler_words':
      // La advertencia puede venir del resumen o de la experiencia.
      // Si está en ambos, va a experiencia (contenido más extenso).
      target = summaryHasFiller(cvData) && !experienceHasFiller(cvData) ? 'resumen' : 'experiencia';
      break;
    case 'education_abandoned':
    case 'education_primary':
      target = 'formacion';
      break;
    case 'courses_relevance':
      target = 'cursos';
      break;
    case 'tool_levels_visual':
    case 'ai_tool_unspecific':
      target = 'habilidades';
      break;
    case 'competencies_format':
      target = 'competencias';
      break;
    case 'section_order':
      target = 'experiencia';
      break;
    case 'multicol_layout':
      target = 'diseno';
      break;
    case 'keyword_match':
      target = 'vacante';
      break;
    default:
      target = FALLBACK_TAB;
  }

  return isValidPanelTab(target, cvData) ? target : FALLBACK_TAB;
}
