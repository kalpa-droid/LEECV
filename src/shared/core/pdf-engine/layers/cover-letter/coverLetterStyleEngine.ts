import { resolveThemeRoles, getContrastTextColor, ResolvedThemeRoles } from '../colors/colorSystem';
import { resolveUnifiedTextSpec, ResolvedTextSpec } from '../typography/unifiedTextHierarchyEngine';
import { Preset } from '../presets/presetSchema';

export interface CoverLetterStyles {
  senderName: ResolvedTextSpec;
  senderContact: ResolvedTextSpec;
  dateRow: ResolvedTextSpec;
  recipientName: ResolvedTextSpec;
  recipientSub: ResolvedTextSpec;
  salutation: ResolvedTextSpec;
  paragraph: ResolvedTextSpec;
  signoffText: ResolvedTextSpec;
  signerName: ResolvedTextSpec;
  signerRole: ResolvedTextSpec;
  rolesColor: ResolvedThemeRoles;
  contrastTextOnAccent: (accentHex: string) => string;
}

export function resolveCoverLetterStyles(preset: Preset, backgroundHex: string = '#ffffff'): CoverLetterStyles {
  const rolesColor = resolveThemeRoles(preset.palette);
  
  return {
    senderName: resolveUnifiedTextSpec('title', backgroundHex, rolesColor, preset.typography, 'coverLetterSenderName'),
    senderContact: resolveUnifiedTextSpec('subtitle', backgroundHex, rolesColor, preset.typography, 'coverLetterSenderContact'),
    dateRow: resolveUnifiedTextSpec('description', backgroundHex, rolesColor, preset.typography, 'coverLetterDateRow'),
    recipientName: resolveUnifiedTextSpec('subtitle', backgroundHex, rolesColor, preset.typography, 'coverLetterRecipientName'),
    recipientSub: resolveUnifiedTextSpec('description', backgroundHex, rolesColor, preset.typography, 'coverLetterRecipientSub'),
    salutation: resolveUnifiedTextSpec('title', backgroundHex, rolesColor, preset.typography, 'coverLetterSalutation'),
    paragraph: resolveUnifiedTextSpec('body', backgroundHex, rolesColor, preset.typography, 'coverLetterParagraph'),
    signoffText: resolveUnifiedTextSpec('body', backgroundHex, rolesColor, preset.typography, 'coverLetterSignoffText'),
    signerName: resolveUnifiedTextSpec('title', backgroundHex, rolesColor, preset.typography, 'coverLetterSignerName'),
    signerRole: resolveUnifiedTextSpec('subtitle', backgroundHex, rolesColor, preset.typography, 'coverLetterSignerRole'),
    rolesColor,
    contrastTextOnAccent: (accentHex: string) => getContrastTextColor(accentHex),
  };
}
