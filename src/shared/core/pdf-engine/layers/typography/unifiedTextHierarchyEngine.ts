/**
 * NÚCLEO — MOTOR UNIFICADO DE JERARQUÍA TIPOGRÁFICA Y CROMÁTICA (unifiedTextHierarchyEngine.ts)
 * 
 * Unifica la clasificación de campos (nativos o personalizados creados por el usuario),
 * la escala tipográfica (tamaños, weights, estilos) y el contraste cromático HSL WCAG.
 * 
 * Garantiza que NINGÚN texto dentro de un currículum o tarjeta quede huérfano de jerarquía.
 */

import { TypographyScale, Preset } from '../presets/presetSchema';
import { ResolvedThemeRoles, hexToHSL, hslToHex, getContrastRatio } from '../colors/colorSystem';
import { calculatePerceivedLuminance } from '../colors/surfaceAwareColorEngine';
import { deriveRecordScale } from './typographyHierarchyEngine';
import { sanitizeFontFamily } from './pdfFontRegistry';

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
  const roleLower = (pdfRole || '').toLowerCase().trim();
  const idLower = (fieldId || '').toLowerCase().trim();

  // 1. Evaluación de rol explícito directo (prioridad absoluta)
  if (roleLower === 'subtitle') return 'subtitle';
  if (roleLower === 'title') return 'title';
  if (roleLower === 'badge' || roleLower === 'accent') return 'accent';
  if (roleLower === 'extra' || roleLower === 'meta') return 'meta';
  if (roleLower === 'description' || roleLower === 'body') return 'body';

  // 2. Heurísticas por id (evitando colisiones como 'subtitle'.includes('title'))
  if (idLower === 'subtitle' || idLower.includes('institution') || idLower.includes('company') || idLower.includes('empresa') || idLower.includes('institucion')) {
    return 'subtitle';
  }
  if (idLower === 'title' || idLower.includes('titulo') || idLower.includes('degree') || idLower.includes('role') || idLower.includes('puesto') || idLower.includes('carrera')) {
    return 'title';
  }
  if (idLower.includes('badge') || idLower.includes('accent')) {
    return 'accent';
  }
  if (idLower.includes('period') || idLower.includes('year') || idLower.includes('hours') || idLower.includes('date') || idLower.includes('meta')) {
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
  let rawFontFamily = typography?.fontFamily || 'Helvetica';
  let fontWeight: 'bold' | 'normal' = 'normal';
  let fontStyle: 'normal' | 'italic' = 'normal';

  switch (level) {
    case 'title':
      fontSizePt = scale.title;
      fontWeight = 'bold';
      fontStyle = 'normal';
      break;
    case 'subtitle':
      fontSizePt = scale.subtitle;
      fontWeight = 'bold';
      fontStyle = 'normal';
      break;
    case 'accent':
      fontSizePt = scale.badge;
      fontWeight = 'bold';
      fontStyle = 'normal';
      break;
    case 'meta':
      fontSizePt = scale.extra;
      fontWeight = 'normal';
      fontStyle = 'italic';
      break;
    case 'body':
    default:
      fontSizePt = scale.description;
      fontWeight = 'normal';
      fontStyle = 'normal';
      break;
  }

  const fontFamily = sanitizeFontFamily(rawFontFamily, fontWeight === 'bold', fontStyle === 'italic');

  // 2. Matriz Cromática HSL W3C WCAG (Luminancia Percibida & Opacidades)
  const cleanSurface = surfaceBgHex && surfaceBgHex.startsWith('#') ? surfaceBgHex : '#ffffff';
  const luminance = calculatePerceivedLuminance(cleanSurface);
  
  // Determinación Matemática de Superficie: Una superficie requiere texto claro (blanco #ffffff)
  // si el ratio de contraste de #ffffff es mayor o igual al de texto oscuro (#0f172a) o si la luminancia es <= 130.
  const whiteRatio = getContrastRatio(cleanSurface, '#ffffff');
  const darkRatio = getContrastRatio(cleanSurface, '#0f172a');
  const isDarkSurface = whiteRatio >= darkRatio || luminance <= 130;

  let colorHex = '#000000';
  let opacity = 1.0;

  if (isDarkSurface) {
    // Escenario B: Rectángulo en Fondo Oscuro / Medio (Base Blanco Puro con Opacidades)
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
    // Se elimina la doble atenuación fijando opacity = 1.0 y codificando el 100% de la jerarquía
    // y del contraste WCAG 2.1 AA (>= 4.5:1 real) en la matriz HSL calibrada.
    const [baseH] = hexToHSL(rolesColor.primary);
    opacity = 1.0;

    switch (level) {
      case 'title':
        colorHex = hslToHex(baseH, 0.50, 0.12); // Título H1: Oscuro y saturado (12.9:1)
        break;
      case 'subtitle':
        colorHex = hslToHex(baseH, 0.40, 0.24); // Subtítulo H2: Mismo matiz, mayor luminancia (7.4:1)
        break;
      case 'accent': {
        // Atenuación de acento en superficie clara (-30% L si L > 0.55 para legibilidad WCAG)
        const [accH, accS, accL] = hexToHSL(rolesColor.accent || '#FF2E63');
        const adjustedAccL = accL > 0.55 ? Math.max(0.20, accL * 0.70) : accL;
        colorHex = hslToHex(accH, accS, adjustedAccL);
        break;
      }
      case 'meta':
        colorHex = hslToHex((baseH + 10) % 360, 0.30, 0.36); // Metadata: +10° H para separación (4.75:1)
        break;
      case 'body':
      default:
        colorHex = hslToHex(baseH, 0.22, 0.32); // Cuerpo de texto: Neutro entintado suave (5.9:1)
        break;
    }
  }

  // 3. Verificación y Auto-Ajuste Final de Contraste WCAG 2.1 AA (>= 4.5:1)
  const minRequiredRatio = 4.5;
  const currentRatio = getContrastRatio(cleanSurface, colorHex);

  if (currentRatio < minRequiredRatio) {
    // Si el contraste es insuficiente sobre el fondo dado, ajustar automáticamente el color
    // a blanco puro o slate muy oscuro según la ventaja matemática de contraste
    colorHex = whiteRatio >= darkRatio ? '#ffffff' : '#0f172a';
    opacity = 1.0;
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

