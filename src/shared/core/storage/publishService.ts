import { supabase } from '../lib/supabaseClient';
import { uploadToGoogleDrive } from './googleDriveBackend';

export interface PublishResult {
  success: boolean;
  slug?: string;
  publicUrl?: string;
  needsPayment?: boolean;
  price?: number;
  message?: string;
  error?: string;
}

/**
 * Otorga permiso de lectura pública ("anyone with link") al archivo en el Google Drive del usuario.
 */
async function makeDriveFilePublic(fileId: string, accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('No se pudo otorgar permiso público en Drive:', err);
    return false;
  }
}

/**
 * Genera un slug limpio y amigable para la URL pública (ej: monica-burgos-salta).
 */
export function generateSlug(candidateName: string): string {
  const cleanName = (candidateName || 'cv')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${cleanName}-${randomSuffix}`;
}

/**
 * Publica o actualiza el CV en línea.
 * - Pro / Enterprise: Publicación ilimitada sin costo extra.
 * - Nivel 1 (Gratuito): Requiere 1 pago único de activación por CV ($1 USD / ARS equivalente).
 *   Una vez activado ese CV, todas sus actualizaciones futuras son 100% GRATIS.
 */
export async function publishCV(cvData: any): Promise<PublishResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { 
      success: false, 
      message: 'Para publicar tu CV en la web debes iniciar sesión con Google.' 
    };
  }

  const userId = session.user.id;
  const cvId = cvData?.id || `cv_${Date.now()}`;
  const candidateName = cvData?.personalInfo?.fullName || 
    `${cvData?.personalInfo?.surname || ''} ${cvData?.personalInfo?.givenNames || ''}`.trim() || 
    'Postulante';

  // 1. Consultar perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, subscription_status')
    .eq('id', userId)
    .single();

  const isProOrEnterprise = profile?.plan === 'pro' || profile?.plan === 'enterprise';

  // 2. Si es plan gratuito, verificar si este CV ya fue desbloqueado anteriormente
  let isUnlocked = isProOrEnterprise;
  if (!isUnlocked) {
    const { data: unlock } = await supabase
      .from('publish_unlocks')
      .select('id')
      .eq('user_id', userId)
      .eq('cv_id', cvId)
      .maybeSingle();

    if (unlock) {
      isUnlocked = true;
    }
  }

  if (!isUnlocked) {
    return {
      success: false,
      needsPayment: true,
      price: 1,
      message: 'La activación del link web público requiere un pago único de $1 USD por este CV (actualizaciones futuras ilimitadas gratis).'
    };
  }

  // 3. Subir el archivo JSON al Google Drive del usuario
  const jsonBlob = new Blob([JSON.stringify(cvData, null, 2)], { type: 'application/json' });
  const fileName = `LEECV_PUBLIC_${cvId}.json`;

  const driveRes = await uploadToGoogleDrive(jsonBlob, fileName);
  if (!driveRes.success || !driveRes.fileId) {
    return { success: false, error: driveRes.error || 'Error guardando en Google Drive.' };
  }

  // 4. Hacer el archivo público en Google Drive
  try {
    const accessRes = await fetch('/api/drive/get-access-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const { accessToken } = await accessRes.json();
    if (accessToken) {
      await makeDriveFilePublic(driveRes.fileId, accessToken);
    }
  } catch (err) {
    console.warn('Continuando publicacion con permisos por defecto en Drive');
  }

  // 5. Registrar / actualizar el puntero en la tabla published_cvs
  let slug = cvData.publicSlug;
  if (!slug) {
    slug = generateSlug(candidateName);
  }

  const { error: dbErr } = await supabase
    .from('published_cvs')
    .upsert({
      user_id: userId,
      cv_id: cvId,
      slug,
      drive_file_id: driveRes.fileId,
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'cv_id' });

  if (dbErr) {
    console.error('Error registrando puntero de publicación:', dbErr);
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://leecv.vercel.app';
  const publicUrl = `${origin}/c/${slug}`;

  return {
    success: true,
    slug,
    publicUrl,
    message: '¡CV publicado y sincronizado exitosamente en la web!'
  };
}
