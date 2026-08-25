import React from 'react';
import { Modal } from '../../../shared/core/ui/Modal';
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { AtsPreflightResult } from '../../../shared/core/pdf-engine/layers/ats/atsPreflightCheck';

export interface AtsCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AtsPreflightResult;
  onExportAtsPdf?: () => void;
}

export function AtsCheckModal({
  isOpen,
  onClose,
  result,
  onExportAtsPdf
}: AtsCheckModalProps) {
  const getScoreBadge = (score: number) => {
    if (score >= 85) {
      return { label: 'Excelente Compatibilidad', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60' };
    }
    if (score >= 60) {
      return { label: 'Compatibilidad Media', color: 'bg-amber-950/80 text-amber-300 border-amber-700/60' };
    }
    return { label: 'Requiere Atención', color: 'bg-red-950/80 text-red-300 border-red-700/60' };
  };

  const scoreBadge = getScoreBadge(result.score);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Diagnóstico de Compatibilidad ATS"
      icon={<Sparkles className="w-5 h-5 text-amber-400" />}
      size="xl"
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>

          {onExportAtsPdf && (
            <button
              onClick={() => {
                onClose();
                onExportAtsPdf();
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Exportar Versión ATS (1 Columna)</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Score Header */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-bold">Puntaje Estimado de Lectura ATS</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-white">{result.score} / 100</span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${scoreBadge.color}`}>
                {scoreBadge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Warnings List */}
        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
          {result.warnings.length === 0 ? (
            <div className="p-6 text-center text-emerald-400 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
              <p className="font-black text-sm">¡Excelente! Tu currículum cumple con las pautas ATS.</p>
              <p className="text-xs text-emerald-300/80">No se detectaron interferencias en el flujo de lectura lineal.</p>
            </div>
          ) : (
            result.warnings.map((w) => (
              <div
                key={w.id}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  {w.level === 'critical' ? (
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  )}
                  <p className="text-xs font-black text-slate-200">{w.title}</p>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{w.description}</p>
                <p className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 flex-shrink-0" />
                  <span>{w.recommendation}</span>
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
