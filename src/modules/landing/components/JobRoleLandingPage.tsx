import React from 'react';
import { jobTemplatesCatalog } from '../../../shared/core/seo/jobTemplatesCatalog';
import { navigation } from '../../../shared/core/utils/navigation';

export default function JobRoleLandingPage() {
  const pathname = navigation.getPathname();
  const segments = pathname.split('/');
  const slug = segments[segments.length - 1];
  const role = jobTemplatesCatalog.find(r => r.slug === slug);

  if (!role) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center text-[var(--ui-text-secondary)]">
        <h2 className="text-2xl font-bold text-[var(--ui-text-primary)] mb-2">Rol no encontrado</h2>
        <p>Este cargo aún no tiene página de aterrizaje optimizada.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-4xl font-extrabold text-[var(--ui-text-primary)] mb-4">{role.title}</h1>
      <p className="text-lg text-[var(--ui-text-secondary)] mb-8">{role.description}</p>
      <h3 className="text-xl font-bold text-[var(--ui-text-primary)] mb-3">Secciones recomendadas</h3>
      <ul className="list-disc list-inside space-y-1 text-[var(--ui-text-secondary)]">
        {role.sections.map(s => <li key={s}>{s}</li>)}
      </ul>
    </div>
  );
}
