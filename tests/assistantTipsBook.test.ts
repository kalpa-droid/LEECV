/**
 * Tests Fase 5 — Lidio en Book Studio: tips por docType, destinos book_*,
 * snapshot estructural sin PII y claves de storage por docType.
 */
import { describe, it, expect } from 'vitest';
import {
  ALL_BOOK_TIPS,
  ALL_TIPS,
  BOOK_ALWAYS_TIPS,
  BOOK_TAB_TIPS,
  BOOK_STEP_IDS,
  AssistantDocType,
  AssistantTip,
  buildAssistantBookSnapshot,
  getAllTips,
  getAssistantSessionKey,
  getAssistantStorageKey,
  getTipsForTab,
  pickAlwaysTip,
  pickNextTip,
  pickNextTipCycled,
  validateAssistantTargetTab,
} from '../src/shared/core/assistant/assistantTips';
import { BOOK_STEP_SEQUENCE } from '../src/shared/core/book-engine/bookStepSequence';

describe('Fase 5 — Lidio en Book Studio', () => {
  it('BOOK_TAB_TIPS solo usa ids de pasos reales de BOOK_STEP_SEQUENCE', () => {
    const validIds = new Set(BOOK_STEP_SEQUENCE.map((s) => s.id));
    for (const [tabId, tips] of Object.entries(BOOK_TAB_TIPS)) {
      expect(validIds.has(tabId), `paso ${tabId} debe existir en BOOK_STEP_SEQUENCE`).toBe(true);
      for (const tip of tips) {
        if (tip.targetTab) {
          expect(validIds.has(tip.targetTab), `${tip.id} targetTab ${tip.targetTab} debe ser un paso real`).toBe(true);
        }
      }
    }
  });

  it('los ids de tips book son únicos dentro del catálogo book', () => {
    const ids = ALL_BOOK_TIPS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no hay colisión de ids entre tips cv y tips book', () => {
    const cvIds = new Set(ALL_TIPS.map((t) => t.id));
    const bookIds = ALL_BOOK_TIPS.map((t) => t.id);
    for (const id of bookIds) {
      expect(cvIds.has(id), `id ${id} colisiona entre cv y book`).toBe(false);
    }
  });

  it('getTipsForTab devuelve tips del paso + transversales para docType book', () => {
    const tips = getTipsForTab('book_cover', 'book');
    expect(tips.some((t) => t.id === 'tip-book-cover-1')).toBe(true);
    const alwaysIds = BOOK_ALWAYS_TIPS.map((t) => t.id);
    for (const a of BOOK_ALWAYS_TIPS) {
      expect(tips.map((t) => t.id)).toContain(a.id);
    }
  });

  it('pickNextTip salta vistos y respeta docType', () => {
    const seen = ['tip-book-cover-1'];
    const next = pickNextTip('book_cover', seen, 'book');
    expect(next).not.toBeNull();
    expect(next!.id).not.toBe('tip-book-cover-1');
    // cv nunca ve tips book: el destino viene del catálogo cv (tabs o transversales)
    const cvNext = pickNextTip('book_cover', [], 'cv');
    expect(cvNext).not.toBeNull();
    expect(cvNext!.id.startsWith('book_')).toBe(false);
    expect(ALL_TIPS.map((t) => t.id)).toContain(cvNext!.id);
  });

  it('pickAlwaysTip JAMÁS devuelve null (Lidio siempre con tip) y cubre los 3 huecos de contenido', () => {
    const all = ALL_BOOK_TIPS.map((t) => t.id);
    for (const step of Object.keys(BOOK_TAB_TIPS)) {
      expect(pickAlwaysTip(step, [], 'book')).toBeTruthy();
      expect(pickAlwaysTip(step, all, 'book')).toBeTruthy();
    }
    // Huecos de contenido auditados: creep, doble cara/borde corto, guías de armado.
    const bodies = ALL_BOOK_TIPS.map((t) => `${t.title} ${t.body}`).join(' ');
    expect(bodies).toContain('creep');
    expect(bodies).toContain('borde corto');
    expect(bodies).toContain('marcas de corte');
  });

  it('pickAlwaysTip con afterTipId rota el repaso dentro del ciclo del paso', () => {
    const all = ALL_BOOK_TIPS.map((t) => t.id);
    const next = pickAlwaysTip('book_imposition', all, 'book', 'tip-book-imposition-1');
    expect(next.id).toBe('tip-book-imposition-2');
  });

  it('pickNextTipCycled en book recorre TODO el catálogo sin repetir hasta cerrar el ciclo', () => {
    const all = ALL_BOOK_TIPS.map((t) => t.id);
    let current: string | null = all[0];
    const visited = new Set<string>([current]);
    for (let i = 0; i < all.length - 1; i++) {
      const next = pickNextTipCycled(current, all, 'book');
      expect(next).not.toBeNull();
      expect(visited.has(next!.id)).toBe(false);
      visited.add(next!.id);
      current = next!.id;
    }
    expect(pickNextTipCycled(current, all, 'book')?.id).toBe(all[0]);
  });

  it('validateAssistantTargetTab valida destinos book_* solo para docType book', () => {
    expect(validateAssistantTargetTab('book_cover', undefined, 'book')).toBe('book_cover');
    expect(validateAssistantTargetTab('book_preview_export', undefined, 'book')).toBe('book_preview_export');
    expect(validateAssistantTargetTab('book_no_existe', undefined, 'book')).toBeNull();
    // cv no acepta destinos book
    expect(validateAssistantTargetTab('book_cover', undefined, 'cv')).toBeNull();
    // book no acepta tabs cv
    expect(validateAssistantTargetTab('vacante', undefined, 'book')).toBeNull();
    // null/undefined siempre null
    expect(validateAssistantTargetTab(null, undefined, 'book')).toBeNull();
  });

  it('buildAssistantBookSnapshot es estructural y sin PII', () => {
    const snap = buildAssistantBookSnapshot(
      {
        mode: 'fotocopia',
        customCover: { type: 'upload', assetId: 'asset-123' },
        customBackCover: { type: 'source' },
        refPdfPage: 3,
        refBookPage: 7,
        destination: 'B',
        exportMode: 'raster',
        applyCreep: false,
        zipByBooklet: true,
        showGuides: true,
        readingDirection: 'rtl',
      },
      'book_cover',
      24,
    );
    expect(snap.docType).toBe('book');
    expect(snap.activeStepId).toBe('book_cover');
    expect(snap.mode).toBe('fotocopia');
    expect(snap.hasCustomCover).toBe(true);
    expect(snap.hasCustomBackCover).toBe(true);
    expect(snap.hasRefCalibration).toBe(true);
    expect(snap.destination).toBe('B');
    expect(snap.exportMode).toBe('raster');
    expect(snap.applyCreep).toBe(false);
    expect(snap.zipByBooklet).toBe(true);
    expect(snap.showGuides).toBe(true);
    expect(snap.readingDirection).toBe('rtl');
    expect(snap.pdfPageCount).toBe(24);
    // Sin PII: el snapshot no tiene fileName, assetId, texto libre ni URLs
    const raw = JSON.stringify(snap);
    expect(raw).not.toContain('asset-123');
    expect(raw).not.toContain('fileName');
    expect(raw).not.toContain('pdfUrl');
  });

  it('buildAssistantBookSnapshot con options vacíos usa defaults defensivos', () => {
    const snap = buildAssistantBookSnapshot(undefined, undefined, undefined);
    expect(snap.activeStepId).toBe('book_source_type');
    expect(snap.mode).toBe('normal');
    expect(snap.destination).toBe('A');
    expect(snap.exportMode).toBe('vector');
    expect(snap.pdfPageCount).toBe(0);
    expect(snap.hasCustomCover).toBe(false);
  });

  it('las keys de storage son distintas por docType', () => {
    expect(getAssistantStorageKey('cv')).toBe('leecv.assistant');
    expect(getAssistantStorageKey('book')).toBe('leecv.assistant.book');
    expect(getAssistantSessionKey('cv')).toBe('leecv.assistant.session');
    expect(getAssistantSessionKey('book')).toBe('leecv.assistant.session.book');
  });

  it('getAllTips devuelve el catálogo correcto según docType', () => {
    expect(getAllTips('book')).toEqual(ALL_BOOK_TIPS);
    expect(getAllTips('cv')).toEqual(ALL_TIPS);
    expect(getAllTips('book').length).toBeGreaterThan(0);
  });

  it('BOOK_STEP_IDS expone los ids canónicos de la secuencia', () => {
    expect(BOOK_STEP_IDS).toEqual(BOOK_STEP_SEQUENCE.map((s) => s.id));
  });

  it('cada paso de BOOK_STEP_SEQUENCE tiene al menos un tip o es step saltable en normal', () => {
    const skipWhenNormal = new Set(BOOK_STEP_SEQUENCE.filter((s) => s.skipWhenNormal).map((s) => s.id));
    for (const step of BOOK_STEP_SEQUENCE) {
      if (skipWhenNormal.has(step.id)) continue;
      expect(BOOK_TAB_TIPS[step.id], `paso ${step.id} debería tener tips`).toBeTruthy();
    }
  });
});
