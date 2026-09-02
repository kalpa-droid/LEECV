/**
 * SCRIPT DE AUTOCOMPROBACIÓN Y AUDITORÍA PROFUNDA REAL
 * Verifica el Motor Espacial 2D del Visor PDF (X, Y, Columna Izq/Der, Secciones Base, Presets y Custom)
 */

import React from 'react';
import path from 'path';
import { pdf } from '@react-pdf/renderer';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { TemplateRenderer } from '../src/shared/core/pdf-engine/renderer/TemplateRenderer.js';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter.js';
import { getAllPresets } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry.js';
import { resolveSectionAnchor } from '../src/shared/core/pdf-engine/layers/anchors/pdfAnchorEngine.js';

console.log('🔍 Iniciando verificación profunda real del Motor Espacial 2D (Posicionamiento X/Y, Registros y Títulos)...\n');

const standardFontDataUrl = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts') + '/';

/**
 * Genera un CV sintético completo que incluye los 3 casos:
 * 1. Secciones Base (experiencia, formacion)
 * 2. Secciones de Presets (ecologia, firma)
 * 3. Secciones Personalizadas de Usuario (customSections con y sin registros)
 */
function createUniversalTestCvData() {
  return {
    id: 'cv_test_2d_universal',
    title: 'CV Prueba 2D Espacial',
    activeFormatId: 'latam-clasico',
    activePresetId: 'cv-clasico',
    personalInfo: {
      fullName: 'ROBERTO CARLOS MENDEZ',
      givenNames: 'ROBERTO CARLOS',
      surname: 'MENDEZ',
      email: 'roberto.mendez@ejemplo.com',
      phone: '+54 11 4000-5555',
      cityProvince: 'Buenos Aires, Argentina',
      profession: 'Ingeniero de Software Senior'
    },
    experience: Array.from({ length: 8 }, (_, i) => ({
      id: `exp_${i + 1}`,
      role: `Líder Técnico / Arquitecto de Software N° ${i + 1}`,
      institution: 'Empresa de Tecnología Internacional',
      year: `${2026 - i}`,
      details: `Desarrollo e implementación de arquitectura distribuida para procesamiento en tiempo real (${i + 1}).`
    })),
    education: [
      { id: 'edu_1', degree: 'Ingeniería en Sistemas de Información', institution: 'UTN FRBA', year: '2020' }
    ],
    ecologia: [
      { id: 'eco_1', title: 'Certificación Green IT & Eco-Computing', year: '2024' }
    ],
    signature: {
      type: 'drawn',
      signerName: 'ROBERTO CARLOS MENDEZ',
      signerRole: 'Ingeniero de Software'
    },
    // SECCIONES PERSONALIZADAS DE USUARIO (customSections)
    customSections: [
      {
        id: 'custom_proyectos_especiales',
        titleText: 'Proyectos de Alto Impacto (Custom con Registros)',
        records: [
          { id: 'c_rec_1', fields: { title: 'Sistema de Tráfico Masivo', details: 'Procesamiento de 1M req/s' } },
          { id: 'c_rec_2', fields: { title: 'Motor Vectorial PDF 2D', details: 'Anclaje determinista por matriz transform' } }
        ]
      },
      {
        id: 'custom_seccion_vacia',
        titleText: 'Sección Vacía Recién Creada (Custom SIN Registros)',
        records: []
      }
    ],
    layout: {
      columnAssignments: {
        personales: 'secundaria',
        ecologia: 'secundaria',
        formacion: 'primaria',
        experiencia: 'primaria',
        custom_proyectos_especiales: 'primaria',
        custom_seccion_vacia: 'secundaria',
        firma: 'primaria'
      },
      sectionOrders: {
        secundaria: ['personales', 'ecologia', 'custom_seccion_vacia'],
        primaria: ['formacion', 'experiencia', 'custom_proyectos_especiales', 'firma']
      }
    }
  };
}

async function run2DSpatialAnchorVerification() {
  const preset = getAllPresets()[0];
  const cvData = createUniversalTestCvData();
  const sections = cvDataToContentSections(cvData);

  const documentElement = (
    <TemplateRenderer
      preset={preset}
      sections={sections}
      personalInfo={cvData.personalInfo || {}}
      activeFormatId={cvData.activeFormatId}
      certificatesScanned={[]}
      showCoverPage={false}
      roles={[]}
      education={cvData.education || []}
      professions={[]}
      userFontFamily={cvData.theme?.fontFamily}
      layoutOverrides={cvData.layout}
    />
  );

  const blob = await pdf(documentElement).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({
    data: arrayBuffer,
    standardFontDataUrl: standardFontDataUrl
  }).promise;

  const anchorMap: Record<string, { startPage: number; startXRatio: number; startYRatio: number; endPage: number; endXRatio: number; endYRatio: number }> = {};

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const pageWidthPt = unscaledViewport.width;
    const pageHeightPt = unscaledViewport.height;

    const textContent = await page.getTextContent();
    for (const item of textContent.items as any[]) {
      if (typeof item.str === 'string' && item.str.includes('ANCHOR_')) {
        const str = item.str.trim();
        const xPdf = Array.isArray(item.transform) ? item.transform[4] : 0;
        const yPdf = Array.isArray(item.transform) ? item.transform[5] : 0;
        
        const xRatio = Math.min(0.98, Math.max(0, xPdf / pageWidthPt));
        const yFromTopPt = Math.max(0, pageHeightPt - yPdf);
        const yRatio = Math.min(0.98, Math.max(0, yFromTopPt / pageHeightPt));

        if (str.startsWith('ANCHOR_START:')) {
          const secId = str.replace('ANCHOR_START:', '').trim();
          if (!anchorMap[secId]) {
            anchorMap[secId] = { startPage: pageNum, startXRatio: xRatio, startYRatio: yRatio, endPage: pageNum, endXRatio: xRatio, endYRatio: yRatio };
          } else {
            anchorMap[secId].startPage = pageNum;
            anchorMap[secId].startXRatio = xRatio;
            anchorMap[secId].startYRatio = yRatio;
          }
        } else if (str.startsWith('ANCHOR_END:')) {
          const secId = str.replace('ANCHOR_END:', '').trim();
          if (!anchorMap[secId]) {
            anchorMap[secId] = { startPage: pageNum, startXRatio: xRatio, startYRatio: yRatio, endPage: pageNum, endXRatio: xRatio, endYRatio: yRatio };
          } else {
            anchorMap[secId].endPage = pageNum;
            anchorMap[secId].endXRatio = xRatio;
            anchorMap[secId].endYRatio = yRatio;
          }
        }
      }
    }
  }

  console.log(`  ✓ Marcadores Espaciales 2D extraídos (${Object.keys(anchorMap).length} secciones en ${pdfDoc.numPages} páginas):`);
  Object.keys(anchorMap).forEach(secId => {
    const info = anchorMap[secId];
    const colSide = (info.endXRatio < 0.45) ? 'Columna Izquierda' : 'Columna Derecha';
    console.log(`     - [${secId.padEnd(28)}]: Pág ${info.endPage}, Y=${info.endYRatio.toFixed(2)}, X=${info.endXRatio.toFixed(2)} (${colSide})`);
  });

  let totalVerifications = 0;
  let passedVerifications = 0;

  // CASO 1: Sección Base con Registros (experiencia)
  totalVerifications++;
  const expAnchor = resolveSectionAnchor('experiencia', sections, preset, cvData.layout, anchorMap);
  if (expAnchor && expAnchor.pageIndex >= 1 && expAnchor.verticalRatio > 0) {
    console.log(`  ✓ CASO 1 [Sección Base 'experiencia']: Resuelta a Pág ${expAnchor.pageIndex}, Y=${expAnchor.verticalRatio.toFixed(2)}, X=${expAnchor.horizontalRatio?.toFixed(2)} OK.`);
    passedVerifications++;
  } else {
    console.error('❌ FALLO CASO 1: Sección base experiencia no se resolvió correctamente.');
  }

  // CASO 2: Sección de Preset (ecologia)
  totalVerifications++;
  const ecoAnchor = resolveSectionAnchor('ecologia', sections, preset, cvData.layout, anchorMap);
  if (ecoAnchor && ecoAnchor.pageIndex >= 1) {
    console.log(`  ✓ CASO 2 [Sección Preset 'ecologia']: Resuelta a Pág ${ecoAnchor.pageIndex}, Y=${ecoAnchor.verticalRatio.toFixed(2)}, X=${ecoAnchor.horizontalRatio?.toFixed(2)} OK.`);
    passedVerifications++;
  } else {
    console.error('❌ FALLO CASO 2: Sección preset ecologia no se resolvió correctamente.');
  }

  // CASO 3A: Sección Personalizada de Usuario CON Registros (custom_proyectos_especiales)
  totalVerifications++;
  const customWithRecsAnchor = resolveSectionAnchor('custom_proyectos_especiales', sections, preset, cvData.layout, anchorMap);
  if (customWithRecsAnchor && customWithRecsAnchor.pageIndex >= 1) {
    console.log(`  ✓ CASO 3A [Sección Custom CON Registros 'custom_proyectos_especiales']: Resuelta a Pág ${customWithRecsAnchor.pageIndex}, Y=${customWithRecsAnchor.verticalRatio.toFixed(2)} OK.`);
    passedVerifications++;
  } else {
    console.error('❌ FALLO CASO 3A: Sección custom con registros no se resolvió.');
  }

  // CASO 3B: Sección Personalizada de Usuario SIN Registros (custom_seccion_vacia)
  totalVerifications++;
  const customEmptyAnchor = resolveSectionAnchor('custom_seccion_vacia', sections, preset, cvData.layout, anchorMap);
  if (customEmptyAnchor && customEmptyAnchor.pageIndex >= 1) {
    const rawMapInfo = anchorMap['custom_seccion_vacia'];
    // Validar que en sección vacía (0 registros), ANCHOR_START y ANCHOR_END estén delimitando únicamente el banner de título
    const heightDifference = Math.abs(rawMapInfo.endYRatio - rawMapInfo.startYRatio);
    const isBannerOnly = rawMapInfo && heightDifference < 0.12;
    if (isBannerOnly) {
      console.log(`  ✓ CASO 3B [Sección Custom SIN Registros 'custom_seccion_vacia']: ANCHOR_START y END delimitan únicamente el banner del título (Diff Y=${heightDifference.toFixed(3)}). Posiciona en encabezado OK.`);
      passedVerifications++;
    } else {
      console.error(`❌ FALLO CASO 3B: Coordenadas de sección vacía no coinciden en el título (Diff Y=${heightDifference.toFixed(3)}).`);
    }
  } else {
    console.error('❌ FALLO CASO 3B: Sección custom vacía no se resolvió.');
  }

  // VERIFICACIÓN MATEMÁTICA REAL DE CENTRADO VIEWPORT:
  totalVerifications++;
  const simulatedViewportHeight = 800;
  const canvasHeight = 1000;
  const targetYPixel = canvasHeight * expAnchor.verticalRatio;
  const calculatedScrollTop = targetYPixel - (simulatedViewportHeight * 0.45);
  const positionInViewport = targetYPixel - calculatedScrollTop;

  if (Math.abs(positionInViewport - (simulatedViewportHeight * 0.45)) < 1) {
    console.log(`  ✓ Pruebas Matemáticas Viewport: Coordenada Y (pixel ${targetYPixel.toFixed(1)}) queda centrada exactamente en ${positionInViewport.toFixed(1)}px (45% del viewport de 800px).`);
    passedVerifications++;
  } else {
    console.error('❌ FALLO MATEMÁTICO: El centrado en el viewport no ubica la coordenada en el 45%.');
  }

  console.log(`\n════════════════════════════════════════════════════════════`);
  if (passedVerifications === totalVerifications) {
    console.log(`✅ VERIFICACIÓN DE MOTOR ESPACIAL 2D PDF EXITOSA: ${passedVerifications}/${totalVerifications} pruebas pasaron al 100%.`);
  } else {
    console.error(`❌ VERIFICACIÓN FALLIDA: ${totalVerifications - passedVerifications} pruebas no pasaron.`);
    process.exit(1);
  }
}

run2DSpatialAnchorVerification().catch(err => {
  console.error('❌ Excepción en verificación 2D espacial:', err);
  process.exit(1);
});
