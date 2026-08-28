import { Preset } from '../presetSchema';

// Contraste verificado: #f4f1ec (fondo sidebar claro) vs #2b2b2b (texto) ≈ 13.9:1.
// #b5462f (acento terracota) vs #f4f1ec (fondo) ≈ 4.9:1 — sobre AA para texto normal.
export const minimalEditorialPreset: Preset = {
  id: 'minimal-editorial',
  name: 'Editorial Minimalista',
  pageCategory: 'documento',
  pageSizeId: 'a4',
  marginPresetId: 'documento_amplio',
  sectors: [
    { id: 'sidebar', role: 'sidebar', widthPercent: 28, order: 0 },
    { id: 'main', role: 'main', widthPercent: 72, order: 1 },
  ],
  fixedObjects: [
    { id: 'foto-perfil', sectorId: 'sidebar', type: 'photo', anchor: 'top', heightPt: 110 },
  ],
  sectionOrder: [
    { sectorRole: 'sidebar', sectionIds: ['contacto', 'datos-personales', 'competencias', 'informatica'] },
    { sectorRole: 'main', sectionIds: ['formacion', 'experiencia', 'cursos', 'firma'] },
  ],
  palette: {
    primary: '#f4f1ec',
    secondary: '#7a7a7a',
    accent: '#b5462f',
    text: '#2b2b2b',
    textOnPrimary: '#2b2b2b',
    background: '#ffffff',
  },
  typography: {
    title: 20, sectionHeading: 9.5, itemTitle: 10, body: 9, caption: 8.5,
    fontFamily: 'Times-Roman',
    lineHeightBody: 1.35,
    lineHeightHeading: 1.25,
    cover: {
      badge: 8.5,
      title: 27,
      name: 20,
      role: 9,
      quote: 10,
      footerMain: 9.5,
      footerSub: 8.5
    }
  },
  coverStyle: 'minimal-editorial',
  recordCardDesigns: {
    education: 'neutral-card',
    experience: 'neutral-card',
    course: 'neutral-card',
  },
  roleLegend: {
    'Fondo de columna lateral / Sidebar': 'primary (#f4f1ec, claro)',
    'Títulos de sección principal': 'accent (#b5462f)',
    'Subtítulos e instituciones': 'secondary (#7a7a7a)',
    'Cuerpo de texto general': 'text (#2b2b2b)',
  },
};
