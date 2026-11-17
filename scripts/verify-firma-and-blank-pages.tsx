/**
 * VERIFICACIÓN ANTI-REGRESIÓN: Firma Digital en el CV + hojas fantasma en blanco.
 *
 * 1) FIRMA: la sección firma DEBE aparecer en el PDF cuando los datos personales
 *    tienen nombre real (esquema moderno givenNames/surname o legacy fullName),
 *    aunque el usuario no haya dibujado una imagen de firma. Nunca debe imprimir
 *    el fallback 'Postulante', ni emitirse sin contenido, ni crashear con
 *    signature undefined.
 *
 * 2) HOJAS FANTASMA: el flujo nativo de @react-pdf no debe producir páginas
 *    sin ningún texto (hoja completamente en blanco). Se renderiza un CV denso
 *    con varias combinaciones de saltos de página y densidades y se lee el PDF
 *    real con PDF.js (verdad de terreno): toda página con 0 ítems de texto = FALLO.
 *
 * 100% autónomo: CV sintético interno, sin dependencias de archivos externos.
 */

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { TemplateRenderer } from '../src/shared/core/pdf-engine/renderer/TemplateRenderer.js';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter.js';
import { sanitizeCvData } from '../src/shared/core/utils/cvDataSchema.js';
import { getAllPresets } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry.js';

const standardFontDataUrl = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts') + '/';

let failures = 0;
let passes = 0;

const expectTrue = (condition: boolean, label: string, detail: string = '') => {
  if (condition) {
    passes++;
    console.log(`  ✓ ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    failures++;
    console.error(`  ✗ FALLO: ${label}${detail ? ` (${detail})` : ''}`);
  }
};

function createSyntheticCvData(): any {
  return {
    id: 'cv_verify_firma_blanks_2026',
    activeFormatId: 'latam-clasico',
    activePresetId: 'cv-clasico',
    personalInfo: {
      givenNames: 'MÓNICA DANIELA',
      surname: 'BURGOS',
      email: 'monica@ejemplo.com',
      phone: '+54 387 500-1234',
      cityProvince: 'Salta, Argentina',
      profession: 'Profesora de Educación Secundaria',
    },
    roles: ['Profesora de Educación Secundaria'],
    education: [
      { id: 'edu_1', degree: 'Prof. de Educación Secundaria', institution: 'ISP N° 6005', year: '2018' },
    ],
    profession: [
      { id: 'prof_1', degree: 'Profesora de Educación Secundaria', institution: 'ISP N° 6005', year: '2018' },
    ],
    experience: Array.from({ length: 10 }, (_, i) => ({
      id: `exp_${i + 1}`,
      cargo: `Docente de Lengua y Literatura (Puesto ${i + 1})`,
      institucion: `Escuela Provincial N° ${100 + i}`,
      periodo: `${2005 + i} - ${2006 + i}`,
      descripcion: 'Planificación y dictado de clases por competencias, evaluación por procesos, tutorías y proyectos institucionales de lectura y escritura con seguimiento individual de los estudiantes.',
    })),
    coursesAndCertificates: [
      { id: 'c_1', title: 'Curso de Posgrado en Evaluación', institution: 'UCASAL', year: '2020' },
      { id: 'c_2', title: 'Jornadas de Literatura Infantil', institution: 'Ministerio de Educación', year: '2019' },
    ],
    informatics: [{ id: 'inf_1', course: 'Google Educator Nivel 1', institution: 'Google' }],
    languages: [
      { id: 'lang_1', name: 'Español', level: 'Nativo' },
      { id: 'lang_2', name: 'Inglés', level: 'B2' },
    ],
    skills: [{ id: 'sk_1', name: 'Comunicación clara', level: 'Alta' }],
    signature: {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) FIRMA: emisión de la sección (nivel adapter, sin render)
// ─────────────────────────────────────────────────────────────────────────────
function verifyFirmaSection() {
  console.log('\n── 1) Sección Firma Digital (emisión desde datos personales) ──');

  const firmaOf = (cvData: any) => cvDataToContentSections(cvData).find(s => s.id === 'firma');

  // Caso 1: esquema moderno + sin imagen → DEBE emitirse con el nombre en vivo
  const moderna = firmaOf(createSyntheticCvData());
  expectTrue(!!moderna, 'CV moderno (givenNames/surname) emite la firma sin imagen dibujada');
  expectTrue((moderna?.records[0] as any)?.fields?.signerName === 'MÓNICA DANIELA BURGOS',
    'El nombre del firmante se resuelve en vivo desde los datos personales');

  // Caso 2: sin nombre real ni imagen → NO debe emitirse (nunca 'Postulante')
  const sinNombre = firmaOf({ ...createSyntheticCvData(), personalInfo: {} });
  expectTrue(!sinNombre, 'CV sin nombre real NO emite la firma (nunca imprime "Postulante")');

  // Caso 3: imagen dibujada sin nombre → emite, con nombre vacío (línea de firma sola)
  const conImagen = firmaOf({
    ...createSyntheticCvData(),
    personalInfo: {},
    signature: { dataUrl: 'data:image/png;base64,AAAA' }
  });
  expectTrue(!!conImagen, 'Firma dibujada sin nombre emite la sección');
  expectTrue((conImagen?.records[0] as any)?.fields?.signerName === '', '...y no imprime "Postulante"');

  // Caso 4: legacy (fullName) vía sanitizeCvData → DEBE emitirse
  const legacy = firmaOf(sanitizeCvData({ personalInfo: { fullName: 'MONICA DANIELA BURGOS' } }));
  expectTrue(!!legacy, 'Esquema legacy (fullName) emite la firma tras sanitizeCvData');

  // Caso 5: signature undefined → no crashea y emite con nombre real
  let noCrash = true;
  let firmaUndefined: any;
  try {
    const cvData = createSyntheticCvData();
    cvData.signature = undefined;
    firmaUndefined = firmaOf(cvData);
  } catch {
    noCrash = false;
  }
  expectTrue(noCrash && !!firmaUndefined, 'signature undefined no crashea y emite la firma');

  // Caso 6: la firma es la sección terminal
  const sections = cvDataToContentSections(createSyntheticCvData());
  expectTrue(sections[sections.length - 1].id === 'firma', 'La firma queda como sección terminal del CV');

  // Caso 7: firma oculta por el usuario → no se emite
  const oculta = firmaOf({ ...createSyntheticCvData(), sectionVisibility: { firma: false } });
  expectTrue(!oculta, 'sectionVisibility.firma = false NO emite la firma');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) HOJAS FANTASMA: 0 páginas con 0 textos en cada escenario (ground truth pdfjs)
// ─────────────────────────────────────────────────────────────────────────────
async function renderAndCountBlankPages(cvData: any, presetId: string): Promise<{ numPages: number; blankPages: number[] }> {
  const preset = getAllPresets().find(p => p.id === presetId)!;
  const sections = cvDataToContentSections(cvData);
  const element = React.createElement(TemplateRenderer, {
    preset,
    sections,
    personalInfo: cvData.personalInfo,
    certificatesScanned: undefined,
    showCoverPage: false,
    roles: cvData.roles,
    education: cvData.education,
    professions: cvData.profession,
  });
  const blob = await pdf(element).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer, standardFontDataUrl }).promise;

  const blankPages: number[] = [];
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const textItems = (textContent.items as any[]).filter(it => typeof it.str === 'string' && it.str.trim().length > 0);
    if (textItems.length === 0) blankPages.push(pageNum);
  }
  return { numPages: pdfDoc.numPages, blankPages };
}

async function verifyNoBlankPages() {
  console.log('\n── 2) Hojas fantasma en blanco (0 páginas sin texto, ground truth pdfjs) ──');

  const escenarios: Array<[string, Record<string, boolean>, string]> = [
    ['Denso SIN saltos de página (baseline)', {}, 'cv-clasico'],
    ['Salto de página en sección intermedia ("cursos")', { cursos: true }, 'cv-clasico'],
    ['Salto de página en la PRIMERA sección main ("resumen")', { resumen: true }, 'cv-clasico'],
    ['Salto de página en la PRIMERA sección sidebar ("contacto")', { contacto: true }, 'cv-clasico'],
    ['Doble salto consecutivo ("formacion" y "cursos")', { formacion: true, cursos: true }, 'cv-clasico'],
    ['Preset de una columna (minimal-editorial)', {}, 'minimal-editorial'],
    ['Preset 2 columnas alternativo (modern-corporate)', {}, 'modern-corporate'],
  ];

  for (const [label, pageBreaks, presetId] of escenarios) {
    try {
      const cvData = createSyntheticCvData();
      cvData.layout = { sectionPageBreaks: pageBreaks };
      const { numPages, blankPages } = await renderAndCountBlankPages(cvData, presetId);
      expectTrue(blankPages.length === 0,
        `${label} [${presetId}]`,
        `${numPages} páginas${blankPages.length > 0 ? ` — BLANCAS: ${blankPages.join(', ')}` : ', 0 blancas'}`);
    } catch (err) {
      failures++;
      console.error(`  ✗ FALLO DE RENDER: ${label} [${presetId}]:`, err);
    }
  }
}

async function main() {
  console.log('🔍 Verificación anti-regresión: Firma Digital + hojas fantasma en blanco...');
  verifyFirmaSection();
  await verifyNoBlankPages();

  console.log('\n══════════════════════════════════════════════════════════');
  if (failures > 0) {
    console.error(`⛔ VERIFICACIÓN FALLIDA: ${failures} fallo(s), ${passes} verificaciones OK.`);
    process.exit(1);
  }
  console.log(`✅ VERIFICACIÓN EXITOSA: ${passes}/${passes} verificaciones pasaron al 100%.`);
}

main().catch(err => {
  console.error('⛔ ERROR FATAL DE LA VERIFICACIÓN:', err);
  process.exit(1);
});
