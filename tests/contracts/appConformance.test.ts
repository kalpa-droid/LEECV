/**
 * Suite de Tests de Conformidad de Plataforma (`appConformance.test.ts`).
 *
 * Toda aplicación registrada en `DOCUMENT_TYPE_REGISTRY` (hoy 7; mañana #8, #15, #30)
 * hereda automáticamente estas invariantes sin escribir una sola línea repetida:
 *   1. Identidad completa en el registro y paridad 1:1 con `APP_SURFACE_MANIFEST`.
 *   2. Sin tipos prohibidos (`portfolio`, `certificate`).
 *   3. Política de persistencia coherente (`local-encrypted` nunca admite nube).
 *   4. Proyecciones de respaldo opt-in válidas, sin binarios ni diseño, bajo `maxBytes`.
 *   5. Lidio cubierto 100%: conocimiento modular en servidor + tips locales + política de privacidad.
 *   6. Helpers de título y borrador sincronizados con el registro.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_REGISTRY,
  getDefaultTitleForDocType,
  getRouteForDocType,
  isEncryptedVaultDocumentType,
} from '../../src/shared/core/capabilities/capabilityRegistry';
import { APP_SURFACE_MANIFEST } from '../../src/shared/core/capabilities/appSurfaceManifest';
import { DOC_TITLE_PREFIX } from '../../src/shared/core/documents/documentEngine/titleEngine';
import {
  getDraftIdForDocType,
  inferDocTypeFromDraftId,
  isDraftDocumentId,
} from '../../src/shared/core/documents/documentEngine/documentHelpers';
import {
  getCloudBackupProjector,
  validateCloudBackupProjection,
} from '../../src/shared/core/storage/cloudBackupProjections';
import { getAllTips, pickAlwaysTip } from '../../src/shared/core/assistant/assistantTips';
import {
  APP_KNOWLEDGE_BY_ID,
  composeAssistantSystemPrompt,
} from '../../api/_lib/aiTasks/appKnowledge/index';

describe('Suite de Conformidad de Plataforma — Invariantes heredadas por todas las apps', () => {
  it('ningún tipo purgado existe en el registro ni en la superficie', () => {
    expect('portfolio' in DOCUMENT_TYPE_REGISTRY).toBe(false);
    expect('certificate' in DOCUMENT_TYPE_REGISTRY).toBe(false);
    expect('portfolio' in APP_SURFACE_MANIFEST).toBe(false);
    expect('certificate' in APP_SURFACE_MANIFEST).toBe(false);
  });

  describe.each(ALL_DOCUMENT_TYPE_IDS)('App registrada: %s', (docTypeId) => {
    const manifest = DOCUMENT_TYPE_REGISTRY[docTypeId];

    it('declara contrato completo y coincide con APP_SURFACE_MANIFEST', () => {
      expect(manifest.id).toBe(docTypeId);
      expect(manifest.capsuleId.length).toBeGreaterThan(0);
      expect(manifest.route.startsWith('/')).toBe(true);
      expect(manifest.exportFormats.length).toBeGreaterThan(0);
      expect(APP_SURFACE_MANIFEST[docTypeId]).toBeDefined();
      expect(APP_SURFACE_MANIFEST[docTypeId].route).toBe(manifest.route);
    });

    it('sincroniza prefijo de título, título por defecto, ruta y borrador desde el registro', () => {
      expect(DOC_TITLE_PREFIX[docTypeId]).toBe(manifest.titlePrefix);
      expect(getDefaultTitleForDocType(docTypeId)).toBe(manifest.defaultTitle);
      expect(getDraftIdForDocType(docTypeId)).toBe(manifest.draftIdPrefix);
      expect(isDraftDocumentId(manifest.draftIdPrefix)).toBe(true);
      expect(inferDocTypeFromDraftId(manifest.draftIdPrefix)).toBe(docTypeId);
      const expectedRoute = 'studioRoute' in manifest && manifest.studioRoute ? manifest.studioRoute : manifest.route;
      expect(getRouteForDocType(docTypeId)).toBe(expectedRoute);
    });

    it('cumple invariantes de persistencia Local-First y privacidad de bóveda', () => {
      if (isEncryptedVaultDocumentType(docTypeId)) {
        expect(manifest.storage.kind).toBe('local-encrypted');
        expect('cloudBackup' in manifest.storage && Boolean((manifest.storage as any).cloudBackup)).toBe(false);
        expect(manifest.assistant.privacy).not.toBe('full-summary');
        expect(validateCloudBackupProjection(docTypeId, { test: 'blocked' }).valid).toBe(false);
      } else if ('cloudBackup' in manifest.storage && manifest.storage.cloudBackup) {
        const projector = getCloudBackupProjector(docTypeId);
        expect(projector).not.toBeNull();
        const proj = projector!.toCloudProjection({
          personalInfo: { fullName: 'Test', profilePhoto: 'data:image/png;base64,AAA' },
          theme: { primaryColor: '#000' },
        });
        expect(validateCloudBackupProjection(docTypeId, proj).valid).toBe(true);
        expect(JSON.stringify(proj)).not.toContain('data:image');
      } else {
        expect(validateCloudBackupProjection(docTypeId, { test: 'blocked' }).valid).toBe(false);
      }
    });

    it('tiene conocimiento modular de Lidio en servidor y tips locales no vacíos', () => {
      const knowledgeId = manifest.assistant.knowledgeId as keyof typeof APP_KNOWLEDGE_BY_ID;
      expect(APP_KNOWLEDGE_BY_ID[knowledgeId]).toBeTruthy();
      expect(composeAssistantSystemPrompt(docTypeId).length).toBeGreaterThan(200);
      expect(getAllTips(docTypeId).length).toBeGreaterThan(0);
      expect(pickAlwaysTip(undefined, [], docTypeId)).toBeTruthy();
    });
  });
});
