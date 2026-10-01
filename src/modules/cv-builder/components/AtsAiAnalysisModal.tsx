import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Wand2, ArrowRight } from 'lucide-react';
import { button } from '../../../shared/core/uiDesignSystem';
import { Modal } from '../../../shared/core/ui/Modal';
import { runAiAtsAnalysis, AtsAiAnalysisResult, AtsAiFinding } from '../../../shared/core/pdf-engine/layers/ats/atsAiAnalysis';
import { useToast } from '../../../shared/core/ui/Toast';

export interface AtsAiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: any;
  cvText: string;
  jobDescription?: string;
  onUpdateCvData: (newData: any) => void;
}

function replaceTextDeep(obj: any, search: string, replace: string): { newObj: any, found: boolean } {
  let found = false;
  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ');
  const normSearch = normalize(search);

  function walk(current: any): any {
    if (typeof current === 'string') {
      if (normalize(current).includes(normSearch)) {
        found = true;
        if (current.includes(search)) {
           return current.replace(search, replace);
        } else {
           const regexStr = search.trim().split(/\s+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
           const regex = new RegExp(regexStr, 'g');
           if (regex.test(current)) {
              return current.replace(regex, replace);
           }
           if (normalize(current) === normSearch) {
              return replace;
           }
        }
      }
      return current;
    }
    if (Array.isArray(current)) {
      return current.map(item => walk(item));
    }
    if (current !== null && typeof current === 'object') {
      const newObj: any = {};
      for (const key in current) {
        if (key === 'id' || key === 'tabId' || key.toLowerCase().includes('id')) {
          newObj[key] = current[key];
        } else {
          newObj[key] = walk(current[key]);
        }
      }
      return newObj;
    }
    return current;
  }
  
  const newObj = walk(obj);
  return { newObj, found };
}

export function AtsAiAnalysisModal({
  isOpen,
  onClose,
  cvData,
  cvText,
  jobDescription,
  onUpdateCvData
}: AtsAiAnalysisModalProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AtsAiAnalysisResult | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [notFoundIds, setNotFoundIds] = useState<Set<string>>(new Set());
  const { showSuccess, showError, showWarning } = useToast();

  useEffect(() => {
    if (isOpen && !result && loading) {
      runAiAtsAnalysis(cvText, jobDescription)
        .then(res => {
          setResult(res);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          showError('Error al analizar el CV con IA.');
          onClose();
        });
    }
  }, [isOpen, cvText, jobDescription]);

  if (!isOpen) return null;

  const handleApply = (finding: AtsAiFinding) => {
    if (!finding.originalText || !finding.suggestedText) return;
    
    const { newObj, found } = replaceTextDeep(cvData, finding.originalText, finding.suggestedText);
    
    if (found) {
      onUpdateCvData(newObj);
      setAppliedIds(prev => new Set(prev).add(finding.id));
      showSuccess('Texto actualizado correctamente.');
    } else {
      setNotFoundIds(prev => new Set(prev).add(finding.id));
      showWarning('No pudimos ubicar este texto automáticamente, por favor copialo manualmente.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Análisis ATS Inteligente"
      icon={<Wand2 className="w-5 h-5 text-[var(--color-primary-base)]" />}
      size="xl"
    >
      <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-[var(--color-neutral-text-secondary)]">
              <div className="w-8 h-8 border-4 border-[var(--color-primary-base)] border-t-transparent rounded-full animate-spin"></div>
              <p>Analizando CV y vacante con IA...</p>
            </div>
          ) : result ? (
            <>
              <div className="flex items-center justify-between p-4 bg-[var(--ui-bg-page)] rounded-[var(--ui-radius-card)] border border-[var(--ui-border)]">
                <div>
                  <h4 className="font-bold">Puntuación Semántica</h4>
                  <p className="text-sm text-[var(--color-neutral-text-secondary)]">Alineación con la vacante</p>
                </div>
                <div className={`text-2xl font-black ${result.semanticScore >= 80 ? 'text-[var(--color-success-base)]' : result.semanticScore >= 50 ? 'text-[var(--color-warning-base)]' : 'text-[var(--color-danger-base)]'}`}>
                  {result.semanticScore}%
                </div>
              </div>

              {result.findings.length === 0 ? (
                <div className="text-center p-6 bg-[var(--color-success-muted)] text-[var(--color-success-text)] rounded-[var(--ui-radius-card)]">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
                  <p className="font-medium">¡Excelente! Tu CV está muy bien alineado.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {result.findings.map(finding => {
                    const isApplied = appliedIds.has(finding.id);
                    const isNotFound = notFoundIds.has(finding.id);
                    
                    return (
                      <div key={finding.id} className="p-4 bg-[var(--ui-bg-page)] rounded-[var(--ui-radius-card)] border border-[var(--ui-border)] space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-[var(--color-warning-base)] flex-shrink-0 mt-0.5" />
                          <div>
                            <h5 className="font-bold text-[var(--color-neutral-text-primary)]">{finding.title}</h5>
                            <p className="text-sm text-[var(--color-neutral-text-secondary)]">{finding.detail}</p>
                          </div>
                        </div>

                        {finding.originalText && finding.suggestedText && (
                          <div className="mt-3 pl-7 space-y-2">
                            <div className="p-2 bg-[var(--color-danger-muted)] text-[var(--color-danger-text)] text-xs rounded border border-[var(--color-danger-base)]/20 line-through opacity-80">
                              {finding.originalText}
                            </div>
                            <div className="flex items-center justify-center text-[var(--color-neutral-text-secondary)]">
                              <ArrowRight className="w-4 h-4" />
                            </div>
                            <div className="p-2 bg-[var(--color-success-muted)] text-[var(--color-success-text)] text-xs rounded border border-[var(--color-success-base)]/20 font-medium">
                              {finding.suggestedText}
                            </div>
                            
                            <div className="pt-2 flex justify-end">
                              <button
                                onClick={() => handleApply(finding)}
                                disabled={isApplied}
                                className={`${button.primary} py-1.5 px-3 text-xs ${isApplied ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {isApplied ? 'Aplicado' : isNotFound ? 'Reintentar Aplicar' : 'Aplicar Sugerencia'}
                              </button>
                            </div>
                            {isNotFound && !isApplied && (
                              <p className="text-xs text-[var(--color-warning-text)] text-right">
                                No pudimos ubicar este texto automáticamente, copialo manualmente.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
      </div>
    </Modal>
  );
}
