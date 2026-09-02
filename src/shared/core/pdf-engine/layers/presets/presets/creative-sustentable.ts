import { Preset } from '../presetSchema';

export const creativeSustentablePreset: Preset = {
  id: 'creative-sustentable',
  name: 'Ecológico & Sustentable',
  pageCategory: 'documento',
  pageSizeId: 'a4',
  marginPresetId: 'documento_estandar',
  sectors: [
    { id: 'sidebar', role: 'sidebar', widthPercent: 32, widthMm: 77.2, order: 0 }, // +1cm exacto vs 32% en A4 (67.2mm), fijo en cualquier tamaño de hoja
    { id: 'main', role: 'main', widthPercent: 68, order: 1 },
  ],
  fixedObjects: [
    { id: 'foto-perfil', sectorId: 'sidebar', type: 'photo', anchor: 'top', heightPt: 130 },
  ],
  sectionOrder: [
    { sectorRole: 'sidebar', sectionIds: ['datos-personales', 'contacto', 'ecologia', 'competencias'] },
    { sectorRole: 'main', sectionIds: ['formacion', 'experiencia', 'profesion', 'cursos', 'firma'] },
  ],
  palette: {
    primary: '#1b4332',
    secondary: '#40916c',
    accent: '#52b788',
    text: '#111827',
    textOnPrimary: '#ffffff',
    background: '#ffffff',
  },
  typography: {
    title: 20,
    sectionHeading: 10.5,
    itemTitle: 10.5,
    body: 9.5,
    caption: 8.5,
    fontFamily: 'Helvetica',
    lineHeightBody: 1.3,
    lineHeightHeading: 1.2,
    cover: {
      badge: 9.5,
      title: 12,
      name: 28,
      role: 10,
      quote: 11,
      footerMain: 10.5,
      footerSub: 9
    }
  },
  coverStyle: 'creative-cardon',
  recordCardDesigns: {
    education: 'accent-card',
    experience: 'primary-card',
    course: 'neutral-card',
  },
  decorativeElementPolicy: {
    cardBorders: true,
    sectionDividers: true,
    backgroundShapes: true,
    shadowEffects: false,
    cornerOrnaments: 'organic-leaf',
    watermarkType: 'ecologia',
    headerIconStyle: 'filled'
  },
  roleLegend: {
    'Fondo de columna lateral / Sidebar': 'primary (#1b4332)',
    'Títulos de sección principal': 'secondary (#40916c)',
    'Acentos de proyectos y badges': 'accent (#52b788)',
    'Cuerpo de texto general': 'text (#111827)',
  },
};
