import type { VercelRequest, VercelResponse } from '@vercel/node';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { captureBackendException } from './_lib/sentryBackend.js';

export const maxDuration = 60;

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec) || 32))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16) || 32));
}

async function extractTextFromOdt(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file('content.xml');
  if (!contentFile) {
    throw new Error('El archivo LibreOffice (.odt) no contiene content.xml.');
  }
  const xml = await contentFile.async('text');
  // Reemplazar encabezados con marca explícita y párrafos con salto de línea doble
  const withStructure = xml
    .replace(/<text:h\b[^>]*text:outline-level="(\d+)"[^>]*>([\s\S]*?)<\/text:h>/gi, (_m, lvl, inner) => {
      const level = Math.min(Math.max(Number(lvl) || 1, 1), 3);
      const prefix = '#'.repeat(level);
      return `\n\n${prefix} ${inner.replace(/<[^>]+>/g, ' ')}\n\n`;
    })
    .replace(/<text:h\b[^>]*>([\s\S]*?)<\/text:h>/gi, (_m, inner) => `\n\n# ${inner.replace(/<[^>]+>/g, ' ')}\n\n`)
    .replace(/<text:line-break\s*\/>/gi, '\n')
    .replace(/<text:tab\s*\/>/gi, ' ')
    .replace(/<\/text:p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');

  return decodeXmlEntities(withStructure)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractTextFromRtf(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  let out = raw
    .replace(/\{\\\*(?:[^{}]|\{[^{}]*\})*\}/g, '')
    .replace(/\{\\(?:fonttbl|colortbl|stylesheet|info|pict)(?:[^{}]|\{[^{}]*\})*\}/g, '')
    .replace(/\\par\b\s?|\\line\b\s?/g, '\n')
    .replace(/\\tab\b\s?/g, ' ')
    .replace(/\\'([0-9a-fA-F]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16) || 32))
    .replace(/\\u(-?\d+)\??/g, (_m, code) => {
      const n = Number(code);
      return String.fromCharCode(n < 0 ? n + 65536 : n);
    })
    .replace(/\\[a-zA-Z]+-?\d*\s?/g, '')
    .replace(/[{}]/g, '');

  return out
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractTextFromHtml(buffer: Buffer): string {
  const raw = buffer.toString('utf8');
  const clean = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, lvl, inner) => `\n\n${'#'.repeat(Number(lvl))} ${inner.replace(/<[^>]+>/g, ' ')}\n\n`)
    .replace(/<(?:p|div|li|br|tr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  return decodeXmlEntities(clean)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function convertMammothHtmlToStructuredMarkdown(html: string): string {
  const withTables = html.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_m, tableInner: string) => {
    const rows = Array.from(tableInner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)).map((rm) =>
      Array.from(rm[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)).map((cm) =>
        decodeXmlEntities(
          cm[1]
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<\/p>\s*<p[^>]*>/gi, ' ')
            .replace(/<[^>]+>/g, '')
            .replace(/[ \t\n]+/g, ' ')
            .trim(),
        ),
      ),
    );
    if (rows.length === 0) return '';
    return `\n\n${rows.map((r) => r.join(' | ')).join('\n')}\n\n`;
  });

  const formatted = withTables
    .replace(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, lvl, inner) => {
      const clean = decodeXmlEntities(inner.replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').trim());
      return clean ? `\n\n${'#'.repeat(Number(lvl))} ${clean}\n\n` : '';
    })
    .replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, (_m, inner) => `**${inner}**`)
    .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, (_m, inner) => `**${inner}**`)
    .replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, (_m, inner) => `*${inner}*`)
    .replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, (_m, inner) => `*${inner}*`)
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner) => {
      const clean = decodeXmlEntities(inner.replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').trim());
      return clean ? `\n- ${clean}` : '';
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|blockquote)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');

  return decodeXmlEntities(formatted)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractTextByFilename(
  buffer: Buffer,
  filename: string = '',
): Promise<{ text: string; messages: unknown[]; detectedFormat: string }> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.odt')) {
    return { text: await extractTextFromOdt(buffer), messages: [], detectedFormat: 'odt' };
  }
  if (lower.endsWith('.rtf')) {
    return { text: extractTextFromRtf(buffer), messages: [], detectedFormat: 'rtf' };
  }
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return { text: extractTextFromHtml(buffer), messages: [], detectedFormat: 'html' };
  }
  if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    return { text: buffer.toString('utf8').trim(), messages: [], detectedFormat: 'text' };
  }
  // Por defecto (Word .docx) usando HTML estructurado para no perder tablas ni jerarquía
  const result = await mammoth.convertToHtml({ buffer });
  const structuredText = convertMammothHtmlToStructuredMarkdown(result.value || '');
  return {
    text: structuredText,
    messages: result.messages || [],
    detectedFormat: 'docx',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket?.remoteAddress ||
    'unknown-ip';

  const rateLimitOk = await requireRateLimit(req, res, `editorial_doc_${clientIp}`, {
    maxRequests: 60,
    windowSeconds: 3600,
  });
  if (!rateLimitOk) return;

  const action = (req.query.action as string) || req.body?.action;

  if (action === 'parse-docx' || action === 'parse-document') {
    try {
      const { base64, fileBase64, filename = 'documento.docx' } = req.body || {};
      const payloadBase64 = base64 || fileBase64;

      if (!payloadBase64 || typeof payloadBase64 !== 'string') {
        return errorResponse(res, 400, 'Falta el archivo en formato base64.');
      }

      const cleanBase64 = payloadBase64.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      if (buffer.length === 0) {
        return errorResponse(res, 400, 'El archivo recibido está vacío.');
      }

      if (buffer.length > 10 * 1024 * 1024) {
        return errorResponse(res, 400, 'El archivo supera el límite de 10 MB.');
      }

      const result = await extractTextByFilename(buffer, String(filename));

      if (!result.text) {
        return errorResponse(res, 422, 'No se pudo extraer texto legible del documento.');
      }

      return successResponse(res, {
        text: result.text,
        messages: result.messages,
        detectedFormat: result.detectedFormat,
      });
    } catch (err: any) {
      console.error('Error parseando documento editorial:', err);
      await captureBackendException(err, 'editorial_parse_document', { clientIp });
      return errorResponse(res, 500, 'Error al procesar el documento recibido.');
    }
  }

  if (action === 'export-docx') {
    try {
      const { title = 'Documento Editorial', author = '', sections = [] } = req.body || {};

      const docChildren: (Paragraph | Table)[] = [
        new Paragraph({
          text: title,
          heading: HeadingLevel.TITLE,
          spacing: { after: 200 },
        }),
      ];

      if (author) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: `Autor: ${author}`, italics: true })],
            spacing: { after: 400 },
          })
        );
      }

      for (const section of sections) {
        if (section.kickerLabel) {
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: String(section.kickerLabel).toUpperCase(), bold: true })],
              spacing: { before: 320, after: 80 },
            }),
          );
        }
        if (section.title) {
          docChildren.push(
            new Paragraph({
              text: section.title,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: section.kickerLabel ? 80 : 400, after: 200 },
            })
          );
        }

        if (Array.isArray(section.records)) {
          for (const rec of section.records) {
            const content = rec.content || '';
            if (rec.type === 'table' && ((rec.tableHeaders?.length || 0) > 0 || (rec.tableRows?.length || 0) > 0)) {
              const allRows: string[][] = [
                ...(Array.isArray(rec.tableHeaders) && rec.tableHeaders.length > 0 ? [rec.tableHeaders] : []),
                ...(Array.isArray(rec.tableRows) ? rec.tableRows : []),
              ];
              if (allRows.length > 0) {
                docChildren.push(
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: allRows.map((rowVals, rowIdx) =>
                      new TableRow({
                        children: rowVals.map(
                          (cellVal) =>
                            new TableCell({
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({
                                      text: String(cellVal ?? ''),
                                      bold: rowIdx === 0 && rec.tableHasHeaderRow !== false,
                                    }),
                                  ],
                                }),
                              ],
                            }),
                        ),
                      }),
                    ),
                  }),
                );
                continue;
              }
            }

            if (!content && rec.type !== 'footnote_list' && rec.type !== 'figure_placeholder') continue;

            if (rec.type === 'subtitle') {
              docChildren.push(
                new Paragraph({
                  text: content,
                  heading: rec.subtitleLevel === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2,
                  spacing: { before: 200, after: 100 },
                })
              );
            } else if (rec.type === 'quote' || rec.type === 'epigraph') {
              docChildren.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: `"${content}"`, italics: true }),
                    ...(rec.quoteAttribution
                      ? [new TextRun({ text: ` — ${rec.quoteAttribution}`, bold: true })]
                      : []),
                  ],
                  spacing: { before: 150, after: 150 },
                  indent: { left: 720 },
                })
              );
            } else if (rec.type === 'poem') {
              for (const line of content.split('\n')) {
                docChildren.push(
                  new Paragraph({
                    children: [new TextRun({ text: line })],
                    spacing: { after: line.trim() ? 40 : 120 },
                    indent: { left: 720 },
                  }),
                );
              }
            } else if (rec.type === 'callout') {
              const lines = [
                ...(rec.calloutTitle ? [rec.calloutTitle] : []),
                ...content.split('\n'),
                ...(Array.isArray(rec.calloutItems) ? rec.calloutItems.map((it: string) => `• ${it}`) : []),
              ].filter(Boolean);
              docChildren.push(
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          borders: {
                            left: { style: BorderStyle.SINGLE, size: 12 },
                            top: { style: BorderStyle.SINGLE, size: 4 },
                            right: { style: BorderStyle.SINGLE, size: 4 },
                            bottom: { style: BorderStyle.SINGLE, size: 4 },
                          },
                          children: lines.map(
                            (l, idx) =>
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: l,
                                    bold: Boolean(rec.calloutTitle && idx === 0),
                                  }),
                                ],
                                spacing: { after: 60 },
                              }),
                          ),
                        }),
                      ],
                    }),
                  ],
                }),
              );
            } else if (rec.type === 'figure_placeholder') {
              docChildren.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `[${rec.figureNumber || 'Figura'}: ${rec.figureCaption || content}]`,
                      italics: true,
                    }),
                  ],
                  spacing: { before: 120, after: 120 },
                }),
              );
            } else if (rec.type === 'footnote_list' && Array.isArray(rec.footnotes)) {
              for (const fn of rec.footnotes) {
                docChildren.push(
                  new Paragraph({
                    children: [new TextRun({ text: `[${fn.number}] ${fn.text}`, size: 18 })],
                    spacing: { after: 60 },
                  }),
                );
              }
            } else {
              docChildren.push(
                new Paragraph({
                  text: content,
                  spacing: { after: 120 },
                })
              );
            }
          }
        }
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docChildren,
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      const safeFilename = encodeURIComponent(
        (title || 'documento')
          .replace(/[^a-zA-Z0-9_\-\s]/g, '')
          .trim()
          .slice(0, 50)
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.docx"`);
      return res.status(200).send(buffer);
    } catch (err: any) {
      console.error('Error exportando docx:', err);
      await captureBackendException(err, 'editorial_export_docx', { clientIp });
      return errorResponse(res, 500, 'Error al exportar a archivo Word.');
    }
  }

  return errorResponse(res, 400, `Acción desconocida: ${action}`);
}
