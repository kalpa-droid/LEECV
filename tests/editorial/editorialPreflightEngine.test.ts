import { describe, expect, it } from 'vitest';
import {
  autoCleanEditorialPunctuation,
  runEditorialPreflight,
} from '../../src/modules/editor-lee-studio/domain/editorialPreflightEngine';

describe('Auditor Editorial Previo a Exportar (Preflight)', () => {
  it('marca ok: true en una obra limpia y completa sin avisos', () => {
    const report = runEditorialPreflight({
      metadata: { title: 'Pedagogía de la Lectura Crítica', author: 'Ana Pérez' },
      sections: [
        {
          id: 'cap1',
          title: 'Capítulo 1 · Marco conceptual',
          visible: true,
          includeInToc: true,
          startNewPage: true,
          position: 0,
          records: [
            {
              id: 'r1',
              type: 'paragraph',
              content: 'El análisis hermenéutico permite comprender los sentidos situados en el aula.',
            },
          ],
        },
      ],
    });

    expect(report.ok).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.warnings).toHaveLength(0);
  });

  it('detecta título genérico "Mi obra" y secciones visibles totalmente vacías como errores bloqueantes', () => {
    const report = runEditorialPreflight({
      metadata: { title: 'Mi obra' },
      sections: [
        {
          id: 'empty_sec',
          title: 'Capítulo sin texto',
          visible: true,
          includeInToc: true,
          startNewPage: true,
          position: 0,
          records: [{ id: 'p_empty', type: 'paragraph', content: '   ' }],
        },
      ],
    });

    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.code === 'default_or_empty_title')).toBe(true);
    expect(report.errors.some((e) => e.code === 'empty_section' && e.sectionId === 'empty_sec')).toBe(true);
  });

  it('detecta placeholders sin reemplazar e imágenes de baja nitidez con lenguaje sencillo (sin jerga DPI)', () => {
    const report = runEditorialPreflight({
      metadata: { title: 'Manual Técnico Aplicado' },
      sections: [
        {
          id: 'sec_1',
          title: 'Desarrollo',
          visible: true,
          includeInToc: true,
          startNewPage: true,
          position: 0,
          records: [
            {
              id: 'rec_ph',
              type: 'paragraph',
              content: 'Ver detalle en [ESPACIO RESERVADO PARA DIAGRAMA DE FLUJO].',
            },
            {
              id: 'rec_img',
              type: 'image',
              content: '',
              imagePath: 'data:image/png;base64,AAA',
              imageDpi: 96,
            },
          ],
        },
      ],
    });

    const phWarning = report.warnings.find((w) => w.code === 'unreplaced_placeholder');
    const lowResWarning = report.warnings.find((w) => w.code === 'low_resolution_image');
    expect(phWarning).toBeDefined();
    expect(lowResWarning).toBeDefined();
    expect(lowResWarning?.title.toLowerCase()).not.toContain('dpi');
    expect(lowResWarning?.description.toLowerCase()).not.toContain('dpi');
  });

  it('detecta comas pegadas (hola,mundo) y las repara con autoCleanEditorialPunctuation preservando versos y \\u00A0', () => {
    const draft = {
      metadata: { title: 'Ensayo sobre Puntuación' },
      sections: [
        {
          id: 's1',
          title: 'Texto',
          visible: true,
          includeInToc: true,
          startNewPage: true,
          position: 0,
          records: [
            {
              id: 'p1',
              type: 'paragraph',
              content: 'Primero hola,mundo  con   espacios\u00A0unidos.',
            },
            {
              id: 'poem1',
              type: 'poem',
              preserveLineBreaks: true,
              content: 'Verso uno,\nverso  dos\nverso tres.',
            },
          ],
        },
      ],
    };

    const before = runEditorialPreflight(draft);
    expect(before.hasAutoFixablePunctuation).toBe(true);

    const cleaned = autoCleanEditorialPunctuation(draft);
    expect(cleaned.sections[0].records[0].content).toBe('Primero hola, mundo con espacios\u00A0unidos.');
    expect(cleaned.sections[0].records[1].content).toBe('Verso uno,\nverso dos\nverso tres.');

    const after = runEditorialPreflight(cleaned);
    expect(after.hasAutoFixablePunctuation).toBe(false);
  });
});
