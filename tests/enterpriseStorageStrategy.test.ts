import { describe, it, expect } from 'vitest';
import {
  getVaultAssetRefCount,
  incrementVaultAssetRefCount,
  decrementVaultAssetRefCount,
  registerEnterpriseVaultAsset
} from '../src/shared/core/storage/enterpriseStorageStrategy';
import { reconstructCvDataFromParts } from '../src/shared/core/storage/driveDocumentPackager';

describe('FASE 4 — Bóveda Enterprise & Conteo de Referencias', () => {
  it('debe incrementar y decrementar el conteo de referencias inmutablemente', async () => {
    const testHash = 'test_hash_enterprise_12345';
    
    expect(await getVaultAssetRefCount(testHash)).toBe(0);

    const count1 = await incrementVaultAssetRefCount(testHash);
    expect(count1).toBe(1);

    const count2 = await incrementVaultAssetRefCount(testHash);
    expect(count2).toBe(2);

    const countDec1 = await decrementVaultAssetRefCount(testHash);
    expect(countDec1).toBe(1);

    const countDec2 = await decrementVaultAssetRefCount(testHash);
    expect(countDec2).toBe(0);
  });

  it('debe registrar un asset en la bóveda generando una ruta boveda://', async () => {
    const mockBlob = new Blob(['sample asset content'], { type: 'image/png' });
    const result = await registerEnterpriseVaultAsset(mockBlob, 'png');

    expect(result.hash).toBeDefined();
    expect(result.vaultPath).toContain('boveda://');
    expect(result.refCount).toBeGreaterThanOrEqual(1);
  });

  it('debe reconstruir esquemas boveda:// desde reconstructCvDataFromParts', async () => {
    const cleanData = {
      personalInfo: {
        fullName: "Test User",
        profilePhoto: "boveda://sample_hash_999.png"
      }
    };
    const assets = {
      "sample_hash_999": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    };

    const reconstructed = await reconstructCvDataFromParts(cleanData, assets);
    expect(reconstructed.personalInfo.profilePhoto).toContain('data:image/png;base64,');
  });
});
