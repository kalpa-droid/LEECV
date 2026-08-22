import { Preset } from '../presetSchema';

export const tarjetaPersonalPreset: Preset = {
  id: 'tarjeta-personal',
  name: 'Tarjeta Personal',
  pageCategory: 'tarjeta',
  // pageSizeId = tamaño de CORTE final (lo que el cliente recibe después de la guillotina).
  // El sangrado (capa 6) agranda esto hacia afuera solo para imprimir, sin que el usuario
  // tenga que pensar en milímetros de más.
  pageSizeId: 'tarjeta_estandar',
  marginPresetId: 'tarjeta_ajustada',

  // ===== FRENTE =====
  sectors: [
    { id: 'unico', role: 'main', widthPercent: 100, order: 0 },
  ],
  fixedObjects: [
    { id: 'linea-decorativa', sectorId: 'unico', type: 'decorative-line', anchor: 'bottom', heightPt: 4 },
  ],
  sectionOrder: [
    { sectorRole: 'main', sectionIds: ['nombre-y-cargo', 'contacto'] },
  ],

  // ===== DORSO =====
  // Mismo sector único, pero con su propio contenido — logo/marca + eslogan corto.
  // Comparte paleta y tipografía con el frente: es la otra cara del mismo objeto.
  back: {
    sectors: [
      { id: 'unico', role: 'main', widthPercent: 100, order: 0 },
    ],
    fixedObjects: [],
    sectionOrder: [
      { sectorRole: 'main', sectionIds: ['marca-y-eslogan'] },
    ],
  },

  palette: {
    primary: '#1a1a2e',
    secondary: '#666666',
    accent: '#e94560',
    text: '#1a1a2e',
    textOnPrimary: '#ffffff',
  },
  typography: {
    title: 13, sectionHeading: 7, itemTitle: 8, body: 7.5, caption: 6.5,
    fontFamily: 'Helvetica',
    lineHeightBody: 1.2,
    lineHeightHeading: 1.15,
  },
  roleLegend: {
    'Fondo principal frente': 'background (#ffffff)',
    'Línea decorativa inferior': 'accent (#e94560)',
    'Nombre y títulos principales': 'primary (#1a1a2e)',
    'Teléfono, Email y Redes': 'secondary (#666666)',
    'Fondo completo del dorso': 'primary (#1a1a2e)',
    'Texto / Marca del dorso': 'textOnPrimary (#ffffff)',
  },

  // ===== IMPRESIÓN (capas 6/7/8) =====
  print: {
    bleedPresetId: 'estandar_tarjeta',
    impositionPresetId: 'impresora_oficina',
    defaultSheetPageSizeId: 'a4',
    duplexMode: 'eje_largo',
    showCropMarksAndBleed: true,
  },
};
