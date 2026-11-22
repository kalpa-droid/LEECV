/**
 * MODAL UNIFICADO DE REGIÓN Y ESTÁNDAR GLOBAL DEL CV (FormatConfirmationModal.tsx)
 *
 * Promovido a la barra superior junto al diagnóstico ATS (`🌐 <Región>`).
 * Permite elegir el estándar internacional (Global, ATS 1 Col, US Resume, Europass,
 * Tech, LATAM) y decidir cómo reorganizar la vista previa sin eliminar jamás datos.
 */

import React, { useEffect, useState } from 'react';
import { FileText, Layout, Layers, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../../shared/core/ui/Modal';
import { LidioHelpTrigger } from '../../../shared/core/ui/LidioHelpTrigger';
import { DomSectionIcon } from '../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from '../../../shared/core/ui/iconCatalog';
import {
  getAllCvFormats,
  getCvFormat,
} from '../../../shared/core/formats/cvFormatRegistry';
import { button, elevationSystem } from '../../../shared/core/uiDesignSystem';
import { t } from '../../../shared/i18n/useText';

export type FormatApplicationMode = 'curated' | 'reorder-only' | 'full-20-sections';

export interface FormatConfirmationModalProps {
  isOpen: boolean;
  initialFormatId?: string;
  formatName?: string;
  onClose: () => void;
  onConfirm: (mode: FormatApplicationMode, selectedFormatId: string) => void;
}

export const FormatConfirmationModal: React.FC<FormatConfirmationModalProps> = ({
  isOpen,
  initialFormatId = 'estandar-completo',
  formatName,
  onClose,
  onConfirm,
}) => {
  const [selectedFormatId, setSelectedFormatId] = useState<string>(initialFormatId);
  const [selectedMode, setSelectedMode] = useState<FormatApplicationMode>('curated');

  useEffect(() => {
    if (isOpen) {
      setSelectedFormatId(initialFormatId || 'estandar-completo');
    }
  }, [isOpen, initialFormatId]);

  const formats = getAllCvFormats();
  const activeFmt = getCvFormat(selectedFormatId);

  const handleApply = () => {
    onConfirm(selectedMode, selectedFormatId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={<DomSectionIcon iconId={UI_ICON_IDS.region} size={18} />}
      title={formatName ? `Estándar: ${formatName}` : '¿Para qué país o estándar es este CV?'}
      helpText="Elegí el estándar según dónde enviás el CV (EE.UU., Europa, LATAM o lectura automática ATS). Cambiar de región nunca elimina tus datos cargados."
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            onClick={onClose}
            className={`${button.secondary} cursor-pointer px-4 py-2 text-xs`}
          >
            {t.common.actions.cancel}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className={`${button.primary} cursor-pointer px-4 py-2 text-xs`}
          >
            Aplicar {activeFmt.shortBadge}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Aviso breve de no destrucción de datos */}
        <div className="rounded-[12px] border border-[var(--color-status-success-base)]/35 bg-[var(--color-status-success-muted)] px-3 py-2 flex items-center gap-2 text-[12px] font-semibold text-[var(--color-status-success-text)]">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{t.modals.formatConfirmation.noDataLoss}</span>
        </div>

        {/* Selector de Región en 2 columnas limpias (icono/insignia + nombre + ?) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-neutral-text-secondary)]">
              1. Estándar regional
            </span>
            <LidioHelpTrigger
              size="xs"
              title="Estándar regional"
              text="Por ejemplo, EE.UU. oculta foto y edad por ley anti-sesgos; Europass prioriza idiomas; LATAM permite perfil clásico completo y foto."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {formats.map((fmt) => {
              const isSelected = fmt.id === selectedFormatId;
              return (
                <div
                  key={fmt.id}
                  className={`relative rounded-[12px] border transition-all ${
                    isSelected
                      ? `border-2 border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] ${elevationSystem.raised}`
                      : 'border-[var(--color-neutral-border)] bg-[var(--ui-btn-outline-bg)] hover:border-[var(--color-accent-base)]/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedFormatId(fmt.id)}
                    className="w-full p-2.5 pr-9 text-left flex items-start gap-2.5 cursor-pointer"
                  >
                    <span
                      className={`mt-0.5 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                        isSelected
                          ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                          : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)]'
                      }`}
                    >
                      {fmt.shortBadge}
                    </span>
                    <span className="text-[12px] font-bold leading-snug text-[var(--color-neutral-text-primary)] line-clamp-2">
                      {fmt.name}
                    </span>
                  </button>
                  <div className="absolute top-2.5 right-2 z-10">
                    <LidioHelpTrigger
                      size="xs"
                      title={fmt.name}
                      text={fmt.description}
                      groupKey={`fmt-help-${fmt.id}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selector de modo de aplicación limpio */}
        <div className="space-y-2 pt-2 border-t border-[var(--color-neutral-border)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-neutral-text-secondary)]">
              2. Cómo acomodar tus secciones
            </span>
            <LidioHelpTrigger
              size="xs"
              title="Cómo acomodar secciones"
              text="Podés activar solo lo recomendado para esta región, reordenar lo que ya tenés visible, o mostrar todas las secciones disponibles."
            />
          </div>

          <div className="space-y-2">
            {[
              {
                id: 'curated' as FormatApplicationMode,
                title: t.modals.formatConfirmation.option1Title,
                help: t.modals.formatConfirmation.option1Sub,
                badge: t.modals.formatConfirmation.recommended,
                Icon: FileText,
              },
              {
                id: 'reorder-only' as FormatApplicationMode,
                title: t.modals.formatConfirmation.option2Title,
                help: t.modals.formatConfirmation.option2Sub,
                Icon: Layout,
              },
              {
                id: 'full-20-sections' as FormatApplicationMode,
                title: t.modals.formatConfirmation.option3Title,
                help: t.modals.formatConfirmation.option3Sub,
                Icon: Layers,
              },
            ].map(({ id, title, help, badge, Icon }) => {
              const selected = selectedMode === id;
              return (
                <div
                  key={id}
                  className={`relative rounded-[12px] border transition-all ${
                    selected
                      ? 'border-2 border-[var(--color-accent-base)] bg-[var(--color-accent-muted)]'
                      : 'border-[var(--color-neutral-border)] bg-[var(--ui-btn-outline-bg)] hover:border-[var(--color-neutral-border-strong)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedMode(id)}
                    className="w-full p-2.5 pr-9 flex items-center gap-2.5 text-left cursor-pointer"
                  >
                    <span
                      className={
                        selected
                          ? 'text-[var(--color-accent-text)] shrink-0'
                          : 'text-[var(--color-neutral-text-secondary)] shrink-0'
                      }
                    >
                      {selected ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </span>
                    <span className="text-[12px] font-bold text-[var(--color-neutral-text-primary)] truncate">
                      {title}
                    </span>
                    {badge && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] shrink-0">
                        {badge}
                      </span>
                    )}
                  </button>
                  <div className="absolute top-2.5 right-2 z-10">
                    <LidioHelpTrigger
                      size="xs"
                      title={title}
                      text={help}
                      groupKey={`fmt-mode-${id}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FormatConfirmationModal;
