/**
 * panelPresets.js
 * Single source of truth for predefined section column layout presets.
 */

export const panelPresets = [
  {
    id: 'docente-tradicional',
    name: '🎓 Docente Tradicional',
    description: 'Formatos académicos con historial en columna principal y contacto/títulos en secundaria',
    primarySections: ['profesion', 'experiencia', 'cursos'],
    secondarySections: ['contacto', 'formacion', 'informatica', 'ecologia', 'certificados'],
    bothSections: []
  },
  {
    id: 'ejecutivo-corporativo',
    name: '💼 Ejecutivo & Corporativo',
    description: 'Destaca la experiencia profesional al centro con habilidades técnicas en el lateral',
    primarySections: ['experiencia', 'profesion', 'cursos'],
    secondarySections: ['contacto', 'informatica', 'formacion'],
    bothSections: ['ecologia']
  },
  {
    id: 'tecnico-tecnologico',
    name: '💻 Técnico & Tecnológico',
    description: 'Enfocado en proyectos, herramientas informáticas y certificaciones',
    primarySections: ['profesion', 'cursos', 'ecologia'],
    secondarySections: ['contacto', 'informatica', 'formacion', 'certificados'],
    bothSections: []
  },
  {
    id: 'investigacion-rural',
    name: '🌱 Investigación & Proyectos',
    description: 'Prioridad total a proyectos de investigación y certificaciones comprobatorias',
    primarySections: ['ecologia', 'profesion', 'certificados'],
    secondarySections: ['contacto', 'formacion', 'informatica'],
    bothSections: ['cursos']
  }
];
