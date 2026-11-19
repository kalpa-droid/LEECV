export interface FacturadorStepItem {
  id: string;
  stepNumber: number;
  label: string;
  shortLabel: string;
  description: string;
  /** Nombre del ícono en ICON_REGISTRY (se resuelve en el Dock). */
  iconId: string;
}

/**
 * Secuencia del Dock lateral de FacturLee.
 * El orden es el recorrido real de facturación: emisor → comprobante → ítems
 * → catálogo → clientes → historial → diseño → respaldo.
 */
export const FACTURADOR_STEP_SEQUENCE: FacturadorStepItem[] = [
  {
    id: 'fact_emisor',
    stepNumber: 1,
    label: '1. Negocio y Logos',
    shortLabel: 'Negocio',
    description: 'Tus datos fiscales y el logo',
    iconId: 'fact_emisor',
  },
  {
    id: 'fact_comprobante',
    stepNumber: 2,
    label: '2. Comprobante',
    shortLabel: 'Comprobante',
    description: 'Letra, número, cliente y fecha',
    iconId: 'fact_comprobante',
  },
  {
    id: 'fact_items',
    stepNumber: 3,
    label: '3. Ítems y Precios',
    shortLabel: 'Ítems',
    description: 'Qué estás cobrando',
    iconId: 'fact_items',
  },
  {
    id: 'fact_catalogo',
    stepNumber: 4,
    label: '4. Catálogo y Stock',
    shortLabel: 'Catálogo',
    description: 'Productos, precios y mayorista',
    iconId: 'fact_catalogo',
  },
  {
    id: 'fact_clientes',
    stepNumber: 5,
    label: '5. Clientes',
    shortLabel: 'Clientes',
    description: 'Tu cartera de clientes',
    iconId: 'fact_clientes',
  },
  {
    id: 'fact_historial',
    stepNumber: 6,
    label: '6. Historial y Cobranzas',
    shortLabel: 'Historial',
    description: 'Comprobantes emitidos y cobros',
    iconId: 'fact_historial',
  },
  {
    id: 'fact_diseno',
    stepNumber: 7,
    label: '7. Diseño y Hoja',
    shortLabel: 'Diseño',
    description: 'Estilo del comprobante y la hoja del PDF',
    iconId: 'fact_diseno',
  },
  {
    id: 'fact_respaldo',
    stepNumber: 8,
    label: '8. Bóveda y Pendrive',
    shortLabel: 'Bóveda',
    description: 'Respaldo, clave y bloqueo',
    iconId: 'fact_respaldo',
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
