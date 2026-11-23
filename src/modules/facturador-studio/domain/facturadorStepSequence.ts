export interface FacturadorStepItem {
  id: string;
  stepNumber: number;
  label: string;
  shortLabel: string;
  description: string;
  /** Nombre del ícono en ICON_REGISTRY (se resuelve en el Dock). */
  iconId: string;
  /** True si vive en la Barra Superior (píldoras globales) en vez del Dock lateral. */
  hideFromDock?: boolean;
}

/**
 * Secuencia de pasos de FacturLee.
 * El Dock lateral prioriza la operación diaria (Ítems → Historial) seguida de
 * los maestros (Catálogo → Clientes) y configuración/bóveda (Diseño → Bóveda).
 * Emisor ("Tu negocio") y Comprobante ("Tipo y N°") viven como píldoras globales en TopBar.
 */
export const FACTURADOR_STEP_SEQUENCE: FacturadorStepItem[] = [
  {
    id: 'fact_items',
    stepNumber: 1,
    label: '1. Ítems y Precios',
    shortLabel: 'Ítems',
    description: 'Qué estás cobrando',
    iconId: 'fact_items',
  },
  {
    id: 'fact_historial',
    stepNumber: 2,
    label: '2. Historial y Cobranzas',
    shortLabel: 'Historial',
    description: 'Comprobantes emitidos y reimpresión',
    iconId: 'fact_historial',
  },
  {
    id: 'fact_catalogo',
    stepNumber: 3,
    label: '3. Catálogo y Stock',
    shortLabel: 'Catálogo',
    description: 'Productos, precios y mayorista',
    iconId: 'fact_catalogo',
  },
  {
    id: 'fact_clientes',
    stepNumber: 4,
    label: '4. Cartera de Clientes',
    shortLabel: 'Clientes',
    description: 'Tu cartera de clientes',
    iconId: 'fact_clientes',
  },
  {
    id: 'fact_diseno',
    stepNumber: 5,
    label: '5. Diseño y Hoja',
    shortLabel: 'Diseño',
    description: 'Estilo del comprobante y la hoja del PDF',
    iconId: 'fact_diseno',
  },
  {
    id: 'fact_respaldo',
    stepNumber: 6,
    label: '6. Bóveda y Pendrive',
    shortLabel: 'Bóveda',
    description: 'Respaldo, clave y bloqueo',
    iconId: 'fact_respaldo',
  },
  {
    id: 'fact_emisor',
    stepNumber: 7,
    label: 'Tu Negocio y Logos',
    shortLabel: 'Negocio',
    description: 'Tus datos fiscales y el logo',
    iconId: 'fact_emisor',
    hideFromDock: true,
  },
  {
    id: 'fact_comprobante',
    stepNumber: 8,
    label: 'Tipo y Numeración',
    shortLabel: 'Comprobante',
    description: 'Letra, número, cliente y fecha',
    iconId: 'fact_comprobante',
    hideFromDock: true,
  },
];

export const getFacturadorStepById = (id: string): FacturadorStepItem | undefined =>
  FACTURADOR_STEP_SEQUENCE.find((step) => step.id === id);

export const getNextFacturadorStepId = (currentId: string): string => {
  const idx = FACTURADOR_STEP_SEQUENCE.findIndex((step) => step.id === currentId);
  return idx >= 0 && idx < FACTURADOR_STEP_SEQUENCE.length - 1
    ? FACTURADOR_STEP_SEQUENCE[idx + 1].id
    : currentId;
};

export const getPrevFacturadorStepId = (currentId: string): string => {
  const idx = FACTURADOR_STEP_SEQUENCE.findIndex((step) => step.id === currentId);
  return idx > 0 ? FACTURADOR_STEP_SEQUENCE[idx - 1].id : currentId;
};
