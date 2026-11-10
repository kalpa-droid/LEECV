import React from 'react';
import { jobTemplatesCatalog } from '../../../shared/core/seo/jobTemplatesCatalog';
import { navigation } from '../../../shared/core/utils/navigation';
import { button } from '../../../shared/core/uiDesignSystem';
import { Sparkles, Tag, Star, Crown, ArrowRight, FileText } from 'lucide-react';
import { useToast } from '../../../shared/core/ui/Toast';

export default function JobRoleLandingPage() {
  const pathname = navigation.getPathname();
  const slug = pathname.split('/').pop() || '';
  const role = jobTemplatesCatalog.find(r => r.slug === slug);
  const { showSuccess } = useToast();

  if (!role) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center text-[var(--ui-text-secondary)]">
        <h2 className="text-2xl font-bold text-[var(--ui-text-primary)] mb-2">Rol no encontrado</h2>
        <p>Todavía no hay una plantilla optimizada para este cargo.</p>
      </div>
    );
  }

  const slugName = role.title.replace(/^CV\s+/i, '');
  const ctaLabel = `Crear mi CV de ${slugName}`;
  const faqItems = [
    {
      question: `¿Qué palabras clave esperan los sistemas ATS en un ${slugName}?`,
      answer: `Incluí estas palabras de forma natural en tu CV: ${role.keywords.join(', ')}.`,
    },
    {
      question: `¿Cómo optimizo mi CV de ${slugName} para pasar los filtros ATS?`,
      answer: `Usá secciones estándar (${role.sections.join(', ')}) y logros cuantificados con la fórmula Acción + Contexto + Resultado.`,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Hero SEO */}
      <section>
        <div className="px-6 py-10 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg-card)] space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent-purple-text)] flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Plantilla compatible con filtros ATS
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--ui-text-primary)] leading-tight">
            Plantilla de CV para <span className="text-[var(--color-accent-purple-text)] underline decoration-2">{slugName}</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--ui-text-secondary)] max-w-2xl">
            {role.description} Diseñá tu currículum con estos criterios y aumentá tus chances de pasar los filtros automáticos de los sistemas de selección.
          </p>
        </div>
      </section>

      {/* Palabras clave ATS */}
      <section>
        <h2 className="text-2xl font-black text-[var(--ui-text-primary)] mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-[var(--color-status-warning-text)]" /> Palabras clave ATS que buscan reclutadores
        </h2>
        <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-[var(--ui-bg-card)] border border-[var(--ui-border)]">
          {role.keywords.map(kw => (
            <span
              key={kw}
              className="px-3 py-1.5 rounded-full bg-[var(--color-status-success-muted)] text-xs font-bold text-[var(--color-status-success-text)] border border-[var(--color-status-success-base)]/40 select-all"
            >
              {kw}
            </span>
          ))}
        </div>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-3">
          Escribilas naturalmente en tu experiencia, resumen y habilidades. Evitá listas genéricas sin contexto.
        </p>
      </section>

      {/* Secciones esenciales */}
      <section>
        <h2 className="text-2xl font-black text-[var(--ui-text-primary)] mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-[var(--color-status-warning-text)]" /> Secciones esenciales
        </h2>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 p-4 rounded-2xl bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-[var(--ui-text-secondary)]">
          {role.sections.map(s => <li key={s} className="font-bold">• {s}</li>)}
        </ul>
      </section>

      {/* Tarjeta Fórmula ACR */}
      <section>
        <h2 className="text-2xl font-black text-[var(--ui-text-primary)] mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-[var(--color-status-danger-text)]" /> Fórmula de logros (Acción + Contexto + Resultado)
        </h2>
        <div className="rounded-2xl bg-[var(--ui-bg-card)] border border-[var(--ui-border)] p-6 sm:p-8 flex flex-col sm:flex-row gap-6">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-accent-blue-text)]">¿Qué esperan los reclutadores?</p>
            <p className="text-sm font-bold text-[var(--ui-text-primary)] mt-1">Valores medibles, no solo responsabilidades.</p>
            <p className="text-xs italic text-[var(--ui-text-secondary)] mt-2">
              "Mejoré", "reduje", "aumenté" + cuánto + cuándo.
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-accent-blue-text)]">Ejemplo para {slugName}</p>
            <p className="text-sm font-bold text-[var(--ui-text-primary)] mt-1">{role.acrExample}</p>
          </div>
        </div>
      </section>

      {/* CTA principal */}
      <section>
        <button
          onClick={() => {
            showSuccess(`Preparado: crear CV de ${slugName} con estas palabras clave`);
            navigation.goTo('/crear-cv');
          }}
          className={`${button.primary} px-8 py-4 text-lg font-black rounded-2xl w-full sm:w-auto flex items-center justify-center gap-2`}
        >
          <span>{ctaLabel}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </section>

      {/* FAQ visible */}
      <section>
        <h2 className="text-xl font-black text-[var(--ui-text-primary)] mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--color-accent-purple-bright)]" /> Preguntas frecuentes
        </h2>
        <div className="space-y-4 p-6 rounded-2xl bg-[var(--ui-bg-card)] border border-[var(--ui-border)]">
          {faqItems.map((q, i) => (
            <details key={i} className="group">
              <summary className="cursor-pointer select-none text-[12px] font-bold text-[var(--ui-text-primary)]">{q.question}</summary>
              <div className="pl-3 pb-3 text-[11px] text-[var(--ui-text-secondary)] leading-relaxed">{q.answer}</div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
