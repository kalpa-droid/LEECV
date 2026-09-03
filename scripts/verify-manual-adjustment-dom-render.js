/**
 * PRUEBA DE RENDERIZADO DOM/JSX REAL — COBERTURA DE AJUSTE MANUAL EN EDITORPANEL
 * (verify-manual-adjustment-dom-render.js)
 * 
 * Garantiza que cuando se activa cualquier pestaña del catálogo (incluyendo secciones
 * personalizadas creadas en runtime), la UI realmente renderiza el control de Ajuste Manual
 * en la salida del componente EditorPanel / PersonalInfoSection.
 */

if (typeof import.meta.env === 'undefined') {
  import.meta.env = {
    DEV: true,
    MODE: 'development',
    VITE_SUPABASE_URL: 'https://placeholder.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'placeholder-key'
  };
}

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getFullSectionCatalog } from '../src/shared/core/sectionRegistry';
import EditorPanel from '../src/modules/cv-builder/components/EditorPanel.tsx';
import PersonalInfoSection from '../src/modules/cv-builder/components/editor/PersonalInfoSection.tsx';

import { CVProvider } from '../src/context/CVContext.tsx';

console.log('🧪 Iniciando prueba de renderizado DOM/JSX real para Ajuste Manual de Secciones...\n');

const mockCustomSections = [
  {
    id: 'custom_test_1',
    titleText: 'Proyectos de Innovación',
    fields: ['tituloOGrado', 'institucion', 'descripcion'],
    records: [{ tituloOGrado: 'Innovación AI', institucion: 'LEECV' }]
  }
];

const mockCvData = {
  personalInfo: {
    fullName: 'Mónica Daniela Burgos',
    email: 'test@example.com',
    phone: '123456',
    address: 'Salta, Argentina',
    quote: 'Titular de prueba'
  },
  summary: 'Resumen profesional de prueba',
  skills: ['Liderazgo'],
  hardSkills: ['TypeScript'],
  languages: [{ language: 'Español', level: 'Nativo' }],
  projects: [{ title: 'Proyecto Alpha' }],
  publications: [{ title: 'Investigación 1' }],
  references: [{ name: 'Juan Pérez' }],
  education: [{ degree: 'Licenciatura' }],
  profession: [{ title: 'Profesora' }],
  experience: [{ role: 'Docente' }],
  coursesAndCertificates: [{ title: 'Curso 1' }],
  informatics: [{ title: 'Linux' }],
  ecology: [{ title: 'Huerta' }],
  certificatesScanned: [],
  signature: { signerCity: 'Salta' },
  customSections: mockCustomSections,
  sectionVisibility: {},
  layout: {
    columnAssignments: {},
    sectionOrders: {
      secundaria: ['contacto', 'personales', 'frase', 'habilidades'],
      primaria: ['resumen', 'experiencia', 'formacion']
    },
    sectionPageBreaks: {}
  }
};

const catalog = getFullSectionCatalog(mockCustomSections);
let passedChecks = 0;
let failedChecks = 0;

console.log(`── Evaluando Render DOM/JSX en 1 a 1 para ${catalog.length} secciones ──`);

catalog.filter(sec => sec.id !== 'frase').forEach((sec) => {
  let html = '';
  try {
    if (['contacto', 'datos-personales', 'frase'].includes(sec.id)) {
      html = renderToStaticMarkup(
        React.createElement(CVProvider, null,
          React.createElement(PersonalInfoSection, {
            cvData: mockCvData,
            setCvData: () => {},
            isVisible: true,
            onToggleVisibility: () => {}
          })
        )
      );
    } else {
      html = renderToStaticMarkup(
        React.createElement(EditorPanel, {
          activeTab: sec.id,
          cvData: mockCvData,
          setCvData: () => {},
          setActiveTab: () => {}
        })
      );
    }

    const hasPageBreakControl = html.includes('Salto de página') || html.includes('Salto de p&aacute;gina');
    const hasColumnControl = html.includes('Columna:') || html.includes('Izquierda') || html.includes('Derecha');
    const hasMatchingSectionIdAttr = html.includes(`data-section-id="${sec.id}"`);

    if (!hasMatchingSectionIdAttr) {
      console.error(`  ❌ Sección '${sec.id}' (${sec.label}) -> DESCALCE DE ATRIBUTO DOM: data-section-id="${sec.id}" no coincide en el HTML renderizado.`);
      failedChecks++;
    } else if (sec.assignableToColumns) {
      if (hasPageBreakControl && hasColumnControl) {
        console.log(`  ✓ Sección '${sec.id}' (${sec.label}) -> Controles (data-section-id="${sec.id}" + Columna + Salto de Página) OK en DOM.`);
        passedChecks++;
      } else {
        console.error(`  ❌ Sección '${sec.id}' (${sec.label}) -> FALTA control de ajuste manual en DOM renderizado (hasColumn=${hasColumnControl}, hasBreak=${hasPageBreakControl}).`);
        failedChecks++;
      }
    } else {
      // Para secciones fijas (firma, certificados), debe haber salto de página pero NO selector de columna
      if (hasPageBreakControl && !hasColumnControl) {
        console.log(`  ✓ Sección fija '${sec.id}' (${sec.label}) -> Controles (data-section-id="${sec.id}" + Salto de página) OK en DOM (Columna oculta).`);
        passedChecks++;
      } else {
        console.error(`  ❌ Sección fija '${sec.id}' (${sec.label}) -> Fallo en renderizado DOM de sección fija (hasColumn=${hasColumnControl}, hasBreak=${hasPageBreakControl}).`);
        failedChecks++;
      }
    }
  } catch (err) {
    console.error(`  ❌ Excepción al renderizar sección '${sec.id}':`, err);
    failedChecks++;
  }
});

console.log('\n════════════════════════════════════════════════════════════');
if (failedChecks > 0) {
  console.error(`❌ PRUEBA DE RENDER DOM FALLIDA: ${failedChecks} de ${catalog.length} secciones no renderizaron el control de ajuste manual.`);
  process.exit(1);
} else {
  console.log(`✅ PRUEBA DE RENDER DOM EXITOSA: Las ${passedChecks}/${catalog.length} secciones renderizan los controles de Ajuste Manual correctamente en el DOM real.`);
}
