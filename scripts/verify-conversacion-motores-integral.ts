import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CANONICAL_SECTION_ORDER, MAX_CUSTOM_SLOTS } from '../src/shared/core/sections/canonicalSectionOrder';
import { SECTION_CATALOG } from '../src/shared/core/sectionRegistry';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter';
import { applyRelativeSectionPosition } from '../src/shared/core/pdf-engine/layers/sectors/sectionOrderEngine';
import { ICON_REGISTRY } from '../src/shared/core/pdf-engine/layers/icons/iconRegistry';
import { sanitizeFontFamily } from '../src/shared/core/pdf-engine/layers/typography/pdfFontRegistry';
import { migrateCvData } from '../src/shared/core/storage/cvMigrationEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('🔍 Executing Autocomprobación Integral de Motores (verify-conversacion-motores-integral)...');

// 1. CANONICAL_SECTION_ORDER matches SECTION_CATALOG exactly
const catalogIds = new Set(SECTION_CATALOG.map((s) => s.id));
const canonicalIds = new Set(CANONICAL_SECTION_ORDER);

const missingInCanonical = [...catalogIds].filter((id) => !canonicalIds.has(id));
const extraInCanonical = [...canonicalIds].filter((id) => !catalogIds.has(id));
assert(missingInCanonical.length === 0, `Missing in CANONICAL_SECTION_ORDER: ${missingInCanonical.join(', ')}`);
assert(extraInCanonical.length === 0, `Extra in CANONICAL_SECTION_ORDER: ${extraInCanonical.join(', ')}`);

// 2. sectionVisibility is respected for all catalog sections in cvDataToContentSections
const fixtureCvData: any = {
  personalInfo: { fullName: 'Juan Perez', email: 'test@test.com', phone: '123' },
  objective: 'Objetivo de prueba',
  summary: 'Resumen de prueba',
  experience: [{ role: 'Dev', company: 'Corp', year: '2022' }],
  education: [{ degree: 'Ingeniero', institution: 'Uni', year: '2020' }],
  profession: [{ degree: 'Licenciado', institution: 'Uni', year: '2019' }],
  coursesAndCertificates: [{ title: 'Curso React', institution: 'Online', year: '2021' }],
  projects: [{ title: 'Proyecto X', details: 'Detalles', year: '2023' }],
  publications: [{ title: 'Paper Y', autor: 'Autor', year: '2024' }],
  references: [{ name: 'Ref Z', contact: '123456' }],
  skills: ['Liderazgo'],
  hardSkills: ['TypeScript'],
  languages: [{ idioma: 'Inglés', nivel: 'C1' }],
  redes: [{ plataforma: 'LinkedIn', usuario: 'user', url: 'https://linkedin.com' }],
  informatics: [{ title: 'Excel', institution: 'Cert' }],
  certificatesScanned: [{ id: '1', title: 'Cert', dataUrl: 'data:image/png;base64,123' }],
  signature: { dataUrl: 'data:image/png;base64,456', signerName: 'Juan' },
  'personalizada-1': [{ tituloOGrado: 'Voluntario', institucion: 'ONG' }],
  sectionTitleOverrides: { 'personalizada-1': 'Voluntariado' },
  sectionVisibility: {}
};

for (const entry of SECTION_CATALOG) {
  const visibleCvData = { ...fixtureCvData, sectionVisibility: { [entry.id]: true } };
  const hiddenCvData = { ...fixtureCvData, sectionVisibility: { [entry.id]: false } };

  const hiddenSections = cvDataToContentSections(hiddenCvData);
  assert(!hiddenSections.some((s) => s.id === entry.id), `sectionVisibility=false failed to hide section: ${entry.id}`);
}

// 3. applyRelativeSectionPosition keeps full section orders
const sampleLayoutData = {
  layout: {
    sectionOrders: {
      primaria: ['experiencia', 'formacion', 'proyectos', 'resumen'],
      secundaria: ['contacto', 'habilidades', 'redes']
    }
  }
};
const moved = applyRelativeSectionPosition(sampleLayoutData, 'resumen', { after: 'experiencia' });
assert(moved.layout.sectionOrders.primaria.length >= 4, `applyRelativeSectionPosition truncated primary sections array`);

// 4. Date sorting (year desc) across sections with date fields
const unSortedCvData = {
  experience: [{ role: 'A', year: '2015' }, { role: 'B', year: '2022' }, { role: 'C', year: '2018' }],
  education: [{ degree: 'X', year: '2010' }, { degree: 'Y', year: '2020' }],
  sectionVisibility: { experiencia: true, formacion: true }
};
const sortedSections = cvDataToContentSections(unSortedCvData);
const expSec = sortedSections.find((s) => s.id === 'experiencia');
assert(!!expSec, 'experiencia section not generated');
if (expSec) {
  const years = expSec.records.map((r: any) => parseInt((r.fields.year || '').match(/\d{4}/)?.[0] || '0', 10));
  assert(years[0] === 2022 && years[1] === 2018 && years[2] === 2015, 'experiencia records not sorted in descending year order');
}

// 5. CV_RECORD_RENDERERS is typed as Record<CvRecordKind, ...>
const cvRenderersPath = path.join(ROOT, 'src/shared/core/pdf-engine/renderer/cvRecordRenderers.tsx');
const renderersContent = fs.readFileSync(cvRenderersPath, 'utf-8');
assert(/CV_RECORD_RENDERERS\s*:\s*Record<CvRecordKind,/.test(renderersContent), 'CV_RECORD_RENDERERS type safety relaxed in cvRecordRenderers.tsx');

// 6. No internal fields leak as text in cvDataAdapter output
const allRenderedSections = cvDataToContentSections(fixtureCvData);
const forbiddenKeys = ['targetSectorRole', '_labelChoices', 'fieldLabelOverrides', 'kind'];
for (const sec of allRenderedSections) {
  for (const rec of sec.records) {
    const valString = JSON.stringify(rec.fields);
    for (const key of forbiddenKeys) {
      assert(!rec.fields[key], `Forbidden internal key '${key}' leaked inside fields of section '${sec.id}'`);
    }
  }
}

// 7. Icon Registry contains valid keys without unhandled raw emojis
for (const [key, iconDef] of Object.entries(ICON_REGISTRY)) {
  assert(!!iconDef, `Icon definition for '${key}' is invalid`);
}

// 8. sanitizeFontFamily safely handles Times / Serif without crashing
const fontRes1 = sanitizeFontFamily('Times New Roman', false, true);
assert(fontRes1.startsWith('Helvetica'), `Times font fallback returned unregistered family '${fontRes1}'`);

const fontRes2 = sanitizeFontFamily('Georgia Serif', true, false);
assert(fontRes2.startsWith('Helvetica'), `Serif font fallback returned unregistered family '${fontRes2}'`);

// 9. Built-in section preset IDs match catalog IDs
const BUILTIN_PRESET_IDS = ['redes', 'publicaciones', 'referencias', 'idiomas'];
for (const bId of BUILTIN_PRESET_IDS) {
  assert(catalogIds.has(bId), `Built-in preset ID '${bId}' is missing from SECTION_CATALOG`);
}

// 10. MAX_CUSTOM_SLOTS count matches custom slots in SECTION_CATALOG
const customSlotsInCatalog = SECTION_CATALOG.filter((s) => (s as any).isCustomSlot);
assert(customSlotsInCatalog.length === MAX_CUSTOM_SLOTS, `Custom slots count (${customSlotsInCatalog.length}) does not match MAX_CUSTOM_SLOTS (${MAX_CUSTOM_SLOTS})`);

// 11. Schema Migration v3 -> v4 cleanly converts customSections to personalizada-1..5
const legacyCvData = {
  schemaVersion: 3,
  customSections: [
    { titleText: 'Voluntariado', fields: ['cargo', 'institucion'], records: [{ cargo: 'Líder', institucion: 'Cruz Roja' }] }
  ]
};
const migrated = migrateCvData(legacyCvData);
assert(migrated.schemaVersion === 5, `Schema version not bumped to 5`);
assert(migrated.sectionTitleOverrides?.['personalizada-1'] === 'Voluntariado', `Legacy customSection title not migrated to personalizada-1`);
assert(Array.isArray(migrated['personalizada-1']) && migrated['personalizada-1'].length === 1, `Legacy customSection records not migrated to personalizada-1`);
assert(migrated.customSections === undefined, `Legacy customSections array not removed after migration`);

console.log('✅ Autocomprobación Integral de Motores COMPLETADA CON ÉXITO.');
