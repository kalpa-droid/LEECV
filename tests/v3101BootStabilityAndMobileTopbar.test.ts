import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { countSectionRecordsChars } from '../src/modules/editor-lee-studio/domain/editorialManuscriptChunker';
import { sanitizeEditorialData } from '../src/modules/editor-lee-studio/domain/sanitizeEditorialData';
import { resolveSectionBadgeLabel } from '../src/modules/editor-lee-studio/domain/editorialDockEngine';

const ROOT = process.cwd();

describe('V3.10.1 — Arranque sin salto visual, estabilidad IA EditorLee y TopBar móvil limpia', () => {
  it('index.html mantiene #root vacío en el arranque con JS y mueve el fallback al bloque <noscript>', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<noscript>');
  });

  it('VectorDocViewer verifica clientWidth > 0 antes de compilar pdf().toBlob() y virtualiza documentos > 12 páginas', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/shared/core/pdf-engine/VectorDocViewer.tsx'),
      'utf8',
    );
    const widthGuardIdx = src.indexOf('if (!container || initialWidth <= 0)');
    const toBlobIdx = src.indexOf('await pdf(document).toBlob()');
    expect(widthGuardIdx).toBeGreaterThan(0);
    expect(toBlobIdx).toBeGreaterThan(widthGuardIdx);
    expect(src).toContain('VIRTUALIZE_PAGES_THRESHOLD = 12');
    expect(src).toContain('localPdfDoc.destroy');
  });

  it('ConfirmDialog devuelve Promise<boolean> para soportar await confirm(...) en EditorLee y FacturLee', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/shared/core/ui/ConfirmDialog.tsx'),
      'utf8',
    );
    expect(src).toContain('Promise<boolean>');
    expect(src).toContain('new Promise<boolean>');
  });

  it('StudioNavbar no muestra el botón móvil "Ver" redundante y FacturLee no incluye el número de factura en la píldora superior', () => {
    const navbarSrc = fs.readFileSync(
      path.join(ROOT, 'src/shared/core/studio-host/StudioNavbar.tsx'),
      'utf8',
    );
    expect(navbarSrc).not.toContain('<span>Ver</span>');

    const factSrc = fs.readFileSync(
      path.join(ROOT, 'src/modules/facturador-studio/FacturadorStudioContent.tsx'),
      'utf8',
    );
    const pillBlock = factSrc.slice(
      factSrc.indexOf("id: 'fact_voucher_pill'"),
      factSrc.indexOf("id: 'fact_new_action'"),
    );
    expect(pillBlock).not.toContain('formatPointOfSale');
    expect(pillBlock).not.toContain('formatCompNro');
  });

  it('EditorLee sanitiza filas nulas en tablas, protege Object.prototype en badges y cuenta títulos en retención IA', () => {
    const sanitized = sanitizeEditorialData({
      type: 'editorial',
      metadata: { title: 'Informe Técnico' },
      sections: [
        {
          id: 'sec_1',
          title: 'Diagnóstico',
          records: [
            {
              id: 'r1',
              type: 'table',
              content: 'Tabla',
              tableHeaders: ['Ítem', null],
              tableRows: [null, ['A', 123]],
            },
          ],
        },
      ],
    });
    expect(sanitized?.sections[0].records[0].tableHeaders).toEqual(['Ítem', '']);
    expect(sanitized?.sections[0].records[0].tableRows).toEqual([['A', '123']]);

    const counters = { prelim: 0, body: 0, annex: 0 };
    const badge = resolveSectionBadgeLabel(
      { id: 'sec_proto', title: 'Prueba', sectionKey: 'constructor' },
      counters,
    );
    expect(typeof badge.badgeLabel).toBe('string');
    expect(badge.badgeLabel).toBe('1');

    const counted = countSectionRecordsChars([
      {
        title: 'Capítulo 1',
        records: [{ type: 'quote', content: 'Texto citado', quoteAttribution: 'Autor 2026' }],
      },
    ]);
    expect(counted).toBeGreaterThan('Textocitado'.length);
  });
});
