/**
 * MOTOR DE ADORNOS DE PORTADA (coverOrnamentEngine.ts)
 *
 * Asigna declarativamente el arquetipo de adorno vectorial SVG a cada estilo de portada:
 * - monica-classic          -> classic-filigree (Filigrana y esquinas clásicas armónicas)
 * - modern-corporate        -> bento-corners (Marcos angulares L-Shape geométricos estilo Bento)
 * - minimal-editorial       -> minimal-bar (Barra fina de acento y punto de corte editorial)
 * - creative-sustentable    -> organic-leaf (Ramas y hojas botánicas vectoriales)
 * - bold-impact             -> bold-star-badge (Insignia geométrica ejecutiva y estrella de liderazgo)
 * - magazine-executive      -> magazine-masthead-lines (Líneas de imprenta dobles de cabecera Masthead)
 *
 * Integra 100% los colores dinámicos resueltos por el motor cromático (surfaceAwareColorEngine/colorSystem).
 */

import { CoverStyleId } from '../presets/coverPresetCatalog';
import { ResolvedThemeRoles } from '../colors/colorSystem';

export type CoverOrnamentKind =
  | 'classic-filigree'
  | 'bento-corners'
  | 'minimal-bar'
  | 'organic-leaf'
  | 'bold-star-badge'
  | 'magazine-masthead-lines';

export interface ResolvedCoverOrnament {
  kind: CoverOrnamentKind;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  backgroundColor: string;
  opacity: number;
}

export function resolveCoverOrnament(
  coverStyleId: CoverStyleId | string,
  rolesColor?: ResolvedThemeRoles
): ResolvedCoverOrnament {
  const primary = rolesColor?.primary || '#1e293b';
  const accent = rolesColor?.accent || '#0f766e';
  const secondary = rolesColor?.secondary || '#64748b';
  const bg = rolesColor?.background || '#ffffff';

  let kind: CoverOrnamentKind = 'classic-filigree';

  switch (coverStyleId) {
    case 'modern-corporate':
      kind = 'bento-corners';
      break;
    case 'minimal-editorial':
      kind = 'minimal-bar';
      break;
    case 'creative-sustentable':
      kind = 'organic-leaf';
      break;
    case 'bold-impact':
      kind = 'bold-star-badge';
      break;
    case 'magazine-executive':
      kind = 'magazine-masthead-lines';
      break;
    case 'monica-classic':
    default:
      kind = 'classic-filigree';
      break;
  }

  return {
    kind,
    primaryColor: primary,
    accentColor: accent,
    secondaryColor: secondary,
    backgroundColor: bg,
    opacity: 0.9
  };
}
