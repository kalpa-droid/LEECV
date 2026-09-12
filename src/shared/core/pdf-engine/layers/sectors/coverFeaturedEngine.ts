/**
 * NÚCLEO — MOTOR UNIFICADO DE INSIGNIAS DESTACADAS DE PORTADA (coverFeaturedEngine.ts)
 * 
 * Centraliza la resolución de los títulos/badges que se dibujan en la portada del CV,
 * garantizando que el editor (EditorPanel.tsx) y el motor de PDF (TemplateRenderer.tsx)
 * muestren exactamente los mismos registros y el mismo conteo.
 */

export interface CoverFeaturedItem {
  id: string;
  label: string;
  source: 'education' | 'profession' | 'roles' | 'titlePrefix';
  isFallback: boolean;
}

export function getEffectiveCoverFeaturedItems(cvData: any): CoverFeaturedItem[] {
  if (!cvData) return [];

  const items: CoverFeaturedItem[] = [];

  // 1. Formación destacada elegida explícitamente
  if (cvData.education && cvData.coverFeaturedEducationId) {
    const found = cvData.education.find(
      (e: any, idx: number) => String(e.id || e._id || idx) === String(cvData.coverFeaturedEducationId)
    );
    if (found?.degree) {
      items.push({
        id: String(found.id || found._id || cvData.coverFeaturedEducationId),
        label: found.degree,
        source: 'education',
        isFallback: false
      });
    }
  }

  // 2. Profesión destacada elegida explícitamente
  if (cvData.profession && cvData.coverFeaturedProfessionId) {
    const found = cvData.profession.find(
      (p: any, idx: number) => String(p.id || p._id || idx) === String(cvData.coverFeaturedProfessionId)
    );
    if (found?.degree) {
      items.push({
        id: String(found.id || found._id || cvData.coverFeaturedProfessionId),
        label: found.degree,
        source: 'profession',
        isFallback: false
      });
    }
  }

  // 3. Roles/Títulos personalizados explícitamente en la lista cvData.roles
  if (items.length === 0 && Array.isArray(cvData.roles) && cvData.roles.length > 0) {
    cvData.roles.forEach((r: any, idx: number) => {
      if (!r) return;
      const label = typeof r === 'string' ? r : (r.title || r.role || r.degree || r.name || '');
      if (label && typeof label === 'string' && label.trim().length > 0) {
        items.push({
          id: `role-${idx}`,
          label: label.trim(),
          source: 'roles',
          isFallback: false
        });
      }
    });
  }

  // 4. Respaldos automáticos desde Datos Personales (titlePrefix)
  if (items.length === 0 && cvData.personalInfo?.titlePrefix) {
    const prefix = String(cvData.personalInfo.titlePrefix).trim();
    if (prefix.length > 0) {
      items.push({
        id: 'titlePrefix',
        label: prefix,
        source: 'titlePrefix',
        isFallback: true
      });
    }
  }

  return items;
}

/**
 * Retorna la lista simple de cadenas de texto de las insignias destacadas de portada.
 * Usado por TemplateRenderer.tsx para iterar y renderizar las etiquetas en PDF.
 */
export function getCoverFeaturedBadges(cvData: any): string[] {
  return getEffectiveCoverFeaturedItems(cvData).map(item => item.label);
}
