import { Preset } from '../presetSchema';

export const plannerPersonalPreset: Preset = {
  id: 'planner-personal',
  name: 'Agenda Personal',
  pageCategory: 'planner',
  pageSizeId: 'a5',
  marginPresetId: 'margin-standard',
  sectors: [],
  fixedObjects: [],
  sectionOrder: [],
  palette: {
    primary: '#059669',
    secondary: '#10B981',
    accent: '#047857',
    text: '#111827',
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
