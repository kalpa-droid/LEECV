/**
 * Núcleo puro — Proveedor dinámico de botones del Dock de EditorLee (editorialDockEngine.ts)
 *
 * Genera:
 * 1. Los pasos estructurales principales (Inicio, Portada, Secciones, Bibliografía,
 *    Diseño, Índice, Metadatos, Importar/IA).
 * 2. Los botones individuales de cada sección/capítulo del manuscrito actual,
 *    diferenciados visualmente por ícono de sección + distintivo (`badgeLabel`):
 *    - Preliminares (Prólogo, Dedicatoria, Resumen, Introducción): `i`, `ii`, `iii`...
 *    - Cuerpo (Capítulos, Unidades, Marco Teórico, Metodología, Resultados, Discusión): `1`, `2`, `3`...
 *    - Anexos / Apéndices: `A`, `B`, `C`...
 *    - Cierre específico: Conclusiones (`C`), Epílogo (`E`), Glosario (`G`), Bibliografía (`Bib`).
 *
 * Sigue la Regla 8 (Identidad Canónica primero, heurística normalizada solo como respaldo).
 */
import type { DockStepContext, DockTabItem } from '../../../shared/core/studio-host/stepSequenceRegistry';
import type { EditorialSection, EditorialSectionKind } from './editorialTypes';
import { EDITORIAL_STEP_SEQUENCE } from './editorialStepSequence';
import { getEditorialPreset } from './editorialPresetCatalog';

export interface EditorialSectionBadgeCounters {
  prelim: number;
  body: number;
  annex: number;
}

const ROMAN_LOWER_MAP: Array<[number, string]> = [
  [50, 'l'],
  [40, 'xl'],
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
];

export function toRomanLower(num: number): string {
  if (!Number.isFinite(num) || num <= 0) return 'i';
  let remaining = Math.floor(num);
  let out = '';
  for (const [val, sym] of ROMAN_LOWER_MAP) {
    while (remaining >= val) {
      out += sym;
      remaining -= val;
    }
  }
  return out || 'i';
}

function normalizeAsciiTitle(raw: string): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function emitHeuristicFallbackTrace(section: Partial<EditorialSection>, inferredKey: string): void {
  if (typeof window === 'undefined') return;
  void import('../../../shared/core/utils/monitoring')
    .then(({ reportMessage }) => {
      reportMessage(
        `Fallback heurístico en badge Editorial para sección "${section.title || section.id}" -> "${inferredKey}"`,
        'info',
        { context: 'editorialDockEngine', extra: { sectionId: section.id, inferredKey } },
      );
    })
    .catch(() => {});
}

const PRELIM_KEYS = new Set([
  'prologo',
  'dedicatoria',
  'agradecimientos',
  'resumen',
  'introduccion',
]);

const CIERRE_SHORT_BADGE: Record<string, string> = {
  conclusiones: 'Cl',
  epilogo: 'Ep',
  glosario: 'Gl',
  bibliografia: 'Bf',
};

/**
 * Resuelve clave canónica de sección (`sectionKey`) + categoría (`category`).
 * Prioriza el campo canónico `sectionKey`; solo cae en heurística léxica normalizada (Regla 8)
 * si la sección proviene de datos heredados o texto plano importado sin clave.
 */
export function resolveCanonicalEditorialKey(section: Partial<EditorialSection>): {
  sectionKey: string;
  category: EditorialSectionKind;
} {
  const directKey = typeof section.sectionKey === 'string' && section.sectionKey ? section.sectionKey : '';
  if (directKey) {
    if (PRELIM_KEYS.has(directKey)) return { sectionKey: directKey, category: section.category || 'preliminares' };
    if (directKey === 'anexo' || directKey in CIERRE_SHORT_BADGE) {
      return { sectionKey: directKey, category: section.category || 'cierre' };
    }
    return { sectionKey: directKey, category: section.category || 'cuerpo' };
  }

  // Fallback por prefijo de id generado por el catálogo (`ed_<clave>_...`)
  const idMatch = typeof section.id === 'string' ? section.id.match(/^ed_([a-z_]+)_\d+/) : null;
  if (idMatch && idMatch[1]) {
    const key = idMatch[1];
    if (PRELIM_KEYS.has(key)) return { sectionKey: key, category: section.category || 'preliminares' };
    if (key === 'anexo' || key in CIERRE_SHORT_BADGE) {
      return { sectionKey: key, category: section.category || 'cierre' };
    }
    return { sectionKey: key, category: section.category || 'cuerpo' };
  }

  // Último recurso: heurística léxica normalizada sobre título (Regla 8: NFD + anclado + trazabilidad)
  const norm = normalizeAsciiTitle(section.title || '');
  let inferred = 'capitulo';
  let cat: EditorialSectionKind = section.category || 'cuerpo';

  if (/^(prologo|prefacio)\b/.test(norm)) {
    inferred = 'prologo';
    cat = 'preliminares';
  } else if (/^(dedicatoria|epigrafe)\b/.test(norm)) {
    inferred = 'dedicatoria';
    cat = 'preliminares';
  } else if (/^agradecimientos?\b/.test(norm)) {
    inferred = 'agradecimientos';
    cat = 'preliminares';
  } else if (/^(resumen|abstract)\b/.test(norm)) {
    inferred = 'resumen';
    cat = 'preliminares';
  } else if (/^(introduccion|fundamentacion)\b/.test(norm)) {
    inferred = 'introduccion';
    cat = 'preliminares';
  } else if (/^(metodologia|materiales y metodos|metodo)\b/.test(norm)) {
    inferred = 'metodologia';
    cat = 'cuerpo';
  } else if (/^(marco teorico|estado del arte|antecedentes)\b/.test(norm)) {
    inferred = 'marco_teorico';
    cat = 'cuerpo';
  } else if (/^resultados?\b/.test(norm)) {
    inferred = 'resultados';
    cat = 'cuerpo';
  } else if (/^discusion\b/.test(norm)) {
    inferred = 'discusion';
    cat = 'cuerpo';
  } else if (/^conclusiones?\b/.test(norm)) {
    inferred = 'conclusiones';
    cat = 'cierre';
  } else if (/^epilogo\b/.test(norm)) {
    inferred = 'epilogo';
    cat = 'cierre';
  } else if (/^(bibliografia|referencias|fuentes)\b/.test(norm)) {
    inferred = 'bibliografia';
    cat = 'cierre';
  } else if (/^glosario\b/.test(norm)) {
    inferred = 'glosario';
    cat = 'cierre';
  } else if (/^(anexo|apendice)\b/.test(norm)) {
    inferred = 'anexo';
    cat = 'cierre';
  } else if (/^unidad\b/.test(norm)) {
    inferred = 'unidad';
    cat = 'cuerpo';
  }

  emitHeuristicFallbackTrace(section, inferred);
  return { sectionKey: inferred, category: cat };
}

/**
 * Asigna el distintivo numérico/romano/alfabético de un botón de sección del Dock.
 */
export function resolveSectionBadgeLabel(
  section: Partial<EditorialSection>,
  counters: EditorialSectionBadgeCounters,
): { badgeLabel: string; sectionKey: string; category: EditorialSectionKind } {
  const { sectionKey, category } = resolveCanonicalEditorialKey(section);

  if (sectionKey === 'anexo') {
    const idx = counters.annex;
    counters.annex += 1;
    const letter = String.fromCharCode(65 + (idx % 26));
    return { badgeLabel: letter, sectionKey, category };
  }

  if (sectionKey in CIERRE_SHORT_BADGE) {
    return { badgeLabel: CIERRE_SHORT_BADGE[sectionKey], sectionKey, category };
  }

  if (category === 'preliminares' || PRELIM_KEYS.has(sectionKey)) {
    counters.prelim += 1;
    return { badgeLabel: toRomanLower(counters.prelim), sectionKey, category };
  }

  counters.body += 1;
  return { badgeLabel: String(counters.body), sectionKey, category };
}

export interface EditorialDockIconSet {
  steps: Record<string, DockTabItem['icon']>;
  sections: Record<string, DockTabItem['icon']>;
  fallback: DockTabItem['icon'];
}

/**
 * Construye todos los ítems del Dock para EditorLee: pasos base + secciones dinámicas
 * con distintivo (`i`, `ii`, `1`, `2`, `A`) para distinguir cada capítulo o apartado.
 */
export function buildEditorialDockTabs(
  ctx: DockStepContext = {},
  iconSet?: EditorialDockIconSet,
): DockTabItem[] {
  const draft = ctx.cvData || {};
  const presetId = draft?.design?.presetId;
  const activePreset = presetId ? getEditorialPreset(presetId) : undefined;

  const coreTabs: DockTabItem[] = EDITORIAL_STEP_SEQUENCE.filter((step) => {
    if (!activePreset) return true;
    if (step.id === 'editorial_toc' && !activePreset.dockButtons.toc && draft?.tocConfig?.enabled === false) {
      return true; // Mantener visible para poder encenderlo cuando se desee
    }
    return true;
  }).map((step) => ({
    id: step.id,
    label: step.label,
    stepNumber: step.stepNumber,
    icon: iconSet?.steps[step.id] || iconSet?.fallback,
    isLarge: true,
    variant: 'accent' as const,
  }));

  const sections: EditorialSection[] = Array.isArray(draft.sections) ? draft.sections : [];
  if (sections.length === 0) return coreTabs;

  const counters: EditorialSectionBadgeCounters = { prelim: 0, body: 0, annex: 0 };
  const sectionTabs: DockTabItem[] = [];

  for (const sec of sections) {
    if (!sec || typeof sec.id !== 'string') continue;
    const { badgeLabel, sectionKey } = resolveSectionBadgeLabel(sec, counters);
    const hasContent =
      Array.isArray(sec.records) &&
      sec.records.some(
        (r) =>
          (typeof r?.content === 'string' && r.content.trim().length > 0) ||
          Boolean(r?.bibTitle || r?.bibAuthor || r?.imagePath),
      );

    sectionTabs.push({
      id: sec.id,
      label: sec.title || 'Sección',
      badgeLabel,
      icon: iconSet?.sections[sectionKey] || iconSet?.sections.capitulo || iconSet?.fallback,
      isLarge: false,
      variant: sectionKey === 'capitulo' || sectionKey === 'unidad' || sectionKey === 'desarrollo' ? 'default' : 'secondary',
      hasContent,
      isDisabled: sec.visible === false,
    });
  }

  return [...coreTabs, ...sectionTabs];
}
