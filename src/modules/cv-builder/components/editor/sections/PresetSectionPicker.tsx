import React, { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { radius, elevationSystem } from '../../../../../shared/core/uiDesignSystem';
import { resolveActiveDockSections, checkSectionHasContent, findFreeCustomSlot, CUSTOM_SLOTS } from '../../../../../shared/core/sections/activeSectionsDockEngine';

export interface PresetSectionItem {
  id: string;
  titleText: string;
  iconId: string;
  desc: string;
  fields: string[];
}

export const PRESET_SECTIONS: PresetSectionItem[] = [
  { id: 'redes', titleText: 'Redes Sociales & Presencia Digital', iconId: 'redes', desc: 'LinkedIn, GitHub, Behance, Portafolio, YouTube, etc.', fields: ['plataforma', 'usuario', 'url'] },
  { id: 'publicaciones', titleText: 'Publicaciones y Artículos', iconId: 'publicaciones', desc: 'Libros, artículos científicos, prensa, ensayos.', fields: ['tituloOGrado', 'institucion', 'autor', 'periodo', 'url'] },
  { id: 'referencias', titleText: 'Referencias Laborales', iconId: 'referencias', desc: 'Contactos y cartas de recomendación.', fields: ['personaReferencia', 'institucion', 'contactoReferencia'] },
  { id: 'idiomas', titleText: 'Idiomas y Certificaciones', iconId: 'idiomas', desc: 'Lenguas extranjeras y grado de dominio (A1-C2).', fields: ['tituloOGrado', 'institucion', 'nivel'] },
  { id: 'voluntariado', titleText: 'Voluntariado & ONG', iconId: 'voluntariado', desc: 'Acción social y trabajo comunitario.', fields: ['cargo', 'institucion', 'periodo', 'descripcion'] },
  { id: 'premios', titleText: 'Premios & Distinciones', iconId: 'premios', desc: 'Menciones de honor y reconocimientos.', fields: ['tituloOGrado', 'institucion', 'periodo', 'descripcion'] },
  { id: 'patentes', titleText: 'Patentes & Habilitaciones', iconId: 'patentes', desc: 'Propiedad intelectual, registros y matrículas.', fields: ['tituloOGrado', 'institucion', 'resolucion', 'periodo'] },
  { id: 'ponencias', titleText: 'Ponencias & Congresos', iconId: 'ponencias', desc: 'Disertaciones, conferencias y jornadas.', fields: ['tituloOGrado', 'institucion', 'periodo', 'url'] }
];

const BUILT_IN_PRESET_IDS = ['redes', 'publicaciones', 'referencias', 'idiomas'];

interface PresetSectionPickerProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
  showSuccess?: (msg: string) => void;
  showWarning?: (msg: string) => void;
  changeActiveTab?: (tab: string) => void;
  /** Si se pasa, las prediseñadas "a medida" se aplican a ESTE slot (modo panel de slot). */
  slotId?: string;
  /** Id del ancla del editor "a medida" para la tarjeta punteada (scrollIntoView). */
  aMedidaAnchorId?: string;
  /** En modo slot, el bloque abre colapsado por defecto. */
  defaultOpen?: boolean;
}

/**
 * Selector de Secciones Prediseñadas + tarjeta punteada "Sección a Medida".
 * Compartido entre la pestaña de alta (nueva_seccion) y el panel de un slot
 * ya creado (personalizada-N): un clic y la sección queda con título, campos
 * e ícono listos. No duplica la lógica de crear sección en ningún lado.
 */
export const PresetSectionPicker = ({
  cvData,
  setCvData,
  showSuccess,
  showWarning,
  changeActiveTab,
  slotId,
  aMedidaAnchorId,
  defaultOpen = true
}: PresetSectionPickerProps) => {
  const [open, setOpen] = useState(defaultOpen);

  const activeDockSections = resolveActiveDockSections(cvData);

  // Prediseñadas "ya en el CV" no se ofrecen de nuevo (evita duplicados)
  const availableSections = PRESET_SECTIONS.filter((presetSec) => {
    const isBuiltIn = BUILT_IN_PRESET_IDS.includes(presetSec.id);
    if (isBuiltIn) {
      const isDockActive = activeDockSections.some((sec) => sec.id === presetSec.id && !sec.isDisabled);
      const isVisibilityTrue = cvData?.sectionVisibility?.[presetSec.id] === true;
      const hasContent = checkSectionHasContent(cvData, presetSec.id);
      return !isDockActive && !isVisibilityTrue && !hasContent;
    }
    if (slotId) {
      // En modo slot, aplicar una prediseñada cambia el slot; no se excluye
      // por estar en uso en otro lado — alcanza con que no sea la activa de este slot.
      return cvData?.sectionTitleOverrides?.[slotId] !== presetSec.titleText;
    }
    const isTitleInDock = activeDockSections.some(
      (sec) => !sec.isDisabled && (sec.label === presetSec.titleText || cvData?.sectionTitleOverrides?.[sec.id] === presetSec.titleText)
    );
    const isSlotUsed = CUSTOM_SLOTS.some(
      (s) => cvData?.sectionTitleOverrides?.[s] === presetSec.titleText && cvData?.sectionVisibility?.[s] !== false
    );
    const isCustomSecUsed = Array.isArray(cvData?.customSections) && cvData.customSections.some(
      (cs: any) => cs.titleText === presetSec.titleText && cvData?.sectionVisibility?.[cs.id] !== false
    );
    return !isTitleInDock && !isSlotUsed && !isCustomSecUsed;
  });

  const applyPreset = (presetSec: PresetSectionItem) => {
    const isBuiltIn = BUILT_IN_PRESET_IDS.includes(presetSec.id);

    if (isBuiltIn) {
      setCvData((prev: any) => ({
        ...prev,
        sectionVisibility: { ...(prev.sectionVisibility || {}), [presetSec.id]: true }
      }));
      showSuccess?.(`Sección '${presetSec.titleText}' activada.`);
      changeActiveTab?.(presetSec.id);
      return;
    }

    if (slotId) {
      // Modo panel de slot: aplicar la prediseñada a ESTE slot
      setCvData((prev: any) => ({
        ...prev,
        sectionVisibility: { ...(prev.sectionVisibility || {}), [slotId]: true },
        sectionTitleOverrides: { ...(prev.sectionTitleOverrides || {}), [slotId]: presetSec.titleText },
        sectionIconOverrides: { ...(prev.sectionIconOverrides || {}), [slotId]: presetSec.iconId || slotId },
        sectionFieldSelection: { ...(prev.sectionFieldSelection || {}), [slotId]: presetSec.fields },
        [slotId]: Array.isArray(prev?.[slotId]) && prev[slotId].length > 0 ? prev[slotId] : [{}],
        layout: {
          ...(prev.layout || {}),
          columnAssignments: {
            ...(prev.layout?.columnAssignments || {}),
            [slotId]: prev.layout?.columnAssignments?.[slotId] || 'primaria'
          }
        }
      }));
      showSuccess?.(`Sección cambiada a '${presetSec.titleText}'.`);
      return;
    }

    // Modo alta (nueva_seccion): crear en el primer slot libre
    const freeSlot = findFreeCustomSlot(cvData);
    if (!freeSlot) {
      showWarning?.('Ya usaste las 5 secciones personalizadas disponibles. Podés reutilizar una existente cambiando su nombre.');
      return;
    }

    setCvData((prev: any) => ({
      ...prev,
      sectionVisibility: { ...(prev.sectionVisibility || {}), [freeSlot]: true },
      sectionTitleOverrides: { ...(prev.sectionTitleOverrides || {}), [freeSlot]: presetSec.titleText },
      sectionIconOverrides: { ...(prev.sectionIconOverrides || {}), [freeSlot]: presetSec.iconId || freeSlot },
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

    showSuccess?.(`Sección '${presetSec.titleText}' incorporada.`);
    changeActiveTab?.(freeSlot);
  };

  const scrollToAMedida = () => {
    if (!aMedidaAnchorId) return;
    document.getElementById(aMedidaAnchorId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const gridContent = (
    <>
      <p className="text-[11px] text-[var(--color-neutral-text-secondary)] font-medium leading-relaxed">
        Haz clic en cualquiera de estas secciones para agregarla instantáneamente a tu currículum con sus campos listos para completar:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {availableSections.map((presetSec) => (
          <button
            key={presetSec.id}
            type="button"
            onClick={() => applyPreset(presetSec)}
            className={`p-2.5 rounded-[${radius.card}] border text-left flex flex-col justify-between transition cursor-pointer bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] hover:border-[var(--color-accent-base)] hover:bg-[var(--ui-bg-card)]`}
          >
            <div className="space-y-1">
              <span className="text-xs font-black text-[var(--color-neutral-text-primary)] block">{presetSec.titleText}</span>
              <p className="text-[10px] text-[var(--color-neutral-text-secondary)] font-medium leading-tight">{presetSec.desc}</p>
            </div>
            <span className="text-[10px] font-black mt-2 self-end px-2 py-0.5 rounded bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]">
              + Incorporar
            </span>
          </button>
        ))}

        {aMedidaAnchorId && (
          <button
            type="button"
            onClick={scrollToAMedida}
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
        )}
      </div>

      {availableSections.length === 0 && (
        <p className="text-[11px] text-[var(--color-neutral-text-muted)] font-medium leading-relaxed">
          Todas las secciones prediseñadas ya están en tu CV.
        </p>
      )}
    </>
  );

  if (slotId) {
    // Modo panel de slot: colapsable, con selector arriba del editor
    return (
      <div className={`p-3 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] space-y-3 ${elevationSystem.raised}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2 text-left cursor-pointer group"
          aria-expanded={open}
        >
          <ChevronDown className={`w-4 h-4 text-[var(--color-neutral-text-secondary)] transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
          <span className="text-xs font-black text-[var(--color-neutral-text-primary)]">¿Querés partir de una Sección Prediseñada?</span>
          {open ? null : <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]">8 ideas</span>}
        </button>
        {open && gridContent}
      </div>
    );
  }

  // Modo alta (nueva_seccion): contenido directo con encabezado de panel a cargo del padre
  return <div className="space-y-3">{gridContent}</div>;
};

export default PresetSectionPicker;
