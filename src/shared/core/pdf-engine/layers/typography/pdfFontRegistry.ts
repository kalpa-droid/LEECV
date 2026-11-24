import { Font } from '@react-pdf/renderer';
import {
  isDynamicFontRegistered,
  registerDynamicFontFamily,
  sanitizeFontFamilyPure,
} from './fontSanitizer';
import { findAcademicFontSpec } from './academicFontCatalog';
import { getStoredCustomFont, saveCustomFont } from '../../../storage/localFontStore';

/**
 * NÚCLEO — REGISTRO Y HIGIENE TIPOGRÁFICA PARA PDF (@react-pdf/renderer)
 *
 * Registra fuentes seguras, fuentes universitarias (equivalentes 1:1 en TTF),
 * fuentes locales de Windows (`queryLocalFonts`) y fuentes subidas por el usuario.
 */

let initialized = false;

export function initPdfFonts(): void {
  if (initialized) return;
  try {
    Font.registerHyphenationCallback((word) => [word]);
    initialized = true;
  } catch {
    // Ignorar si ya está registrado en el entorno
  }
}

export async function ensureAcademicOrCustomFontRegistered(family: string): Promise<boolean> {
  initPdfFonts();
  const clean = String(family || '').trim();
  if (!clean) return false;
  if (isDynamicFontRegistered(clean)) return true;

  // 1. Revisar si el usuario ya subió o conectó desde Windows esta fuente en IndexedDB
  const stored = await getStoredCustomFont(clean);
  if (stored?.dataUrl) {
    try {
      Font.register({ family: clean, src: stored.dataUrl });
      registerDynamicFontFamily(clean);
      return true;
    } catch {
      // Continuar al catálogo académico
    }
  }

  // 2. Registrar desde el catálogo universitario / Google TTF (bajo demanda, 0 KB en bundle inicial)
  const spec = findAcademicFontSpec(clean);
  if (spec) {
    try {
      const styleItalic = 'italic' as const;
      const canUseLocalOrigin =
        typeof window !== 'undefined' &&
        /^https?:/i.test(window.location?.origin || '');
      const selectedUrls = canUseLocalOrigin && spec.localTtfUrls ? spec.localTtfUrls : spec.ttfUrls;
      const toSrc = (rawUrl: string): string =>
        canUseLocalOrigin && rawUrl.startsWith('/')
          ? new URL(rawUrl, window.location.origin).href
          : rawUrl;

      const buildEntries = () => {
        const fonts: Array<{ src: string; fontWeight?: 'normal' | 'bold'; fontStyle?: 'normal' | 'italic' }> = [
          { src: toSrc(selectedUrls.regular), fontWeight: 'normal', fontStyle: 'normal' },
        ];
        if (selectedUrls.bold) {
          fonts.push({ src: toSrc(selectedUrls.bold), fontWeight: 'bold', fontStyle: 'normal' });
        }
        if (selectedUrls.italic) {
          fonts.push({ src: toSrc(selectedUrls.italic), fontWeight: 'normal', fontStyle: styleItalic });
        }
        if (selectedUrls.boldItalic) {
          fonts.push({ src: toSrc(selectedUrls.boldItalic), fontWeight: 'bold', fontStyle: styleItalic });
        }
        return fonts;
      };

      Font.register({ family: spec.family, fonts: buildEntries() });
      registerDynamicFontFamily(spec.family);
      if (spec.openEquivalentName && spec.openEquivalentName !== spec.family) {
        Font.register({ family: spec.openEquivalentName, fonts: buildEntries() });
        registerDynamicFontFamily(spec.openEquivalentName);
      }
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export async function uploadCustomPdfFontFile(file: File, customFamilyName?: string): Promise<string> {
  initPdfFonts();
  const familyName = (customFamilyName || file.name.replace(/\.(ttf|otf|woff2?)$/i, '')).trim() || 'Fuente Personalizada';
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No pudimos leer el archivo de fuente.'));
    reader.readAsDataURL(file);
  });

  await saveCustomFont({
    familyName,
    fileName: file.name,
    source: 'uploaded',
    dataUrl,
  });

  Font.register({ family: familyName, src: dataUrl });
  registerDynamicFontFamily(familyName);
  return familyName;
}

export async function importWindowsLocalFonts(targetFamilies: string[] = ['Times New Roman', 'Arial', 'Calibri', 'Georgia']): Promise<{
  supported: boolean;
  imported: string[];
}> {
  if (typeof window === 'undefined' || typeof (window as any).queryLocalFonts !== 'function') {
    return { supported: false, imported: [] };
  }

  const localFonts: Array<{ family: string; style: string; blob: () => Promise<Blob> }> =
    await (window as any).queryLocalFonts();
  const imported: string[] = [];

  for (const target of targetFamilies) {
    const match = localFonts.find(
      (f) =>
        f.family.toLowerCase() === target.toLowerCase() &&
        /regular|normal/i.test(f.style || 'Regular'),
    ) || localFonts.find((f) => f.family.toLowerCase() === target.toLowerCase());

    if (!match) continue;
    const blob = await match.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Error leyendo fuente local'));
      reader.readAsDataURL(blob);
    });

    await saveCustomFont({
      familyName: target,
      fileName: `${target}.ttf`,
      source: 'windows_local',
      dataUrl,
    });
    Font.register({ family: target, src: dataUrl });
    registerDynamicFontFamily(target);
    imported.push(target);
  }

  return { supported: true, imported };
}

/**
 * Sanitiza cualquier nombre de fuente (incluyendo 'cursive', 'sans-serif', etc.)
 * garantizando que NUNCA se pase una fuente no registrada a @react-pdf/renderer.
 */
export function sanitizeFontFamily(
  family?: string,
  isBold: boolean = false,
  isItalic: boolean = false,
): string {
  initPdfFonts();
  return sanitizeFontFamilyPure(family, isBold, isItalic);
}
