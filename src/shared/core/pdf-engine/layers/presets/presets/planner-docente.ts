import { Preset } from '../presetSchema';

export const plannerDocentePreset: Preset = {
  id: 'planner-docente',
  name: 'Agenda Docente',
  pageCategory: 'planner',
  pageSizeId: 'a4',
  marginPresetId: 'margin-standard',
  sectors: [],
  fixedObjects: [],
  sectionOrder: [],
  palette: {
    primary: '#2563EB',
    secondary: '#3B82F6',
    accent: '#1D4ED8',
    text: '#1E293B',
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
