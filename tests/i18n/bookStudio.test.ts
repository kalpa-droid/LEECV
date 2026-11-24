import { describe, it, expect } from 'vitest';
import { bookStudioCatalog } from '../../src/shared/i18n/catalog/bookStudio';
import { BOOK_STEP_SEQUENCE, getNextBookStepId } from '../../src/modules/book-studio/domain/bookStepSequence';

const SECTION_FOR: Record<string, keyof typeof bookStudioCatalog> = {
  book_source_type: 'sourceStep',
  book_organize: 'organizeStep',
  book_cover: 'coverStep',
  book_back_cover: 'backCoverStep',
  book_dividers: 'dividersStep',
  book_foliado: 'foliadoStep',
  book_imposition: 'impositionStep',
  book_preview_export: 'previewExportStep',
};

describe('bookStudioCatalog ↔ BOOK_STEP_SEQUENCE (Fase 4)', () => {
  it('tiene exactamente una sección por paso, con título numerado igual al label del dock', () => {
    expect(Object.keys(SECTION_FOR).length).toBe(BOOK_STEP_SEQUENCE.length);
    for (const step of BOOK_STEP_SEQUENCE) {
      const section = bookStudioCatalog[SECTION_FOR[step.id]];
      expect(section, `falta sección de catálogo para ${step.id}`).toBeTruthy();
      expect(section.title).toBe(step.label);
    }
  });

  it('los nextStep del catálogo apuntan al paso siguiente real de la secuencia', () => {
    expect(bookStudioCatalog.sourceStep.nextStepOrganize).toBe(`Siguiente: ${BOOK_STEP_SEQUENCE[1].label}`);
    expect(bookStudioCatalog.sourceStep.nextStepCover).toBe(`Siguiente: ${BOOK_STEP_SEQUENCE[2].label}`);
    expect(bookStudioCatalog.organizeStep.nextStep).toBe(`Siguiente: ${BOOK_STEP_SEQUENCE[2].label}`);
    expect(bookStudioCatalog.coverStep.nextStep).toBe(`Siguiente: ${BOOK_STEP_SEQUENCE[3].label}`);
    expect(bookStudioCatalog.backCoverStep.nextStep).toBe(`Siguiente: ${BOOK_STEP_SEQUENCE[4].label}`);
    expect(bookStudioCatalog.dividersStep.nextStep).toBe(`Siguiente: ${BOOK_STEP_SEQUENCE[5].label}`);
    expect(bookStudioCatalog.foliadoStep.nextStep).toBe(`Siguiente: ${BOOK_STEP_SEQUENCE[6].label}`);
    expect(bookStudioCatalog.impositionStep.nextStep).toBe(`Siguiente: ${BOOK_STEP_SEQUENCE[7].label}`);
  });

  it('el paso 6 (Encuentro un número) apunta a 7. Armado y Guías (no Exportar)', () => {
    expect(bookStudioCatalog.foliadoStep.nextStep).toContain('Armado');
    expect(bookStudioCatalog.foliadoStep.nextStep).not.toContain('Exportar');
  });

  it('getNextBookStepId coincide con el catálogo en ambos modos', () => {
    expect(getNextBookStepId('book_source_type', 'normal')).toBe('book_cover');
    expect(getNextBookStepId('book_source_type', 'fotocopia')).toBe('book_organize');
    expect(getNextBookStepId('book_back_cover', 'normal')).toBe('book_dividers');
    expect(getNextBookStepId('book_dividers', 'normal')).toBe('book_foliado');
    expect(getNextBookStepId('book_foliado', 'normal')).toBe('book_imposition');
    expect(getNextBookStepId('book_imposition', 'normal')).toBe('book_preview_export');
  });

  it('los botones de volver usan la clave compartida backStep', () => {
    expect(bookStudioCatalog.backStep).toBe('Volver');
  });
});
