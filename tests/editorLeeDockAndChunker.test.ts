import { describe, it, expect } from 'vitest';
import {
  buildEditorialDockTabs,
  resolveSectionBadgeLabel,
  toRomanLower,
} from '../src/modules/editor-lee-studio/domain/editorialDockEngine';
import {
  splitTextIntoManuscriptChunks,
  mergeEditorialChunkedSections,
  heuristicSplitManuscript,
} from '../src/modules/editor-lee-studio/domain/editorialManuscriptChunker';

describe('EditorLee V3.1 — Dock con distintivos numéricos/romanos y Chunker de textos largos', () => {
  it('convierte números a romanos minúsculos para preliminares', () => {
    expect(toRomanLower(1)).toBe('i');
    expect(toRomanLower(2)).toBe('ii');
    expect(toRomanLower(3)).toBe('iii');
    expect(toRomanLower(4)).toBe('iv');
    expect(toRomanLower(5)).toBe('v');
  });

  it('asigna distintivos distintos (i, ii, 1, 2, Cl, A) en el Dock para distinguir capítulos y apartados', () => {
    const tabs = buildEditorialDockTabs({
      cvData: {
        design: { presetId: 'libro-ensayo-novela' },
        sections: [
          { id: 's_pro', title: 'Prólogo', sectionKey: 'prologo', category: 'preliminares', visible: true, includeInToc: true, startNewPage: true, position: 0, records: [{ id: '1', type: 'paragraph', content: 'Hola' }] },
          { id: 's_int', title: 'Introducción', sectionKey: 'introduccion', category: 'preliminares', visible: true, includeInToc: true, startNewPage: true, position: 1, records: [] },
          { id: 's_c1', title: 'Capítulo 1', sectionKey: 'capitulo', category: 'cuerpo', visible: true, includeInToc: true, startNewPage: true, position: 2, records: [{ id: '2', type: 'paragraph', content: 'Cuerpo 1' }] },
          { id: 's_c2', title: 'Capítulo 2', sectionKey: 'capitulo', category: 'cuerpo', visible: true, includeInToc: true, startNewPage: true, position: 3, records: [] },
          { id: 's_con', title: 'Conclusiones', sectionKey: 'conclusiones', category: 'cierre', visible: true, includeInToc: true, startNewPage: true, position: 4, records: [] },
          { id: 's_anx', title: 'Anexo A', sectionKey: 'anexo', category: 'cierre', visible: false, includeInToc: true, startNewPage: true, position: 5, records: [] },
        ],
      },
    });

    const byId = Object.fromEntries(tabs.map((t) => [t.id, t]));
    expect(byId.editorial_inicio.stepNumber).toBe(1);
    expect(byId.editorial_bibliografia.stepNumber).toBe(4);
    expect(byId.s_pro.badgeLabel).toBe('i');
    expect(byId.s_pro.hasContent).toBe(true);
    expect(byId.s_int.badgeLabel).toBe('ii');
    expect(byId.s_c1.badgeLabel).toBe('1');
    expect(byId.s_c2.badgeLabel).toBe('2');
    expect(byId.s_con.badgeLabel).toBe('Cl');
    expect(byId.s_anx.badgeLabel).toBe('A');
    expect(byId.s_anx.isDisabled).toBe(true);
  });

  it('usa heurística normalizada sin diacríticos solo cuando falta clave canónica (Regla 8)', () => {
    const counters = { prelim: 0, body: 0, annex: 0 };
    const res1 = resolveSectionBadgeLabel({ id: 'legacy_1', title: 'PRÓLOGO DEL AUTOR' }, counters);
    const res2 = resolveSectionBadgeLabel({ id: 'legacy_2', title: 'Capítulo Inicial' }, counters);
    const res3 = resolveSectionBadgeLabel({ id: 'legacy_3', title: 'Apéndice Estadístico' }, counters);

    expect(res1.badgeLabel).toBe('i');
    expect(res1.sectionKey).toBe('prologo');
    expect(res2.badgeLabel).toBe('1');
    expect(res2.sectionKey).toBe('capitulo');
    expect(res3.badgeLabel).toBe('A');
    expect(res3.sectionKey).toBe('anexo');
  });

  it('divide textos largos respetando párrafos y fusiona fragmentos continuos sin cortar capítulos', () => {
    const paraA = 'Primer párrafo largo. '.repeat(200).trim();
    const paraB = 'CAPÍTULO 2: DESARROLLO\n\nSegundo bloque extenso. '.repeat(120).trim();
    const fullText = `${paraA}\n\n${paraB}`;

    const chunks = splitTextIntoManuscriptChunks(fullText, 5000);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('\n\n').length).toBeGreaterThan(fullText.length - 10);

    // Simular chunk 1 terminando en Capítulo 1 y chunk 2 continuando Capítulo 1 + abriendo Metodología
    const afterChunk1 = mergeEditorialChunkedSections([], [
      {
        title: 'Capítulo 1: Antecedentes',
        sectionKey: 'capitulo',
        records: [{ type: 'paragraph', content: 'Parte A del capítulo 1.' }],
      },
    ]);

    const afterChunk2 = mergeEditorialChunkedSections(afterChunk1, [
      {
        title: 'Capítulo 1: Antecedentes',
        sectionKey: 'capitulo',
        continuesPreviousSection: true,
        records: [{ type: 'paragraph', content: 'Parte B continuada.' }],
      },
      {
        title: 'Metodología',
        sectionKey: 'metodologia',
        records: [{ type: 'paragraph', content: 'Encuestas a 50 participantes.' }],
      },
    ]);

    expect(afterChunk2).toHaveLength(2);
    expect(afterChunk2[0].records.map((r) => r.content)).toEqual([
      'Parte A del capítulo 1.',
      'Parte B continuada.',
    ]);
    expect(afterChunk2[1].sectionKey).toBe('metodologia');
  });

  it('detector heurístico local identifica secciones aún en texto plano sin negritas ni metadatos', () => {
    const plainManuscript = [
      'Introducción',
      'Este estudio analiza la deserción escolar en la región.',
      '',
      'Metodología',
      'Se aplicaron entrevistas semiestructuradas durante tres meses.',
      '',
      'Conclusiones',
      'Los resultados muestran una mejora significativa.',
    ].join('\n');

    const detected = heuristicSplitManuscript(plainManuscript);
    expect(detected.map((d) => d.sectionKey)).toEqual(['introduccion', 'metodologia', 'conclusiones']);
  });
});
