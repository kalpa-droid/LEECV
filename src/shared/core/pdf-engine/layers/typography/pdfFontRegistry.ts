import { Font } from '@react-pdf/renderer';
import {
  clearDynamicFontRegistry,
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
import { decodeBase64ToUint8Array, encodeUint8ArrayToBase64 } from '../../../utils/imageCompressor';

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

const VERIFIED_FONT_DATA_URL_CACHE = new Map<string, string | null>();

async function verifyFontBytesSafe(bytes: Uint8Array): Promise<boolean> {
  if (!isValidSfntFontBytes(bytes)) return false;
  try {
    const fkModule: any = await import('fontkit');
    const fontkit = fkModule?.default || fkModule;
    if (typeof fontkit?.create === 'function') {
      const parsed = fontkit.create(bytes);
      if (!parsed || 'fonts' in parsed) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function fetchVerifiedSfntDataUrl(url: string): Promise<string | null> {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) return null;
  if (cleanUrl.startsWith('data:')) {
    return isValidSfntDataUrl(cleanUrl) ? cleanUrl : null;
  }
  if (VERIFIED_FONT_DATA_URL_CACHE.has(cleanUrl)) {
    return VERIFIED_FONT_DATA_URL_CACHE.get(cleanUrl) ?? null;
  }

  let bytes: Uint8Array | null = null;
  try {
    if (typeof window === 'undefined') {
      if (cleanUrl.startsWith('/fonts/')) {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const diskPath = path.join(process.cwd(), 'public', cleanUrl.replace(/^\/+/, ''));
        if (fs.existsSync(diskPath)) {
          bytes = new Uint8Array(fs.readFileSync(diskPath));
        }
      }
    } else {
      const res = await fetch(cleanUrl);
      if (res.ok) {
        bytes = new Uint8Array(await res.arrayBuffer());
      }
    }
  } catch {
    bytes = null;
  }

  if (!bytes || !(await verifyFontBytesSafe(bytes))) {
    VERIFIED_FONT_DATA_URL_CACHE.set(cleanUrl, null);
    return null;
  }

  const dataUrl = `data:font/ttf;base64,${encodeUint8ArrayToBase64(bytes)}`;
  VERIFIED_FONT_DATA_URL_CACHE.set(cleanUrl, dataUrl);
  return dataUrl;
}

export function resetBrokenDynamicFonts(): void {
  clearDynamicFontRegistry();
  try {
    (Font as any)?.clear?.();
  } catch {
    // noop
  }
}

async function resolveVerifiedSpecDataUrls(spec: AcademicFontSpec): Promise<{
  regular: string;
  bold: string;
  italic: string;
  boldItalic: string;
} | null> {
  const tryOrder = (localUrl?: string, remoteUrl?: string) =>
    [localUrl, remoteUrl].filter((u): u is string => Boolean(u));

  const pickFirstValid = async (candidates: string[]): Promise<string | null> => {
    for (const url of candidates) {
      const dataUrl = await fetchVerifiedSfntDataUrl(url);
      if (dataUrl) return dataUrl;
    }
    return null;
  };

  const regular = await pickFirstValid(
    tryOrder(spec.localTtfUrls?.regular, spec.ttfUrls.regular),
  );
  if (!regular) return null;

  const [bold, italic, boldItalic] = await Promise.all([
    pickFirstValid(tryOrder(spec.localTtfUrls?.bold, spec.ttfUrls.bold)),
    pickFirstValid(tryOrder(spec.localTtfUrls?.italic, spec.ttfUrls.italic)),
    pickFirstValid(tryOrder(spec.localTtfUrls?.boldItalic, spec.ttfUrls.boldItalic)),
  ]);

  const resolvedBold = bold || regular;
  return {
    regular,
    bold: resolvedBold,
    italic: italic || regular,
    boldItalic: boldItalic || resolvedBold,
  };
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
        const specData = spec ? await resolveVerifiedSpecDataUrls(spec) : null;
        const boldSrc =
          stored.variants?.bold && isValidSfntDataUrl(stored.variants.bold)
            ? stored.variants.bold
            : specData?.bold || stored.dataUrl;
        const italicSrc =
          stored.variants?.italic && isValidSfntDataUrl(stored.variants.italic)
            ? stored.variants.italic
            : specData?.italic || stored.dataUrl;
        const boldItalicSrc =
          stored.variants?.boldItalic && isValidSfntDataUrl(stored.variants.boldItalic)
            ? stored.variants.boldItalic
            : specData?.boldItalic || boldSrc;

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

  // 2. Registrar desde catálogo descargando y validando los bytes SFNT ANTES de Font.register()
  if (spec) {
    try {
      const verified = await resolveVerifiedSpecDataUrls(spec);
      if (!verified) return false;
      const fonts = [
        { src: verified.regular, fontWeight: 'normal' as const, fontStyle: 'normal' as const },
        { src: verified.bold, fontWeight: 'bold' as const, fontStyle: 'normal' as const },
        { src: verified.italic, fontWeight: 'normal' as const, fontStyle: styleItalic },
        { src: verified.boldItalic, fontWeight: 'bold' as const, fontStyle: styleItalic },
      ];
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
    const specData = spec ? await resolveVerifiedSpecDataUrls(spec) : null;

    const resolvedBold = boldUrl || specData?.bold || regularUrl;
    const resolvedItalic = italicUrl || specData?.italic || regularUrl;
    const resolvedBoldItalic = boldItalicUrl || specData?.boldItalic || resolvedBold;

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
