import { apiClient } from '../../../shared/core/utils/apiClient';

/**
 * Servicio de Monitoreo Preventivo de Cuota de Google Drive & Failover a LEECV Cloud
 */

/**
 * Consulta la cuota utilizada en Google Drive via Google API
 * Retorna { usedBytes, totalBytes, percentUsed, isNearLimit, isFull }
 */
export async function checkGoogleDriveQuota(accessToken: string) {
  if (!accessToken) {
    return { isConfigured: false, usedBytes: 0, totalBytes: 0, percentUsed: 0, isNearLimit: false, isFull: false };
  }

  try {
    const { ok, data, error } = await apiClient.get<any>('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
      headers: { Authorization: `Bearer ${accessToken}` },
      requiresAuth: false,
    });
    if (!ok || !data) throw new Error(error || 'Error al consultar cuota de Google Drive');

    const quota = data.storageQuota || {};
    const limit = Number(quota.limit || 16106127360); // 15 GB por defecto en bytes
    const usage = Number(quota.usage || 0);

    const percentUsed = limit > 0 ? Math.round((usage / limit) * 100) : 0;
    const isNearLimit = percentUsed >= 85;
    const isFull = percentUsed >= 98;

    return {
      isConfigured: true,
      usedBytes: usage,
      totalBytes: limit,
      percentUsed,
      isNearLimit,
      isFull,
      remainingGB: ((limit - usage) / (1024 * 1024 * 1024)).toFixed(1),
    };
  } catch (err) {
    console.warn('Advertencia de consulta de cuota Drive:', err);
    return { isConfigured: true, usedBytes: 0, totalBytes: 0, percentUsed: 0, isNearLimit: false, isFull: false };
  }
}

/**
 * Mensaje de alerta en lenguaje amigable según el nivel de almacenamiento
 */
export function getQuotaAlertNotice(quotaInfo) {
  if (!quotaInfo?.isConfigured) return null;

  if (quotaInfo.isFull) {
    return {
      type: 'danger',
      title: '🚨 Espacio en Google Drive Agotado (100% Lleno)',
      message: `Tu cuenta de Google Drive se ha quedado sin espacio disponible. Tus datos ingresados se mantienen intactos en tu pantalla. Puedes liberar archivos de tu Drive o activar el Plan LEECV Cloud para continuar sin interrupciones.`,
    };
  }

  if (quotaInfo.isNearLimit) {
    return {
      type: 'warning',
      title: `⚠️ Aviso Preventivo: Tu Google Drive está al ${quotaInfo.percentUsed}% de su capacidad`,
      message: `Te quedan aproximadamente ${quotaInfo.remainingGB} GB en tu cuenta de Google. Considera limpiar candidatos antiguos o adquirir el módulo LEECV Cloud para asegurar tus respaldos.`,
    };
  }

  return null;
}
