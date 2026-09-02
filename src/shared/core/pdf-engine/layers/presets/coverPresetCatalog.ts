/**
 * CATÁLOGO DE PRESETS DE DISEÑO DE PORTADA (PÁGINA 1)
 *
 * Basado en la investigación del informe "Diseños de Portadas Globales.md":
 * - Estructuras de retículas (Van de Graaf, Bento Grid, Swiss Grid).
 * - Neurociencia visual y patrones de escaneo (Gutenberg, Z, F, Ley de Hick).
 * - Arquetipos editoriales (Bold Typography, Minimalismo, Orgánico, Masthead).
 */

export type CoverStyleId =
  | 'monica-classic'
  | 'modern-corporate'
  | 'minimal-editorial'
  | 'creative-sustentable'
  | 'bold-impact'
  | 'magazine-executive';

export interface CoverPresetDefinition {
  id: CoverStyleId;
  name: string;
  subtitle: string;
  description: string;
  archetypeReportRef: string;
  scanPattern: string;
  badgeLabel: string;
  badgeBg: string;
  badgeTextColor: string;
}

export const COVER_PRESETS_CATALOG: CoverPresetDefinition[] = [
  {
    id: 'monica-classic',
    name: 'Canon Clásico & Proporción Áurea',
    subtitle: 'Van de Graaf / Simetría Tradicional',
    description: 'Estructura armónica basada en cánones de Van de Graaf (2:3:4:6). Marco de alineación central con insignias finas y elegancia atemporal.',
    archetypeReportRef: 'Canon de Van de Graaf & Cánones Medievales',
    scanPattern: 'Diagrama de Gutenberg (Foco en Área Óptica Primaria)',
    badgeLabel: 'CLÁSICO',
    badgeBg: 'var(--color-accent-amber)',
    badgeTextColor: 'var(--color-accent-on-base)'
  },
  {
    id: 'modern-corporate',
    name: 'Bento Grid Corporativo',
    subtitle: 'Cuadrícula Modular Asimétrica',
    description: 'Arquitectura de cajas Bento con bordes suavizados. Organiza fotografía, insignias y titular en módulos independientes de escaneo rápido.',
    archetypeReportRef: 'Estilo Suizo & Bento Grid B2B',
    scanPattern: 'Patrón de Escaneo Z & F',
    badgeLabel: 'BENTO',
    badgeBg: 'var(--color-accent-base)',
    badgeTextColor: 'var(--color-accent-on-base)'
  },
  {
    id: 'minimal-editorial',
    name: 'Minimalista Radical & Espacio Negativo',
    subtitle: 'Supresión de Adorno / Ley de Hick',
    description: 'Elimina la fricción visual y cajas superfluas. Jerarquía tipográfica heroica alineada al margen superior izquierdo sobre fondo limpio.',
    archetypeReportRef: 'Minimalismo Reduccionista & Carga Cognitiva',
    scanPattern: 'Reducción de Carga Extrínseca (Ley de Hick)',
    badgeLabel: 'MINIMAL',
    badgeBg: 'var(--color-secondary-base)',
    badgeTextColor: 'var(--color-secondary-on-base)'
  },
  {
    id: 'creative-sustentable',
    name: 'Orgánico & Texturas Botánicas',
    subtitle: 'Motivos Verdes & Tono Cálido',
    description: 'Acentúa motivos botánicos, esquemas orgánicos y tonos marfil/verde musgo. Transmite sustentabilidad, empatía y calidez humana.',
    archetypeReportRef: 'Artesanal & Psicología Cromática Vegetal',
    scanPattern: 'Movimiento Orgánico & Respiración Visual',
    badgeLabel: 'SUSTENTABLE',
    badgeBg: 'var(--color-status-success-base)',
    badgeTextColor: 'var(--color-status-success-on-base)'
  },
  {
    id: 'bold-impact',
    name: 'Tipografía Audaz & Heroica',
    subtitle: 'Nombre Hiperdimensionado / Directivo',
    description: 'El titular y nombre ocupan más del 70% del impacto inicial. Trazo robusto con alto contraste cromático para perfiles ejecutivos.',
    archetypeReportRef: 'Bold Typography & Visual Gravity',
    scanPattern: 'Gravedad Visual de Alto Impacto Directo',
    badgeLabel: 'EJECUTIVO',
    badgeBg: 'var(--color-status-danger-base)',
    badgeTextColor: 'var(--ui-btn-outline-bg)'
  },
  {
    id: 'magazine-executive',
    name: 'Cabecera Editorial & Masthead',
    subtitle: 'Estilo Revista de Lujo / Didot Headline',
    description: 'Cabecera superior prominente (Masthead) con titulares satélites laterales. Diseñada para proyectar distinción e identidad de marca.',
    archetypeReportRef: 'Anatomía de Portada de Revista (Magazine Layout)',
    scanPattern: 'Contraste Jerárquico por Oposición Directa',
    badgeLabel: 'MASTHEAD',
    badgeBg: 'var(--color-accent-purple-bright)',
    badgeTextColor: 'var(--ui-btn-outline-bg)'
  }
];

export function getCoverPresetById(id: string): CoverPresetDefinition {
  return COVER_PRESETS_CATALOG.find(p => p.id === id) || COVER_PRESETS_CATALOG[0];
}

export const COVER_PRESETS = COVER_PRESETS_CATALOG;
