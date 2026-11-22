import React, { useState } from 'react';
import { Plus, Trash2, Copy, ArrowRightLeft } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { SectionSwitch } from './SectionSwitch';
import { button, elevationSystem } from '../uiDesignSystem';
import {
  getCompatibleTargetSections,
  planRecordMove,
  executeRecordMove,
  type PlannedRecordMove,
} from '../sections/recordReclassificationEngine';

const getNestedValue = (obj: any, path: string) => {
  if (!path) return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const p of parts) {
    if (!curr) return undefined;
    curr = curr[p];
  }
  return curr;
};

const setNestedValue = (obj: any, path: string, newValue: any): any => {
  const parts = path.split('.');
  if (parts.length === 1) {
    if (Array.isArray(obj)) {
      const idx = parseInt(parts[0], 10);
      const copy = [...obj];
      copy[idx] = newValue;
      return copy;
    }
    return { ...(obj || {}), [parts[0]]: newValue };
  }
  const [head, ...tail] = parts;
  if (Array.isArray(obj)) {
    const idx = parseInt(head, 10);
    const copy = [...obj];
    copy[idx] = setNestedValue(copy[idx] || {}, tail.join('.'), newValue);
    return copy;
  }
  return {
    ...(obj || {}),
    [head]: setNestedValue(obj?.[head] || {}, tail.join('.'), newValue)
  };
};

/**
 * RepeatableSection.tsx
 * Generic configurable section component for EditorPanel.tsx.
 * Reduces 1000+ lines of duplicated section code across array fields.
 * Supports dot-notation pathing for nested fields (e.g., 'ecology.rural', 'customSections.0.records').
 */
export function RepeatableSection({
  sectionKey,
  sectionTitle,
  addLabel,
  cvData,
  setCvData,
  fieldName,
  emptyItem = {},
  itemTitlePrefix = 'Registro',
  getItemName = (item: any, idx: number) => item?.title || item?.degree || item?.role || item?.course || item?.level || item?.institution || `Registro #${idx + 1}`,
  designKey = undefined,
  onDeleteSection = undefined,
  manualAdjustment = undefined,
  renderTrailingSlot = undefined,
  renderItem
}: any) {
  const { confirm } = useConfirm();
  const { showSuccess } = useToast();
  const [pendingMove, setPendingMove] = useState<{ itemIndex: number; plan: PlannedRecordMove } | null>(null);
  const compatibleTargets = sectionKey ? getCompatibleTargetSections(sectionKey, cvData) : [];
  const isVisible = cvData?.sectionVisibility?.[sectionKey] !== false;
  const rawItems = getNestedValue(cvData, fieldName);
  const items = Array.isArray(rawItems) ? rawItems : [];

  const applyRecordMove = (itemIndex: number, targetSectionKey: string, mergeOverflowIntoDescription: boolean) => {
    let targetLabel = targetSectionKey;
    setCvData((prev: any) => {
      const res = executeRecordMove(prev, {
        sourceSectionKey: sectionKey,
        sourceFieldName: fieldName,
        itemIndex,
        targetSectionKey,
        mergeOverflowIntoDescription,
      });
      targetLabel = res.targetLabel;
      return res.updatedCvData;
    });
    setPendingMove(null);
    showSuccess(`Registro movido a ${targetLabel}.`);
  };

  const handleRequestMove = (idx: number, targetSectionKey: string) => {
    if (!targetSectionKey) return;
    const item = items[idx];
    const plan = planRecordMove(item, sectionKey, targetSectionKey, cvData);
    if (!plan.compatible) return;
    if (plan.isLossless) {
      applyRecordMove(idx, targetSectionKey, true);
      return;
    }
    setPendingMove({ itemIndex: idx, plan });
  };

  const handleToggleVisibility = () => {
    setCvData((prev: any) => ({
      ...prev,
      sectionVisibility: {
        ...prev.sectionVisibility,
        [sectionKey]: !isVisible
      }
    }));
  };

  const handleAddItem = () => {
    setCvData((prev: any) => {
      const currentList = Array.isArray(getNestedValue(prev, fieldName)) ? getNestedValue(prev, fieldName) : [];
      return setNestedValue(prev, fieldName, [...currentList, { ...emptyItem }]);
    });
  };

  const handleDuplicateItem = (idx: number) => {
    setCvData((prev: any) => {
      const currentList = Array.isArray(getNestedValue(prev, fieldName)) ? getNestedValue(prev, fieldName) : [];
      const itemToCopy = currentList[idx];
      if (!itemToCopy) return prev;

      const duplicatedItem = {
        ...JSON.parse(JSON.stringify(itemToCopy)),
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
      };

      const updatedList = [...currentList];
      updatedList.splice(idx + 1, 0, duplicatedItem);

      return setNestedValue(prev, fieldName, updatedList);
    });
  };

  const handleDeleteItem = (idx: number) => {
    const itemName = getItemName(items[idx], idx);
    confirm({
      title: `¿Eliminar ${itemTitlePrefix}?`,
      message: `¿Estás seguro de que deseas eliminar "${itemName}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: () => {
        setCvData((prev: any) => {
          const currentList = Array.isArray(getNestedValue(prev, fieldName)) ? getNestedValue(prev, fieldName) : [];
          return setNestedValue(prev, fieldName, currentList.filter((_: any, i: number) => i !== idx));
        });
      }
    });
  };

  const handleUpdateItemField = (idx: number, field: string, value: any) => {
    setCvData((prev: any) => {
      const currentList = [...(Array.isArray(getNestedValue(prev, fieldName)) ? getNestedValue(prev, fieldName) : [])];
      if (currentList[idx]) {
        currentList[idx] = { ...currentList[idx], [field]: value };
      }
      return setNestedValue(prev, fieldName, currentList);
    });
  };

  return (
    <div className="space-y-4">
      {/* Single Line Header Toggle & Add Button */}
      <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-[12px] border mb-3 transition ${
        isVisible 
          ? `ui-bg-card ui-border ui-text-primary ${elevationSystem.raised}` 
          : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-muted)] opacity-75'
      }`}>
        <span className="text-xs font-black uppercase tracking-wide">
          {sectionTitle}
        </span>

        <div className="flex items-center gap-2">
          <SectionSwitch
            checked={isVisible}
            label={sectionTitle || sectionKey || 'Sección'}
            size="sm"
            onChange={() => handleToggleVisibility()}
          />

          {isVisible && addLabel && (
            <button
              type="button"
              onClick={handleAddItem}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-brand-hover)] text-[var(--color-accent-on-base)] ${elevationSystem.raised} transition cursor-pointer`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addLabel}</span>
            </button>
          )}

          {onDeleteSection && (
            <button
              type="button"
              onClick={onDeleteSection}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] hover:opacity-80 ${elevationSystem.raised} transition cursor-pointer`}
              title="Eliminar esta sección personalizada"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Sección</span>
            </button>
          )}
        </div>
      </div>



      {/* Item List Rendering */}
      {isVisible && (
        <div className="space-y-4">
          {items.map((item: any, idx: number) => (
            <div key={item.id || item._id || idx} className={`p-3.5 ui-bg-card ui-border ui-text-primary rounded-[16px] border-2 ${elevationSystem.raised} space-y-3`}>
              <div className="flex items-center justify-between pb-1 border-b border-[var(--color-neutral-border)]">
                <span className="text-xs font-bold text-[var(--ui-secondary)]">
                  {itemTitlePrefix} #{idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  {compatibleTargets.length > 0 && (
                    <label
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] hover:border-[var(--color-accent-base)] text-[11px] font-bold transition cursor-pointer"
                      title="Mover este registro a otra sección compatible"
                    >
                      <ArrowRightLeft className="w-3 h-3 text-[var(--color-accent-text)] shrink-0" />
                      <select
                        value=""
                        aria-label={`Mover ${itemTitlePrefix} #${idx + 1} a otra sección`}
                        onChange={(e) => {
                          const targetKey = e.target.value;
                          e.currentTarget.value = '';
                          handleRequestMove(idx, targetKey);
                        }}
                        className="bg-transparent outline-none cursor-pointer text-[11px] font-bold text-[var(--ui-text-primary)] max-w-[115px]"
                      >
                        <option value="" disabled>
                          Mover a…
                        </option>
                        {compatibleTargets.map((target) => (
                          <option key={target.sectionKey} value={target.sectionKey} className="bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]">
                            {target.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDuplicateItem(idx)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)] hover:opacity-80 text-[11px] font-bold transition cursor-pointer"
                    title="Duplicar este registro para crear una copia editable"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Duplicar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(idx)}
                    className="p-1 text-[var(--ui-text-primary)] font-medium hover:text-[var(--color-status-danger-text)] transition cursor-pointer"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {renderItem(item, idx, (field: string, value: any) => handleUpdateItemField(idx, field, value))}
            </div>
          ))}
        </div>
      )}

      {/* Manual Adjustment / Trailing Slot Footer */}
      {isVisible && (manualAdjustment || renderTrailingSlot) && (
        <div className="pt-2">
          {manualAdjustment || (sectionKey && renderTrailingSlot?.(sectionKey))}
        </div>
      )}

      {pendingMove && (
        <Modal
          isOpen={true}
          onClose={() => setPendingMove(null)}
          title={`Mover registro a ${pendingMove.plan.targetLabel}`}
          icon={<ArrowRightLeft className="w-5 h-5 text-[var(--color-accent-text)]" />}
          size="md"
          footer={
            <div className="w-full flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingMove(null)}
                className={`${button.base} ${button.ghost} text-xs px-3 py-1.5`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() =>
                  applyRecordMove(pendingMove.itemIndex, pendingMove.plan.targetSectionKey, false)
                }
                className={`${button.base} ${button.secondary} text-xs px-3 py-1.5`}
              >
                Mover sin campos extra
              </button>
              <button
                type="button"
                onClick={() =>
                  applyRecordMove(pendingMove.itemIndex, pendingMove.plan.targetSectionKey, true)
                }
                className={`${button.base} ${button.primary} text-xs px-3 py-1.5`}
              >
                Mover y guardar datos en Descripción
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs text-[var(--ui-text-primary)]">
            <p className="text-[var(--ui-text-secondary)] leading-relaxed">
              Los siguientes datos existen en <strong>{pendingMove.plan.sourceLabel}</strong> pero no tienen un casillero propio en{' '}
              <strong>{pendingMove.plan.targetLabel}</strong>:
            </p>
            <ul className="space-y-1.5 p-3 rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)]">
              {pendingMove.plan.overflowSummary.map((entry) => (
                <li key={entry.fieldId}>
                  <strong>{entry.label}:</strong> {entry.value}
                </li>
              ))}
            </ul>
            <p className="text-[var(--ui-text-secondary)]">
              Podés conservarlos agregados al final de la <strong>Descripción</strong> en la nueva sección para no perder información.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
