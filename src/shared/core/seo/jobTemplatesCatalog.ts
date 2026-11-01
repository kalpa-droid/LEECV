export interface JobRoleTemplate {
  slug: string;
  title: string;
  description: string;
  sections: string[];
}

export const jobTemplatesCatalog: ReadonlyArray<JobRoleTemplate> = [
  { slug: 'marketing-digital', title: 'Marketing Digital', description: 'CV optimizado para roles de marketing digital y crecimiento.', sections: ['Experiencia Laboral', 'Formación', 'Habilidades Técnicas', 'Certificaciones'] },
  { slug: 'desarrollo-web', title: 'Desarrollo Web', description: 'CV técnico para desarrolladores frontend y backend.', sections: ['Experiencia Laboral', 'Proyectos', 'Educación', 'Herramientas'] },
  { slug: 'gestion-de-proyectos', title: 'Gestión de Proyectos', description: 'CV orientado a coordinación de proyectos ágiles y tradicionales.', sections: ['Experiencia Laboral', 'Formación', 'Certificaciones', 'Idiomas'] },
];
