/**
 * NÚCLEO — CATÁLOGO UNIVERSAL DE CAMPOS (fieldCatalog.ts)
 *
 * Fuente única de la verdad para todos los atributos de registros.
 * Elimina la duplicación de código en formularios, mapeos y renderizadores.
 */

export interface FieldDefinition {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'url';
  pdfRole: 'title' | 'subtitle' | 'badge' | 'description' | 'extra';
}

export const FIELD_CATALOG: Record<string, FieldDefinition> = {
  tituloOGrado: {
    id: 'tituloOGrado',
    label: 'Título / Grado / Nombre',
    placeholder: 'Ej: Profesorado de Ed. Secundaria en Lengua',
    type: 'text',
    pdfRole: 'title'
  },
  cargo: {
    id: 'cargo',
    label: 'Puesto / Cargo Desempeñado',
    placeholder: 'Ej: Docente Titular de Cátedra',
    type: 'text',
    pdfRole: 'title'
  },
  institucion: {
    id: 'institucion',
    label: 'Institución / Empresa / Ente Emisor',
    placeholder: 'Ej: Ministerio de Educación, Ciencia y Tecnología',
    type: 'text',
    pdfRole: 'subtitle'
  },
  nivel: {
    id: 'nivel',
    label: 'Nivel / Dominio',
    placeholder: 'Ej: Nivel Terciario / Superior, Avanzado (C1)',
    type: 'text',
    pdfRole: 'badge'
  },
  periodo: {
    id: 'periodo',
    label: 'Periodo / Año',
    placeholder: 'Ej: 2023 - 2026',
    type: 'text',
    pdfRole: 'badge'
  },
  cargaHoraria: {
    id: 'cargaHoraria',
    label: 'Carga Horaria',
    placeholder: 'Ej: 60 hs',
    type: 'text',
    pdfRole: 'badge'
  },
  modalidad: {
    id: 'modalidad',
    label: 'Modalidad',
    placeholder: 'Ej: Presencial, Virtual, Híbrido',
    type: 'text',
    pdfRole: 'badge'
  },
  resolucion: {
    id: 'resolucion',
    label: 'Resolución N° / Disposición (Opcional)',
    placeholder: 'Ej: Res. Min. N° 1234/26',
    type: 'text',
    pdfRole: 'extra'
  },
  descripcion: {
    id: 'descripcion',
    label: 'Descripción / Logros / Detalles',
    placeholder: 'Ej: Planificación de secuencias didácticas y tertulias dialógicas...',
    type: 'textarea',
    pdfRole: 'description'
  },
  url: {
    id: 'url',
    label: 'Enlace / Portfolio / DOI',
    placeholder: 'Ej: https://doi.org/... o portfolio.com/obra',
    type: 'url',
    pdfRole: 'extra'
  },
  autor: {
    id: 'autor',
    label: 'Autor(es) / Colaboradores',
    placeholder: 'Ej: Burgos M., Medina V.',
    type: 'text',
    pdfRole: 'extra'
  },
  personaReferencia: {
    id: 'personaReferencia',
    label: 'Nombre de la Referencia',
    placeholder: 'Ej: Lic. Juan Pérez (Director)',
    type: 'text',
    pdfRole: 'subtitle'
  },
  contactoReferencia: {
    id: 'contactoReferencia',
    label: 'Contacto de Referencia',
    placeholder: 'Ej: +54 387 4123456 | director@escuela.edu.ar',
    type: 'text',
    pdfRole: 'extra'
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
    defaultFields: ['tituloOGrado', 'institucion', 'nivel', 'periodo']
  },
  profession: {
    kind: 'education',
    label: 'Títulos Profesionales',
    defaultFields: ['tituloOGrado', 'institucion', 'periodo', 'resolucion']
  },
  experience: {
    kind: 'experience',
    label: 'Experiencia Laboral',
    defaultFields: ['cargo', 'institucion', 'periodo', 'descripcion', 'resolucion']
  },
  course: {
    kind: 'course',
    label: 'Cursos y Capacitaciones',
    defaultFields: ['tituloOGrado', 'institucion', 'periodo', 'cargaHoraria', 'resolucion']
  },
  informatics: {
    kind: 'course',
    label: 'Informática y TICs',
    defaultFields: ['tituloOGrado', 'institucion']
  }
};
