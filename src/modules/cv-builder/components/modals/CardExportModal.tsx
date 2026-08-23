import React, { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { CardSheetExportSelector } from '../CardSheetExportSelector';
import { buildCardDataFromCV, BusinessCardData } from '../../../../shared/core/pdf-engine/layers/records/cardDataAdapter';
import { Preset } from '../../../../shared/core/pdf-engine/layers/presets/presetSchema';
import { getPreset } from '../../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { Modal } from '../../../../shared/core/ui/Modal';

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Impresión de Tarjetas de Presentación"
      icon={<CreditCard className="w-5 h-5 text-rose-400" />}
      size="lg"
    >
      <div className="space-y-4">
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
    </Modal>
  );
}
