/**
 * Manejador de apertura directa desde el Sistema Operativo (PWA `launchQueue`).
 *
 * Cuando el usuario hace doble clic en Windows/macOS sobre un archivo `.leecv`, `.leedoc`,
 * `.leecard` o `.leebook` (con el ícono de rayo asociado tras instalar la PWA), este
 * consumidor lee el FileSystemFileHandle, desempaqueta el documento y lo abre en el estudio
 * correspondiente.
 *
 * Los imports pesados se cargan de forma dinámica dentro de `setConsumer` para mantener el
 * tamaño del bundle inicial intacto.
 */

export interface PwaLaunchHandlerDeps {
  onDocumentOpened: (args: { docType: string; data: any; route: string; fileName: string }) => void;
  onError?: (message: string) => void;
}

export function initPwaFileLaunchHandler(deps: PwaLaunchHandlerDeps): () => void {
  if (typeof window === 'undefined' || !('launchQueue' in window)) {
    return () => {};
  }

  let active = true;
  const launchQueue = (window as any).launchQueue;
  if (!launchQueue || typeof launchQueue.setConsumer !== 'function') {
    return () => {};
  }

  launchQueue.setConsumer(async (launchParams: any) => {
    if (!active) return;
    const files = Array.isArray(launchParams?.files) ? launchParams.files : [];
    const firstHandle = files[0];
    if (!firstHandle || typeof firstHandle.getFile !== 'function') return;

    try {
      const file: File = await firstHandle.getFile();
      const [codecMod, nativeFileMod, storageMod] = await Promise.all([
        import('../storage/leecvPackageCodec'),
        import('../storage/nativeFileDocumentService'),
        import('../storage/documentStorageService'),
      ]);

      const unpacked = await codecMod.unpackDocumentFromDisk(file);
      const spec = codecMod.getPackageFormatSpec(unpacked.docType);
      const docId =
        String(unpacked.data?.id || '').trim() ||
        `doc_${unpacked.docType}_${Date.now()}`;

      const hydratedDoc = {
        ...unpacked.data,
        id: docId,
      };

      nativeFileMod.bindNativeFileHandle(docId, firstHandle);
      await storageMod.saveDocumentDraftLocal(hydratedDoc, unpacked.docType);

      if (!active) return;
      deps.onDocumentOpened({
        docType: unpacked.docType,
        data: hydratedDoc,
        route: spec.route,
        fileName: file.name,
      });
    } catch (err: any) {
      deps.onError?.(err?.message || 'No pudimos abrir el archivo seleccionado desde el sistema.');
    }
  });

  return () => {
    active = false;
  };
}
