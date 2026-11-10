export interface JobRoleTemplate {
  slug: string;
  title: string;
  description: string;
  sections: string[];
  keywords?: string[];
  acrExample?: string;
  category?: string;
}

import rawData from './jobTemplatesData.json';

export const jobTemplatesCatalog: ReadonlyArray<JobRoleTemplate> = (rawData as JobRoleTemplate[]);

export function getJobRoleBySlug(slug: string): JobRoleTemplate | undefined {
  return jobTemplatesCatalog.find(r => r.slug === slug);
}

export function getAllJobRoles(): JobRoleTemplate[] {
  return [...jobTemplatesCatalog];
}
