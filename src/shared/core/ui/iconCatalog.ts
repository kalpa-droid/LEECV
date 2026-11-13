/**
 * NÚCLEO — CATÁLOGO CENTRAL DE ÍCONOS (iconCatalog.ts)
 *
 * Regla de núcleo: UNA sola entidad o acción = UN solo ícono, en todo el
 * producto (Dock del editor, Wizard, paneles, Navbar y PDF). Ningún
 * componente elige un ícono "a ojo": consulta este catálogo.
 *
 * Los ids de aquí apuntan a claves de ICON_REGISTRY
 * (src/shared/core/pdf-engine/layers/icons/iconRegistry.ts), que es el único
 * lugar donde viven los trazados SVG. Así Dock DOM y motor PDF comparten
 * exactamente el mismo dibujo para la misma sección.
 *
 * Prohibido: definir íconos sueltos en componentes, o repetir un mismo
 * ícono entre secciones/botones distintos (cero colisiones).
 */

/**
 * Mapeo canónico: id de sección (dato) → id de ícono (trazado).
 * Cubre CANONICAL_SECTION_ORDER, slots personalizada-1..5, secciones de
 * tarjeta (card_*) y redes sociales (social-*).
 */
export const SECTION_ICON_IDS: Record<string, string> = {
  // --- Secciones canónicas del CV ---
  contacto: 'contacto',
  'datos-personales': 'datos-personales',
  frase: 'frase',
  objetivo: 'objetivo',
  resumen: 'resumen',
  experiencia: 'experiencia',
  logros: 'logros',
  portafolio: 'portafolio',
  formacion: 'formacion',
  profesion: 'profesion',
  cursos: 'cursos',
  informatica: 'informatica',
  proyectos: 'proyectos',
  publicaciones: 'publicaciones',
  referencias: 'referencias',
  habilidades: 'habilidades',
  competencias: 'competencias',
  idiomas: 'idiomas',
  redes: 'redes',
  certificados: 'certificados',
  firma: 'firma',
  portada: 'portada',
  // --- Secciones prediseñadas (activables desde "Nueva sección") ---
  ecologia: 'ecologia',
  voluntariado: 'voluntariado',
  premios: 'premios',
  patentes: 'patentes',
  ponencias: 'ponencias',
  // --- Slots de sección personalizada (ícono determinista por número) ---
  'personalizada-1': 'personalizada-1',
  'personalizada-2': 'personalizada-2',
  'personalizada-3': 'personalizada-3',
  'personalizada-4': 'personalizada-4',
  'personalizada-5': 'personalizada-5',
  // --- Tarjeta profesional (card_*) ---
  card_size: 'card_size',
  card_extract: 'card_extract',
  card_logo: 'card_logo',
  card_front: 'card_front',
  card_back: 'card_back',
  card_qr: 'card_qr',
  // --- Redes sociales (social-*) ---
  'social-professional': 'social-professional',
  'social-code': 'social-code',
  'social-email': 'social-email',
  'social-web': 'social-web'
};

/**
 * Productos de la app (icono de producto, no de sección).
 * Mismo ícono en Navbar, NewDocumentMenu, Wizard y exportaciones.
 */
export const PRODUCT_ICON_IDS = {
  cv: 'cv',
  tarjeta: 'tarjeta',
  carta: 'carta',
  libro: 'libro',
  agenda: 'agenda'
} as const;

export type ProductIconKey = keyof typeof PRODUCT_ICON_IDS;

/**
 * Acciones globales de UI. Ejemplos: IA siempre es 'ia' (Sparkles vectorial),
  * Guardar siempre 'guardar', Vista previa siempre 'preview', etc.
 */
export const UI_ICON_IDS = {
  ia: 'ia',
  exportar: 'exportar',
  preview: 'preview',
  guardar: 'guardar',
  ats: 'ats',
  diseno: 'diseno',
  importar: 'importar',
  vacante: 'vacante'
} as const;

export type UiIconKey = keyof typeof UI_ICON_IDS;

/**
 * Resuelve el ícono canónico de una sección.
 *
 * Orden de precedencia:
 *   1. `sectionIconOverrides[slot]` — override explícito guardado por el usuario
 *      (ej: un slot personalizada-N al que se le asignó el ícono de un preset).
 *   2. `customSections[].iconId` — sección personalizada dinámica (legado).
 *   3. Slot determinista: `personalizada-N` → su propio ícono del registro
 *      (nunca el círculo fallback común).
 *   4. Mapeo canónico SECTION_ICON_IDS.
 *   5. 'fallback' (círculo) solo si nada más resolve.
 *
 * También normaliza ids de sector con sufijo '-cont' (banners de contenedor).
 * Pura: sin DOM, sin fechas, sin red — importable en tests de node.
 */
export function resolveSectionIconId(sectionId: string, cvData?: any): string {
  if (!sectionId || typeof sectionId !== 'string') return 'fallback';

  const baseId = sectionId.endsWith('-cont') ? sectionId.slice(0, -5) : sectionId;

  // 1. Override explícito del usuario
  const overrides = cvData?.sectionIconOverrides;
  if (overrides && typeof overrides === 'object') {
    const o = overrides[baseId];
    if (typeof o === 'string' && o) return o;
  }

  // 2. Sección personalizada dinámica (legado)
  if (Array.isArray(cvData?.customSections)) {
    const cs = cvData.customSections.find(
      (c: any) => c && c.id === baseId
    );
    if (cs && typeof cs.iconId === 'string' && cs.iconId) return cs.iconId;
  }

  // 3 + 4. Slot determinista o mapeo canónico (personalizada-N ya está
  // mapeado 1:1 consigo mismo en SECTION_ICON_IDS)
  const mapped = SECTION_ICON_IDS[baseId];
  if (mapped) return mapped;

  // 5. Fallback
  return 'fallback';
}
