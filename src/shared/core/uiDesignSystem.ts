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
  primary: `bg-[${colorSystem.accent.base}] text-white hover:bg-[${colorSystem.accent.hover}] active:scale-[0.98]`,
  secondary: `bg-white border border-[${colorSystem.neutral.border}] text-[${colorSystem.neutral.textPrimary}] hover:border-[${colorSystem.neutral.borderStrong}] active:scale-[0.98]`,
  ghost: `bg-transparent text-[${colorSystem.neutral.textSecondary}] hover:text-[${colorSystem.neutral.textPrimary}]`,
  danger: `bg-[${colorSystem.status.danger.muted}] border border-[${colorSystem.status.danger.base}]/30 text-[${colorSystem.status.danger.text}] hover:bg-[${colorSystem.status.danger.muted}]`,
} as const;

/**
 * TARJETA SELECCIONABLE — el patrón de "elegir 1 de N presets". Mismo
 * componente para presets de color, tipografía, layout, tamaño de tarjeta.
 */
export const selectableCard = {
  base: 'rounded-[10px] p-3 text-left transition-all cursor-pointer border',
  selected: `border-2 border-[${colorSystem.accent.base}] bg-[${colorSystem.accent.muted}]`,
  unselected: `border-[${colorSystem.neutral.border}] bg-white hover:border-[${colorSystem.neutral.borderStrong}]`,
} as const;

/**
 * INPUT DE TEXTO / SELECT — un solo estado visual para los 3, foco idéntico
 * en todos así el usuario aprende una sola convención.
 */
export const input = {
  base: `w-full rounded-[10px] border border-[${colorSystem.neutral.border}] px-3 py-2.5 text-[13px] text-[${colorSystem.neutral.textPrimary}] bg-white outline-none transition-colors placeholder:text-[${colorSystem.neutral.textMuted}]`,
  focus: `focus:border-[${colorSystem.accent.base}] focus:ring-2 focus:ring-[${colorSystem.accent.muted}]`,
} as const;

/**
 * BADGE / PILL — SOLO usa colores de estado o el acento, nunca un color
 * inventado para una pestaña puntual.
 */
export const badge = {
  base: 'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
  accent: `bg-[${colorSystem.accent.muted}] text-[${colorSystem.accent.text}]`,
  success: `bg-[${colorSystem.status.success.muted}] text-[${colorSystem.status.success.text}]`,
  warning: `bg-[${colorSystem.status.warning.muted}] text-[${colorSystem.status.warning.text}]`,
  danger: `bg-[${colorSystem.status.danger.muted}] text-[${colorSystem.status.danger.text}]`,
  neutral: `bg-[${colorSystem.neutral.surfaceMuted}] text-[${colorSystem.neutral.textSecondary}]`,
} as const;

/**
 * PESTAÑA (tab de navegación superior) — activa vs. inactiva, sin
 * variantes intermedias.
 */
export const tab = {
  base: 'px-3 py-2 text-[12px] font-medium rounded-[8px] transition-colors cursor-pointer',
  active: `bg-[${colorSystem.accent.muted}] text-[${colorSystem.accent.text}]`,
  inactive: `text-[${colorSystem.neutral.textSecondary}] hover:bg-[${colorSystem.neutral.surfaceMuted}]`,
} as const;

/** Radios de esquina — 2 tamaños, nunca un valor suelto (rounded-xl vs rounded-2xl mezclados) */
export const radius = { control: '10px', card: '12px' } as const;
