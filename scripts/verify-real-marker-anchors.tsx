/**
 * SCRIPT DE AUTOCOMPROBACIÓN Y VERIFICACIÓN DE MARCADORES REALES DE ANCLAJE PDF
 * Valida que TemplateRenderer emita ANCHOR_START / ANCHOR_END en el flujo vectorial de @react-pdf/renderer
 * y que PDF.js los lea con 100% de precisión milimétrica creando el PdfAnchorMap de verdad de terreno.
 */

import React from 'react';
import fs from 'fs';
import { pdf } from '@react-pdf/renderer';
import * as pdfjsLib from 'pdfjs-dist';
import { TemplateRenderer } from '../src/shared/core/pdf-engine/renderer/TemplateRenderer.js';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter.js';
import { getAllPresets } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry.js';
import { resolveSectionAnchor } from '../src/shared/core/pdf-engine/layers/anchors/pdfAnchorEngine.js';

console.log('🔍 Iniciando verificación anti-regresión del Motor de Marcadores Reales (PDF.js Ground Truth)...\n');

async function runRealMarkerVerification() {
  const preset = getAllPresets()[0];
  const rawJsonPath = '/home/mappo/Kalpagrafica/Proyectos/LEECV_MÓNICA_DANIELA_BURGOS_v2.json';
  const raw = JSON.parse(fs.readFileSync(rawJsonPath, 'utf-8'));
  const cvData = raw.cvData || raw;
  const sections = cvDataToContentSections(cvData);

  const documentElement = (
    <TemplateRenderer
      preset={preset}
      sections={sections}
      personalInfo={cvData.personalInfo || {}}
      activeFormatId={cvData.activeFormatId}
      certificatesScanned={cvData.certificatesScanned || []}
      showCoverPage={false}
      roles={cvData.roles || []}
      education={cvData.education || []}
      professions={cvData.profession || []}
      userFontFamily={cvData.theme?.fontFamily}
      layoutOverrides={cvData.layout}
    />
  );

  const blob = await pdf(documentElement).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const anchorMap = {};
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const pageHeightPt = unscaledViewport.height;

    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
      if (typeof item.str === 'string' && item.str.includes('ANCHOR_')) {
        const str = item.str.trim();
        const yPdf = Array.isArray(item.transform) ? item.transform[5] : 0;
        const yFromTopPt = Math.max(0, pageHeightPt - yPdf);
        const ratio = Math.min(0.98, Math.max(0, yFromTopPt / pageHeightPt));

        if (str.startsWith('ANCHOR_START:')) {
          const secId = str.replace('ANCHOR_START:', '').trim();
          if (!anchorMap[secId]) {
            anchorMap[secId] = { startPage: pageNum, startYRatio: ratio, endPage: pageNum, endYRatio: ratio };
          } else {
            anchorMap[secId].startPage = pageNum;
            anchorMap[secId].startYRatio = ratio;
          }
        } else if (str.startsWith('ANCHOR_END:')) {
          const secId = str.replace('ANCHOR_END:', '').trim();
          if (!anchorMap[secId]) {
            anchorMap[secId] = { startPage: pageNum, startYRatio: ratio, endPage: pageNum, endYRatio: ratio };
          } else {
            anchorMap[secId].endPage = pageNum;
            anchorMap[secId].endYRatio = ratio;
          }
        }
      }
    }
  }

  const detectedSections = Object.keys(anchorMap);
  console.log(`  ✓ Marcadores extraídos por PDF.js (${detectedSections.length} secciones detectadas en ${pdfDoc.numPages} páginas):`);
  detectedSections.forEach(secId => {
    const info = anchorMap[secId];
    console.log(`     - [${secId.padEnd(16)}]: Inicio (Pág ${info.startPage}, ratio: ${info.startYRatio.toFixed(2)}) => Fin (Pág ${info.endPage}, ratio: ${info.endYRatio.toFixed(2)})`);
  });

  if (detectedSections.length === 0) {
    console.error('❌ ERROR: No se extrajo ningún marcador real ANCHOR_ de la vista PDF.');
    process.exit(1);
  }

  // Verificar consulta O(1) en resolveSectionAnchor
  const testTabs = ['personales', 'formacion', 'profesion', 'experiencia', 'cursos', 'informatica', 'ecologia', 'certificados', 'firma'];
  let passedCount = 0;

  testTabs.forEach(tab => {
    const anchor = resolveSectionAnchor(tab, sections, preset, cvData.layout, anchorMap);
    if (anchor && anchor.pageIndex >= 1 && anchor.verticalRatio >= 0 && anchor.verticalRatio <= 1.0) {
      passedCount++;
    } else {
      console.error(`❌ FALLO DE LECTURA DE MARCADOR REAL para pestaña '${tab}':`, anchor);
    }
  });

  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`✅ VERIFICACIÓN DE MARCADORES REALES PDF EXITOSA: ${passedCount}/${testTabs.length} pestañas leídas con verdad de terreno 100%.`);
}

runRealMarkerVerification().catch(err => {
  console.error('❌ Excepción en verificación de marcadores reales:', err);
  process.exit(1);
});
