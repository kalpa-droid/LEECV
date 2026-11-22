import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Target,
  CheckCircle,
  AlertCircle,
  Wand2,
  CornerUpLeft,
  Sparkles,
  Loader2,
  FileText,
} from 'lucide-react';
import { Field } from '../../../../../shared/core/ui/Field';
import { button } from '../../../../../shared/core/uiDesignSystem';
import { useCVContext } from '../../../../../context/CVContext';
import { useToast } from '../../../../../shared/core/ui/Toast';
import { executeAiTask } from '../../../../../shared/core/ai/aiClient';
import { extractJobData, checkKeywordInCV, ExtractedJobData } from '../../../../../shared/core/utils/keywordExtractor';
import { runAtsPreflightCheck } from '../../../../../shared/core/pdf-engine/layers/ats/atsPreflightCheck';
import { resolveActivePreset } from '../../../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { cvDataToContentSections } from '../../../../../shared/core/pdf-engine/layers/records/cvDataAdapter';
import { AtsAiAnalysisModal } from '../../AtsAiAnalysisModal';
import PrepareApplicationModal, { type PrepareApplicationTarget } from '../../modals/PrepareApplicationModal';
import {
  computeApplicationRename,
  createApplicationVariant,
  type ApplicationTailoredPatch,
} from '../../../../../shared/core/documents/applicationVariant';
import { ensureDocumentTab } from '../../../../../shared/core/documents/workspaceController';
import { updateTabTitle } from '../../../../../shared/core/documents/tabStore';
import { computeAutoDocumentTitle } from '../../../../../shared/core/documents/documentEngine';

export interface SuggestedJobProfile {
  jobTitle: string;
  companyName: string;
  sector?: string;
  matchReason: string;
  suggestedDescription: string;
}

function isPlaceholderTarget(val: string | undefined, placeholderWord: string): boolean {
  const clean = String(val || '').trim().toLowerCase();
  return !clean || clean === placeholderWord;
}

export const JobTargetSection = ({
  cvData,
  setCvData,
  onCreateApplicationVariant,
  onBackToBaseCV,
  onNavigateToTab,
}: any) => {
  const { saveCVAs } = useCVContext();
  const { showSuccess, showError, showWarning } = useToast();
  const jobTarget = cvData?.jobTarget || {};

  const [extractedData, setExtractedData] = useState<ExtractedJobData | null>(null);
  const [extractedKeywords, setExtractedKeywords] = useState<{ word: string; found: boolean }[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [cvTextForAi, setCvTextForAi] = useState('');
  const [isAnalyzingProfiles, setIsAnalyzingProfiles] = useState(false);
  const [focusHint, setFocusHint] = useState('');
  const [prepareTarget, setPrepareTarget] = useState<PrepareApplicationTarget | null>(null);

  const isApplicationVersion = Boolean(cvData?.sourceCvTabId);
  const profileSuggestions: SuggestedJobProfile[] = Array.isArray(cvData?.profileSuggestions)
    ? cvData.profileSuggestions
    : [];

  useEffect(() => {
    if (jobTarget.jobDescription) {
      const data = extractJobData(jobTarget.jobDescription);
      setExtractedData(data);
      const matched = data.keywords.map((kw) => ({
        word: kw,
        found: checkKeywordInCV(kw, cvData),
      }));
      setExtractedKeywords(matched);
    } else {
      setExtractedData(null);
      setExtractedKeywords([]);
    }
  }, [jobTarget.jobDescription, cvData]);

  const updateField = (field: string, val: string) => {
    const nextJobTarget = { ...jobTarget, [field]: val };
    const currentLabel = cvData.version_label || cvData.versionLabel;
    const nextLabel = computeApplicationRename(
      currentLabel,
      field === 'jobTitle' ? val : nextJobTarget.jobTitle,
      field === 'companyName' ? val : nextJobTarget.companyName,
    );
    if (nextLabel && isApplicationVersion) {
      updateTabTitle(cvData.id, computeAutoDocumentTitle('cv', { ...cvData, version_label: nextLabel }), nextLabel);
      setCvData((prev: any) => ({
        ...prev,
        jobTarget: { ...(prev.jobTarget || {}), [field]: val },
        version_label: nextLabel,
        versionLabel: nextLabel,
      }));
      return;
    }
    setCvData((prev: any) => ({
      ...prev,
      jobTarget: {
        ...(prev.jobTarget || {}),
        [field]: val,
      },
    }));
  };

  const handleOpenAiAnalysis = () => {
    const preset = resolveActivePreset(cvData);
    const sections = cvDataToContentSections(cvData);
    const result = runAtsPreflightCheck(preset, sections, cvData, jobTarget.jobDescription);
    setCvTextForAi(result.linearReadingOrder.join('\n'));
    setIsAiModalOpen(true);
  };

  const handleAnalyzeProfiles = async () => {
    setIsAnalyzingProfiles(true);
    try {
      const res = await executeAiTask<{ profiles: SuggestedJobProfile[] }>({
        taskId: 'suggest_job_profiles',
        payload: { focusHint: focusHint.trim() || undefined },
        cvData,
        maxTokens: 3200,
        temperature: 0.3,
      });
      const profiles = Array.isArray(res.data?.profiles)
        ? res.data.profiles.filter((p) => p && p.jobTitle && p.companyName)
        : [];
      if (profiles.length === 0) {
        showWarning('Cargá primero más datos en tu CV Base (formación, experiencia o cursos) para identificar perfiles.');
        return;
      }
      setCvData((prev: any) => ({
        ...prev,
        profileSuggestions: profiles,
      }));
      showSuccess(`Se detectaron ${profiles.length} oportunidades acordes a tu CV Base.`);
    } catch (err: any) {
      showError(err?.message || 'No pudimos analizar tu perfil en este momento.');
    } finally {
      setIsAnalyzingProfiles(false);
    }
  };

  const handleConfirmCreateApplication = async (args: {
    puesto: string;
    empresa: string;
    jobDescription: string;
    tailoredPatch?: ApplicationTailoredPatch;
  }) => {
    if (typeof onCreateApplicationVariant === 'function') {
      await onCreateApplicationVariant({
        puesto: args.puesto,
        empresa: args.empresa,
        jobDescription: args.jobDescription,
        tailoredPatch: args.tailoredPatch,
        goTo: 'vacante',
      });
      return;
    }

    const result = await createApplicationVariant(
      {
        cvData,
        puesto: args.puesto,
        empresa: args.empresa,
        jobDescription: args.jobDescription,
        tailoredPatch: args.tailoredPatch,
      },
      {
        saveAs: (data, label) => saveCVAs(label, data),
        ensureTab: (id, docType, data) => ensureDocumentTab(id, docType, data),
      },
    );
    if (!result?.success) {
      showError('No se pudo crear la postulación. El CV base se conservó sin cambios.');
      return;
    }
    showSuccess('Postulación creada y optimizada en una nueva pestaña.');
  };

  const handleTriggerCoverLetterForCurrentTarget = () => {
    const hasTitle = !isPlaceholderTarget(jobTarget.jobTitle, 'ninguno');
    const hasCompany = !isPlaceholderTarget(jobTarget.companyName, 'ninguna');
    if (!hasTitle || !hasCompany) {
      showWarning('Completá Puesto y Empresa en Vacante Objetivo para generar la carta (tu CV Base no se modificará).');
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('leecv_auto_generate_cover_letter', String(Date.now()));
      } catch {}
    }
    if (typeof onNavigateToTab === 'function') {
      onNavigateToTab('carta');
    }
  };

  const hasValidBaseTarget =
    !isPlaceholderTarget(jobTarget.jobTitle, 'ninguno') &&
    !isPlaceholderTarget(jobTarget.companyName, 'ninguna');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-neutral-border)]">
        <Target className="w-5 h-5 text-[var(--color-accent-text)]" />
        <h2 className="text-lg font-semibold text-[var(--color-neutral-text-primary)]">Vacante Objetivo</h2>
      </div>

      {!isApplicationVersion ? (
        <div className="space-y-6">
          {/* Bloque 1: Vacante manual actual en CV Base + generar carta sin tocar CV Base */}
          <div className="space-y-4 rounded-[var(--ui-radius-card)] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--ui-text-primary)]">
                Postulación manual o carta directa (sin modificar tu CV Base)
              </h3>
              <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
                En tu <strong>CV Base</strong> el puesto figura por defecto como <strong>Ninguno</strong> y la empresa como <strong>Ninguna</strong>. Si cargás un puesto y una empresa acá abajo, podés generar una <strong>Carta de presentación</strong> gratuita sin alterar el CV Base, o crear una copia independiente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Puesto"
                value={jobTarget.jobTitle || ''}
                onChange={(e: any) => updateField('jobTitle', e.target.value)}
                placeholder="Ninguno"
              />
              <Field
                label="Empresa"
                value={jobTarget.companyName || ''}
                onChange={(e: any) => updateField('companyName', e.target.value)}
                placeholder="Ninguna"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setPrepareTarget({
                    jobTitle: jobTarget.jobTitle || '',
                    companyName: jobTarget.companyName || '',
                    suggestedDescription: jobTarget.jobDescription || '',
                  })
                }
                className={`${button.base} ${button.primary} flex-1 min-w-[200px] flex items-center justify-center gap-2 text-xs`}
              >
                <Briefcase className="w-4 h-4" />
                Crear postulación con este puesto
              </button>
              <button
                type="button"
                onClick={handleTriggerCoverLetterForCurrentTarget}
                className={`${button.base} ${button.secondary} flex-1 min-w-[200px] flex items-center justify-center gap-2 text-xs ${
                  !hasValidBaseTarget ? 'opacity-80' : ''
                }`}
              >
                <FileText className="w-4 h-4 text-[var(--color-accent-text)]" />
                Generar carta para este puesto actual
              </button>
            </div>
          </div>

          {/* Bloque 2: Descubrimiento con IA de en qué se perfila según todo el CV Base */}
          <div className="space-y-4 rounded-[var(--ui-radius-card)] border border-[var(--color-accent-base)]/40 bg-[var(--ui-bg-card)] p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--ui-text-primary)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-accent-text)]" />
                Analizar en qué me perfilo
              </h3>
              <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
                La IA lee <strong>todo tu CV Base completo</strong> (formación, cursos, experiencia, habilidades y ciudad) para proponerte puestos y empresas reales o remotas acordes a tu perfil. Luego tocá <strong>Crear postulación</strong> en cualquiera para revisar el aviso y adaptar tu nuevo CV.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={focusHint}
                onChange={(e) => setFocusHint(e.target.value)}
                placeholder="Filtro opcional: ciudad, modalidad remota o rubro..."
                className="flex-1 rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] text-[var(--ui-text-primary)] px-3 py-2 text-xs outline-none focus:border-[var(--color-accent-base)]"
              />
              <button
                type="button"
                onClick={handleAnalyzeProfiles}
                disabled={isAnalyzingProfiles}
                className={`${button.base} ${button.primary} flex items-center justify-center gap-2 text-xs px-4 py-2 shrink-0`}
              >
                {isAnalyzingProfiles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {isAnalyzingProfiles ? 'Analizando CV Base…' : 'Analizar en qué me perfilo'}
              </button>
            </div>

            {profileSuggestions.length > 0 && (
              <div className="overflow-x-auto rounded-[var(--ui-radius-control)] border border-[var(--ui-border)]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--ui-bg-panel)] border-b border-[var(--ui-border)] text-[var(--ui-text-secondary)]">
                      <th className="py-2 px-3 font-bold">Puesto sugerido</th>
                      <th className="py-2 px-3 font-bold">Empresa / Institución</th>
                      <th className="py-2 px-3 font-bold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ui-border)]">
                    {profileSuggestions.map((row, idx) => (
                      <tr key={`${row.jobTitle}-${row.companyName}-${idx}`} className="hover:bg-[var(--ui-bg-panel)]/60">
                        <td className="py-2.5 px-3 align-top">
                          <div className="font-bold text-[var(--ui-text-primary)]">{row.jobTitle}</div>
                          {row.matchReason && (
                            <div className="text-[11px] text-[var(--ui-text-secondary)] mt-0.5">{row.matchReason}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-top">
                          <div className="font-semibold text-[var(--ui-text-primary)]">{row.companyName}</div>
                          {row.sector && (
                            <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-secondary)]">
                              {row.sector}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-top text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              setPrepareTarget({
                                jobTitle: row.jobTitle,
                                companyName: row.companyName,
                                suggestedDescription: row.suggestedDescription || '',
                              })
                            }
                            className={`${button.base} ${button.primary} text-[11px] px-3 py-1.5 inline-flex items-center gap-1`}
                          >
                            <Briefcase className="w-3.5 h-3.5" />
                            Crear postulación
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--ui-radius-card)] border border-[var(--color-secondary-base)]/30 bg-[var(--color-secondary-muted)] px-3 py-2 text-sm text-[var(--color-secondary-text)]">
            <span>Esta postulación está vinculada a tu CV Base. Todas las adaptaciones se guardan solo aquí.</span>
            {typeof onBackToBaseCV === 'function' && (
              <button
                type="button"
                onClick={onBackToBaseCV}
                className="flex shrink-0 items-center gap-1.5 font-bold text-[var(--color-accent-text)] hover:text-[var(--ui-text-primary)] transition-colors cursor-pointer"
              >
                <CornerUpLeft className="w-3.5 h-3.5" />
                Volver al CV Base
              </button>
            )}
          </div>

          {cvData?.atsMetadata?.alignmentSummary && (
            <div className="p-3.5 rounded-[var(--ui-radius-card)] border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)]/30 space-y-2 text-xs">
              <div className="font-bold flex items-center gap-1.5 text-[var(--color-accent-text)]">
                <Sparkles className="w-4 h-4" />
                CV alineado por IA para filtros ATS
              </div>
              <p className="text-[var(--ui-text-primary)] leading-relaxed">{cvData.atsMetadata.alignmentSummary}</p>
              {Array.isArray(cvData.atsMetadata.keywords) && cvData.atsMetadata.keywords.length > 0 && (
                <p className="text-[11px] text-[var(--ui-text-secondary)]">
                  <strong>Etiquetas ATS embebidas en el PDF:</strong> {cvData.atsMetadata.keywords.slice(0, 12).join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <Field
              label="Cargo / Puesto"
              value={jobTarget.jobTitle || ''}
              onChange={(e: any) => updateField('jobTitle', e.target.value)}
              placeholder="Ej: Diseñadora Instruccional"
            />
            <Field
              label="Empresa"
              value={jobTarget.companyName || ''}
              onChange={(e: any) => updateField('companyName', e.target.value)}
              placeholder="Ej: EdTech.IA"
            />
            <div>
              <label className="block text-sm font-semibold mb-1">Descripción del Aviso (Editable)</label>
              <textarea
                value={jobTarget.jobDescription || ''}
                onChange={(e) => updateField('jobDescription', e.target.value)}
                placeholder="Pegá acá todo el texto del aviso (requisitos, tareas, beneficios...)"
                rows={6}
                className="w-full bg-[var(--ui-bg-input)] border border-[var(--ui-border)] rounded-[10px] p-2.5 text-sm focus:outline-none focus:border-[var(--color-accent-base)] resize-y min-h-[120px]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleTriggerCoverLetterForCurrentTarget}
              className={`${button.base} ${button.primary} py-2 px-4 flex items-center gap-2 text-xs`}
            >
              <FileText className="w-4 h-4" />
              Generar carta para este puesto actual
            </button>
            <button
              type="button"
              onClick={handleOpenAiAnalysis}
              className={`${button.base} ${button.secondary} py-2 px-4 flex items-center gap-2 text-xs`}
            >
              <Wand2 className="w-4 h-4 text-[var(--color-accent-text)]" />
              Análisis Profundo con IA
            </button>
          </div>

          {extractedData && (extractedData.yearsOfExperience !== null || extractedData.degree !== null) && (
            <div className="flex gap-4 mt-4 p-3 bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 rounded-[var(--ui-radius-card)]">
              {extractedData.yearsOfExperience !== null && (
                <div className="text-sm">
                  <span className="font-semibold">Exp. Requerida:</span> {extractedData.yearsOfExperience} años
                </div>
              )}
              {extractedData.degree !== null && (
                <div className="text-sm">
                  <span className="font-semibold">Nivel Educativo:</span> {extractedData.degree}
                </div>
              )}
            </div>
          )}

          {extractedKeywords.length > 0 && (
            <div className="space-y-3 mt-6 pt-4 border-t border-[var(--color-neutral-border)]">
              <h3 className="text-md font-semibold text-[var(--color-neutral-text-primary)]">Palabras Clave Extraídas</h3>
              <p className="text-xs text-[var(--color-neutral-text-secondary)] mb-2">
                El sistema detectó estos términos frecuentes. Tratá de incluirlos en tu CV <strong>sólo si tenés la experiencia real</strong>.
              </p>

              <div className="flex flex-wrap gap-2">
                {extractedKeywords.map((kw, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                      kw.found
                        ? 'bg-[var(--color-success-muted)] text-[var(--color-success-text)] border-[var(--color-success-base)]/50'
                        : 'bg-[var(--color-danger-muted)] text-[var(--color-danger-text)] border-[var(--color-danger-base)]/50'
                    }`}
                  >
                    {kw.found ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {kw.word}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <PrepareApplicationModal
        isOpen={Boolean(prepareTarget)}
        initialTarget={prepareTarget}
        cvData={cvData}
        onClose={() => setPrepareTarget(null)}
        onConfirmCreate={handleConfirmCreateApplication}
      />

      <AtsAiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        cvData={cvData}
        cvText={cvTextForAi}
        jobDescription={jobTarget.jobDescription}
        onUpdateCvData={setCvData}
      />
    </div>
  );
};
