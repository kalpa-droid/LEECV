import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Iniciando auditoría de Conexión de Secciones al Renderizador PDF y Omisión de Título en Resumen...\n');

const adapterPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/records/cvDataAdapter.ts');
const registryPath = path.join(ROOT, 'src/shared/core/sectionRegistry.ts');

if (!fs.existsSync(adapterPath) || !fs.existsSync(registryPath)) {
  console.error('❌ No se encontraron los archivos adapter o registry.');
  process.exit(1);
}

// Importación dinámica a través de esm/node
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter.ts';
import { SECTION_CATALOG } from '../src/shared/core/sectionRegistry.ts';

const mockCvData = {
  personalInfo: {
    fullName: 'Mónica Daniela Burgos',
    email: 'monica@example.com',
    phone: '12345678',
    address: 'Salta, Argentina',
    dni: '12345678',
    nacionalidad: 'Argentina',
    quote: 'Educadora e Investigadora'
  },
  frase: 'Cita inspiradora de prueba',
  summary: 'Profesional altamente calificada con experiencia en gestión educativa y coordinación pedagógica.',
  redes: [{ plataforma: 'LinkedIn', usuario: 'monicaburgos', url: 'https://linkedin.com/in/monicaburgos' }],
  hardSkills: ['Metodologías Ágiles'],
  skills: ['Liderazgo de Equipos'],
  languages: [{ language: 'Español', level: 'Nativo' }],
  projects: [{ title: 'Proyecto Educativo 2026' }],
  publications: [{ title: 'Publicación Científica A' }],
  references: [{ name: 'Dr. Roberto Gómez' }],
  education: [{ degree: 'Licenciatura en Educación' }],
  profession: [{ title: 'Profesora Universitaria' }],
  experience: [{ role: 'Coordinadora Académica' }],
  coursesAndCertificates: [{ title: 'Capacitación Pedagógica' }],
  informatics: [{ title: 'Google Workspace' }],
  ecology: [{ title: 'Proyecto Huerta Comunitaria' }],
  certificatesScanned: [{ title: 'Título Universitario Escaneado' }],
  signature: { signerName: 'Mónica Burgos', signerRole: 'Directora' },
  customSections: [
    {
      id: 'custom_section_test',
      titleText: 'PREMIOS Y RECONOCIMIENTOS',
      fields: ['tituloOGrado'],
      records: [{ tituloOGrado: 'Premio Mención de Honor' }]
    }
  ]
};

const renderedSections = cvDataToContentSections(mockCvData);

let passed = 0;
let failed = 0;

// Assert 1: Resumen Profesional está conectado pero tiene titleText === '' (para no imprimir título de sección en PDF)
const resumenSec = renderedSections.find(s => s.id === 'resumen');
if (resumenSec && resumenSec.titleText === '' && resumenSec.records.length > 0) {
  console.log('  ✓ Sección Resumen Profesional: Conectada al render PDF, debajo del nombre y SIN título de sección impreso OK.');
  passed++;
} else {
  console.error('  ❌ Sección Resumen Profesional no está bien configurada en cvDataAdapter (falta conexión o titleText no está vacío).');
  failed++;
}

// Assert 2: Secciones Universales y Catálogo Fijo mapeadas en cvDataAdapter (certificados se renderiza como anexo de página completa al final)
SECTION_CATALOG.filter(s => s.id !== 'certificados').forEach((catSec) => {
  const found = renderedSections.find(s => s.id === catSec.id);
  if (found && found.records.length > 0) {
    console.log(`  ✓ Sección '${catSec.id}' (${catSec.label}) -> Mapeada a ContentSection en PDF render OK.`);
    passed++;
  } else {
    console.error(`  ❌ Sección '${catSec.id}' (${catSec.label}) -> FALTA conexión a ContentSection en cvDataAdapter.`);
    failed++;
  }
});

// Assert 3: Sección personalizada dinámica
const customSec = renderedSections.find(s => s.id === 'custom_section_test');
if (customSec && customSec.records.length > 0) {
  console.log('  ✓ Sección Personalizada Dinámica -> Mapeada a ContentSection en PDF render OK.');
  passed++;
} else {
  console.error('  ❌ Sección Personalizada Dinámica no se mapeó a ContentSection.');
  failed++;
}

console.log('\n════════════════════════════════════════════════════════════');
if (failed > 0) {
  console.error(`❌ AUDITORÍA DE CONEXIÓN PDF FALLIDA: ${failed} secciones no pasaron la verificación.`);
  process.exit(1);
} else {
  console.log(`✅ AUDITORÍA DE CONEXIÓN PDF EXITOSA: Las ${passed} verificaciones pasaron al 100%.`);
}
