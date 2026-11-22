import type { VercelRequest, VercelResponse } from '@vercel/node';
import mammoth from 'mammoth';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { captureBackendException } from './_lib/sentryBackend.js';

export const maxDuration = 60;

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

  if (action === 'parse-docx') {
    try {
      const { base64, fileBase64 } = req.body || {};
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

      const result = await mammoth.extractRawText({ buffer });
      const extractedText = (result.value || '').trim();

      if (!extractedText) {
        return errorResponse(res, 422, 'No se pudo extraer texto del documento Word.');
      }

      return successResponse(res, {
        text: extractedText,
        messages: result.messages || [],
      });
    } catch (err: any) {
      console.error('Error parseando docx:', err);
      await captureBackendException(err, 'editorial_parse_docx', { clientIp });
      return errorResponse(res, 500, 'Error al procesar el archivo Word.');
    }
  }

  if (action === 'export-docx') {
    try {
      const { title = 'Documento Editorial', author = '', sections = [] } = req.body || {};

      const docChildren: Paragraph[] = [
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
        if (section.title) {
          docChildren.push(
            new Paragraph({
              text: section.title,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            })
          );
        }

        if (Array.isArray(section.records)) {
          for (const rec of section.records) {
            const content = rec.content || '';
            if (!content) continue;

            if (rec.type === 'subtitle') {
              docChildren.push(
                new Paragraph({
                  text: content,
                  heading: rec.subtitleLevel === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2,
                  spacing: { before: 200, after: 100 },
                })
              );
            } else if (rec.type === 'quote') {
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
