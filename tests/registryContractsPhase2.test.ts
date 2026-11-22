import { describe, it, expect } from 'vitest';
import {
  ALL_DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_REGISTRY,
  getCloudBackupDocumentTypeIds,
  getDefaultTitleForDocType,
  getDocTypeForRoute,
  getRouteForDocType,
  inferDocumentTypeId,
  isEncryptedVaultDocumentType,
  isLocalOnlyDocumentType,
  isRegisteredDocumentTypeId,
} from '../src/shared/core/capabilities/capabilityRegistry';
import { DOC_TITLE_PREFIX } from '../src/shared/core/documents/documentEngine/titleEngine';
import {
  getDraftIdForDocType,
  inferDocTypeFromDraftId,
  isDraftDocumentId,
} from '../src/shared/core/documents/documentEngine/documentHelpers';
import { PORT_CONTACT_PROFILE_V1 } from '../src/shared/contracts';

describe('Fase 2 — Contratos puros, Registro v2 y purga de portfolio/certificate', () => {
  it('elimina por completo portfolio y certificate del registro y mantiene los 7 tipos activos', () => {
    expect(isRegisteredDocumentTypeId('portfolio')).toBe(false);
    expect(isRegisteredDocumentTypeId('certificate')).toBe(false);
    expect('portfolio' in DOCUMENT_TYPE_REGISTRY).toBe(false);
    expect('certificate' in DOCUMENT_TYPE_REGISTRY).toBe(false);

    expect([...ALL_DOCUMENT_TYPE_IDS].sort()).toEqual([
      'book',
      'business_card',
      'cover_letter',
      'cv',
      'editorial',
      'invoice',
      'planner',
    ]);
  });

  it('impone política Local-First y aislamiento de FacturLee en el registro', () => {
    expect(getCloudBackupDocumentTypeIds().sort()).toEqual(['business_card', 'cover_letter', 'cv']);
    expect(isLocalOnlyDocumentType('book')).toBe(true);
    expect(isLocalOnlyDocumentType('planner')).toBe(true);
    expect(isLocalOnlyDocumentType('editorial')).toBe(true);
    expect(isLocalOnlyDocumentType('invoice')).toBe(true);
    expect(isLocalOnlyDocumentType('cv')).toBe(false);

    expect(isEncryptedVaultDocumentType('invoice')).toBe(true);
    expect(isEncryptedVaultDocumentType('cv')).toBe(false);
    expect(DOCUMENT_TYPE_REGISTRY.invoice.assistant.privacy).toBe('metadata-only');
  });

  it('declara puertos entre apps (CV provee contact-profile@1, Tarjeta lo consume)', () => {
    expect(DOCUMENT_TYPE_REGISTRY.cv.ports.provides).toContain(PORT_CONTACT_PROFILE_V1);
    expect(DOCUMENT_TYPE_REGISTRY.business_card.ports.consumes).toContain(PORT_CONTACT_PROFILE_V1);
  });

  it('resuelve rutas, títulos, borradores e inferencia sin condicionales manuales por tipo', () => {
    expect(getRouteForDocType('cover_letter')).toBe('/crear-cv');
    expect(getDocTypeForRoute('/crear-carta')).toBe('cv');
    expect(getDocTypeForRoute('/crear-editor')).toBe('editorial');
    expect(getDocTypeForRoute('/crear-factura/')).toBe('invoice');
    expect(getDocTypeForRoute('/crear-tarjeta?ref=1')).toBe('business_card');

    for (const id of ALL_DOCUMENT_TYPE_IDS) {
      const cfg = DOCUMENT_TYPE_REGISTRY[id];
      expect(DOC_TITLE_PREFIX[id]).toBe(cfg.titlePrefix);
      expect(getDefaultTitleForDocType(id)).toBe(cfg.defaultTitle);
      expect(getDraftIdForDocType(id)).toBe(cfg.draftIdPrefix);
      expect(isDraftDocumentId(cfg.draftIdPrefix)).toBe(true);
      expect(inferDocTypeFromDraftId(cfg.draftIdPrefix)).toBe(id);
    }

    // Precedencia de presets exactos sobre prefijos (libro-ensayo-novela es editorial, no book)
    expect(inferDocumentTypeId({ activePresetId: 'libro-ensayo-novela' })).toBe('editorial');
    expect(inferDocumentTypeId({ activePresetId: 'libro-standard' })).toBe('book');
    expect(inferDocumentTypeId({ docType: 'carta' })).toBe('cover_letter');
    expect(inferDocumentTypeId({ docType: 'factura' })).toBe('invoice');
    expect(inferDocumentTypeId({ docType: 'editor' })).toBe('editorial');
    expect(inferDocumentTypeId({ bookMode: true })).toBe('book');
  });
});
