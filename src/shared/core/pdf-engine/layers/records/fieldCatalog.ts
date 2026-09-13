/**
 * NÚCLEO — CATÁLOGO UNIVERSAL DE CAMPOS (fieldCatalog.ts)
 *
 * Fuente única de la verdad para todos los atributos de registros.
 * Elimina la duplicación de código en formularios, mapeos y renderizadores.
 */

export interface FieldDesignHint {
  sizeOverride?: 'title' | 'subtitle' | 'badge' | 'extra';
  colorOverride?: 'accent' | 'muted' | 'inherit';
  position?: 'inline-right' | 'inline-left' | 'own-line';
  weightOverride?: 'bold' | 'normal';
  styleOverride?: 'italic' | 'normal';
}

export interface FieldDefinition {
  id: string;
  label: string;
  pdfLabel?: string;
  labelOptions?: string[];
  placeholder: string;
  type: 'text' | 'textarea' | 'url' | 'select';
  options?: string[];
  pdfRole: 'title' | 'subtitle' | 'badge' | 'description' | 'extra';
  designHint: FieldDesignHint;
}

export const FIELD_CATALOG: Record<string, FieldDefinition> = {
  titlePrefix: {
    id: 'titlePrefix',
    label: 'Abreviatura / Título Honorífico',
    placeholder: 'Ej: Prof., Lic., Ing., Dr., Mgtr.',
    type: 'text',
    pdfRole: 'badge',
    designHint: {}
  },
  tituloOGrado: {
    id: 'tituloOGrado',
    label: 'Título / Grado / Nombre',
    placeholder: 'Ej: Profesorado de Ed. Secundaria en Lengua',
    type: 'text',
    pdfRole: 'title',
    designHint: {}
  },
  cargo: {
    id: 'cargo',
    label: 'Puesto / Cargo Desempeñado',
    placeholder: 'Ej: Docente Titular de Cátedra',
    type: 'text',
    pdfRole: 'title',
    designHint: {}
  },
  institucion: {
    id: 'institucion',
    label: 'Institución / Empresa / Ente Emisor',
    placeholder: 'Ej: Ministerio de Educación, Ciencia y Tecnología',
    type: 'text',
    pdfRole: 'subtitle',
    designHint: {}
  },
  nivel: {
    id: 'nivel',
    label: 'Nivel / Dominio',
    placeholder: 'Ej: Nivel Terciario / Superior, Avanzado (C1)',
    type: 'text',
    pdfRole: 'badge',
    designHint: { colorOverride: 'accent' }
  },
  estado: {
    id: 'estado',
    label: 'Estado Académico / Situación',
    placeholder: 'Ej: Graduado, En Curso (80% aprobado), Finalizado',
    type: 'text',
    pdfRole: 'badge',
    designHint: { colorOverride: 'accent' }
  },
  promedio: {
    id: 'promedio',
    label: 'Promedio / Distinción / Mérito',
    placeholder: 'Ej: Promedio: 9.45 / Summa Cum Laude',
    type: 'text',
    pdfRole: 'badge',
    designHint: {}
  },
  periodo: {
    id: 'periodo',
    label: 'Periodo / Año',
    placeholder: 'Ej: 2023 - 2026',
    type: 'text',
    pdfRole: 'badge',
    designHint: { colorOverride: 'accent', position: 'inline-right' }
  },
  cargaHoraria: {
    id: 'cargaHoraria',
    label: 'Carga Horaria',
    placeholder: 'Ej: 60 hs',
    type: 'text',
    pdfRole: 'badge',
    designHint: {}
  },
  modalidad: {
    id: 'modalidad',
    label: 'Modalidad',
    placeholder: 'Ej: Presencial, Virtual, Híbrido',
    type: 'text',
    pdfRole: 'badge',
    designHint: {}
  },
  matricula: {
    id: 'matricula',
    label: 'Matrícula Profesional N° / Registro',
    placeholder: 'Ej: Matrícula Prof. N° 45892-A',
    type: 'text',
    pdfRole: 'badge',
    designHint: { colorOverride: 'muted' }
  },
  tomoFolio: {
    id: 'tomoFolio',
    label: 'Tomo / Folio / Acta',
    placeholder: 'Ej: Tomo IV, Folio 128, Libro 2',
    type: 'text',
    pdfRole: 'extra',
    designHint: { colorOverride: 'muted' }
  },
  resolucion: {
    id: 'resolucion',
    label: 'Resolución N° / Disposición (Opcional)',
    pdfLabel: 'Resolución N° / Disposición',
    // El "/" de arriba no son opciones elegibles por el usuario (a
    // diferencia de 'url' o 'nivel') — es un único rótulo compuesto con
    // un pdfLabel que solo saca el "(Opcional)". Sin este labelOptions
    // explícito, getFieldLabelOptions() lo partiría en 2 "opciones"
    // sin sentido ("Resolución N°" / "Disposición (Opcional)").
    labelOptions: ['Resolución N° / Disposición'],
    placeholder: 'Ej: Res. Min. N° 1234/26',
    type: 'text',
    pdfRole: 'extra',
    designHint: { colorOverride: 'muted' }
  },
  descripcion: {
    id: 'descripcion',
    label: 'Descripción / Logros / Detalles',
    placeholder: 'Ej: Planificación de secuencias didácticas y tertulias dialógicas...',
    type: 'textarea',
    pdfRole: 'description',
    designHint: {}
  },
  logros: {
    id: 'logros',
    label: 'Logros / Puntos Destacados',
    placeholder: 'Ej: Lideré un equipo de 6 personas',
    type: 'textarea',
    pdfRole: 'description',
    designHint: {}
  },
  plataforma: {
    id: 'plataforma',
    label: 'Plataforma / Red Social',
    labelOptions: ['Plataforma'],
    placeholder: 'Ej: LinkedIn, GitHub, Behance, Portafolio, Instagram',
    type: 'select',
    options: [
      'LinkedIn',
      'GitHub / GitLab',
      'Sitio Web / Portafolio',
      'Email',
      'WhatsApp Business',
      'X / Twitter',
      'Instagram',
      'Facebook',
      'YouTube',
      'TikTok',
      'Behance / Dribbble',
      'Otra Red / Enlace'
    ],
    pdfRole: 'title',
    designHint: {}
  },
  usuario: {
    id: 'usuario',
    label: 'Usuario / Manija (@usuario)',
    labelOptions: ['Usuario', 'Manija'],
    placeholder: 'Ej: @daniela.burgos o linkedin.com/in/daniela-burgos',
    type: 'text',
    pdfRole: 'subtitle',
    designHint: {}
  },
  url: {
    id: 'url',
    label: 'Enlace / Portfolio / DOI',
    placeholder: 'Ej: https://linkedin.com/in/usuario o portfolio.com',
    type: 'url',
    pdfRole: 'extra',
    designHint: {}
  },
  autor: {
    id: 'autor',
    label: 'Autor(es) / Colaboradores',
    placeholder: 'Ej: Burgos M., Medina V.',
    type: 'text',
    pdfRole: 'extra',
    designHint: {}
  },
  idioma: {
    id: 'idioma',
    label: 'Idioma',
    placeholder: 'Ej: Inglés, Portugués, Francés, Alemán',
    type: 'text',
    pdfRole: 'title',
    designHint: {}
  },
  personaReferencia: {
    id: 'personaReferencia',
    label: 'Nombre de la Referencia',
    placeholder: 'Ej: Lic. Juan Pérez (Director)',
    type: 'text',
    pdfRole: 'subtitle',
    designHint: {}
  },
  contactoReferencia: {
    id: 'contactoReferencia',
    label: 'Contacto de Referencia',
    placeholder: 'Ej: +54 387 4123456 | director@escuela.edu.ar',
    type: 'text',
    pdfRole: 'extra',
    designHint: {}
  }
};

export interface RecordKindSchema {
  kind: string;
  label: string;
  defaultFields: readonly string[];
}

export const BUILTIN_RECORD_KINDS = {
  education: {
    kind: 'education',
    label: 'Formación Académica',
    defaultFields: ['tituloOGrado', 'institucion', 'nivel', 'periodo', 'estado', 'promedio', 'descripcion']
  },
  profession: {
    kind: 'education',
    label: 'Títulos Profesionales',
    defaultFields: ['tituloOGrado', 'institucion', 'periodo', 'matricula', 'resolucion', 'tomoFolio']
  },
  experience: {
    kind: 'experience',
    label: 'Experiencia Laboral',
    defaultFields: ['cargo', 'institucion', 'periodo', 'modalidad', 'descripcion', 'resolucion', 'personaReferencia', 'contactoReferencia']
  },
  course: {
    kind: 'course',
    label: 'Cursos y Capacitaciones',
    defaultFields: ['tituloOGrado', 'institucion', 'periodo', 'cargaHoraria', 'modalidad', 'resolucion', 'url']
  },
  informatics: {
    kind: 'course',
    label: 'Informática y TICs',
    defaultFields: ['tituloOGrado', 'institucion', 'nivel', 'descripcion']
  },
  redes: {
    kind: 'social-link',
    label: 'Redes Sociales & Presencia Digital',
    defaultFields: ['plataforma', 'usuario', 'url']
  },
  languages: {
    kind: 'languages',
    label: 'Idiomas & Nivel de Dominio',
    defaultFields: ['idioma', 'nivel', 'institucion', 'descripcion']
  },
  projects: {
    kind: 'projects',
    label: 'Proyectos Destacados',
    defaultFields: ['tituloOGrado', 'institucion', 'periodo', 'url', 'descripcion']
  },
  publications: {
    kind: 'publications',
    label: 'Publicaciones & Patentes',
    defaultFields: ['tituloOGrado', 'autor', 'institucion', 'periodo', 'url', 'descripcion']
  },
  references: {
    kind: 'references',
    label: 'Referencias Laborales',
    defaultFields: ['personaReferencia', 'cargo', 'institucion', 'contactoReferencia']
  }
} as const;

export type CatalogDerivedKind = typeof BUILTIN_RECORD_KINDS[keyof typeof BUILTIN_RECORD_KINDS]['kind'];
