import React from 'react';
import { pdf } from '@react-pdf/renderer';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { TemplateRenderer } from '../src/shared/core/pdf-engine/renderer/TemplateRenderer';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter';
import { cvClasicoPreset } from '../src/shared/core/pdf-engine/layers/presets/presets/cv-clasico';

const sampleCvData = {
  id: 'inspect_test',
  personalInfo: { fullName: 'Juan Pérez', email: 'juan@example.com' },
  experience: [{ role: 'Desarrollador', institution: 'Empresa X', year: '2024', details: 'Detalles del trabajo...' }]
};

const sections = cvDataToContentSections(sampleCvData);

async function inspectPdfPages() {
  const doc = React.createElement(TemplateRenderer, {
    preset: cvClasicoPreset,
    sections: sections,
    personalInfo: sampleCvData.personalInfo || {},
    showCoverPage: false
  });
  
  const buffer = await pdf(doc).toBuffer();
  console.log('PDF Generated, buffer byteLength:', buffer.byteLength);
  
  const uint8 = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8 });
  const pdfDoc = await loadingTask.promise;
  
  console.log('PDF Page Count:', pdfDoc.numPages);
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const textItems = content.items.map((it: any) => it.str).filter(Boolean);
    console.log(`Page ${i} text item count: ${textItems.length}, first 3 items: "${textItems.slice(0, 3).join(' | ')}"`);
  }
}

inspectPdfPages().catch(console.error);
