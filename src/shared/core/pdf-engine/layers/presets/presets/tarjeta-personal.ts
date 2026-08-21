import { Preset } from '../presetSchema';

export const tarjetaPersonalPreset: Preset = {
  id: 'tarjeta-personal',
  name: 'Tarjeta Personal',
  pageCategory: 'tarjeta',
  pageSizeId: 'tarjeta_estandar',
  marginPresetId: 'tarjeta_ajustada',
  sectors: [
    { id: 'unico', role: 'main', widthPercent: 100, order: 0 },
  ],
  fixedObjects: [
    { id: 'linea-decorativa', sectorId: 'unico', type: 'decorative-line', anchor: 'bottom', heightPt: 4 },
  ],
  sectionOrder: [
    { sectorRole: 'main', sectionIds: ['nombre-y-cargo', 'contacto'] },
  ],
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
  },
};
