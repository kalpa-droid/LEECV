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
}

export interface FieldDefinition {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'url';
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
    designHint: { position: 'inline-right' }
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
    designHint: { position: 'inline-right' }
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
  plataforma: {
    id: 'plataforma',
    label: 'Red Social / Plataforma',
    placeholder: 'Ej: LinkedIn, GitHub, Behance, Portafolio, Instagram',
    type: 'text',
    pdfRole: 'title',
    designHint: {}
  },
  usuario: {
    id: 'usuario',
    label: 'Usuario / Manija (@usuario)',
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
  defaultFields: string[];
}

export const BUILTIN_RECORD_KINDS: Record<string, RecordKindSchema> = {
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
    kind: 'redes',
    label: 'Redes Sociales & Presencia Digital',
    defaultFields: ['plataforma', 'usuario', 'url']
  },
  ecology: {
    kind: 'course',
    label: 'Proyectos Ecológicos & Sustentables',
    defaultFields: ['tituloOGrado', 'institucion', 'periodo', 'descripcion']
  }
};
