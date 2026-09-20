import { Preset } from '../presetSchema';

export const plannerEjecutivoPreset: Preset = {
  id: 'planner-ejecutivo',
  name: 'Agenda Ejecutiva',
  pageCategory: 'planner',
  pageSizeId: 'b5',
  marginPresetId: 'margin-standard',
  sectors: [],
  fixedObjects: [],
  sectionOrder: [],
  palette: {
    primary: '#0F172A',
    secondary: '#334155',
    accent: '#1E293B',
    text: '#0F172A',
    textOnPrimary: '#FFFFFF',
    background: '#FAFAFA'
  },
  typography: {
    title: 24,
    sectionHeading: 14,
    itemTitle: 12,
    body: 10,
    caption: 8,
    fontFamily: 'Helvetica',
    lineHeightBody: 1.5,
    lineHeightHeading: 1.2
  }
};
