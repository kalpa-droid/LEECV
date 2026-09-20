import { Preset } from '../presetSchema';

export const plannerEmprendedorPreset: Preset = {
  id: 'planner-emprendedor',
  name: 'Agenda Emprendedor',
  pageCategory: 'planner',
  pageSizeId: 'a5',
  marginPresetId: 'margin-standard',
  sectors: [],
  fixedObjects: [],
  sectionOrder: [],
  palette: {
    primary: '#7C3AED',
    secondary: '#8B5CF6',
    accent: '#6D28D9',
    text: '#1F2937',
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
