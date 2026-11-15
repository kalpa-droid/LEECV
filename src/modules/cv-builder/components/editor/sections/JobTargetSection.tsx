import React, { useState, useEffect } from 'react';
import { Briefcase, Target, CheckCircle, AlertCircle, Wand2, CornerUpLeft } from 'lucide-react';
import { Field } from '../../../../../shared/core/ui/Field';
import { button } from '../../../../../shared/core/uiDesignSystem';
import { useCVContext } from '../../../../../context/CVContext';
import { useToast } from '../../../../../shared/core/ui/Toast';

import { extractJobData, checkKeywordInCV, ExtractedJobData } from '../../../../../shared/core/utils/keywordExtractor';
import { runAtsPreflightCheck } from '../../../../../shared/core/pdf-engine/layers/ats/atsPreflightCheck';
import { resolveActivePreset } from '../../../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { cvDataToContentSections } from '../../../../../shared/core/pdf-engine/layers/records/cvDataAdapter';
import { AtsAiAnalysisModal } from '../../AtsAiAnalysisModal';
import {
  buildApplicationVersionLabel,
  computeApplicationRename,
  createApplicationVariant,
} from '../../../../../shared/core/documents/applicationVariant';
import { ensureDocumentTab } from '../../../../../shared/core/documents/workspaceController';
import { updateTabTitle } from '../../../../../shared/core/documents/tabStore';
import { computeAutoDocumentTitle } from '../../../../../shared/core/documents/documentEngine';

export const JobTargetSection = ({ cvData, setCvData, onCreateApplicationVariant, onBackToBaseCV }: any) => {
  const { saveCVAs } = useCVContext();
  const { showSuccess, showError } = useToast();
  const jobTarget = cvData.jobTarget || {};
  
  const [extractedData, setExtractedData] = useState<ExtractedJobData | null>(null);
  const [extractedKeywords, setExtractedKeywords] = useState<{word: string, found: boolean}[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [cvTextForAi, setCvTextForAi] = useState('');
  const [isCreatingApplication, setIsCreatingApplication] = useState(false);
  const isApplicationVersion = Boolean(cvData.sourceCvTabId);

  // Mini-formulario de la postulación nueva (CV base): Puesto + Empresa → label "Puesto · Empresa".
  const [puestoInput, setPuestoInput] = useState('');
  const [empresaInput, setEmpresaInput] = useState('');

  useEffect(() => {
    if (jobTarget.jobDescription) {
      const data = extractJobData(jobTarget.jobDescription);
      setExtractedData(data);
      const matched = data.keywords.map(kw => ({
        word: kw,
        found: checkKeywordInCV(kw, cvData)
      }));
      setExtractedKeywords(matched);
    } else {
      setExtractedData(null);
      setExtractedKeywords([]);
    }
  }, [jobTarget.jobDescription, cvData]);

  // Auto-rename "Puesto · Empresa": sólo si el label actual es el provisional
  // ("Nueva postulación"). Si venía un label manual, no se pisa.
  const updateField = (field: string, val: string) => {
    const nextJobTarget = { ...jobTarget, [field]: val };
    const currentLabel = cvData.version_label || cvData.versionLabel;
    const nextLabel = computeApplicationRename(
      currentLabel,
      field === 'jobTitle' ? val : nextJobTarget.jobTitle,
      field === 'companyName' ? val : nextJobTarget.companyName
    );
    if (nextLabel) {
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
        [field]: val
      }
    }));
  };

  const handleOpenAiAnalysis = () => {
    const preset = resolveActivePreset(cvData);
    const sections = cvDataToContentSections(cvData);
    const result = runAtsPreflightCheck(preset, sections, cvData, jobTarget.jobDescription);
    setCvTextForAi(result.linearReadingOrder.join('\n'));
    setIsAiModalOpen(true);
  };

  const handleCreateApplication = async () => {
    if (isCreatingApplication) return;
    setIsCreatingApplication(true);
    const puesto = puestoInput.trim();
    const empresa = empresaInput.trim();
    try {
      if (typeof onCreateApplicationVariant === 'function') {
        // Vía principal: el handler de la app (crea, abre pestaña y aterriza donde corresponde).
        await onCreateApplicationVariant({ puesto, empresa });
        setPuestoInput('');
        setEmpresaInput('');
        return;
      }
      // Fallback canónico (mismo motor) por si el contenedor no pasó el handler.
      const result = await createApplicationVariant(
        { cvData, puesto, empresa },
        {
          saveAs: (data, label) => saveCVAs(label, data),
          ensureTab: (id, docType, data) => ensureDocumentTab(id, docType, data),
        }
      );
      if (!result?.success) {
        showError('No se pudo crear la postulación. El CV base se conservó sin cambios.');
        return;
      }
      setPuestoInput('');
      setEmpresaInput('');
      showSuccess('Se creó una copia independiente. Completá la vacante en esta nueva postulación.');
    } finally {
      setIsCreatingApplication(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-neutral-border)]">
        <Target className="w-5 h-5 text-[var(--color-accent-text)]" />
        <h2 className="text-lg font-semibold text-[var(--color-neutral-text-primary)]">Vacante Objetivo</h2>
      </div>

      {!isApplicationVersion ? (
        <div className="space-y-4 rounded-[var(--ui-radius-card)] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] p-4">
          <p className="text-sm text-[var(--ui-text-primary)]">
            Creá una postulación independiente. Así, la información de la oferta y los cambios para adaptar el CV no se guardan en tu perfil maestro.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Puesto"
              value={puestoInput}
              onChange={(e: any) => setPuestoInput(e.target.value)}
              placeholder="Ej: Desarrollador Frontend Semi Senior"
            />
            <Field
              label="Empresa"
              value={empresaInput}
              onChange={(e: any) => setEmpresaInput(e.target.value)}
              placeholder="Ej: Mercado Libre"
            />
          </div>
          <button
            type="button"
            onClick={handleCreateApplication}
            disabled={isCreatingApplication}
            className={`${button.primary} w-full flex items-center justify-center gap-2`}
          >
            <Briefcase className="w-4 h-4" />
            {isCreatingApplication ? 'Creando postulación…' : 'Crear postulación desde este CV'}
          </button>
          {(puestoInput.trim() || empresaInput.trim()) && (
            <p className="text-[11px] font-semibold text-[var(--ui-text-secondary)]">
              Se llamará: "{buildApplicationVersionLabel(puestoInput, empresaInput)}"
            </p>
          )}
        </div>
      ) : (
        <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--ui-radius-card)] border border-[var(--color-secondary-base)]/30 bg-[var(--color-secondary-muted)] px-3 py-2 text-sm text-[var(--color-secondary-text)]">
        <span>Esta versión está vinculada al CV de origen. La vacante y sus adaptaciones se guardan sólo aquí.</span>
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
      <div className="p-4 bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/30 rounded-[12px] text-sm text-[var(--color-accent-text)] leading-relaxed space-y-2">
        <p>
          <strong>Alineá tu CV con una oferta real.</strong> Pegá el texto del aviso de trabajo acá. El sistema extraerá localmente las palabras clave más importantes (sin enviar datos a IA) y las comparará con tu CV para ver qué te falta.
        </p>
      </div>

      <div className="space-y-4">
        <Field
          label="Cargo / Puesto"
          value={jobTarget.jobTitle || ''}
          onChange={(e: any) => updateField('jobTitle', e.target.value)}
          placeholder="Ej: Desarrollador Frontend Semi Senior"
        />
        <Field
          label="Empresa"
          value={jobTarget.companyName || ''}
          onChange={(e: any) => updateField('companyName', e.target.value)}
          placeholder="Ej: Mercado Libre"
        />
        <div>
          <label className="block text-sm font-semibold mb-1">Descripción del Aviso (Pegar texto completo)</label>
          <textarea
            value={jobTarget.jobDescription || ''}
            onChange={(e) => updateField('jobDescription', e.target.value)}
            placeholder="Pegá acá todo el texto del aviso (requisitos, tareas, beneficios...)"
            rows={6}
            className={`w-full bg-[var(--ui-bg-input)] border border-[var(--ui-border)] rounded-[10px] p-2.5 text-sm focus:outline-none focus:border-[var(--color-accent-base)] resize-y min-h-[120px]`}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleOpenAiAnalysis}
          className={`${button.secondary} py-2 px-4 flex items-center gap-2`}
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
          
          <div className="mt-4 p-3 bg-[var(--ui-bg-page)] rounded text-xs text-[var(--color-neutral-text-secondary)] border border-dashed border-[var(--color-neutral-border)]">
            <strong>¿Dónde agregar las faltantes?</strong> 
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>Si es una herramienta técnica → <em>Habilidades Técnicas / Informática</em></li>
              <li>Si es un verbo de acción o tarea → <em>Viñetas de Experiencia</em></li>
              <li>Si es un concepto general → <em>Resumen Profesional / Objetivo</em></li>
            </ul>
          </div>
        </div>
      )}

      </>
      )}

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
