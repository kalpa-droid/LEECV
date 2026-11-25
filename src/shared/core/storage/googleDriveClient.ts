import { dal } from '../storage/dataAccessLayer';
import { supabase } from '../lib/supabaseClient';

/**
 * Cliente puro de navegador para Google Drive Personal.
 *
 * - Usa Google Identity Services (GIS) OAuth2 Token Client con scope mínimo `drive.file`
 *   (la app SOLO ve las carpetas y archivos que crea ella misma, nunca otros archivos personales).
 * - Organiza en 2 carpetas ordenadas dentro de la unidad del usuario:
 *   1. `LEECV / Borradores Editables`
 *   2. `LEECV / Documentos Terminados`
 * - Nunca sobrescribe respaldos previos: cada subida añade fecha/hora legible al nombre.
 * - Soporta subida simple (`multipart` <= 4 MB) y reanudable (`resumable` > 4 MB para libros grandes).
 */

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const ROOT_FOLDER_NAME = 'LEECV';
const RESUMABLE_THRESHOLD_BYTES = 4 * 1024 * 1024;

export const DRIVE_FOLDER_LABELS = {
  editable_drafts: 'Borradores Editables',
  finished_docs: 'Documentos Terminados',
} as const;

export type DriveFolderKind = keyof typeof DRIVE_FOLDER_LABELS;

export interface DriveQuotaSummary {
  limitBytes: number;
  usageBytes: number;
  availableBytes: number;
  percentUsed: number;
  userEmail?: string;
}

export interface DriveFileEntry {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
}

interface DriveTokenState {
  accessToken: string;
  expiresAt: number;
}

let inMemoryToken: DriveTokenState | null = null;
let gisLoadPromise: Promise<void> | null = null;

function getGoogleClientId(): string {
  try {
    return String((import.meta as any)?.env?.VITE_GOOGLE_CLIENT_ID || '').trim();
  } catch {
    return '';
  }
}

export function isGoogleDriveConfigured(): boolean {
  return getGoogleClientId().length > 0;
}

export function clearDriveSession(): void {
  inMemoryToken = null;
}

async function ensureGisLoaded(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Google Drive solo está disponible en el navegador.');
  }
  if ((window as any).google?.accounts?.oauth2) return;
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar el acceso de Google.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services.'));
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

export async function connectPersonalGoogleDrive(interactive: boolean = true): Promise<string> {
  if (inMemoryToken && inMemoryToken.expiresAt > Date.now() + 30_000) {
    return inMemoryToken.accessToken;
  }

  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error(
      'Falta configurar VITE_GOOGLE_CLIENT_ID para conectar Google Drive. Mientras tanto podés guardar una copia en tu dispositivo.'
    );
  }

  await ensureGisLoaded();
  const oauth2 = (window as any).google?.accounts?.oauth2;
  if (!oauth2?.initTokenClient) {
    throw new Error('El navegador bloqueó el módulo de acceso de Google.');
  }

  return new Promise<string>((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (resp: any) => {
        if (resp?.error || !resp?.access_token) {
          reject(new Error(resp?.error_description || 'No se completó el permiso de Google Drive.'));
          return;
        }
        const expiresInSec = Math.max(Number(resp.expires_in || 3500), 60);
        inMemoryToken = {
          accessToken: String(resp.access_token),
          expiresAt: Date.now() + expiresInSec * 1000,
        };
        resolve(inMemoryToken.accessToken);
      },
      error_callback: () => {
        reject(new Error('Se cerró o canceló la ventana de Google Drive.'));
      },
    });

    tokenClient.requestAccessToken({ prompt: interactive ? '' : 'none' });
  });
}

async function driveFetch(url: string, accessToken: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });

  if (res.status === 401) {
    inMemoryToken = null;
    throw new Error('Tu permiso de Google Drive venció. Volvé a tocar Conectar para continuar.');
  }
  return res;
}

export async function fetchDriveStorageQuota(accessToken: string): Promise<DriveQuotaSummary | null> {
  try {
    const res = await driveFetch(
      'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user',
      accessToken
    );
    if (!res.ok) return null;
    const json: any = await res.json();
    const limit = Number(json?.storageQuota?.limit || 0);
    const usage = Number(json?.storageQuota?.usage || 0);
    const available = limit > 0 ? Math.max(0, limit - usage) : Number.MAX_SAFE_INTEGER;
    const percentUsed = limit > 0 ? Math.min(100, Math.round((usage / limit) * 100)) : 0;

    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id && Number.isFinite(percentUsed)) {
          await dal.profiles.updateDriveQuota(data.user.id, percentUsed);
        }
      } catch {
        // Silencioso: no requiere cuenta LEECV ni bloquea Drive personal
      }
    }

    return {
      limitBytes: limit,
      usageBytes: usage,
      availableBytes: available,
      percentUsed,
      userEmail: json?.user?.emailAddress,
    };
  } catch {
    return null;
  }
}

async function findOrCreateFolder(name: string, accessToken: string, parentId?: string): Promise<string> {
  const escaped = name.replace(/'/g, "\\'");
  const qParts = [
    `name = '${escaped}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`,
    parentId ? `'${parentId}' in parents` : `'root' in parents`,
  ];
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qParts.join(' and '))}&fields=files(id,name)&pageSize=5`;
  const searchRes = await driveFetch(searchUrl, accessToken);
  if (!searchRes.ok) throw new Error('No se pudo leer tu carpeta de Google Drive.');

  const searchData: any = await searchRes.json();
  if (Array.isArray(searchData.files) && searchData.files.length > 0) {
    return String(searchData.files[0].id);
  }

  const createRes = await driveFetch('https://www.googleapis.com/drive/v3/files', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  if (!createRes.ok) throw new Error(`No se pudo crear la carpeta "${name}" en Google Drive.`);
  const created: any = await createRes.json();
  return String(created.id);
}

export async function ensureLeecvDriveFolder(folderKind: DriveFolderKind, accessToken: string): Promise<string> {
  const rootId = await findOrCreateFolder(ROOT_FOLDER_NAME, accessToken);
  return findOrCreateFolder(DRIVE_FOLDER_LABELS[folderKind], accessToken, rootId);
}

/** Agrega fecha y hora local al nombre para no sobrescribir copias previas en Drive. */
export function buildTimestampedDriveFilename(baseName: string): string {
  const clean = String(baseName || 'documento-leecv').trim();
  const stampMatch = /\d{4}-\d{2}-\d{2}_\d{2}-\d{2}/.test(clean);
  if (stampMatch) return clean;

  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;

  const dotIdx = clean.lastIndexOf('.');
  if (dotIdx > 0) {
    return `${clean.slice(0, dotIdx)}_${stamp}${clean.slice(dotIdx)}`;
  }
  return `${clean}_${stamp}`;
}

async function uploadMultipart(
  blob: Blob,
  fileName: string,
  folderId: string,
  accessToken: string
): Promise<DriveFileEntry> {
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: blob.type || 'application/octet-stream',
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const res = await driveFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime',
    accessToken,
    { method: 'POST', body: form }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`No se pudo subir el archivo a Google Drive (${res.status}). ${errText.slice(0, 120)}`);
  }
  const uploaded: any = await res.json();
  return {
    id: String(uploaded.id),
    name: String(uploaded.name || fileName),
    mimeType: String(uploaded.mimeType || blob.type || 'application/octet-stream'),
    size: Number(uploaded.size || blob.size),
    modifiedTime: String(uploaded.modifiedTime || new Date().toISOString()),
  };
}

async function uploadResumable(
  blob: Blob,
  fileName: string,
  folderId: string,
  accessToken: string
): Promise<DriveFileEntry> {
  const mimeType = blob.type || 'application/octet-stream';
  const initRes = await driveFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,modifiedTime',
    accessToken,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(blob.size),
      },
      body: JSON.stringify({ name: fileName, parents: [folderId], mimeType }),
    }
  );
  if (!initRes.ok) {
    throw new Error(`No se pudo iniciar la subida grande a Google Drive (${initRes.status}).`);
  }
  const sessionUri = initRes.headers.get('location');
  if (!sessionUri) {
    throw new Error('Google Drive no devolvió URL de subida reanudable.');
  }

  const putRes = await fetch(sessionUri, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: blob,
  });
  if (!putRes.ok) {
    throw new Error(`Falló la transferencia a Google Drive (${putRes.status}).`);
  }
  const uploaded: any = await putRes.json();
  return {
    id: String(uploaded.id),
    name: String(uploaded.name || fileName),
    mimeType: String(uploaded.mimeType || mimeType),
    size: Number(uploaded.size || blob.size),
    modifiedTime: String(uploaded.modifiedTime || new Date().toISOString()),
  };
}

export async function uploadFileToPersonalDrive(params: {
  blob: Blob;
  fileName: string;
  folderKind: DriveFolderKind;
  accessToken?: string;
}): Promise<{ file: DriveFileEntry; folderName: string }> {
  const accessToken = params.accessToken || (await connectPersonalGoogleDrive(true));
  const quota = await fetchDriveStorageQuota(accessToken);
  if (quota && quota.availableBytes < params.blob.size) {
    throw new Error('Tu espacio de Google Drive está lleno. Liberá lugar o guardá la copia en tu computadora.');
  }

  const folderId = await ensureLeecvDriveFolder(params.folderKind, accessToken);
  const uniqueName = buildTimestampedDriveFilename(params.fileName);

  const file =
    params.blob.size > RESUMABLE_THRESHOLD_BYTES
      ? await uploadResumable(params.blob, uniqueName, folderId, accessToken)
      : await uploadMultipart(params.blob, uniqueName, folderId, accessToken);

  return { file, folderName: `LEECV / ${DRIVE_FOLDER_LABELS[params.folderKind]}` };
}

export async function listLeecvDriveFiles(
  folderKind: DriveFolderKind = 'editable_drafts',
  accessToken?: string
): Promise<DriveFileEntry[]> {
  const token = accessToken || (await connectPersonalGoogleDrive(true));
  const folderId = await ensureLeecvDriveFolder(folderKind, token);
  const query = `'${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=30&fields=files(id,name,mimeType,size,modifiedTime)`;
  const res = await driveFetch(url, token);
  if (!res.ok) throw new Error('No se pudieron listar tus archivos de Google Drive.');
  const json: any = await res.json();
  return (json.files || []).map((f: any) => ({
    id: String(f.id),
    name: String(f.name || 'archivo'),
    mimeType: String(f.mimeType || 'application/octet-stream'),
    size: Number(f.size || 0),
    modifiedTime: String(f.modifiedTime || ''),
  }));
}

export async function downloadLeecvDriveFile(fileId: string, fileName: string, accessToken?: string): Promise<File> {
  const token = accessToken || (await connectPersonalGoogleDrive(true));
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  const res = await driveFetch(url, token);
  if (!res.ok) throw new Error('No pudimos descargar este archivo de Google Drive.');
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
}
