export interface JobPositionCategory {
  category: string;
  positions: string[];
}

export const JOB_POSITION_CATALOG: JobPositionCategory[] = [
  {
    category: 'Educación y Formación',
    positions: [
      'Docencia',
      'Dirección Educativa',
      'Coordinación Pedagógica',
      'Investigación Académica',
      'Tutoría y Orientación',
      'Capacitación y Desarrollo',
      'Educación Especial',
      'Preceptoría / Celaduría',
      'Bibliotecología'
    ]
  },
  {
    category: 'Administración y Gestión',
    positions: [
      'Administrativo/a',
      'Gerencia General',
      'Jefatura de Área',
      'Coordinación Operativa',
      'Asistencia Ejecutiva',
      'Gestión de Proyectos (PM)',
      'Recursos Humanos (RRHH)',
      'Secretaría Administrativa',
      'Mesa de Entradas y Archivo'
    ]
  },
  {
    category: 'Salud y Ciencias',
    positions: [
      'Medicina General',
      'Enfermería',
      'Farmacia',
      'Bioquímica y Laboratorio',
      'Psicología',
      'Nutrición',
      'Kinesiología y Fisioterapia',
      'Odontología',
      'Radiología y Diagnóstico'
    ]
  },
  {
    category: 'Tecnología e Ingeniería',
    positions: [
      'Desarrollo de Software',
      'Soporte Técnico / IT',
      'Ingeniería Civil',
      'Ingeniería Industrial',
      'Diseño Gráfico / UX/UI',
      'Analista de Datos / BI',
      'Ciberseguridad',
      'Administración de Redes y Sistemas',
      'DevOps / Cloud Specialist'
    ]
  },
  {
    category: 'Comercio, Finanzas y Ventas',
    positions: [
      'Ventas y Comercial',
      'Marketing Digital / Community Management',
      'Contabilidad y Auditoría',
      'Finanzas y Banca',
      'Comercio Exterior',
      'Atención al Cliente',
      'Logística y Supply Chain',
      'Cajera/o y Cobranzas'
    ]
  },
  {
    category: 'Legal, Seguridad e Institucional',
    positions: [
      'Abogacía / Asesoría Jurídica',
      'Seguridad e Higiene Laboral',
      'Fuerzas de Seguridad',
      'Defensa y Misiones institucionales',
      'Relaciones Públicas / Institucionales'
    ]
  },
  {
    category: 'Oficios, Servicios e Industria',
    positions: [
      'Electricidad e Instalaciones',
      'Gastronomía y Hotelería',
      'Construcción y Obras',
      'Mecánica Automotriz e Industrial',
      'Transporte y Logística de Cargas',
      'Agricultura y Agronomía',
      'Mantenimiento General'
    ]
  }
];

/** Lista plana de todos los puestos para autocompletado y validaciones */
export const ALL_POSITIONS_FLAT: string[] = JOB_POSITION_CATALOG.flatMap(cat => cat.positions);
