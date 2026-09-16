import { AlertTriangle, Check, ChevronRight, Cloud, Download, FileText, Grid, Grid3X3, GripHorizontal, GripVertical, Image as ImageIcon, Layers, Layout, Monitor, Palette, Plus, RotateCcw, Sparkles, Trash2, User, X } from 'lucide-react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import React from 'react';
import { PanelSection } from '../PanelSection';

import { FIELD_CATALOG } from '../../../../../shared/core/pdf-engine/layers/records/fieldCatalog';
import { Field } from '../../../../../shared/core/ui/Field';


import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { GuardadosSection } from './GuardadosSection';

import { 
  radius,
  elevationSystem,
  typeScale as typography,
  shadow as effects,
  button
} from '../../../../../shared/core/uiDesignSystem';
import { 
  COVER_PRESETS,
  } from '../../../../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';


export const PersonalizadaSection = ({
  cvData,
  setCvData,
  activeTab,
  changeActiveTab,
  showSuccess,
  showWarning,
  triggerPresetTransition,
  getEffectiveCoverFeaturedItems,
  confirm,
  savedList,
  isSavingFromPanel,
  handleSaveFromPanel,
  handleOpenSavedFromPanel,
  handleDeleteSavedFromPanel
}: any) => {
  return (
    <>
      {/* ========================================================================= */}
        {/* PANEL DE EDICIÓN DE UN SLOT DE SECCIÓN PERSONALIZADA (activeTab = personalizada-N) */}
        {/* ========================================================================= */}
        {(() => {
          if (!activeTab || !activeTab.startsWith('personalizada-')) return null;
          const slotId = activeTab;
          const titleText = cvData?.sectionTitleOverrides?.[slotId] || `Sección Personalizada (${slotId})`;
          const activeFields = cvData?.sectionFieldSelection?.[slotId] || ['tituloOGrado', 'institucion', 'periodo', 'descripcion'];

          return (
            <div className="space-y-4">
              <div className={`p-3.5 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] space-y-3 ${elevationSystem.raised}`}>
                <Field
                  label="Nombre de la Sección (así se ve en el PDF)"
                  value={cvData?.sectionTitleOverrides?.[slotId] || ''}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    setCvData((prev: any) => ({
                      ...prev,
                      sectionTitleOverrides: {
                        ...(prev.sectionTitleOverrides || {}),
                        [slotId]: val
                      }
                    }));
                  }}
                  placeholder="Ej: Voluntariado & ONG"
                />

                <div>
                  <p className="text-[11px] font-bold text-[var(--color-neutral-text-secondary)] mb-1.5">
                    ¿Qué campos debe tener cada registro?
                  </p>
                  <div className={`grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[var(--color-neutral-surface-muted)] rounded-[${radius.card}] border border-[var(--color-neutral-border)]`}>
                    {Object.values(FIELD_CATALOG as any).map((f: any) => {
                      const isChecked = activeFields.includes(f.id);
                      return (
                        <label key={f.id} className="flex items-center gap-2 text-[11px] font-bold text-[var(--color-neutral-text-primary)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const updated = isChecked
                                ? (activeFields.length > 1 ? activeFields.filter((id: any) => id !== f.id) : activeFields)
                                : [...activeFields, f.id];
                              setCvData((prev: any) => ({
                                ...prev,
                                sectionFieldSelection: {
                                  ...(prev.sectionFieldSelection || {}),
                                  [slotId]: updated
                                }
                              }));
                            }}
                            className="rounded border-[var(--color-neutral-border)] text-[var(--color-accent-text)]"
                          />
                          <span>{f.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <RecordFormSection
                key={slotId}
                sectionKey={slotId}
                sectionTitle={titleText}
                kindKey="custom"
                customFields={activeFields}
                addLabel={`Agregar Registro a ${titleText}`}
                cvData={cvData}
                setCvData={setCvData}
                fieldName={slotId}
                itemTitlePrefix={titleText}
                onDeleteSection={() => {
                  confirm({
                    title: `¿Eliminar sección '${titleText}'?`,
                    message: 'Se desactivará esta sección y se limpiarán sus registros.',
                    confirmText: 'Eliminar Sección',
                    onConfirm: () => {
                      setCvData((prev: any) => ({
                        ...prev,
                        sectionVisibility: { ...(prev.sectionVisibility || {}), [slotId]: false },
                        sectionTitleOverrides: { ...(prev.sectionTitleOverrides || {}), [slotId]: undefined },
                        [slotId]: []
                      }));
                      changeActiveTab('personales');
                      showSuccess(`Sección '${titleText}' eliminada.`);
                    }
                  });
                }}
                manualAdjustment={<SectionManualAdjustment sectionId={slotId} cvData={cvData} setCvData={setCvData} />}
              />
            </div>
          );
        })()}

        {/* PANEL DE EDICIÓN DE UNA SECCIÓN PERSONALIZADA LEGADO (customSections[]) */}
        {(() => {
          const customIdx = (cvData.customSections || []).findIndex((cs: any) => cs.id === activeTab && cs.id !== 'ecologia');
          if (customIdx === -1) return null;
          const cs = cvData.customSections[customIdx];
          return (
            <RecordFormSection
              key={cs.id}
              sectionKey={cs.id}
              sectionTitle={cs.titleText}
              kindKey="custom"
              customFields={cs.fields}
              addLabel={`Agregar a ${cs.titleText}`}
              cvData={cvData}
              setCvData={setCvData}
              fieldName={`customSections.${customIdx}.records`}
              itemTitlePrefix={cs.titleText}
              onDeleteSection={() => {
                confirm({
                  title: `¿Eliminar sección '${cs.titleText}'?`,
                  message: 'Se eliminarán esta sección y todos sus registros.',
                  confirmText: 'Eliminar Sección',
                  onConfirm: () => {
                    setCvData((prev: any) => ({
                      ...prev,
                      customSections: (prev.customSections || []).filter((s: any) => s.id !== cs.id)
                    }));
                    changeActiveTab('personales');
                    showSuccess(`Sección '${cs.titleText}' eliminada.`);
                  }
                });
              }}
              manualAdjustment={<SectionManualAdjustment sectionId={cs.id} cvData={cvData} setCvData={setCvData} />}
            />
          );
        })()}

        {/* ========================================================================= */}
        {/* TAB 10: CVS GUARDADOS / ABRIR */}
        {/* ========================================================================= */}
        {activeTab === 'guardados' && (
          <GuardadosSection
            savedList={savedList}
            isSavingFromPanel={isSavingFromPanel}
            handleSaveFromPanel={handleSaveFromPanel}
            handleOpenSavedFromPanel={handleOpenSavedFromPanel}
            handleDeleteSavedFromPanel={handleDeleteSavedFromPanel}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: DISEÑO */}
    </>
  );
};
