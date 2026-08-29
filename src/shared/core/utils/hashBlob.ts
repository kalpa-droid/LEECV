/**
 * NÚCLEO — UTILIDAD CANÓNICA DE HASHING DE BLOBS (hashBlob.ts)
 * 
 * Calcula el hash SHA-256 en formato hexadecimal de cualquier Blob binario
 * utilizando la Web Crypto API nativa del navegador.
 * 
 * Reutilizado por el respaldo incremental de Google Drive y la Bóveda Enterprise.
 */
export async function hashBlob(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
