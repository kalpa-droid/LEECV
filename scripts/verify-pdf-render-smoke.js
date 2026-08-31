import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import { getAllPresets } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';
import { TemplateRenderer } from '../src/shared/core/pdf-engine/renderer/TemplateRenderer';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter';

console.log('🧪 Iniciando Smoke Test de Renderizado PDF Completo (verify-pdf-render-smoke)...');

// CV sintético completo con las 12 secciones pobladas
const mockFullCvData = {
  id: 'smoke-test-cv',
  personalInfo: {
    givenNames: 'Alex',
    surname: 'Morgan',
    profession: 'Ingeniero de Software Senior',
    email: 'alex.morgan@example.com',
    phone: '+54 9 11 1234 5678',
    location: 'Buenos Aires, Argentina',
    linkedin: 'linkedin.com/in/alexmorgan',
    github: 'github.com/alexmorgan',
    website: 'alexmorgan.dev',
    summary: 'Profesional altamente enfocado en arquitectura de software, optimización de motores de rendimiento y desarrollo web de alta escala.'
  },
  experience: [
    {
      id: 'exp-1',
      cargo: 'Líder Técnico',
      institucion: 'Tech Solutions Inc',
      periodo: '2021 - Presente',
      descripcion: 'Liderazgo de equipo multidisciplinario, diseño de arquitectura en la nube y optimización de pipelines CI/CD.'
    },
    {
      id: 'exp-2',
      cargo: 'Desarrollador Full Stack',
      institucion: 'Innovate AI',
      periodo: '2018 - 2020',
      descripcion: 'Desarrollo de microservicios y sistemas distribuidos con alto rendimiento.'
    }
  ],
  roles: ['Líder Técnico', 'Arquitecto Cloud'],
  education: [
    {
      id: 'edu-1',
      degree: 'Ingeniería en Sistemas de Información',
      institution: 'Universidad Tecnológica Nacional',
      periodo: '2013 - 2018',
      description: 'Graduado con honores. Especialización en sistemas distribuidos.'
    }
  ],
  profession: [
    { id: 'prof-1', title: 'Arquitecto Cloud', degree: 'Ingeniero de Software', institution: 'UTN' }
  ],
  coursesAndCertificates: [
    { id: 'course-1', title: 'AWS Certified Solutions Architect', institution: 'Amazon Web Services', year: '2023', hours: '40 hs' }
  ],
  informatics: [
    { id: 'inf-1', course: 'Docker & Kubernetes', institution: 'CNCF' }
  ],
  languages: [
    { id: 'lang-1', name: 'Español', level: 'Nativo' },
    { id: 'lang-2', name: 'Inglés', level: 'C1 Avanzado' }
  ],
  skills: [
    { id: 'skill-1', name: 'TypeScript', level: 'Experto' },
    { id: 'skill-2', name: 'React / Next.js', level: 'Experto' },
    { id: 'skill-3', name: 'Node.js / Express', level: 'Avanzado' },
    { id: 'skill-4', name: 'Arquitectura PDF', level: 'Avanzado' }
  ],
  projects: [
    { id: 'proj-1', name: 'Plataforma LEECV', description: 'Motor dinámico de armado de currículums de alta estética.' }
  ]
};

const sections = cvDataToContentSections(mockFullCvData);
const presets = getAllPresets().filter(p => p.pageCategory !== 'tarjeta');

async function runSmokeTest() {
  let passedCount = 0;

  for (const preset of presets) {
    try {
      const element = React.createElement(TemplateRenderer, {
        preset,
        sections,
        personalInfo: mockFullCvData.personalInfo,
        certificatesScanned: mockFullCvData.certificatesScanned,
        showCoverPage: true,
        roles: mockFullCvData.roles,
        education: mockFullCvData.education,
        professions: mockFullCvData.professions,
      });

      const stream = await renderToStream(element);
      
      // Consumir el stream para forzar el renderizado completo de react-pdf
      await new Promise((resolve, reject) => {
        stream.on('data', () => {});
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      passedCount++;
      console.log(`  ✓ Smoke test render OK: Preset '${preset.id}' (${preset.name})`);
    } catch (err) {
      console.error(`❌ FALLO DE RENDERIZADO EN PRESET '${preset.id}':`, err);
      process.exit(1);
    }
  }

  console.log(`\n✅ SMOKE TEST DE RENDERIZADO PDF EXITOSO: ${passedCount}/${presets.length} presets procesados sin excepciones.`);
}

runSmokeTest();
