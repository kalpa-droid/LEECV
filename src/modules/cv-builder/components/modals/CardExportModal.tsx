import React, { useEffect, useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import { CardSheetExportSelector } from '../CardSheetExportSelector';
import { buildCardDataFromCV, BusinessCardData } from '../../../../shared/core/pdf-engine/layers/records/cardDataAdapter';
import { Preset } from '../../../../shared/core/pdf-engine/layers/presets/presetSchema';
import { getPreset } from '../../../../shared/core/pdf-engine/layers/presets/presetRegistry';

interface CardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: any;
  presetId?: string;
}

export function CardExportModal({ isOpen, onClose, cvData, presetId = 'tarjeta-personal' }: CardExportModalProps) {
  const [cardData, setCardData] = useState<BusinessCardData | null>(null);
  const [loading, setLoading] = useState(true);

  const preset: Preset = getPreset(presetId);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function prepareCardData() {
      setLoading(true);
      try {
        const data = await buildCardDataFromCV(cvData);
        if (isMounted) setCardData(data);
      } catch (err) {
        console.error('Error preparando datos de tarjeta:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    prepareCardData();
    return () => { isMounted = false; };
  }, [isOpen, cvData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Impresión de Tarjetas de Presentación</h3>
              <p className="text-xs text-slate-400">Configura tu hoja física, márgenes de impresora y corte</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto max-h-[75vh]">
          {loading || !cardData ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-300">Generando preview de imposición y QR...</p>
            </div>
          ) : (
            <CardSheetExportSelector
              preset={preset}
              cardData={cardData}
              onExported={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
