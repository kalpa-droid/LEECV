import { describe, expect, it } from 'vitest';
import {
  BIBLIOGRAPHY_NORM_GUIDES,
  buildInlineCiteToken,
  collectBibliographyFromSections,
  computeCitationAppearanceOrder,
  formatEditorialCitation,
  resolveInlineCitationsInText,
  syncSectionsBibliographyOrder,
} from '../src/modules/editor-lee-studio/domain/editorialCitationFormatter';
import {
  applyEditorialGlobalConfig,
  checkEditorialNormCompatibility,
  clearEditorialFieldManual,
  detectEditorialDesignConflicts,
  formatEditorialPillLabel,
  markEditorialFieldManual,
} from '../src/modules/editor-lee-studio/domain/editorialNormEngine';
import type { EditorialRecord, EditorialSection } from '../src/modules/editor-lee-studio/domain/editorialTypes';

describe('EditorLee V3.3 — Normas Separadas, Cascada Anti-Pisado y Citas en Línea', () => {
  it('permite combinar estructura APA 7 con Vancouver, IEEE y Harvard y advierte mezcla estricta con Chicago/MLA', () => {
    expect(checkEditorialNormCompatibility('apa7', 'vancouver').level).toBe('optimal');
    expect(checkEditorialNormCompatibility('apa7', 'ieee').level).toBe('optimal');
    expect(checkEditorialNormCompatibility('apa7', 'harvard').level).toBe('optimal');

    expect(checkEditorialNormCompatibility('chicago', 'chicago').level).toBe('optimal');
    expect(checkEditorialNormCompatibility('mla', 'mla').level).toBe('optimal');

    expect(checkEditorialNormCompatibility('chicago', 'apa7').level).toBe('advisory');
    expect(checkEditorialNormCompatibility('mla', 'vancouver').level).toBe('advisory');
  });

  it('separa configuración global de ajustes finos manuales (manualOverrides) y soporta reset puntual', () => {
    const initialDraft = {
      id: 'ed_cascade_1',
      type: 'editorial',
      metadata: { title: 'Tesis Experimental' },
      design: {
        presetId: 'libro-ensayo-novela',
        pageSizeId: 'a5',
        marginTop: 20,
        marginBottom: 20,
        marginRight: 16,
        gutter: 22,
        typography: { fontFamily: 'Times-Roman', fontSize: 11, lineHeight: 1.5 },
        firstLineIndent: true,
        pageNumbers: true,
      },
      sections: [],
    };

    // Usuario ajusta manualmente el interlineado a 1.8 en Diseño
    const customized = markEditorialFieldManual(
      {
        ...initialDraft,
        design: {
          ...initialDraft.design,
          typography: { ...initialDraft.design.typography, lineHeight: 1.8 },
        },
      },
      'lineHeight',
    );

    const conflicts = detectEditorialDesignConflicts(customized, 'apa7', 'tesis-apa7');
    expect(conflicts.map((c) => c.fieldKey)).toContain('lineHeight');

    // Cambiar global a APA 7 + IEEE conservando ajustes finos
    const preserved = applyEditorialGlobalConfig(customized, {
      presetId: 'tesis-apa7',
      structuralNormId: 'apa7',
      bibliographyStyle: 'ieee',
      applyMode: 'preserve-manual',
    });

    expect(preserved.design.structuralNormId).toBe('apa7');
    expect(preserved.design.bibliographyStyle).toBe('ieee');
    expect(preserved.design.marginTop).toBe(25.4);
    expect(preserved.design.typography.lineHeight).toBe(1.8); // ajuste fino preservado
    expect(preserved.design.manualOverrides.lineHeight).toBe(true);
    expect(formatEditorialPillLabel(preserved).shortLabel).toBe('APA 7 · IEEE');

    // Reset puntual del ajuste manual vuelve a 2.0 (norma APA 7)
    const resetLineHeight = clearEditorialFieldManual(preserved, 'lineHeight');
    expect(resetLineHeight.design.typography.lineHeight).toBe(2.0);
    expect(resetLineHeight.design.manualOverrides.lineHeight).toBeUndefined();

    // Aplicar todo sobrescribe todos los manualOverrides
    const fullApplied = applyEditorialGlobalConfig(customized, {
      presetId: 'tesis-apa7',
      structuralNormId: 'apa7',
      bibliographyStyle: 'vancouver',
      applyMode: 'apply-all',
    });
    expect(fullApplied.design.typography.lineHeight).toBe(2.0);
    expect(fullApplied.design.manualOverrides.lineHeight).toBeUndefined();
    expect(formatEditorialPillLabel(fullApplied).shortLabel).toBe('APA 7 · Vancouver');
  });

  it('formatea referencias IEEE, Harvard y MLA y resuelve citas en línea según estilo activo y orden de aparición', () => {
    const bibA: EditorialRecord = {
      id: 'bib_alvarez',
      type: 'bibliography_item',
      content: '',
      bibSourceType: 'articulo',
      bibAuthor: 'Álvarez, Marta; Pérez, Juan',
      bibYear: '2024',
      bibTitle: 'Arquitecturas distribuidas en salud',
      bibJournal: 'Revista Biomédica',
      bibVolume: '18',
      bibIssue: '2',
      bibPages: '101-114',
      bibOrderNumber: 1,
    };

    const bibZ: EditorialRecord = {
      id: 'bib_zelaya',
      type: 'bibliography_item',
      content: '',
      bibSourceType: 'libro',
      bibAuthor: 'Zelaya, Carlos',
      bibYear: '2021',
      bibTitle: 'Ensayos de ingeniería',
      bibEditorial: 'Eudeba',
      bibOrderNumber: 2,
    };

    expect(formatEditorialCitation(bibA, 'ieee', 0).fullText).toContain('[1] Álvarez, Marta; Pérez, Juan, «Arquitecturas distribuidas en salud»');
    expect(formatEditorialCitation(bibA, 'harvard', 0).fullText).toContain('Álvarez, Marta; Pérez, Juan (2024)');
    expect(formatEditorialCitation(bibZ, 'mla', 1).fullText).toContain('Zelaya, Carlos. Ensayos de ingeniería. Eudeba, 2021.');
    expect(BIBLIOGRAPHY_NORM_GUIDES.ieee.sortOrder).toBe('appearance');
    expect(BIBLIOGRAPHY_NORM_GUIDES.harvard.sortOrder).toBe('alphabetical');

    // En Cap 1 se cita primero a Zelaya y en Cap 2 a Álvarez con página + Zelaya otra vez
    const sections: EditorialSection[] = [
      {
        id: 'cap1',
        title: 'Capítulo 1',
        sectionKey: 'capitulo',
        category: 'cuerpo',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 0,
        records: [
          {
            id: 'r1',
            type: 'paragraph',
            content: `Según trabajos previos ${buildInlineCiteToken('bib_zelaya')} el método es válido.`,
          },
        ],
      },
      {
        id: 'cap2',
        title: 'Capítulo 2',
        sectionKey: 'capitulo',
        category: 'cuerpo',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 1,
        records: [
          {
            id: 'r2',
            type: 'paragraph',
            content: `Resultados recientes ${buildInlineCiteToken('bib_alvarez', 'p. 105')} confirman a ${buildInlineCiteToken('bib_zelaya')}.`,
          },
        ],
      },
      {
        id: 'bibsec',
        title: 'Bibliografía',
        sectionKey: 'bibliografia',
        category: 'cierre',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 2,
        records: [bibA, bibZ], // Llegaron al revés (Álvarez primero)
      },
    ];

    const orderMap = computeCitationAppearanceOrder(sections);
    expect(orderMap.get('bib_zelaya')).toBe(1);
    expect(orderMap.get('bib_alvarez')).toBe(2);

    const { map: bibMap } = collectBibliographyFromSections(sections);

    // En Vancouver: Zelaya es [1], Álvarez [2] y repetir Zelaya conserva [1]
    expect(resolveInlineCitationsInText(sections[0].records[0].content, bibMap, 'vancouver', orderMap)).toBe(
      'Según trabajos previos [1] el método es válido.',
    );
    expect(resolveInlineCitationsInText(sections[1].records[0].content, bibMap, 'vancouver', orderMap)).toBe(
      'Resultados recientes [2, p. 105] confirman a [1].',
    );
    const vancouverSynced = syncSectionsBibliographyOrder(sections, 'vancouver');
    expect(vancouverSynced[2].records.map((r) => r.id)).toEqual(['bib_zelaya', 'bib_alvarez']);

    // Al cambiar el mismo texto sin editar capítulos a APA 7: pasa automáticamente a (Autor, Año) y orden A-Z
    expect(resolveInlineCitationsInText(sections[0].records[0].content, bibMap, 'apa7', orderMap)).toBe(
      'Según trabajos previos (Zelaya, 2021) el método es válido.',
    );
    expect(resolveInlineCitationsInText(sections[1].records[0].content, bibMap, 'apa7', orderMap)).toBe(
      'Resultados recientes (Álvarez & Pérez, 2024, p. 105) confirman a (Zelaya, 2021).',
    );
    const apaSynced = syncSectionsBibliographyOrder(sections, 'apa7');
    expect(apaSynced[2].records.map((r) => r.id)).toEqual(['bib_alvarez', 'bib_zelaya']);

    // En MLA: (Autor pág)
    expect(resolveInlineCitationsInText(sections[1].records[0].content, bibMap, 'mla', orderMap)).toBe(
      'Resultados recientes (Álvarez & Pérez 105) confirman a (Zelaya).',
    );
  });
});
