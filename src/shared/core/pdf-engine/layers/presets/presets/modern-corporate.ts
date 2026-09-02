import { Preset } from '../presetSchema';

// Contraste verificado: #0f2942 (fondo sidebar) vs #ffffff (texto) ≈ 13.5:1 — muy por
// encima del mínimo AA (4.5:1). #c9a227 (acento) vs #0f2942 (texto sobre fondo claro)
// se usa solo para acentos puntuales (badges, iconos), no como texto de cuerpo.
export const modernCorporatePreset: Preset = {
  id: 'modern-corporate',
  name: 'Corporativo Moderno',
  pageCategory: 'documento',
  pageSizeId: 'a4',
  marginPresetId: 'documento_estandar',
  sectors: [
    { id: 'sidebar', role: 'sidebar', widthPercent: 36, widthMm: 85.6, order: 0 }, // +1cm exacto vs 36% en A4 (75.6mm), fijo en cualquier tamaño de hoja
    { id: 'main', role: 'main', widthPercent: 64, order: 1 },
  ],
  fixedObjects: [
    { id: 'foto-perfil', sectorId: 'sidebar', type: 'photo', anchor: 'top', heightPt: 140 },
  ],
  sectionOrder: [
    { sectorRole: 'sidebar', sectionIds: ['datos-personales', 'contacto', 'competencias', 'informatica'] },
    { sectorRole: 'main', sectionIds: ['resumen', 'experiencia', 'formacion', 'cursos', 'firma'] },
  ],
  palette: {
    primary: '#0f2942',
    secondary: '#5b7186',
    accent: '#c9a227',
    text: '#1a1a1a',
    textOnPrimary: '#ffffff',
    background: '#ffffff',
  },
  typography: {
    title: 19, sectionHeading: 10.5, itemTitle: 10.5, body: 9.5, caption: 9,
    fontFamily: 'Helvetica',
    lineHeightBody: 1.3,
    lineHeightHeading: 1.2,
    cover: {
      badge: 9.5,
      title: 12,
      name: 28,
      role: 9.5,
      quote: 11,
      footerMain: 10.5,
      footerSub: 9
    }
  },
  coverStyle: 'modern-corporate',
  recordCardDesigns: {
    education: 'primary-card',
    experience: 'accent-card',
    course: 'neutral-card',
  },
  roleLegend: {
    'Fondo de columna lateral / Sidebar': 'primary (#0f2942)',
    'Títulos de sección principal': 'primary (#0f2942)',
    'Subtítulos e instituciones / acentos': 'accent (#c9a227)',
    'Cuerpo de texto general': 'text (#1a1a1a)',
  },
};
