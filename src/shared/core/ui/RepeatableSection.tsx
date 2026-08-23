import React from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';

/**
 * RepeatableSection.jsx
 * Generic configurable section component for EditorPanel.jsx.
 * Reduces 1000+ lines of duplicated section code across array fields.
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
  getItemName = (item, idx) => item.title || item.degree || item.role || item.course || item.level || item.institution || `Ítem #${idx + 1}`,
  designKey = undefined,
  renderItem
}: any) {
  const { confirm } = useConfirm();
  const isVisible = cvData?.sectionVisibility?.[sectionKey] !== false;
  const items = Array.isArray(cvData?.[fieldName]) ? cvData[fieldName] : [];

  const handleToggleVisibility = () => {
    setCvData(prev => ({
      ...prev,
      sectionVisibility: {
        ...prev.sectionVisibility,
        [sectionKey]: !isVisible
      }
    }));
  };

  const handleAddItem = () => {
    setCvData(prev => ({
      ...prev,
      [fieldName]: [...(Array.isArray(prev[fieldName]) ? prev[fieldName] : []), { ...emptyItem }]
    }));
  };

  const handleDuplicateItem = (idx) => {
    setCvData(prev => {
      const currentList = Array.isArray(prev[fieldName]) ? prev[fieldName] : [];
      const itemToCopy = currentList[idx];
      if (!itemToCopy) return prev;

      const duplicatedItem = {
        ...JSON.parse(JSON.stringify(itemToCopy)),
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
      };

      const updatedList = [...currentList];
      updatedList.splice(idx + 1, 0, duplicatedItem);

      return {
        ...prev,
        [fieldName]: updatedList
      };
    });
  };

  const handleDeleteItem = (idx) => {
    const itemName = getItemName(items[idx], idx);
    confirm({
      title: `¿Eliminar ${itemTitlePrefix}?`,
      message: `¿Estás seguro de que deseas eliminar "${itemName}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: () => {
        setCvData(prev => ({
          ...prev,
          [fieldName]: (Array.isArray(prev[fieldName]) ? prev[fieldName] : []).filter((_, i) => i !== idx)
        }));
      }
    });
  };

  const handleUpdateItemField = (idx, field, value) => {
    setCvData(prev => {
      const updated = [...(Array.isArray(prev[fieldName]) ? prev[fieldName] : [])];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return { ...prev, [fieldName]: updated };
    });
  };

  return (
    <div className="space-y-4">
      {/* Single Line Header Toggle & Add Button */}
      <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border mb-3 transition ${
        isVisible 
          ? 'ui-bg-card ui-border ui-text-primary shadow-sm' 
          : 'bg-slate-200 border-slate-300 text-slate-500 opacity-75'
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
                : 'bg-slate-400 text-white hover:bg-slate-500'
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
        </div>
      </div>

      {isVisible && designKey && (
        <div className="p-2.5 ui-bg-card ui-border ui-text-primary rounded-xl border mb-3 flex items-center justify-between text-xs">
          <span className="font-bold">Estilo de Contenedores ({sectionTitle})</span>
          <select
            value={cvData.recordCardDesigns?.[designKey] || 'accent-card'}
            onChange={(e) => setCvData(prev => ({
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
          {items.map((item, idx) => (
            <div key={idx} className="p-3.5 ui-bg-card ui-border ui-text-primary rounded-2xl border-2 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-1 border-slate-200">
                <span className="text-xs font-bold text-[var(--color-secondary-base)]">
                  {itemTitlePrefix} #{idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDuplicateItem(idx)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 text-[11px] font-bold transition cursor-pointer"
                    title="Duplicar este registro para crear una copia editable"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Duplicar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(idx)}
                    className="p-1 text-[var(--color-neutral-text-primary)] font-medium hover:text-red-600 transition cursor-pointer"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {renderItem(item, idx, (field, value) => handleUpdateItemField(idx, field, value))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
