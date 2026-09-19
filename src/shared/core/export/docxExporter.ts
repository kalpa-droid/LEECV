import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import type { CoverLetterData } from '../pdf-engine/layers/records/coverLetterDataAdapter.js';
import { getPageSize } from '../pdf-engine/layers/page/pageSizes.js';

export async function exportCoverLetterToDocx(data: CoverLetterData): Promise<Blob> {
  const p = data.personalInfo || {};
  const j = data.jobTarget || {};
  const b = data.body || {};

  const activePageSizeId = (data as any)?.layout?.pageSizeId || (data as any)?.layout?.paperSize || 'a4';
  const pageDef = getPageSize(activePageSizeId);
  const widthTwips = Math.round(pageDef.widthPt * 20);
  const heightTwips = Math.round(pageDef.heightPt * 20);

  const fullName = p.fullName || `${p.givenNames || ''} ${p.surname || ''}`.trim() || 'Nombre Completo';
  const today = data.date || new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: widthTwips,
              height: heightTwips
            }
          }
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: fullName.toUpperCase(),
                bold: true,
                size: 28,
                color: '1D9E75'
              })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: [p.email, p.phone, p.cityProvince].filter(Boolean).join('  |  '),
                size: 18,
                color: '718096'
              })
            ]
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          new Paragraph({
            children: [
              new TextRun({
                text: today,
                size: 20,
                color: '4A5568'
              })
            ]
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          new Paragraph({
            children: [
              new TextRun({ text: j.recipientName || 'Responsable de Selección', bold: true, size: 22 }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: j.jobTitle || 'Puesto Postulado', size: 20, color: '4A5568' }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: j.companyName || 'Empresa Destino', size: 20, color: '4A5568' }),
            ]
          }),

          new Paragraph({ text: '', spacing: { after: 300 } }),

          new Paragraph({
            children: [
              new TextRun({ text: b.salutation || 'Estimado/a responsable de selección,', bold: true, size: 21 })
            ]
          }),

          new Paragraph({ text: '', spacing: { after: 150 } }),

          ...(b.hookParagraph ? [
            new Paragraph({
              spacing: { after: 200 },
              children: [new TextRun({ text: b.hookParagraph, size: 21 })]
            })
          ] : []),

          ...(b.evidenceParagraph ? [
            new Paragraph({
              spacing: { after: 200 },
              children: [new TextRun({ text: b.evidenceParagraph, size: 21 })]
            })
          ] : []),

          ...(b.closingParagraph ? [
            new Paragraph({
              spacing: { after: 200 },
              children: [new TextRun({ text: b.closingParagraph, size: 21 })]
            })
          ] : []),

          new Paragraph({ text: '', spacing: { after: 300 } }),

          new Paragraph({
            children: [new TextRun({ text: b.signoff || 'Atentamente,', size: 21 })]
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          new Paragraph({
            children: [
              new TextRun({ text: data.signature?.signerName || fullName, bold: true, size: 22 })
            ]
          }),
          ...(data.signature?.signerRole ? [
            new Paragraph({
              children: [
                new TextRun({ text: data.signature.signerRole, size: 18, color: '718096' })
              ]
            })
          ] : [])
        ]
      }
    ]
  });

  return await Packer.toBlob(doc);
}
