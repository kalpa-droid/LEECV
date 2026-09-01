import { resolveSectionAnchor } from '../src/shared/core/pdf-engine/layers/anchors/pdfAnchorEngine';
import { getAllPresets } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';

const preset = getAllPresets()[0];

const multiPageSections: any[] = [
  { id: 'datos-personales', titleText: 'DATOS', records: [{ id: '1', kind: 'contact-item', fields: {}, targetSectorRole: 'main' }] },
  { id: 'resumen', titleText: 'RESUMEN', records: Array(5).fill({ id: 'r', kind: 'freeform', fields: {}, targetSectorRole: 'main' }) },
  { id: 'experiencia', titleText: 'EXPERIENCIA', records: Array(10).fill({ id: 'e', kind: 'experience', fields: {}, targetSectorRole: 'main' }) },
  { id: 'formacion', titleText: 'FORMACIÓN', records: Array(8).fill({ id: 'f', kind: 'education', fields: {}, targetSectorRole: 'main' }) },
  { id: 'referencias', titleText: 'REFERENCIAS', records: Array(4).fill({ id: 'ref', kind: 'custom', fields: {}, targetSectorRole: 'main' }) }
];

const firstAnchor = resolveSectionAnchor('personales', multiPageSections, preset);
const lastAnchor = resolveSectionAnchor('referencias', multiPageSections, preset);

if (firstAnchor.pageIndex !== 1) {
  console.error('❌ Error: la primera sección debe estar en pageIndex: 1, retornado:', firstAnchor.pageIndex);
  process.exit(1);
}

if (lastAnchor.pageIndex <= 1) {
  console.error('❌ Error: la sección inferior (referencias) retornó pageIndex <= 1 (pageIndex hardcodeado):', lastAnchor.pageIndex);
  process.exit(1);
}

console.log('  ✓ Sección inicial (personales) en página:', firstAnchor.pageIndex);
console.log('  ✓ Sección inferior (referencias) anclada a página real:', lastAnchor.pageIndex, `(Ratio: ${lastAnchor.verticalRatio.toFixed(2)})`);
