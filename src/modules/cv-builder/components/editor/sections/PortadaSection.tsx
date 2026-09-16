import { AlertTriangle, Check, ChevronRight, Cloud, Download, FileText, Grid, Grid3X3, GripHorizontal, GripVertical, Image as ImageIcon, Layers, Layout, Monitor, Palette, Plus, RotateCcw, Sparkles, Trash2, User, X } from 'lucide-react';
import React from 'react';
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
import { 
  COVER_PRESETS,
  } from '../../../../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { getCvFormat, getAllCvFormats, getFormatDefaultVisibility } from '../../../../../shared/core/formats/cvFormatRegistry';


export const PortadaSection = ({
  cvData,
  setCvData,
  activeTab,
  changeActiveTab,
  showSuccess,
  showWarning,
  triggerPresetTransition,
  getEffectiveCoverFeaturedItems,
  }: any) => {
  return (
    <>
      {activeTab === 'portada' && (
          <div className="space-y-6">
            <PanelSection icon={<Sparkles className="w-4 h-4" />} title="Portada">
              {/* Cover Page Toggle */}
              <div className={`flex items-center justify-between p-3 rounded-[${radius.card}] border transition ${
                cvData.showCoverPage !== false 
                  ? 'bg-[var(--ui-bg-card)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] ${elevationSystem.raised}' 
                  : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-muted)] opacity-75'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wide">
                  Portada de Impacto (Página 1)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const willEnable = cvData.showCoverPage === false;
                    triggerPresetTransition(willEnable ? 'Portada Activada' : 'Portada Desactivada', 'cover');
                    setCvData((prev: any) => ({ ...prev, showCoverPage: !prev.showCoverPage }));
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-black transition flex items-center gap-1.5 ${elevationSystem.raised} cursor-pointer ${
                    cvData.showCoverPage !== false
                      ? 'bg-[var(--color-accent-purple-hover)] text-white hover:opacity-90'
                      : 'bg-[var(--color-neutral-text-muted)] text-white hover:opacity-80'
                  }`}
                >
                  <span>{cvData.showCoverPage !== false ? 'ACTIVADA' : 'DESACTIVADA'}</span>
                </button>
              </div>

              {cvData.showCoverPage !== false && (
                <>
                  {/* Registros Destacados en Portada (Solo Títulos, con botón Agregar/Eliminar) */}
                  {(() => {
                    const effectiveCoverItems = getEffectiveCoverFeaturedItems(cvData);
                    return (
                      <div className={`p-3 bg-[var(--ui-bg-card)] rounded-[${radius.card}] border border-[var(--color-neutral-border)] space-y-3`}>
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">
                            Registros Destacados en Portada ({effectiveCoverItems.length})
                          </label>
                        </div>
                        
                        {/* Selector Desplegable para Agregar Registro Ingresado */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-medium text-[var(--color-neutral-text-secondary)]">
                            Seleccionar título de registros cargados:
                          </label>
                          <select
                            onChange={(e) => {
                              const selectedTitle = e.target.value;
                              if (selectedTitle) {
                                if (!cvData.roles?.includes(selectedTitle)) {
                                  setCvData((prev: any) => ({
                                    ...prev,
                                    roles: [...(prev.roles || []), selectedTitle]
                                  }));
                                } else {
                                  showWarning('Este título ya está agregado a la portada.');
                                }
                                e.target.value = '';
                              }
                            }}
                            defaultValue=""
                            className={`w-full text-xs p-2.5 rounded-[${radius.card}] border border-[var(--color-secondary-base)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer`}
                          >
                            <option value="" disabled>-- Seleccionar título para destacar --</option>
                            {[
                              ...(cvData.education || []).map((e: any) => e.degree).filter(Boolean),
                              ...(cvData.profession || []).map((p: any) => p.degree).filter(Boolean),
                              ...(cvData.experience || []).map((x: any) => x.role).filter(Boolean),
                              ...(cvData.coursesAndCertificates || []).map((c: any) => c.title || c.course).filter(Boolean),
                              ...(cvData.customSections || []).flatMap((cs: any) => (cs.records || []).map((r: any) => r.tituloOGrado || r.cargo || r.title)).filter(Boolean)
                            ].map((titleStr: string, idx: number) => (
                              <option key={idx} value={titleStr}>
                                {titleStr}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Lista de Registros Destacados con Indicadores Claros */}
                        <div className="space-y-1.5 pt-2">
                          {effectiveCoverItems.length === 0 ? (
                            <p className={`text-xs text-[var(--color-neutral-text-secondary)] italic text-center py-2 border border-dashed border-[var(--color-neutral-border)] rounded-[${radius.card}]`}>
                              No hay registros ni títulos destacados en la portada aún.
                            </p>
                          ) : (
                            effectiveCoverItems.map((item, idx) => (
                              <div key={item.id || idx} className={`flex items-center justify-between p-2 bg-[var(--ui-bg-card)] rounded-[${radius.control}] border border-[var(--color-neutral-border)] text-xs`}>
                                <div className="flex flex-col">
                                  <span className="font-bold text-[var(--color-neutral-text-primary)]">{item.label}</span>
                                  {item.isFallback && (
                                    <span className="text-[10px] text-[var(--color-neutral-text-secondary)] italic">
                                      (Por defecto desde Datos Personales)
                                    </span>
                                  )}
                                  {!item.isFallback && item.source !== 'roles' && (
                                    <span className="text-[10px] text-[var(--color-neutral-text-secondary)] italic">
                                      ({item.source === 'education' ? 'Formación Destacada' : 'Profesión Destacada'})
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.source === 'roles') {
                                      // Remove from roles array
                                      setCvData((prev: any) => ({
                                        ...prev,
                                        roles: (prev.roles || []).filter((_: any, i: number) => i !== idx)
                                      }));
                                    } else if (item.source === 'education') {
                                      setCvData((prev: any) => ({ ...prev, coverFeaturedEducationId: undefined }));
                                    } else if (item.source === 'profession') {
                                      setCvData((prev: any) => ({ ...prev, coverFeaturedProfessionId: undefined }));
                                    } else if (item.source === 'titlePrefix') {
                                      // Override fallback by explicitly setting roles to empty array or setting titlePrefix
                                      setCvData((prev: any) => ({
                                        ...prev,
                                        roles: [],
                                        personalInfo: { ...(prev.personalInfo || {}), titlePrefix: '' }
                                      }));
                                    }
                                  }}
                                  className="p-1 text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-muted)] rounded transition cursor-pointer"
                                  title="Quitar de portada"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Selector de Presets de Diseño de Portada */}
                  <div className={`p-4 bg-[var(--ui-bg-card)] rounded-[${radius.card}] border border-[var(--color-neutral-border)] space-y-3`}>
                    <div>
                      <h4 className="text-xs font-black text-[var(--color-neutral-text-primary)] uppercase tracking-wider mb-1">
                        Selecciona el Preset de Diseño de Portada *
                      </h4>
                      <p className="text-[11px] font-bold text-[var(--color-neutral-text-secondary)]">
                        Elige el estilo visual y arquetipo de composición para la portada de presentación (Página 1).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {COVER_PRESETS.map((presetItem) => {
                        const isActive = (cvData.coverStyle || 'monica-classic') === presetItem.id;
                        return (
                          <div
                            key={presetItem.id}
                            onClick={() => {
                              triggerPresetTransition(presetItem.name, 'cover');
                              setCvData((prev: any) => ({ ...prev, coverStyle: presetItem.id }));
                            }}
                            className={`p-3 rounded-[12px] border-2 cursor-pointer transition flex flex-col justify-between ${
                              isActive
                                ? 'bg-[var(--ui-bg-card)] border-[var(--color-accent-base)] ring-2 ring-[var(--color-accent-base)]/40 shadow-[var(--shadow-floating)]'
                                : 'bg-[var(--ui-bg-panel)] border-[var(--ui-border)] hover:border-[var(--color-secondary-bright)] hover:bg-[var(--ui-bg-card)]'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                {/* check-contrast-ignore-next-line */}
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs" style={{ backgroundColor: presetItem.badgeBg, color: presetItem.badgeTextColor }}>
                                  {presetItem.badgeLabel}
                                </span>
                                {isActive && (
                                  <span className="flex items-center gap-1 text-[10px] font-black text-[var(--color-accent-on-base)] bg-[var(--color-accent-base)] px-2.5 py-0.5 rounded-full shadow-[var(--shadow-raised)]">
                                    <Check className="w-3 h-3" /> ACTIVO
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-black text-[var(--ui-text-primary)] mb-0.5">
                                {presetItem.name}
                              </p>
                              <p className="text-[11px] font-extrabold text-[var(--color-secondary-bright)] mb-1.5 leading-snug">
                                {presetItem.subtitle}
                              </p>
                              <p className="text-[10px] font-medium text-[var(--ui-text-primary)] opacity-90 line-clamp-2 leading-relaxed">
                                {presetItem.description}
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-[var(--ui-border)] flex items-center justify-between text-[10px] font-extrabold text-[var(--ui-text-secondary)]">
                              <span>{presetItem.scanPattern}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              </PanelSection>
          </div>
        )}
    </>
  );
};
