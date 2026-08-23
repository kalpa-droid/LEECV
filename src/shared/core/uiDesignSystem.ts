/**
 * NÚCLEO DE DISEÑO DE LA INTERFAZ WEB (no confundir con el motor de color
 * del PDF, que vive en /shared/core/pdf-engine/layers/colors — ese resuelve
 * el color DENTRO del currículum/tarjeta exportada; este resuelve el color
 * de los PANELES, botones e inputs con los que el usuario interactúa).
 *
 * Regla de oro: ningún componente de panel escribe un hex, un text-[Npx]
 * o una clase de botón a mano. Todo sale de acá.
 */

// ============================================================
// 1. SISTEMA DE COLOR — semántico, no "el rosa" sino "el acento"
// ============================================================

export const colorSystem = {
  // Acento de marca — la única vez que se define este hex en TODA la web
  accent: { base: '#FF2E63', hover: '#E0184C', muted: '#FFE8ED', text: '#B3123F' },
  secondary: { base: '#00A8A0', hover: '#008780', muted: '#E0F5F3', text: '#00655F' },

  // Neutros — la escala que usa todo texto/borde que no es color de marca
  neutral: {
    textPrimary: '#2B1B2E',   // títulos, valores importantes
    textSecondary: '#6B5B6E', // texto de apoyo
    textMuted: '#9B8B9E',     // placeholders, ayuda, metadatos
    border: '#EFE2C9',        // borde por defecto
    borderStrong: '#D9C9A0',  // borde en hover/foco
    surface: '#FFFFFF',       // fondo de tarjeta
    surfaceMuted: '#FAF7F0',  // fondo de página/paneles
  },

  // Estados — SOLO para estos 3 significados, nunca decorativos
  status: {
    success: { base: '#1D9E75', muted: '#E1F5EE', text: '#0F6E56' },
    warning: { base: '#BA7517', muted: '#FAEEDA', text: '#854F0B' },
    danger: { base: '#D14D4D', muted: '#FCEBEB', text: '#A32D2D' },
  },
} as const;

// ============================================================
// 2. JERARQUÍA TIPOGRÁFICA — una escala fija, 6 niveles, sin excepciones
// ============================================================

export const typeScale = {
  // Nivel 1: título de pestaña activa (aparece 1 vez por pantalla)
  pageTitle: 'text-[15px] font-semibold',
  // Nivel 2: título de sección dentro de una pestaña (ver PanelSection)
  sectionTitle: 'text-[13px] font-medium',
  // Nivel 3: etiqueta de un campo de formulario ("Nombre", "Institución")
  fieldLabel: 'text-[12px] font-medium',
  // Nivel 4: valor/texto de cuerpo (lo que el usuario escribió o lee)
  body: 'text-[13px] font-normal',
  // Nivel 5: texto de ayuda — SOLO cuando algo no es obvio, nunca por defecto
  helper: 'text-[11px] font-normal',
  // Nivel 6: microcopy — texto dentro de badges/pills/contadores
  micro: 'text-[10px] font-medium',
} as const;

/**
 * Regla de asignación de color por nivel (para que la jerarquía se vea, no
 * solo se sienta por tamaño):
 * - pageTitle / sectionTitle → neutral.textPrimary
 * - fieldLabel → neutral.textSecondary
 * - body → neutral.textPrimary
 * - helper → neutral.textMuted
 * - micro → depende del contenedor (ver badge más abajo)
 */

// ============================================================
// 3. CÓMO SE CONSTRUYE CADA ELEMENTO
// ============================================================

/**
 * BOTÓN — 4 roles, nunca un 5to inventado en una pestaña puntual.
 * - primary: la ÚNICA acción principal de la pantalla. Si hay dos botones
 *   "primary" a la vista, uno de los dos está mal clasificado.
 * - secondary: alternativas de mismo peso entre sí (ej. presets uno al lado del otro)
 * - ghost: bajo compromiso — cancelar, cerrar, "Ajuste manual"
 * - danger: solo eliminar / acciones irreversibles
 */
export const button = {
  base: 'rounded-[10px] font-medium text-[13px] px-4 py-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
  primary: `bg-[var(--color-accent-base)] text-white hover:bg-[var(--color-accent-hover)] active:scale-[0.98]`,
  secondary: `bg-white border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] hover:border-[var(--color-neutral-border-strong)] active:scale-[0.98]`,
  ghost: `bg-transparent text-[var(--color-neutral-text-secondary)] hover:text-[var(--color-neutral-text-primary)]`,
  danger: `bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/30 text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-muted)]`,
} as const;

/**
 * TARJETA SELECCIONABLE — el patrón de "elegir 1 de N presets". Mismo
 * componente para presets de color, tipografía, layout, tamaño de tarjeta.
 */
export const selectableCard = {
  base: 'rounded-[10px] p-3 text-left transition-all cursor-pointer border',
  selected: `border-2 border-[var(--color-accent-base)] bg-[var(--color-accent-muted)]`,
  unselected: `border-[var(--color-neutral-border)] bg-white hover:border-[var(--color-neutral-border-strong)]`,
} as const;

/**
 * INPUT DE TEXTO / SELECT — un solo estado visual para los 3, foco idéntico
 * en todos así el usuario aprende una sola convención.
 */
export const input = {
  base: `w-full rounded-[10px] border border-[var(--color-neutral-border)] px-3 py-2.5 text-[13px] text-[var(--color-neutral-text-primary)] bg-white outline-none transition-colors placeholder:text-[var(--color-neutral-text-muted)]`,
  focus: `focus:border-[var(--color-accent-base)] focus:ring-2 focus:ring-[var(--color-accent-muted)]`,
} as const;

/**
 * BADGE / PILL — SOLO usa colores de estado o el acento, nunca un color
 * inventado para una pestaña puntual.
 */
export const badge = {
  base: 'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
  accent: `bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]`,
  success: `bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)]`,
  warning: `bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)]`,
  danger: `bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)]`,
  neutral: `bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)]`,
} as const;

/**
 * PESTAÑA (tab de navegación superior) — activa vs. inactiva, sin
 * variantes intermedias.
 */
export const tab = {
  base: 'px-3 py-2 text-[12px] font-medium rounded-[8px] transition-colors cursor-pointer',
  active: `bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]`,
  inactive: `text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-surface-muted)]`,
} as const;

/** Radios de esquina — 3 tamaños estandarizados */
export const radius = { control: '10px', card: '12px', modal: '16px' } as const;

// ============================================================
// 4. CAPAS AVANZADAS DEL MOTOR: ANIMACIÓN, ELEVACIÓN, Z-INDEX Y ACCESIBILIDAD
// ============================================================

/**
 * SISTEMA DE ANIMACIÓN Y MICRO-FEEDBACK — Tiempos, curvas y transformaciones táctiles
 */
export const motionSystem = {
  duration: { fast: '150ms', normal: '250ms', slow: '350ms' },
  ease: { standard: 'cubic-bezier(0.4, 0, 0.2, 1)', decelerate: 'cubic-bezier(0, 0, 0.2, 1)' },
  interaction: {
    hoverScale: 'hover:scale-[1.02] transition-transform duration-150',
    activeScale: 'active:scale-[0.98] transition-transform duration-100',
    fade: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    scaleUp: 'animate-scale-up',
  },
} as const;

/**
 * SISTEMA DE ELEVACIÓN Y SOMBRAS — Profundidad semántica sin sombras duras
 */
export const elevationSystem = {
  flat: 'shadow-none',
  raised: 'shadow-[0_2px_8px_rgba(43,27,46,0.06)]',
  floating: 'shadow-[0_8px_24px_rgba(43,27,46,0.12)]',
  overlay: 'shadow-[0_16px_48px_rgba(43,27,46,0.20)]',
} as const;

/**
 * MAPA DE CAPAS Z-INDEX — Control estricto de superposición
 */
export const zIndex = {
  dropdown: 50,
  sticky: 100,
  drawer: 500,
  modal: 1000,
  toast: 9999,
} as const;

/**
 * MATRIZ DE TEMAS DE LA INTERFAZ (UI Theme Matrix - Nocturno, Cálido, Océano)
 */
export const uiThemePresets = {
  default: {
    id: 'default',
    name: 'Editorial Warm (Cálido)',
    bgPanel: '#FAF7F0',
    bgCard: '#FFFFFF',
    textPrimary: '#2B1B2E',
    textSecondary: '#6B5B6E',
    border: '#EFE2C9',
  },
  dark: {
    id: 'dark',
    name: 'Cyber Dark (Modo Nocturno)',
    bgPanel: '#0F172A',
    bgCard: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    border: '#334155',
  },
  teal_ocean: {
    id: 'teal_ocean',
    name: 'Midnight Ocean (Océano Teal)',
    bgPanel: '#0D1F2D',
    bgCard: '#1D3557',
    textPrimary: '#F1FAEE',
    textSecondary: '#A8DADC',
  },
} as const;

export function getActiveUiTheme(themeId?: string) {
  if (themeId && themeId in uiThemePresets) {
    return uiThemePresets[themeId as keyof typeof uiThemePresets];
  }
  return uiThemePresets.default;
}

