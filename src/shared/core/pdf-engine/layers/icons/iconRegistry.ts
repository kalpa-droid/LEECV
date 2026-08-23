/**
 * NÚCLEO — REGISTRO DE ÍCONOS SVG UNIVERSALES (iconRegistry.ts)
 *
 * Proporciona trazados vectoriales SVG limpios compartidos entre el
 * DOM del navegador (dock del editor, vistas) y el motor PDF (@react-pdf/renderer).
 */

export interface IconDefinition {
  id: string;
  viewBox: string;
  paths: string[];
}

export const ICON_REGISTRY: Record<string, IconDefinition> = {
  personales: {
    id: 'personales',
    viewBox: '0 0 24 24',
    paths: [
      'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2',
      'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'
    ]
  },
  redes: {
    id: 'redes',
    viewBox: '0 0 24 24',
    paths: [
      'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      'M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      'M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      'M8.59 13.51l6.83 3.98',
      'M15.41 6.51L8.59 10.49'
    ]
  },
  contacto: {
    id: 'contacto',
    viewBox: '0 0 24 24',
    paths: [
      'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'
    ]
  },
  formacion: {
    id: 'formacion',
    viewBox: '0 0 24 24',
    paths: [
      'M22 10v6M2 10l10-5 10 5-10 5z',
      'M6 12v5c3 3 9 3 12 0v-5'
    ]
  },
  profesion: {
    id: 'profesion',
    viewBox: '0 0 24 24',
    paths: [
      'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
      'M2 18h20',
      'M6 10h12',
      'M6 14h12'
    ]
  },
  experiencia: {
    id: 'experiencia',
    viewBox: '0 0 24 24',
    paths: [
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      'M14 2v6h6',
      'M16 13H8',
      'M16 17H8'
    ]
  },
  cursos: {
    id: 'cursos',
    viewBox: '0 0 24 24',
    paths: [
      'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20'
    ]
  },
  informatica: {
    id: 'informatica',
    viewBox: '0 0 24 24',
    paths: [
      'M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0l1.2 2.4A1 1 0 0 1 20.3 20H3.7a1 1 0 0 1-.9-1.6L4 16'
    ]
  },
  ecologia: {
    id: 'ecologia',
    viewBox: '0 0 24 24',
    paths: [
      'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 7a9 9 0 0 1-10 11z',
      'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'
    ]
  },
  certificados: {
    id: 'certificados',
    viewBox: '0 0 24 24',
    paths: [
      'M12 15l-3.5 2 1-4-3-2.5 4-.5L12 6l1.5 4 4 .5-3 2.5 1 4z',
      'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z'
    ]
  },
  firma: {
    id: 'firma',
    viewBox: '0 0 24 24',
    paths: [
      'M12 19l7-7 3 3-7 7-3-3z',
      'M18 13l-1.5-7.5L2 2l3.5 14.5L13 18'
    ]
  },
  frase: {
    id: 'frase',
    viewBox: '0 0 24 24',
    paths: [
      'M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3c0 4-3 6-4 6z',
      'M14 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3c0 4-3 6-4 6z'
    ]
  },
  competencias: {
    id: 'competencias',
    viewBox: '0 0 24 24',
    paths: [
      'M12 2L2 7l10 5 10-5-10-5z',
      'M2 17l10 5 10-5',
      'M2 12l10 5 10-5'
    ]
  },
  publicaciones: {
    id: 'publicaciones',
    viewBox: '0 0 24 24',
    paths: [
      'M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
      'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
      'M9 7h6',
      'M9 11h6'
    ]
  },
  referencias: {
    id: 'referencias',
    viewBox: '0 0 24 24',
    paths: [
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
      'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
      'M22 21v-2a4 4 0 0 0-3-3.87',
      'M16 3.13a4 4 0 0 1 0 7.75'
    ]
  },
  idiomas: {
    id: 'idiomas',
    viewBox: '0 0 24 24',
    paths: [
      'M5 8l6 6',
      'M4 14e6 6 0 0 1 6-6h12',
      'M2 5h12',
      'M7 2h1',
      'M22 22l-5-10-5 10',
      'M14 18h6'
    ]
  },
  voluntariado: {
    id: 'voluntariado',
    viewBox: '0 0 24 24',
    paths: [
      'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'
    ]
  },
  premios: {
    id: 'premios',
    viewBox: '0 0 24 24',
    paths: [
      'M6 9H4.5a2.5 2.5 0 0 1 0-5H6',
      'M18 9h1.5a2.5 2.5 0 0 0 0-5H18',
      'M4 22h16',
      'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22',
      'M14 14.66V17c0 .55.47.98.97 1.21 1.18.54 2.03 2.03 2.03 3.79',
      'M18 2H6v7a6 6 0 0 0 12 0V2z'
    ]
  },
  patentes: {
    id: 'patentes',
    viewBox: '0 0 24 24',
    paths: [
      'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'
    ]
  },
  ponencias: {
    id: 'ponencias',
    viewBox: '0 0 24 24',
    paths: [
      'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z',
      'M19 10v2a7 7 0 0 1-14 0v-2',
      'M12 19v3',
      'M8 22h8'
    ]
  },
  custom: {
    id: 'custom',
    viewBox: '0 0 24 24',
    paths: [
      'M12 5v14M5 12h14'
    ]
  }
};

export function getIcon(id: string): IconDefinition {
  return ICON_REGISTRY[id] || ICON_REGISTRY['custom'];
}
