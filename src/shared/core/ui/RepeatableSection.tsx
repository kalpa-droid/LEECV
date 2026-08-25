import React from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';

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
  getItemName = (item: any, idx: number) => item?.title || item?.degree || item?.role || item?.course || item?.level || item?.institution || `Ítem #${idx + 1}`,
  designKey = undefined,
  onDeleteSection = undefined,
  renderItem
}: any) {
  const { confirm } = useConfirm();
  const isVisible = cvData?.sectionVisibility?.[sectionKey] !== false;
  const rawItems = getNestedValue(cvData, fieldName);
  const items = Array.isArray(rawItems) ? rawItems : [];

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
      <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border mb-3 transition ${
        isVisible 
          ? 'ui-bg-card ui-border ui-text-primary shadow-sm' 
          : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-muted)] opacity-75'
      }`}>
        <span className="text-xs font-black uppercase tracking-wide">
          {sectionTitle}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleVisibility}
            className={`px-3 py-1 rounded-full text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
              isVisible
                ? 'bg-[var(--color-secondary-base)] text-white hover:bg-[var(--color-secondary-hover)]'
                : 'bg-[var(--color-neutral-text-muted)] text-white hover:opacity-80'
            }`}
          >
            <span>{isVisible ? 'ACTIVADA' : 'DESACTIVADA'}</span>
          </button>

          {isVisible && addLabel && (
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-brand-hover)] text-white shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addLabel}</span>
            </button>
          )}

          {onDeleteSection && (
            <button
              type="button"
              onClick={onDeleteSection}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] hover:opacity-80 shadow-sm transition cursor-pointer"
              title="Eliminar esta sección personalizada"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Sección</span>
            </button>
          )}
        </div>
      </div>

      {isVisible && designKey && (
        <div className="p-2.5 ui-bg-card ui-border ui-text-primary rounded-xl border mb-3 flex items-center justify-between text-xs">
          <span className="font-bold">Estilo de Contenedores ({sectionTitle})</span>
          <select
            value={cvData.recordCardDesigns?.[designKey] || 'accent-card'}
            onChange={(e) => setCvData((prev: any) => ({
              ...prev,
              recordCardDesigns: { ...(prev.recordCardDesigns || {}), [designKey]: e.target.value }
            }))}
            className="text-xs p-1.5 rounded-lg ui-bg-card ui-border ui-text-primary font-bold outline-none cursor-pointer"
          >
            <option value="accent-card">🎨 Borde Acento</option>
            <option value="primary-card">🔷 Borde Primario</option>
            <option value="neutral-card">⚪ Borde Neutro</option>
          </select>
        </div>
      )}

      {/* Item List Rendering */}
      {isVisible && (
        <div className="space-y-4">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="p-3.5 ui-bg-card ui-border ui-text-primary rounded-2xl border-2 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--color-neutral-border)]">
                <span className="text-xs font-bold text-[var(--color-secondary-base)]">
                  {itemTitlePrefix} #{idx + 1}
                </span>
                <div className="flex items-center gap-1">
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
                    className="p-1 text-[var(--color-neutral-text-primary)] font-medium hover:text-[var(--color-status-danger-text)] transition cursor-pointer"
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
    </div>
  );
}
