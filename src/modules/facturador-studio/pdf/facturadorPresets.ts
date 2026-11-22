import { Preset } from '../../../shared/core/pdf-engine/layers/presets/presetSchema';
import { registerPresetInMemory } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';

/**
 * CAPA 5 — PRESETS DE FACTURLEE
 *
 * Un comprobante nuevo NO es un renderer nuevo: es otro Preset que consume el
 * mismo motor PDF. `pageCategory: 'factura'` hace que `getAllPresets()` (que
 * filtra 'documento') nunca mezcle plantillas de factura con plantillas de CV.
 *
 * Paletas pensadas para impresión monocromática en impresora de casa: el
 * contraste se sostiene aunque se imprima en blanco y negro.
 */

export const FACTURA_PRESET_CLASICO = 'fact-clasico-fiscal';
export const FACTURA_PRESET_MODERNO = 'fact-moderno';
export const FACTURA_PRESET_COMPACTO = 'fact-compacto';

export const INVOICE_PRESETS: Preset[] = [
  {
    id: FACTURA_PRESET_CLASICO,
    name: 'Clásico fiscal',
    pageCategory: 'factura',
    pageSizeId: 'a4',
    marginPresetId: 'margin-standard',
    sectors: [],
    fixedObjects: [],
    sectionOrder: [],
    palette: {
      primary: '#1E293B',
      secondary: '#475569',
      accent: '#0F172A',
      text: '#0F172A',
      textOnPrimary: '#FFFFFF',
      background: '#FFFFFF',
    },
    typography: {
      title: 18,
      sectionHeading: 10,
      itemTitle: 9,
      body: 8.5,
      caption: 7,
      fontFamily: 'Helvetica',
      lineHeightBody: 1.35,
      lineHeightHeading: 1.2,
    },
  },
  {
    id: FACTURA_PRESET_MODERNO,
    name: 'Moderno',
    pageCategory: 'factura',
    pageSizeId: 'a4',
    marginPresetId: 'margin-standard',
    sectors: [],
    fixedObjects: [],
    sectionOrder: [],
    palette: {
      primary: '#0F766E',
      secondary: '#0D9488',
      accent: '#115E59',
      text: '#134E4A',
      textOnPrimary: '#FFFFFF',
      background: '#FFFFFF',
    },
    typography: {
      title: 18,
      sectionHeading: 10,
      itemTitle: 9,
      body: 8.5,
      caption: 7,
      fontFamily: 'Helvetica',
      lineHeightBody: 1.35,
      lineHeightHeading: 1.2,
    },
  },
  {
    id: FACTURA_PRESET_COMPACTO,
    name: 'Compacto (ahorra papel)',
    pageCategory: 'factura',
    pageSizeId: 'a5',
    marginPresetId: 'margin-standard',
    sectors: [],
    fixedObjects: [],
    sectionOrder: [],
    palette: {
      primary: '#111827',
      secondary: '#374151',
      accent: '#111827',
      text: '#111827',
      textOnPrimary: '#FFFFFF',
      background: '#FFFFFF',
    },
    typography: {
      title: 15,
      sectionHeading: 9,
      itemTitle: 8,
      body: 7.5,
      caption: 6.5,
      fontFamily: 'Helvetica',
      lineHeightBody: 1.28,
      lineHeightHeading: 1.15,
    },
    typographyOverrides: { densityMode: 'compact' },
  },
];

export const INVOICE_PRESET_IDS = INVOICE_PRESETS.map((preset) => preset.id);

export function getInvoicePreset(id: string): Preset {
  return INVOICE_PRESETS.find((preset) => preset.id === id) || INVOICE_PRESETS[0];
}

INVOICE_PRESETS.forEach((p) => registerPresetInMemory(p));
