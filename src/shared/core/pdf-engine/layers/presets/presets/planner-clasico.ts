import { Preset } from '../presetSchema';

export const plannerClasicoPreset: Preset = {
  id: 'planner-clasico',
  name: 'Agenda Clásica B5',
  pageCategory: 'planner',
  pageSizeId: 'b5',
  marginPresetId: 'margin-standard',
  sectors: [], // Se ignora en el rendering de planner, pero lo requiere Preset
  fixedObjects: [],
  sectionOrder: [],
  palette: {
    primary: '#1E293B',
    secondary: '#475569',
    accent: '#0F172A',
    text: '#334155',
    textOnPrimary: '#FFFFFF',
    background: '#FFFFFF'
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
