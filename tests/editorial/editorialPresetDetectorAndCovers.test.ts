import { describe, it, expect } from 'vitest';
import {
  detectEditorialPresetHeuristic,
  detectEditorialPresetForText,
} from '../../src/modules/editor-lee-studio/domain/editorialPresetDetector';
import {
  resolveEditorialSectionCoverState,
  countEditorialSectionCoverPages,
} from '../../src/modules/editor-lee-studio/domain/sanitizeEditorialData';
import { generateSectionAnchors } from '../../src/modules/editor-lee-studio/domain/editorialTocResolver';
import type { EditorialSection } from '../../src/modules/editor-lee-studio/domain/editorialTypes';

describe('editorialPresetDetector — detección de tipo de obra al subir manuscritos', () => {
  it('detecta un Informe / Proyecto ejecutivo y recomienda cambiar cuando el editor está en Libro / Novela', async () => {
    const reportText = `
      RESUMEN EJECUTIVO
      El presente informe técnico de gestión detalla el alcance del proyecto, los objetivos específicos
      y el diagnóstico situacional del trimestre.
      1. Indicadores de gestión (KPI) y entregables
      2. Cronograma y presupuesto estimado
      3. Plan de acción y recomendaciones estratégicas
    `;

    const heur = detectEditorialPresetHeuristic(reportText, 'informe_trimestral.docx');
    expect(heur.presetId).toBe('informe-proyecto');
    expect(heur.confidence).toBe('high');

    const rec = await detectEditorialPresetForText({
      fullText: reportText,
      currentPresetId: 'libro-ensayo-novela',
      fileName: 'informe_trimestral.docx',
      skipAi: true,
    });
    expect(rec).not.toBeNull();
    expect(rec?.recommendedPresetId).toBe('informe-proyecto');
  });

  it('no recomienda cambio si el documento detectado ya coincide con el preset activo', async () => {
    const reportText = `
      RESUMEN EJECUTIVO
      Informe de gestión con objetivos específicos, presupuesto, cronograma, KPI y plan de acción.
    `;
    const rec = await detectEditorialPresetForText({
      fullText: reportText,
      currentPresetId: 'informe-proyecto',
      skipAi: true,
    });
    expect(rec).toBeNull();
  });

  it('detecta Informe Científico IMRyD (Vancouver) con citas numéricas [1]', () => {
    const paperText = `
      Abstract y Palabras clave.
      Introducción: antecedentes clínicos [1, 2].
      Materiales y métodos: estudio de cohorte con significancia estadística p < 0.05 [3].
      Resultados y discusión: hallazgos principales.
    `;
    const heur = detectEditorialPresetHeuristic(paperText);
    expect(heur.presetId).toBe('cientifico-vancouver');
    expect(heur.bibliographyStyle).toBe('vancouver');
  });

  it('detecta Tesis Universitaria APA 7 con marco teórico y citas (Autor, Año)', () => {
    const thesisText = `
      Tesis de grado presentada para optar al título.
      Marco teórico y estado del arte: según investigaciones recientes (Gómez, 2023, p. 14).
      Hipótesis de investigación y variables de estudio.
      Referencias bibliográficas.
    `;
    const heur = detectEditorialPresetHeuristic(thesisText);
    expect(heur.presetId).toBe('tesis-apa7');
    expect(heur.structuralNormId).toBe('apa7');
  });
});

describe('Carátulas por capítulo / sección en EditorLee', () => {
  const capSection: EditorialSection = {
    id: 'ed_cap_1',
    title: 'Capítulo 1: El Comienzo',
    sectionKey: 'capitulo',
    category: 'cuerpo',
    visible: true,
    includeInToc: true,
    startNewPage: true,
    position: 0,
    records: [{ id: 'r1', type: 'paragraph', content: 'Texto del capítulo.' }],
  };

  const bibSection: EditorialSection = {
    id: 'ed_bib_1',
    title: 'Referencias',
    sectionKey: 'bibliografia',
    category: 'cierre',
    visible: true,
    includeInToc: true,
    startNewPage: true,
    position: 1,
    records: [],
  };

  it('viene desactivada por defecto (0 páginas extra)', () => {
    const state = resolveEditorialSectionCoverState(capSection, {}, {});
    expect(state.enabled).toBe(false);
    expect(countEditorialSectionCoverPages(capSection, {}, {})).toBe(0);
  });

  it('al activar globalmente suma 1 página (o 2 con hoja blanca detrás) en capítulos del cuerpo y omite bibliografía', () => {
    const design = {
      coverStyleId: 'modern-corporate',
      sectionDividers: {
        enabled: true,
        scope: 'body-chapters',
        inheritCoverStyle: true,
        blankBackPage: true,
      },
    };
    expect(countEditorialSectionCoverPages(capSection, design, {})).toBe(2);
    expect(countEditorialSectionCoverPages(bibSection, design, {})).toBe(0);
  });

  it('permite activar o desactivar la carátula en una sección puntual (override Nivel 3)', () => {
    const sectionWithOverride: EditorialSection = {
      ...capSection,
      sectionCover: {
        enabled: true,
        blankBackPage: false,
        kicker: 'PARTE I',
      },
    };
    const state = resolveEditorialSectionCoverState(sectionWithOverride, {}, { coverStyleId: 'bold-impact' });
    expect(state.enabled).toBe(true);
    expect(state.blankBackPage).toBe(false);
    expect(state.coverStyleId).toBe('bold-impact');
    expect(state.kicker).toBe('PARTE I');
    expect(countEditorialSectionCoverPages(sectionWithOverride, {}, {})).toBe(1);
  });

  it('generateSectionAnchors desplaza la numeración del índice cuando hay carátulas de capítulos', () => {
    const sec1Base: EditorialSection = {
      ...capSection,
      id: 'sec_1',
    };
    const sec1WithDivider: EditorialSection = {
      ...sec1Base,
      sectionCover: { enabled: true, blankBackPage: true }, // +2 páginas antes del contenido
    };
    const sec2: EditorialSection = {
      ...capSection,
      id: 'sec_2',
      title: 'Capítulo 2',
    };
    const anchorsWithout = generateSectionAnchors(
      [sec1Base, sec2],
      { sec_1: sec1Base.records, sec_2: sec2.records },
      {},
      {},
    );
    const anchorsWith = generateSectionAnchors(
      [sec1WithDivider, sec2],
      { sec_1: sec1WithDivider.records, sec_2: sec2.records },
      {},
      {},
    );
    const pageWithout = anchorsWithout.find((a) => a.anchorId === 'sec_2')?.pageNumber ?? 0;
    const pageWith = anchorsWith.find((a) => a.anchorId === 'sec_2')?.pageNumber ?? 0;
    expect(pageWith - pageWithout).toBe(2);
  });
});
