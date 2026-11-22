import {
  Palette,
  Plus,
  Sparkles,
  Database,
  Radar,
} from 'lucide-react';
import { UI_ICON_IDS } from '../../shared/core/ui/iconCatalog';
import {
  resolveActiveDockSections,
  DOCK_SPECIAL_TABS,
} from '../../shared/core/sections/activeSectionsDockEngine';
import type {
  DockStepContext,
  DockTabItem,
} from '../../shared/core/studio-host/stepSequenceRegistry';

const COVER_LETTER_TABS: DockTabItem[] = [
  { id: 'letter_style', label: '3. Estilo', icon: Palette, isLarge: true, variant: 'accent', role: 'preset' },
  { id: 'source_data', label: '1. Origen de Datos', icon: Database, isLarge: true, variant: 'secondary', role: 'record' },
  { id: 'vacancy', label: '2. Vacante', icon: Radar, isLarge: true, variant: 'secondary', role: 'ai_utility' },
  { id: 'ai_editor', label: '4. Redacción IA', icon: Sparkles, isLarge: true, variant: 'custom', role: 'ai_utility' },
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
      role: 'catalog',
    },
    {
      id: 'diseno',
      label: 'Estilo & Color',
      iconId: UI_ICON_IDS.diseno,
      isLarge: true,
      variant: 'accent',
      role: 'preset',
    },
    {
      id: 'diseno_tipografia',
      label: 'Letra & Espacio',
      iconId: UI_ICON_IDS.disenoTipografia,
      isLarge: false,
      variant: 'accent',
      role: 'preset',
    },
    {
      id: 'diseno_hoja',
      label: 'Hoja & Columnas',
      iconId: UI_ICON_IDS.disenoHoja,
      isLarge: false,
      variant: 'accent',
      role: 'preset',
    },
    {
      id: DOCK_SPECIAL_TABS.portada.id,
      label: 'Portada Profesional',
      iconId: 'portada',
      isLarge: false,
      variant: 'accent',
      role: 'preset',
    },
    {
      id: DOCK_SPECIAL_TABS.personal.id,
      label: DOCK_SPECIAL_TABS.personal.label,
      iconId: DOCK_SPECIAL_TABS.personal.iconId,
      isLarge: false,
      variant: 'secondary',
      role: 'record',
    },
    ...dockSections.map((sec) => ({
      id: sec.id,
      label: sec.label,
      iconId: sec.iconId,
      isCustom: sec.isCustom,
      variant: (sec.isCustom ? 'custom' : 'secondary') as DockTabItem['variant'],
      role: (sec.isCustom ? 'custom_record' : 'record') as DockTabItem['role'],
      hasContent: sec.hasContent,
      isDisabled: sec.isDisabled,
      isLarge: false,
    })),
    {
      id: DOCK_SPECIAL_TABS.importData.id,
      label: DOCK_SPECIAL_TABS.importData.label,
      iconId: DOCK_SPECIAL_TABS.importData.iconId,
      isLarge: false,
      variant: 'custom',
      role: 'ai_utility',
    },
    {
      id: DOCK_SPECIAL_TABS.vacante.id,
      label: DOCK_SPECIAL_TABS.vacante.label,
      iconId: DOCK_SPECIAL_TABS.vacante.iconId,
      isLarge: false,
      variant: 'custom',
      role: 'ai_utility',
    },
    {
      id: DOCK_SPECIAL_TABS.coverLetter.id,
      label: DOCK_SPECIAL_TABS.coverLetter.label,
      iconId: DOCK_SPECIAL_TABS.coverLetter.iconId,
      isLarge: false,
      variant: 'secondary',
      role: 'handoff',
    },
  ];
}

export function buildCoverLetterDockTabs(): DockTabItem[] {
  return COVER_LETTER_TABS;
}
