import { Preset } from '../presetSchema';

export const cvClasicoPreset: Preset = {
  id: 'cv-clasico',
  name: 'CV Clásico (sidebar + columna principal)',
  pageCategory: 'documento',
  pageSizeId: 'a4',
  marginPresetId: 'documento_estandar',
  sectors: [
    { id: 'sidebar', role: 'sidebar', widthPercent: 32, order: 0 },
    { id: 'main', role: 'main', widthPercent: 68, order: 1 },
  ],
  fixedObjects: [
    { id: 'foto-perfil', sectorId: 'sidebar', type: 'photo', anchor: 'top', heightPt: 130 },
  ],
  sectionOrder: [
    { sectorRole: 'sidebar', sectionIds: ['contacto', 'datos-personales', 'frase', 'competencias', 'informatica'] },
    { sectorRole: 'main', sectionIds: ['formacion', 'experiencia', 'cursos', 'firma'] },
  ],
  palette: {
    primary: '#ab5ba1',
    secondary: '#888888',
    accent: '#40a08e',
    text: '#333333',
    textOnPrimary: '#ffffff',
  },
  typography: {
    title: 18, sectionHeading: 10, itemTitle: 10.5, body: 9.5, caption: 9,
    fontFamily: 'Helvetica',
    lineHeightBody: 1.3,
    lineHeightHeading: 1.2,
    cover: {
      badge: 9,
      title: 26,
      name: 20,
      role: 9,
      quote: 10.5,
      footerMain: 10,
      footerSub: 8.5
    }
  },
  coverStyle: 'monica-classic',
  recordCardDesigns: {
    education: 'primary-card',
    experience: 'primary-card',
    course: 'primary-card',
  },
  roleLegend: {
    'Fondo de columna lateral / Sidebar': 'primary (#ab5ba1)',
    'Títulos de sección principal': 'accent (#40a08e)',
    'Subtítulos e instituciones': 'secondary (#888888)',
    'Cuerpo de texto general': 'text (#333333)',
  },
};
