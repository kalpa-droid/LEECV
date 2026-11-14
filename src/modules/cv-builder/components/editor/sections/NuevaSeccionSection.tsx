import { FolderPlus, Plus } from 'lucide-react';
import { Field } from '../../../../../shared/core/ui/Field';
import { FIELD_CATALOG } from '../../../../../shared/core/pdf-engine/layers/records/fieldCatalog';
import React, { useState } from 'react';
import { PanelSection } from '../../../../../shared/core/ui/PanelSection';

import { PresetSectionPicker } from './PresetSectionPicker';

import {
  radius,
  elevationSystem,
  button
} from '../../../../../shared/core/uiDesignSystem';
import { findFreeCustomSlot } from '../../../../../shared/core/sections/activeSectionsDockEngine';

export const NuevaSeccionSection = ({
  cvData,
  setCvData,
  activeTab,
  changeActiveTab,
  showSuccess,
  showWarning,
}: any) => {
  const [selectedFields, setSelectedFields] = useState<string[]>(['tituloOGrado', 'institucion', 'periodo', 'descripcion']);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  return (
    <>
      {activeTab === 'nueva_seccion' && (
          <div className="space-y-6">
            {/* 1. SECCIONES PREDISEÑADAS CON 1 CLIC */}
            <PanelSection icon={<FolderPlus className="w-4 h-4 text-[var(--ui-secondary)]" />} title="Secciones Prediseñadas">
              <div className={`p-3.5 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] space-y-3 ${elevationSystem.raised}`}>
                <PresetSectionPicker
                  cvData={cvData}
                  setCvData={setCvData}
                  showSuccess={showSuccess}
                  showWarning={showWarning}
                  changeActiveTab={changeActiveTab}
                  aMedidaAnchorId="custom-section-creator-form"
                />
              </div>
            </PanelSection>

            {/* 2. CREADOR DE SECCIÓN A MEDIDA */}
            <PanelSection icon={<Plus className="w-4 h-4 text-[var(--ui-rose)]" />} title="Sección a Medida">
              <div id="custom-section-creator-form" className={`p-3.5 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] space-y-4 ${elevationSystem.raised}`}>

                <div>
                  <Field
                    label="Nombre de la Sección Nueva"
                    type="text"
                    value={newSectionTitle}
                    onChange={(e: any) => setNewSectionTitle(e.target.value)}
                    placeholder="Ej: DOCENCIA UNIVERSITARIA, OBRAS DE ARTE"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)] mb-1.5">
                    Seleccionar qué campos tendrá cada registro de esta sección:
                  </label>
                  <div className={`grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-[var(--color-neutral-surface-muted)] rounded-[${radius.card}] border border-[var(--color-neutral-border)]`}>
                    {Object.values(FIELD_CATALOG as any).map((f: any) => {
                      const isChecked = selectedFields.includes(f.id);
                      return (
                        <label key={f.id} className="flex items-center gap-2 text-[11px] font-bold text-[var(--color-neutral-text-primary)] cursor-pointer hover:text-[var(--color-accent-base)]">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                if (selectedFields.length > 1) {
                                  setSelectedFields(prev => prev.filter(id => id !== f.id));
                                } else {
                                  showWarning('Debes mantener al menos 1 campo seleccionado.');
                                }
                              } else {
                                setSelectedFields(prev => [...prev, f.id]);
                              }
                            }}
                            className="rounded border-[var(--color-neutral-border)] text-[var(--color-accent-text)] focus:ring-[var(--color-accent-base)]"
                          />
                          <span>{f.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!newSectionTitle.trim()) {
                      showWarning('Por favor ingresa un nombre para la sección.');
                      return;
                    }
                    if (selectedFields.length === 0) {
                      showWarning('Debes seleccionar al menos 1 campo para los registros de la sección.');
                      return;
                    }
                    const freeSlot = findFreeCustomSlot(cvData);

                    if (!freeSlot) {
                      showWarning('Ya usaste las 5 secciones personalizadas disponibles. Podés reutilizar una existente cambiando su nombre.');
                      return;
                    }

                    const titleText = newSectionTitle.trim();
                    setCvData((prev: any) => ({
                      ...prev,
                      sectionVisibility: { ...(prev.sectionVisibility || {}), [freeSlot]: true },
                      sectionTitleOverrides: { ...(prev.sectionTitleOverrides || {}), [freeSlot]: titleText },
                      sectionFieldSelection: { ...(prev.sectionFieldSelection || {}), [freeSlot]: [...selectedFields] },
                      [freeSlot]: prev[freeSlot]?.length ? prev[freeSlot] : [{}],
                      layout: {
                        ...(prev.layout || {}),
                        columnAssignments: {
                          ...(prev.layout?.columnAssignments || {}),
                          [freeSlot]: 'primaria'
                        },
                        sectionOrders: {
                          ...(prev.layout?.sectionOrders || {}),
                          primaria: [...(prev.layout?.sectionOrders?.primaria || []), freeSlot]
                        }
                      }
                    }));

                    setNewSectionTitle('');
                    showSuccess(`Sección '${titleText}' creada exitosamente.`);
                    changeActiveTab(freeSlot);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--color-secondary-base)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-secondary-on-base)] text-xs font-black rounded-[${radius.card}] ${elevationSystem.raised} transition cursor-pointer`}
                >
                  <Plus className="w-4 h-4" /> Crear e Integrar Sección al CV
                </button>
              </div>

              {/* Secciones Personalizadas Activas (Slots del Núcleo) */}
              {(() => {
                const customSlots = ['personalizada-1', 'personalizada-2', 'personalizada-3', 'personalizada-4', 'personalizada-5'] as const;
                // Un slot "activo" es el que tiene título propio o registros —
                // no alcanza con que un formato lo haya encendido vacío.
                const activeSlots = customSlots.filter(
                  (s) => !!cvData?.sectionTitleOverrides?.[s] || (Array.isArray(cvData?.[s]) && cvData[s].length > 0)
                );
                if (activeSlots.length === 0 && (!cvData?.customSections || cvData.customSections.length === 0)) return null;

                return (
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-black text-[var(--color-neutral-text-primary)] uppercase border-b pb-1 border-[var(--color-neutral-border)]">
                      Tus Secciones Personalizadas ({activeSlots.length + (cvData?.customSections?.length || 0)})
                    </h4>

                    {activeSlots.map((slotId) => (
                      <div key={slotId} className={`p-3 bg-[var(--color-neutral-surface-muted)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] flex items-center justify-between`}>
                        <span className="text-xs font-black text-[var(--ui-rose)] uppercase">
                          {cvData?.sectionTitleOverrides?.[slotId] || slotId}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeActiveTab(slotId)}
                          className={`px-3 py-1 font-bold text-xs rounded-[${radius.card}] transition cursor-pointer ${button.primary}`}
                        >
                          Editar Registros →
                        </button>
                      </div>
                    ))}

                    {(cvData?.customSections || []).map((cs: any) => (
                      <div key={cs.id} className={`p-3 bg-[var(--color-neutral-surface-muted)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] flex items-center justify-between`}>
                        <span className="text-xs font-black text-[var(--ui-rose)] uppercase">
                          {cs.titleText}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeActiveTab(cs.id)}
                          className={`px-3 py-1 font-bold text-xs rounded-[${radius.card}] transition cursor-pointer ${button.primary}`}
                        >
                          Editar Registros →
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </PanelSection>
          </div>
        )}
    </>
  );
};
