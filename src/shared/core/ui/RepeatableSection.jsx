import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
  renderItem
}) {
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
          ? 'bg-white border-[#EFE2C9] text-[#2B1B2E] shadow-sm' 
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
                ? 'bg-[#00A8A0] text-white hover:bg-[#00877F]'
                : 'bg-slate-400 text-white hover:bg-slate-500'
            }`}
          >
            <span>{isVisible ? 'ACTIVADA' : 'DESACTIVADA'}</span>
          </button>

          {isVisible && addLabel && (
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[#FF2E63] hover:bg-[#E31555] text-white shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Item List Rendering */}
      {isVisible && (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="p-3.5 bg-white rounded-2xl border-2 border-[#EFE2C9] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-1 border-slate-200">
                <span className="text-xs font-bold text-[#00A8A0]">
                  {itemTitlePrefix} #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(idx)}
                  className="p-1 text-[#2B1B2E] font-medium hover:text-red-600 transition cursor-pointer"
                  title="Eliminar registro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {renderItem(item, idx, (field, value) => handleUpdateItemField(idx, field, value))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
