import { describe, expect, it } from 'vitest';
import {
  computeOptimalTableLayout,
  partitionRecordsIntoColumnBands,
  splitTextAroundImage,
} from '../src/modules/editor-lee-studio/domain/editorialLayoutEngines';

describe('EditorLee Fase 8 — Columnas dobles, Imágenes tipo Word y Tablas auto-ajustables', () => {
  it('partitionRecordsIntoColumnBands balancea 2 columnas y respeta subtítulos de ancho completo', () => {
    const bands = partitionRecordsIntoColumnBands(
      [
        { id: '1', type: 'subtitle', subtitleLevel: 2, content: 'Sección A' },
        { id: '2', type: 'paragraph', content: 'Primer párrafo de cita o análisis.' },
        { id: '3', type: 'paragraph', content: 'Segundo párrafo para equilibrar la columna derecha.' },
      ],
      {
        columns: 2,
        usableWidthPt: 450,
        columnGapPt: 16,
        fontSizePt: 11,
        lineHeight: 1.5,
      },
    );
    expect(bands.length).toBe(2);
    expect(bands[0].kind).toBe('full');
    expect(bands[1].kind).toBe('two-col');
    if (bands[1].kind === 'two-col') {
      expect(bands[1].left.length).toBe(1);
      expect(bands[1].right.length).toBe(1);
    }
  });

  it('splitTextAroundImage divide limpiamente en sideText y belowText en frontera de palabra', () => {
    const longText = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');
    const res = splitTextAroundImage(longText, {
      usableWidthPt: 460,
      imageWidthPct: 45,
      gapPt: 14,
      fontSizePt: 11,
      lineHeight: 1.5,
    });
    expect(res.sideText.length).toBeGreaterThan(20);
    expect(res.belowText.length).toBeGreaterThan(20);
    expect(res.sideText.endsWith(' ')).toBe(false);
  });

  it('computeOptimalTableLayout alinea números a la derecha y suma 100%', () => {
    const res = computeOptimalTableLayout(
      ['Descripción del indicador', 'Año', 'Total'],
      [
        ['Tasa de retención universitaria en primer año', '2026', '84%'],
        ['Egresados totales', '2025', '120'],
      ],
      { sectionColumns: 1 },
    );
    expect(res.colWidthsPct.reduce((a, b) => a + b, 0)).toBe(100);
    expect(res.colAlignments[0]).toBe('left');
    expect(res.colAlignments[1]).toBe('right');
    expect(res.colAlignments[2]).toBe('right');
  });
});
