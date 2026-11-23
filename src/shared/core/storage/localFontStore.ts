/**
 * LocalFontStore — Persiste fuentes personalizadas (.ttf / .otf / Windows local fonts)
 * en IndexedDB para que estén disponibles en PDF al recargar la página.
 */

import { idbStorage } from './storageIndexedDB';

const FONT_INDEX_KEY = 'leecv_custom_fonts_index_v1';
const FONT_DATA_PREFIX = 'leecv_custom_font_data_v1:';

export interface StoredCustomFontEntry {
  slug: string;
  familyName: string;
  fileName: string;
  source: 'uploaded' | 'windows_local';
  dataUrl: string;
  createdAt: string;
}

function slugifyFont(name: string): string {
  return String(name || 'custom-font')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function listStoredCustomFonts(): Promise<Omit<StoredCustomFontEntry, 'dataUrl'>[]> {
  try {
    const raw = await idbStorage.getItem(FONT_INDEX_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function getStoredCustomFont(familyName: string): Promise<StoredCustomFontEntry | null> {
  const slug = slugifyFont(familyName);
  try {
    const data = await idbStorage.getItem(`${FONT_DATA_PREFIX}${slug}`);
    return data && typeof data === 'object' ? (data as StoredCustomFontEntry) : null;
  } catch {
    return null;
  }
}

export async function saveCustomFont(entry: Omit<StoredCustomFontEntry, 'slug' | 'createdAt'>): Promise<StoredCustomFontEntry> {
  const slug = slugifyFont(entry.familyName);
  const full: StoredCustomFontEntry = {
    ...entry,
    slug,
    createdAt: new Date().toISOString(),
  };

  await idbStorage.setItem(`${FONT_DATA_PREFIX}${slug}`, full);
  const index = await listStoredCustomFonts();
  const nextIndex = [
    { slug, familyName: full.familyName, fileName: full.fileName, source: full.source, createdAt: full.createdAt },
    ...index.filter((item) => item.slug !== slug),
  ];
  await idbStorage.setItem(FONT_INDEX_KEY, nextIndex);
  return full;
}
