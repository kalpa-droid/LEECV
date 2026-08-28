import React, { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { CardSheetExportSelector } from '../CardSheetExportSelector';
import { buildCardDataFromCV, BusinessCardData } from '../../../../shared/core/pdf-engine/layers/records/cardDataAdapter';
import { Preset } from '../../../../shared/core/pdf-engine/layers/presets/presetSchema';
import { getPreset } from '../../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { Modal } from '../../../../shared/core/ui/Modal';
import { useToast } from '../../../../shared/core/ui/Toast';
import { withErrorHandling } from '../../../../shared/core/utils/errorHandler';

interface CardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: any;
  presetId?: string;
}

export function CardExportModal({ isOpen, onClose, cvData, presetId = 'tarjeta-personal' }: CardExportModalProps) {
  const { showError } = useToast();
  const [cardData, setCardData] = useState<BusinessCardData | null>(null);
  const [loading, setLoading] = useState(true);

  const preset: Preset = getPreset(presetId);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function prepareCardData() {
      setLoading(true);
      await withErrorHandling(
        async () => {
          const data = await buildCardDataFromCV(cvData);
          if (isMounted) setCardData(data);
        },
        {
          context: 'Preparación de Tarjeta de Presentación',
          errorMessage: 'No se pudieron generar los datos de la tarjeta.',
          notify: (msg) => showError(msg)
        }
      );
      if (isMounted) setLoading(false);
    }

    prepareCardData();
    return () => { isMounted = false; };
  }, [isOpen, cvData]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Impresión de Tarjetas de Presentación"
      icon={<CreditCard className="w-5 h-5 text-[var(--ui-rose)]" />}
      size="lg"
    >
      <div className="space-y-4">
        {loading || !cardData ? (
          <div className="py-12 flex flex-col items-center justify-center text-[var(--ui-text-secondary)] space-y-3">
            <div className="w-8 h-8 border-4 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-[var(--ui-text-primary)]">Generando preview de imposición y QR...</p>
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
