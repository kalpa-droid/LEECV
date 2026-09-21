import { resolveThemeRoles, ResolvedThemeRoles } from '../colors/colorSystem';
import { resolveUnifiedTextSpec, ResolvedTextSpec } from '../typography/unifiedTextHierarchyEngine';
import { Preset } from '../presets/presetSchema';

export interface CoverLetterStyles {
  senderName: ResolvedTextSpec;
  senderContact: ResolvedTextSpec;
  dateRow: ResolvedTextSpec;
  recipientName: ResolvedTextSpec;
  recipientSub: ResolvedTextSpec;
  body: ResolvedTextSpec;
  signerName: ResolvedTextSpec;
  signerRole: ResolvedTextSpec;
  rolesColor: ResolvedThemeRoles;
}

/**
 * Resuelve la tipografía y el color de cada campo de la carta de presentación
 * a partir del preset activo (palette + typography), en vez de valores fijos.
 * Análogo a resolvePlannerStyles en plannerStyleEngine.ts.
 */
export function resolveCoverLetterStyles(preset: Preset, backgroundHex: string = '#ffffff'): CoverLetterStyles {
  const rolesColor = resolveThemeRoles(preset.palette);
  return {
    senderName: resolveUnifiedTextSpec('title', backgroundHex, rolesColor, preset.typography, 'coverLetterSenderName'),
    senderContact: resolveUnifiedTextSpec('extra', backgroundHex, rolesColor, preset.typography, 'coverLetterSenderContact'),
    dateRow: resolveUnifiedTextSpec('extra', backgroundHex, rolesColor, preset.typography, 'coverLetterDateRow'),
    recipientName: resolveUnifiedTextSpec('subtitle', backgroundHex, rolesColor, preset.typography, 'coverLetterRecipientName'),
    recipientSub: resolveUnifiedTextSpec('extra', backgroundHex, rolesColor, preset.typography, 'coverLetterRecipientSub'),
    body: resolveUnifiedTextSpec('description', backgroundHex, rolesColor, preset.typography, 'coverLetterBody'),
    signerName: resolveUnifiedTextSpec('subtitle', backgroundHex, rolesColor, preset.typography, 'coverLetterSignerName'),
    signerRole: resolveUnifiedTextSpec('extra', backgroundHex, rolesColor, preset.typography, 'coverLetterSignerRole'),
    rolesColor,
  };
}
