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
      'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z',
      'M8.8 13.4L6.5 21l5.5-3 5.5 3-2.3-7.6'
    ]
  },
  experiencia: {
    id: 'experiencia',
    viewBox: '0 0 24 24',
    paths: [
      'M4 8h16a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1z',
      'M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2',
      'M3 13.5h18'
    ]
  },
  cursos: {
    id: 'cursos',
    viewBox: '0 0 24 24',
    paths: [
      'M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z',
      'M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z'
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
  portada: {
    id: 'portada',
    viewBox: '0 0 24 24',
    paths: [
      'M12 2L2 7l10 5 10-5-10-5z',
      'M2 17l10 5 10-5',
      'M2 12l10 5 10-5'
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
  resumen: {
    id: 'resumen',
    viewBox: '0 0 24 24',
    paths: [
      'M4 6h16',
      'M4 10h16',
      'M4 14h10',
      'M4 18h7'
    ]
  },
  proyectos: {
    id: 'proyectos',
    viewBox: '0 0 24 24',
    paths: [
      'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
      'M12 11v6',
      'M9 14h6'
    ]
  },
  habilidades: {
    id: 'habilidades',
    viewBox: '0 0 24 24',
    paths: [
      'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'
    ]
  },
  competencias: {
    id: 'competencias',
    viewBox: '0 0 24 24',
    paths: [
      'M5 6h4',
      'M5 12h8',
      'M5 18h12',
      'M13 6h.01',
      'M17 12h.01',
      'M21 18h.01'
    ]
  },
  publicaciones: {
    id: 'publicaciones',
    viewBox: '0 0 24 24',
    paths: [
      'M3 8h13v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      'M16 11h3a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-3',
      'M6.5 12h6',
      'M6.5 15.5h6'
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
      'M4 14l6-6 2-3',
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
  'social-professional': {
    id: 'social-professional',
    viewBox: '0 0 24 24',
    paths: [
      'M4 7h16v13H4z',
      'M9 7V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3'
    ]
  },
  'social-code': {
    id: 'social-code',
    viewBox: '0 0 24 24',
    paths: [
      'M8 6L2 12l6 6',
      'M16 6l6 6-6 6'
    ]
  },
  'social-email': {
    id: 'social-email',
    viewBox: '0 0 24 24',
    paths: [
      'M4 4h16v16H4z',
      'M4 4l8 8 8-8'
    ]
  },
  'social-web': {
    id: 'social-web',
    viewBox: '0 0 24 24',
    paths: [
      'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
      'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'
    ]
  },
  objetivo: {
    id: 'objetivo',
    viewBox: '0 0 24 24',
    paths: [
      'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
      'M15.5 8.5l-2 5-5 2 2-5z'
    ]
  },
  logros: {
    id: 'logros',
    viewBox: '0 0 24 24',
    paths: [
      'M5 21V4',
      'M5 5h12l-2.5 4L17 13H5'
    ]
  },
  portafolio: {
    id: 'portafolio',
    viewBox: '0 0 24 24',
    paths: [
      'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      'M8 12.5h.01',
      'M12 12.5h.01',
      'M16 12.5h.01',
      'M8 16.5h.01',
      'M12 16.5h.01',
      'M16 16.5h.01'
    ]
  },
  card_size: {
    id: 'card_size',
    viewBox: '0 0 24 24',
    paths: [
      'M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3'
    ]
  },
  card_extract: {
    id: 'card_extract',
    viewBox: '0 0 24 24',
    paths: [
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      'M12 12v6',
      'M9 15l3-3 3 3'
    ]
  },
  card_logo: {
    id: 'card_logo',
    viewBox: '0 0 24 24',
    paths: [
      'M3 6h18v12H3z',
      'M8.5 10.5a1.5 1.5 0 1 0 0-.01z',
      'M4 17l4.5-4.5L12 15.5 15 12.5 20 17'
    ]
  },
  card_front: {
    id: 'card_front',
    viewBox: '0 0 24 24',
    paths: [
      'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      'M8.5 14.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5z',
      'M13 10h4',
      'M13 13.5h4',
      'M13 17h2.5'
    ]
  },
  card_back: {
    id: 'card_back',
    viewBox: '0 0 24 24',
    paths: [
      'M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z',
      'M2 9.5h20',
      'M5.5 15.5c1.2-1.8 2.3 1.8 3.5 0s2.3 1.8 3.5 0',
      'M15.5 15.5h3.5'
    ]
  },
  card_qr: {
    id: 'card_qr',
    viewBox: '0 0 24 24',
    paths: [
      'M3 3h6v6H3z', 'M15 3h6v6h-6z', 'M3 15h6v6H3z',
      'M14 14h3v3h-3z', 'M19 14h2v2h-2z', 'M14 19h2v2h-2z', 'M17 17h4v4h-4z'
    ]
  },
  fallback: {
    id: 'fallback',
    viewBox: '0 0 24 24',
    paths: [
      'M12 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0'
    ]
  },
  'datos-personales': {
    id: 'datos-personales',
    viewBox: '0 0 24 24',
    paths: [
      'M9 2h6v3H9z',
      'M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2',
      'M12 17a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
      'M9 20.5c.5-1.4 1.6-2.1 3-2.1s2.5.7 3 2.1'
    ]
  },
  'personalizada-1': {
    id: 'personalizada-1',
    viewBox: '0 0 24 24',
    paths: [
      'M12 3l7 9-7 9-7-9z',
      'M12 11h.01'
    ]
  },
  'personalizada-2': {
    id: 'personalizada-2',
    viewBox: '0 0 24 24',
    paths: [
      'M12 4L21 20H3z',
      'M12 10v4',
      'M12 17h.01'
    ]
  },
  'personalizada-3': {
    id: 'personalizada-3',
    viewBox: '0 0 24 24',
    paths: [
      'M12 2.5l8 4.6v9.8l-8 4.6-8-4.6V7.1z',
      'M12 8v8',
      'M8.5 10l7 4',
      'M15.5 10l-7 4'
    ]
  },
  'personalizada-4': {
    id: 'personalizada-4',
    viewBox: '0 0 24 24',
    paths: [
      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
      'M7 12h3l2-3 2 5 1.5-2H17'
    ]
  },
  'personalizada-5': {
    id: 'personalizada-5',
    viewBox: '0 0 24 24',
    paths: [
      'M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z'
    ]
  },
  carta: {
    id: 'carta',
    viewBox: '0 0 24 24',
    paths: [
      'M4 2h16v20H4z',
      'M8 7h5',
      'M8 11h8',
      'M8 15h8',
      'M8 19h4'
    ]
  },
  importar: {
    id: 'importar',
    viewBox: '0 0 24 24',
    paths: [
      'M12 3v12',
      'M7 10l5 5 5-5',
      'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2'
    ]
  },
  exportar: {
    id: 'exportar',
    viewBox: '0 0 24 24',
    paths: [
      'M12 21V9',
      'M7 14l5-5 5 5',
      'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2'
    ]
  },
  vacante: {
    id: 'vacante',
    viewBox: '0 0 24 24',
    paths: [
      'M12 12L19 5',
      'M12 3a9 9 0 0 1 9 9',
      'M12 7a5 5 0 0 1 5 5',
      'M12 12h.01'
    ]
  },
  cv: {
    id: 'cv',
    viewBox: '0 0 24 24',
    paths: [
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      'M14 2v6h6',
      'M9.25 13.25a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5z',
      'M7.5 17.5c.3-1.4 1-2 1.75-2s1.45.6 1.75 2',
      'M13.5 11h4.5',
      'M13.5 14.5h4.5',
      'M13.5 18h3'
    ]
  },
  tarjeta: {
    id: 'tarjeta',
    viewBox: '0 0 24 24',
    paths: [
      'M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z',
      'M6 9h4v3H6z',
      'M12 10.5h6',
      'M12 14h6'
    ]
  },
  libro: {
    id: 'libro',
    viewBox: '0 0 24 24',
    paths: [
      'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20'
    ]
  },
  agenda: {
    id: 'agenda',
    viewBox: '0 0 24 24',
    paths: [
      'M8 2v4',
      'M16 2v4',
      'M3 10h18',
      'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'
    ]
  },
  ia: {
    id: 'ia',
    viewBox: '0 0 24 24',
    paths: [
      'M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z',
      'M19.5 4.5h.01',
      'M4.5 19.5h.01'
    ]
  },
  preview: {
    id: 'preview',
    viewBox: '0 0 24 24',
    paths: [
      'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z',
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'
    ]
  },
  guardar: {
    id: 'guardar',
    viewBox: '0 0 24 24',
    paths: [
      'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z',
      'M17 21v-8H7v8',
      'M7 3v5h8'
    ]
  },
  ats: {
    id: 'ats',
    viewBox: '0 0 24 24',
    paths: [
      'M3 8V5a2 2 0 0 1 2-2h3',
      'M16 3h3a2 2 0 0 1 2 2v3',
      'M21 16v3a2 2 0 0 1-2 2h-3',
      'M8 21H5a2 2 0 0 1-2-2v-3',
      'M7 10h10',
      'M7 13.5h7',
      'M7 17h4'
    ]
  },
  diseno: {
    id: 'diseno',
    viewBox: '0 0 24 24',
    paths: [
      'M3 3h18v7H3z',
      'M3 14h8v7H3z',
      'M15 14h6v7h-6z'
    ]
  },
  custom: {
    id: 'custom',
    viewBox: '0 0 24 24',
    paths: [
      'M4 4h16v16H4z',
      'M9 9h6v6H9z'
    ]
  }
};

export function getIcon(id: string): IconDefinition {
  return ICON_REGISTRY[id] || ICON_REGISTRY['fallback'] || ICON_REGISTRY['custom'];
}
