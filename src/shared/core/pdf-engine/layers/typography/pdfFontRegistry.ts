import { Font } from '@react-pdf/renderer';
import {
  isDynamicFontRegistered,
  registerDynamicFontFamily,
  sanitizeFontFamilyPure,
} from './fontSanitizer';
import { AcademicFontSpec, findAcademicFontSpec } from './academicFontCatalog';
import {
  getStoredCustomFont,
  removeCustomFont,
  saveCustomFont,
} from '../../../storage/localFontStore';
import { decodeBase64ToUint8Array } from '../../../utils/imageCompressor';

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

/**
 * Verifica la cabecera SFNT real (TTF/OTF) y la integridad de sus tablas
 * para impedir que fuentes `.woff`, `.woff2`, `.ttc`, HTML o buffers truncados
 * rompan `fontkit` con `RangeError: Offset is outside the bounds of the DataView`.
 */
export function isValidSfntFontBytes(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 64) return false;

  const tag =
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;

  // Rechazo explícito de WOFF (wOFF), WOFF2 (wOF2) y colecciones TrueType (ttcf)
  if (tag === 0x774f4646 || tag === 0x774f4632 || tag === 0x74746366) {
    return false;
  }

  // Solo aceptar 0x00010000 (TrueType), 'OTTO' (0x4F54544F) o 'true' (0x74727565)
  if (tag !== 0x00010000 && tag !== 0x4f54544f && tag !== 0x74727565) {
    return false;
  }

  const numTables = (bytes[4] << 8) | bytes[5];
  if (numTables === 0 || 12 + numTables * 16 > bytes.length) return false;

  for (let i = 0; i < numTables; i++) {
    const base = 12 + i * 16;
    const offset =
      ((bytes[base + 8] << 24) |
        (bytes[base + 9] << 16) |
        (bytes[base + 10] << 8) |
        bytes[base + 11]) >>>
      0;
    const length =
      ((bytes[base + 12] << 24) |
        (bytes[base + 13] << 16) |
        (bytes[base + 14] << 8) |
        bytes[base + 15]) >>>
      0;
    if (offset + length > bytes.length) return false;
  }

  return true;
}

export function isValidSfntDataUrl(dataUrl?: string | null): boolean {
  if (!dataUrl || typeof dataUrl !== 'string') return false;
  const idx = dataUrl.indexOf(',');
  if (idx < 0 || !/^data:/i.test(dataUrl)) return false;
  const b64 = dataUrl.slice(idx + 1);
  const bytes = decodeBase64ToUint8Array(b64);
  if (!bytes) return false;
  return isValidSfntFontBytes(bytes);
}

function buildSpecFontEntries(spec: AcademicFontSpec) {
  const styleItalic = 'italic' as const;
  const canUseLocalOrigin =
    typeof window !== 'undefined' &&
    /^https?:/i.test(window.location?.origin || '');
  const selectedUrls = canUseLocalOrigin && spec.localTtfUrls ? spec.localTtfUrls : spec.ttfUrls;
  const toSrc = (rawUrl: string): string =>
    canUseLocalOrigin && rawUrl.startsWith('/')
      ? new URL(rawUrl, window.location.origin).href
      : rawUrl;

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
}

export async function ensureAcademicOrCustomFontRegistered(family: string): Promise<boolean> {
  initPdfFonts();
  const clean = String(family || '').trim();
  if (!clean) return false;
  if (isDynamicFontRegistered(clean)) return true;

  const styleItalic = 'italic' as const;
  const spec = findAcademicFontSpec(clean);

  // 1. Revisar si el usuario ya subió o conectó desde Windows esta fuente en IndexedDB
  const stored = await getStoredCustomFont(clean);
  if (stored?.dataUrl) {
    if (!isValidSfntDataUrl(stored.dataUrl)) {
      // Auto-limpieza de entradas .woff2 / corruptas heredadas en IndexedDB
      await removeCustomFont(clean);
    } else {
      try {
        const specEntries = spec ? buildSpecFontEntries(spec) : [];
        const findSpecUrl = (w: 'normal' | 'bold', st: 'normal' | 'italic') =>
          specEntries.find((e) => (e.fontWeight || 'normal') === w && (e.fontStyle || 'normal') === st)?.src;

        const boldSrc =
          stored.variants?.bold && isValidSfntDataUrl(stored.variants.bold)
            ? stored.variants.bold
            : findSpecUrl('bold', 'normal') || stored.dataUrl;
        const italicSrc =
          stored.variants?.italic && isValidSfntDataUrl(stored.variants.italic)
            ? stored.variants.italic
            : findSpecUrl('normal', styleItalic) || stored.dataUrl;
        const boldItalicSrc =
          stored.variants?.boldItalic && isValidSfntDataUrl(stored.variants.boldItalic)
            ? stored.variants.boldItalic
            : findSpecUrl('bold', styleItalic) || boldSrc;

        Font.register({
          family: clean,
          fonts: [
            { src: stored.dataUrl, fontWeight: 'normal', fontStyle: 'normal' },
            { src: boldSrc, fontWeight: 'bold', fontStyle: 'normal' },
            { src: italicSrc, fontWeight: 'normal', fontStyle: styleItalic },
            { src: boldItalicSrc, fontWeight: 'bold', fontStyle: styleItalic },
          ],
        });
        registerDynamicFontFamily(clean);
        return true;
      } catch {
        // Continuar al catálogo académico
      }
    }
  }

  // 2. Registrar desde el catálogo universitario / Google TTF (bajo demanda, 0 KB en bundle inicial)
  if (spec) {
    try {
      const fonts = buildSpecFontEntries(spec);
      Font.register({ family: spec.family, fonts });
      registerDynamicFontFamily(spec.family);
      if (spec.openEquivalentName && spec.openEquivalentName !== spec.family) {
        Font.register({ family: spec.openEquivalentName, fonts });
        registerDynamicFontFamily(spec.openEquivalentName);
      }
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No pudimos leer el archivo de fuente.'));
    reader.readAsDataURL(blob);
  });
}

export async function uploadCustomPdfFontFile(file: File, customFamilyName?: string): Promise<string> {
  initPdfFonts();
  const rawBytes = new Uint8Array(await file.arrayBuffer());
  if (/\.(woff2?|ttc)$/i.test(file.name) || !isValidSfntFontBytes(rawBytes)) {
    throw new Error('Elegí un archivo de fuente .ttf u .otf válido.');
  }

  const familyName = (customFamilyName || file.name.replace(/\.(ttf|otf)$/i, '')).trim() || 'Fuente Personalizada';
  const dataUrl = await blobToDataUrl(file);
  const styleItalic = 'italic' as const;

  await saveCustomFont({
    familyName,
    fileName: file.name,
    source: 'uploaded',
    dataUrl,
  });

  Font.register({
    family: familyName,
    fonts: [
      { src: dataUrl, fontWeight: 'normal', fontStyle: 'normal' },
      { src: dataUrl, fontWeight: 'bold', fontStyle: 'normal' },
      { src: dataUrl, fontWeight: 'normal', fontStyle: styleItalic },
      { src: dataUrl, fontWeight: 'bold', fontStyle: styleItalic },
    ],
  });
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
  const styleItalic = 'italic' as const;

  const tryReadValidFont = async (entry?: { blob: () => Promise<Blob> }): Promise<string | undefined> => {
    if (!entry) return undefined;
    try {
      const blob = await entry.blob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (!isValidSfntFontBytes(bytes)) return undefined;
      return await blobToDataUrl(blob);
    } catch {
      return undefined;
    }
  };

  for (const target of targetFamilies) {
    const familyEntries = localFonts.filter(
      (f) => f.family.toLowerCase() === target.toLowerCase(),
    );
    if (familyEntries.length === 0) continue;

    const regularEntry =
      familyEntries.find((f) => /^(regular|normal|book)$/i.test((f.style || '').trim())) ||
      familyEntries.find((f) => !/bold|italic|oblique/i.test(f.style || 'Regular')) ||
      familyEntries[0];
    const boldEntry = familyEntries.find(
      (f) => /bold/i.test(f.style || '') && !/italic|oblique/i.test(f.style || ''),
    );
    const italicEntry = familyEntries.find(
      (f) => /italic|oblique/i.test(f.style || '') && !/bold/i.test(f.style || ''),
    );
    const boldItalicEntry = familyEntries.find(
      (f) => /bold/i.test(f.style || '') && /italic|oblique/i.test(f.style || ''),
    );

    const regularUrl = await tryReadValidFont(regularEntry);
    if (!regularUrl) continue;

    const [boldUrl, italicUrl, boldItalicUrl] = await Promise.all([
      tryReadValidFont(boldEntry),
      tryReadValidFont(italicEntry),
      tryReadValidFont(boldItalicEntry),
    ]);

    const spec = findAcademicFontSpec(target);
    const specEntries = spec ? buildSpecFontEntries(spec) : [];
    const fallbackSpec = (w: 'normal' | 'bold', st: 'normal' | 'italic') =>
      specEntries.find((e) => (e.fontWeight || 'normal') === w && (e.fontStyle || 'normal') === st)?.src;

    const resolvedBold = boldUrl || fallbackSpec('bold', 'normal') || regularUrl;
    const resolvedItalic = italicUrl || fallbackSpec('normal', styleItalic) || regularUrl;
    const resolvedBoldItalic = boldItalicUrl || fallbackSpec('bold', styleItalic) || resolvedBold;

    await saveCustomFont({
      familyName: target,
      fileName: `${target}.ttf`,
      source: 'windows_local',
      dataUrl: regularUrl,
      variants: {
        bold: boldUrl,
        italic: italicUrl,
        boldItalic: boldItalicUrl,
      },
    });
    Font.register({
      family: target,
      fonts: [
        { src: regularUrl, fontWeight: 'normal', fontStyle: 'normal' },
        { src: resolvedBold, fontWeight: 'bold', fontStyle: 'normal' },
        { src: resolvedItalic, fontWeight: 'normal', fontStyle: styleItalic },
        { src: resolvedBoldItalic, fontWeight: 'bold', fontStyle: styleItalic },
      ],
    });
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
