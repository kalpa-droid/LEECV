import { describe, expect, it, vi } from 'vitest';
import { localAssetStore } from '../src/shared/core/storage/localAssetStore';
import { idbStorage } from '../src/shared/core/storage/storageIndexedDB';
import { computeBackupHealth } from '../src/shared/core/storage/storageResilienceEngine';
import {
  registerBeforeReloadFlush,
  runAllBeforeReloadFlushes,
} from '../src/shared/core/pwa/updateEngine';

describe('Resiliencia Local-First y Service Worker Seguro (Fase 2)', () => {
  it('deleteDocumentAssets respeta reference counting si otro documento usa el mismo asset', async () => {
    const uri1 = await localAssetStore.putAsset('doc_a', 'data:image/png;base64,' + 'A'.repeat(300), 'image/png');
    const uri2 = await localAssetStore.putAsset('doc_b', 'data:image/png;base64,' + 'A'.repeat(300), 'image/png');
    expect(uri1).toBe(uri2);

    await localAssetStore.deleteDocumentAssets('doc_a');
    const stillExists = await localAssetStore.getAsset(uri2);
    expect(stillExists).not.toBeNull();

    await localAssetStore.deleteDocumentAssets('doc_b');
    const deletedAfterLastRef = await localAssetStore.getAsset(uri2);
    expect(deletedAfterLastRef).toBeNull();

    // Limpieza extra
    await idbStorage.removeItem('leecv_asset_doc_index:doc_a');
    await idbStorage.removeItem('leecv_asset_doc_index:doc_b');
  });

  it('runAllBeforeReloadFlushes ejecuta los flushers registrados antes de actualizar', async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    const unregister = registerBeforeReloadFlush(spy);
    await runAllBeforeReloadFlushes();
    expect(spy).toHaveBeenCalledTimes(1);
    unregister();
  });

  it('computeBackupHealth devuelve warning si no hubo respaldo externo reciente y ok si es reciente', async () => {
    const warn = await computeBackupHealth({ lastBackupIso: null });
    expect(warn.status).toBe('warning');

    const ok = await computeBackupHealth({ lastBackupIso: new Date().toISOString() });
    expect(ok.status).toBe('ok');
  });
});
