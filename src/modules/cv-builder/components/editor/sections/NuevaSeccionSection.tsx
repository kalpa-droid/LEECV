import { AlertTriangle, Check, ChevronRight, Cloud, Download, FileText, Grid, Grid3X3, GripHorizontal, GripVertical, Image as ImageIcon, Layers, Layout, Monitor, Palette, Plus, RotateCcw, Sparkles, Trash2, User, X } from 'lucide-react';
import { Field } from '../../../../../shared/core/ui/Field';
import { FIELD_CATALOG } from '../../../../../shared/core/pdf-engine/layers/records/fieldCatalog';
import React, { useState } from 'react';
import { PanelSection } from '../PanelSection';

import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { GuardadosSection } from './GuardadosSection';

import { 
  radius,
  elevationSystem,
  typeScale as typography,
  shadow as effects,
  button
} from '../../../../../shared/core/uiDesignSystem';

export const NuevaSeccionSection = ({
  cvData,
  setCvData,
  activeTab,
  changeActiveTab,
  showSuccess,
  showWarning,
  triggerPresetTransition,
  getEffectiveCoverFeaturedItems,
  }: any) => {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  return (
    <>
      {activeTab === 'nueva_seccion' && (
          <div className="space-y-6">
            {/* 1. SECCIONES PREDISEÑADAS CON 1 CLIC */}
            <PanelSection icon={<Sparkles className="w-4 h-4 text-[var(--ui-secondary)]" />} title="Secciones Prediseñadas">
              <div className={`p-3.5 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] space-y-3 ${elevationSystem.raised}`}>
                <p className="text-[11px] text-[var(--color-neutral-text-secondary)] font-medium leading-relaxed">
                  Haz clic en cualquiera de estas secciones para agregarla instantáneamente a tu currículum con sus campos listos para completar:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    {
                      id: 'redes',
                      titleText: 'Redes Sociales & Presencia Digital',
                      iconId: 'redes',
                      desc: 'LinkedIn, GitHub, Behance, Portafolio, YouTube, etc.',
                      fields: ['plataforma', 'usuario', 'url']
                    },
                    {
                      id: 'publicaciones',
                      titleText: 'Publicaciones y Artículos',
                      iconId: 'publicaciones',
                      desc: 'Libros, artículos científicos, prensa, ensayos.',
                      fields: ['tituloOGrado', 'institucion', 'autor', 'periodo', 'url']
                    },
                    {
                      id: 'referencias',
                      titleText: 'Referencias Laborales',
                      iconId: 'referencias',
                      desc: 'Contactos y cartas de recomendación.',
                      fields: ['personaReferencia', 'institucion', 'contactoReferencia']
                    },
                    {
                      id: 'idiomas',
                      titleText: 'Idiomas y Certificaciones',
                      iconId: 'idiomas',
                      desc: 'Lenguas extranjeras y grado de dominio (A1-C2).',
                      fields: ['tituloOGrado', 'institucion', 'nivel']
                    },
                    {
                      id: 'voluntariado',
                      titleText: 'Voluntariado & ONG',
                      iconId: 'voluntariado',
                      desc: 'Acción social y trabajo comunitario.',
                      fields: ['cargo', 'institucion', 'periodo', 'descripcion']
                    },
                    {
                      id: 'premios',
                      titleText: 'Premios & Distinciones',
                      iconId: 'premios',
                      desc: 'Menciones de honor y reconocimientos.',
                      fields: ['tituloOGrado', 'institucion', 'periodo', 'descripcion']
                    },
                    {
                      id: 'patentes',
                      titleText: 'Patentes & Habilitaciones',
                      iconId: 'patentes',
                      desc: 'Propiedad intelectual, registros y matrículas.',
                      fields: ['tituloOGrado', 'institucion', 'resolucion', 'periodo']
                    },
                    {
                      id: 'ponencias',
                      titleText: 'Ponencias & Congresos',
                      iconId: 'ponencias',
                      desc: 'Disertaciones, conferencias y jornadas.',
                      fields: ['tituloOGrado', 'institucion', 'periodo', 'url']
                    }
                  ].map((presetSec) => {
                    const isBuiltIn = ['redes', 'publicaciones', 'referencias', 'idiomas'].includes(presetSec.id);
                    const isAlreadyAdded = isBuiltIn
                      ? cvData?.sectionVisibility?.[presetSec.id] !== false
                      : (['personalizada-1', 'personalizada-2', 'personalizada-3', 'personalizada-4', 'personalizada-5'] as const).some(
                          (slotId) => cvData?.sectionTitleOverrides?.[slotId] === presetSec.titleText || cvData?.sectionVisibility?.[slotId] === true && cvData?.sectionTitleOverrides?.[slotId]
                        );

                    return (
                      <button
                        key={presetSec.id}
                        type="button"
                        onClick={() => {
                          if (isBuiltIn) {
                            setCvData((prev: any) => ({
                              ...prev,
                              sectionVisibility: {
                                ...(prev.sectionVisibility || {}),
                                [presetSec.id]: true
                              }
                            }));
                            showSuccess(`Sección '${presetSec.titleText}' activada.`);
                            changeActiveTab(presetSec.id);
                            return;
                          }

                          if (isAlreadyAdded) {
                            const existingSlot = (['personalizada-1', 'personalizada-2', 'personalizada-3', 'personalizada-4', 'personalizada-5'] as const).find(
                              (slotId) => cvData?.sectionTitleOverrides?.[slotId] === presetSec.titleText
                            );
                            if (existingSlot) changeActiveTab(existingSlot);
                            return;
                          }

                          const customSlots = ['personalizada-1', 'personalizada-2', 'personalizada-3', 'personalizada-4', 'personalizada-5'] as const;
                          const freeSlot = customSlots.find(
                            (slotId) => cvData?.sectionVisibility?.[slotId] !== true && (!cvData?.[slotId] || cvData[slotId].length === 0) && !cvData?.sectionTitleOverrides?.[slotId]
                          );

                          if (!freeSlot) {
                            showWarning('Ya utilizaste los 5 slots de secciones personalizadas disponibles en tu plan. Puedes reutilizar una sección cambiando su nombre.');
                            return;
                          }

                          setCvData((prev: any) => ({
                            ...prev,
                            sectionVisibility: { ...(prev.sectionVisibility || {}), [freeSlot]: true },
                            sectionTitleOverrides: { ...(prev.sectionTitleOverrides || {}), [freeSlot]: presetSec.titleText },
                            sectionFieldSelection: { ...(prev.sectionFieldSelection || {}), [freeSlot]: presetSec.fields },
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

                          showSuccess(`Sección '${presetSec.titleText}' incorporada en slot ${freeSlot}.`);
                          changeActiveTab(freeSlot);
                        }}
                        className={`p-2.5 rounded-[${radius.card}] border text-left flex flex-col justify-between transition cursor-pointer ${
                          isAlreadyAdded
                            ? 'bg-[var(--color-secondary-muted)] border-[var(--color-secondary-base)]/40 text-[var(--color-secondary-text)]'
                            : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] hover:border-[var(--color-accent-base)] hover:bg-[var(--ui-bg-card)]'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-black text-[var(--color-neutral-text-primary)] block">{presetSec.titleText}</span>
                          <p className="text-[10px] text-[var(--color-neutral-text-secondary)] font-medium leading-tight">{presetSec.desc}</p>
                        </div>
                        <span className={`text-[10px] font-black mt-2 self-end px-2 py-0.5 rounded ${
                          isAlreadyAdded ? 'bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)]' : 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                        }`}>
                          {isAlreadyAdded ? '✓ Activa (Editar)' : '+ Incorporar'}
                        </span>
                      </button>
                    );
                  })}

                  {/* 10ª Tarjeta para completar el par del grid (5 filas perfectas) */}
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('custom-section-creator-form')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`p-2.5 rounded-[${radius.card}] border-2 border-dashed border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] hover:opacity-90 text-left flex flex-col justify-between transition cursor-pointer`}
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-black text-[var(--color-accent-text)] flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Sección a Medida
                      </span>
                      <p className="text-[10px] text-[var(--color-neutral-text-secondary)] font-medium leading-tight">
                        Crear sección personalizada seleccionando campos a medida.
                      </p>
                    </div>
                    <span className="text-[10px] font-black mt-2 self-end px-2 py-0.5 rounded bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]">
                      ↓ Ir a Creador
                    </span>
                  </button>
                </div>
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
                    const customSlots = ['personalizada-1', 'personalizada-2', 'personalizada-3', 'personalizada-4', 'personalizada-5'] as const;
                    const freeSlot = customSlots.find(
                      (slotId) => cvData?.sectionVisibility?.[slotId] !== true && (!cvData?.[slotId] || cvData[slotId].length === 0) && !cvData?.sectionTitleOverrides?.[slotId]
                    );

                    if (!freeSlot) {
                      showWarning('Ya usaste las 5 secciones personalizadas disponibles. Puedes reutilizar una sección existente cambiando su nombre.');
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
                const activeSlots = customSlots.filter(s => cvData?.sectionVisibility?.[s] === true || cvData?.sectionTitleOverrides?.[s]);
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
