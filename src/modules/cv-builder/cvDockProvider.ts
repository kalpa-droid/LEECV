import {
  Palette,
  Plus,
  Sparkles,
  Database,
  Radar,
} from 'lucide-react';
import {
  resolveActiveDockSections,
  DOCK_SPECIAL_TABS,
} from '../../shared/core/sections/activeSectionsDockEngine';
import type {
  DockStepContext,
  DockTabItem,
} from '../../shared/core/studio-host/stepSequenceRegistry';

const COVER_LETTER_TABS: DockTabItem[] = [
  { id: 'source_data', label: '1. Origen de Datos', icon: Database, isLarge: true, variant: 'accent' },
  { id: 'vacancy', label: '2. Vacante', icon: Radar, isLarge: true, variant: 'accent' },
  { id: 'letter_style', label: '3. Estilo', icon: Palette, isLarge: true, variant: 'accent' },
  { id: 'ai_editor', label: '4. Redacción IA', icon: Sparkles, isLarge: true, variant: 'accent' },
];

export function buildCvDockTabs({ cvData }: DockStepContext): DockTabItem[] {
  const dockSections = resolveActiveDockSections(cvData);

  return [
    {
      id: DOCK_SPECIAL_TABS.addSection.id,
      label: 'Catálogo & Creador de Secciones',
      icon: Plus,
      isLarge: true,
      variant: 'success',
    },
    {
      id: 'diseno',
      label: 'Diseño',
      icon: Palette,
      isLarge: true,
      variant: 'accent',
    },
    {
      id: DOCK_SPECIAL_TABS.portada.id,
      label: 'Portada Profesional',
      iconId: 'portada',
      isLarge: false,
      variant: 'accent',
    },
    {
      id: DOCK_SPECIAL_TABS.coverLetter.id,
      label: DOCK_SPECIAL_TABS.coverLetter.label,
      iconId: DOCK_SPECIAL_TABS.coverLetter.iconId,
      isLarge: false,
      variant: 'secondary',
    },
    {
      id: DOCK_SPECIAL_TABS.personal.id,
      label: DOCK_SPECIAL_TABS.personal.label,
      iconId: DOCK_SPECIAL_TABS.personal.iconId,
      isLarge: false,
      variant: 'secondary',
    },
    {
      id: DOCK_SPECIAL_TABS.importData.id,
      label: DOCK_SPECIAL_TABS.importData.label,
      iconId: DOCK_SPECIAL_TABS.importData.iconId,
      isLarge: false,
      variant: 'secondary',
    },
    {
      id: DOCK_SPECIAL_TABS.vacante.id,
      label: DOCK_SPECIAL_TABS.vacante.label,
      iconId: DOCK_SPECIAL_TABS.vacante.iconId,
      isLarge: false,
      variant: 'secondary',
    },
    ...dockSections.map((sec) => ({
      id: sec.id,
      label: sec.label,
      iconId: sec.iconId,
      isCustom: sec.isCustom,
      variant: (sec.isCustom ? 'custom' : 'secondary') as DockTabItem['variant'],
      hasContent: sec.hasContent,
      isDisabled: sec.isDisabled,
      isLarge: false,
    })),
  ];
}

export function buildCoverLetterDockTabs(): DockTabItem[] {
  return COVER_LETTER_TABS;
}
