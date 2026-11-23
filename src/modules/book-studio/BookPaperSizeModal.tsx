import React from 'react';
import { ArrowLeftRight, FileText } from 'lucide-react';
import { Modal } from '../../shared/core/ui/Modal';
import { ActionGrid } from '../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../shared/core/ui/ActionTileButton';
import { ContextualGuideBox } from '../../shared/core/ui/ContextualGuideBox';
import { ManualOverrideBadge } from '../../shared/core/ui/ManualOverrideBadge';
import { UI_ICON_IDS } from '../../shared/core/ui/iconCatalog';
import { button } from '../../shared/core/uiDesignSystem';
import { isManuallyOverridden } from '../../shared/core/presets/configCascadeEngine';
import { emitLidioMessage } from '../../shared/core/assistant/lidioBus';
import {
  BOOK_PAPER_SPECS,
  BOOK_PRINT_PROFILES,
  BookPaperSizeId,
  clearBookFieldManual,
  inferBookPrintTarget,
  markBookFieldManual,
} from './domain/bookPrintProfileEngine';
import { BookImpositionOptions } from './domain/impositionEngine';

export interface BookPaperSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  onSwitchTarget?: () => void;
}

export const BookPaperSizeModal: React.FC<BookPaperSizeModalProps> = ({
  isOpen,
  onClose,
  options,
  setOptions,
  onSwitchTarget,
}) => {
  const activeTarget = inferBookPrintTarget(options);
  const profile = BOOK_PRINT_PROFILES[activeTarget];
  const currentPaper = (options.paperSize || profile.defaults.paperSize) as BookPaperSizeId;
  const paperIsManual = isManuallyOverridden(options, 'paperSize');
  const paperConflict = !profile.allowedPaperSizes.includes(currentPaper);

  const paperList: BookPaperSizeId[] = profile.allowedPaperSizes.includes(currentPaper)
    ? profile.allowedPaperSizes
    : [currentPaper, ...profile.allowedPaperSizes];

  const handleSelectPaper = (paperId: BookPaperSizeId) => {
    const spec = BOOK_PAPER_SPECS[paperId] || BOOK_PAPER_SPECS.A4;
    setOptions((prev) => {
      const updated = { ...prev, paperSize: paperId };
      return paperId === profile.defaults.paperSize
        ? clearBookFieldManual(updated, 'paperSize')
        : markBookFieldManual(updated, 'paperSize');
    });
    emitLidioMessage({
      kind: 'state',
      groupKey: 'book-paper-size',
      title: `Hoja cambiada a ${spec.pageSize.name}`,
      body: `${spec.shortTitle} ${spec.technicalParen} lista para armar tu libro.`,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={<FileText className="w-4 h-4" />}
      title="Hoja donde vas a imprimir"
      helpTitle="Elección de papel global"
      helpText="Mostramos las hojas compatibles con el destino elegido en la barra superior. Si seleccionás una distinta a la sugerida, queda protegida ante cambios automáticos."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--ui-text-primary)]">
              Opciones para: {profile.shortName}
            </span>
            <ManualOverrideBadge
              isOverridden={paperIsManual}
              globalLabel={profile.shortName}
              hasConflict={paperConflict}
              conflictHelpText={`Conservaste esta hoja manualmente al pasar a "${profile.shortName}".`}
              onReset={() => setOptions((prev) => clearBookFieldManual(prev, 'paperSize'))}
            />
          </div>

          {onSwitchTarget && (
            <button
              type="button"
              onClick={onSwitchTarget}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] hover:border-[var(--color-accent-base)] text-[11px] font-bold text-[var(--color-accent-text)] cursor-pointer transition-colors"
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>Cambiar Casa / Imprenta</span>
            </button>
          )}
        </div>

        <ContextualGuideBox title="Cómo elegir sin equivocarte">
          Revisá la etiqueta de la resma o la bandeja de tu impresora. En casa suele usarse hoja común; en imprenta suelen pedir hojas dobles o más amplias.
        </ContextualGuideBox>

        <ActionGrid columns={2}>
          {paperList.map((paperId) => {
            const spec = BOOK_PAPER_SPECS[paperId] || BOOK_PAPER_SPECS.A4;
            return (
              <ActionTileButton
                key={paperId}
                role="preset"
                iconId={UI_ICON_IDS.disenoHoja}
                label={spec.shortTitle}
                badge={spec.pageSize.name}
                helpText={`${spec.technicalParen} — ${spec.usageSubtitle}`}
                helpGroupKey={`book-paper-${paperId}`}
                active={currentPaper === paperId}
                onClick={() => handleSelectPaper(paperId)}
              />
            );
          })}
        </ActionGrid>

        <div className="flex justify-end pt-2 border-t border-[var(--ui-border)]">
          <button
            type="button"
            onClick={onClose}
            className={`${button.base} ${button.primary}`}
          >
            Listo
          </button>
        </div>
      </div>
    </Modal>
  );
};
