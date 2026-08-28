/**
 * NÚCLEO — MOTOR UNIFICADO DE JERARQUÍA TIPOGRÁFICA Y CROMÁTICA (unifiedTextHierarchyEngine.ts)
 * 
 * Unifica la clasificación de campos (nativos o personalizados creados por el usuario),
 * la escala tipográfica (tamaños, weights, estilos) y el contraste cromático HSL WCAG.
 * 
 * Garantiza que NINGÚN texto dentro de un currículum o tarjeta quede huérfano de jerarquía.
 */

import { TypographyScale, Preset } from '../presets/presetSchema';
import { ResolvedThemeRoles, hexToHSL, hslToHex } from '../colors/colorSystem';
import { calculatePerceivedLuminance } from '../colors/surfaceAwareColorEngine';
import { deriveRecordScale } from './typographyHierarchyEngine';

export type TextRoleLevel = 'title' | 'subtitle' | 'body' | 'meta' | 'accent';

export interface ResolvedTextSpec {
  role: TextRoleLevel;
  fontSizePt: number;
  fontFamily: string;
  fontWeight: 'bold' | 'normal';
  fontStyle: 'normal' | 'italic';
  colorHex: string;
  opacity: number;
  lineHeight?: number;
}

/**
 * Clasifica cualquier rol tipográfico o campo (nativo o custom) en uno de los 5 niveles jerárquicos.
 */
export function classifyTextRole(pdfRole: string, fieldId?: string): TextRoleLevel {
  const roleLower = (pdfRole || '').toLowerCase();
  const idLower = (fieldId || '').toLowerCase();

  if (roleLower === 'title' || idLower.includes('title') || idLower.includes('titulo') || idLower.includes('degree') || idLower.includes('role')) {
    return 'title';
  }
  if (roleLower === 'subtitle' || idLower.includes('institution') || idLower.includes('company') || idLower.includes('empresa') || idLower.includes('institucion')) {
    return 'subtitle';
  }
  if (roleLower === 'badge' || idLower.includes('badge') || idLower.includes('accent')) {
    return 'accent';
  }
  if (roleLower === 'extra' || roleLower === 'meta' || idLower.includes('period') || idLower.includes('year') || idLower.includes('hours') || idLower.includes('date')) {
    return 'meta';
  }

  return 'body';
}

/**
 * MOTOR DE JERARQUÍA UNIFICADO
 * Resuelve de forma determinista y matemática la especificación tipográfica y cromática completa.
 */
export function resolveUnifiedTextSpec(
  pdfRole: string,
  surfaceBgHex: string,
  rolesColor: ResolvedThemeRoles,
  typography: TypographyScale,
  fieldId?: string
): ResolvedTextSpec {
  const level = classifyTextRole(pdfRole, fieldId);
  const scale = deriveRecordScale(typography, typography.recordScaleRatios);

  // 1. Matriz Tipográfica (Size, Family, Weight, Style)
  let fontSizePt = scale.description;
  let fontFamily = typography.fontFamily || 'Helvetica';
  let fontWeight: 'bold' | 'normal' = 'normal';
  let fontStyle: 'normal' | 'italic' = 'normal';

  switch (level) {
    case 'title':
      fontSizePt = scale.title;
      fontFamily = 'Helvetica-Bold';
      fontWeight = 'bold';
      fontStyle = 'normal';
      break;
    case 'subtitle':
      fontSizePt = scale.subtitle;
      fontFamily = 'Helvetica-Bold';
      fontWeight = 'bold';
      fontStyle = 'normal';
      break;
    case 'accent':
      fontSizePt = scale.badge;
      fontFamily = 'Helvetica-Bold';
      fontWeight = 'bold';
      fontStyle = 'normal';
      break;
    case 'meta':
      fontSizePt = scale.extra;
      fontFamily = 'Helvetica';
      fontWeight = 'normal';
      fontStyle = 'italic';
      break;
    case 'body':
    default:
      fontSizePt = scale.description;
      fontFamily = typography.fontFamily || 'Helvetica';
      fontWeight = 'normal';
      fontStyle = 'normal';
      break;
  }

  // 2. Matriz Cromática HSL W3C WCAG (Luminancia Percibida & Opacidades)
  const cleanSurface = surfaceBgHex && surfaceBgHex.startsWith('#') ? surfaceBgHex : '#ffffff';
  const luminance = calculatePerceivedLuminance(cleanSurface);
  const isDarkSurface = luminance <= 128;

  let colorHex = '#000000';
  let opacity = 1.0;

  if (isDarkSurface) {
    // Escenario B: Rectángulo en Fondo Oscuro (Base Blanco Puro con Opacidades)
    switch (level) {
      case 'title':
        colorHex = '#ffffff';
        opacity = 1.0;
        break;
      case 'subtitle':
        colorHex = '#ffffff';
        opacity = 0.85;
        break;
      case 'accent':
        colorHex = rolesColor.accent || '#38bdf8';
        opacity = 1.0;
        break;
      case 'meta':
        colorHex = '#ffffff';
        opacity = 0.50;
        break;
      case 'body':
      default:
        colorHex = '#ffffff';
        opacity = 0.70;
        break;
    }
  } else {
    // Escenario A: Rectángulo en Fondo Claro / Pastel
    // Color Base Oscuro Integrado: HSL(H, 40%, 15%) entintado con el matiz base
    const [baseH] = hexToHSL(rolesColor.primary);

    switch (level) {
      case 'title':
        colorHex = hslToHex(baseH, 0.40, 0.15); // H1 - 100% opacidad
        opacity = 1.0;
        break;
      case 'subtitle':
        colorHex = hslToHex(baseH, 0.35, 0.26); // H2 - 85% equivalente
        opacity = 0.85;
        break;
      case 'accent': {
        // Atenuación de acento en superficie clara (-30% L si L > 0.55 para legibilidad WCAG)
        const [accH, accS, accL] = hexToHSL(rolesColor.accent || '#FF2E63');
        const adjustedAccL = accL > 0.55 ? Math.max(0.20, accL * 0.70) : accL;
        colorHex = hslToHex(accH, accS, adjustedAccL);
        opacity = 1.0;
        break;
      }
      case 'meta':
        colorHex = hslToHex(baseH, 0.25, 0.48); // Metadata - 50% equivalente
        opacity = 0.50;
        break;
      case 'body':
      default:
        colorHex = hslToHex(baseH, 0.30, 0.35); // Cuerpo - 70% equivalente
        opacity = 0.70;
        break;
    }
  }

  return {
    role: level,
    fontSizePt,
    fontFamily,
    fontWeight,
    fontStyle,
    colorHex,
    opacity,
    lineHeight: scale.lineHeightBody
  };
}
