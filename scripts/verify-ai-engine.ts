import { AI_PROVIDERS, AI_PROVIDER_FALLBACK_ORDER } from '../api/_lib/aiProviders/registry';
import { getNextAvailableKey } from '../api/_lib/aiProviders/keyRotation';
import { DOCUMENT_TYPE_REGISTRY, getDocumentTypeConfig } from '../src/shared/core/capabilities/capabilityRegistry';
import { getCoverLetterPreset } from '../src/shared/core/presets/coverLetterPresetCatalog';
import { prepareCoverLetterRenderData } from '../src/shared/core/pdf-engine/layers/records/coverLetterDataAdapter';
import { exportCoverLetterToDocx } from '../src/shared/core/export/docxExporter';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log('🔍 Executing Auditoría del Motor de IA, Cartas de Presentación, LinkedIn Importer & Word Exporter...');

// 1. AI Providers Registry contains groq & gemini
assert(!!AI_PROVIDERS.groq, 'Groq provider missing from AI_PROVIDERS');
assert(!!AI_PROVIDERS.gemini, 'Gemini provider missing from AI_PROVIDERS');
assert(AI_PROVIDER_FALLBACK_ORDER[0] === 'groq', 'Groq is not first in AI_PROVIDER_FALLBACK_ORDER');

// 2. Key Rotation fallback when env vars empty
const sampleKey = getNextAvailableKey('groq');
assert(sampleKey === null || typeof sampleKey === 'string', 'Key rotation returned invalid type');

// 3. Document Type cover_letter in capability registry
const coverConfig = getDocumentTypeConfig('cover_letter');
assert(coverConfig.id === 'cover_letter', 'cover_letter missing from DOCUMENT_TYPE_REGISTRY');
assert(coverConfig.capabilities.includes('cover_letter_body'), 'cover_letter missing cover_letter_body capability');
assert(coverConfig.capabilities.includes('job_target'), 'cover_letter missing job_target capability');
assert(coverConfig.capabilities.includes('ai_generation'), 'cover_letter missing ai_generation capability');

// 4. Document order: cv -> cover_letter -> business_card
const docKeys = Object.keys(DOCUMENT_TYPE_REGISTRY);
const cvIdx = docKeys.indexOf('cv');
const coverIdx = docKeys.indexOf('cover_letter');
const cardIdx = docKeys.indexOf('business_card');
assert(cvIdx < coverIdx && coverIdx < cardIdx, `Document order invalid: cv (${cvIdx}), cover_letter (${coverIdx}), business_card (${cardIdx})`);

// 5. Cover letter preset catalog
const preset = getCoverLetterPreset('carta-clasica');
assert(preset.id === 'carta-clasica', 'carta-clasica preset missing');

// 6. Cover letter data adapter
const sampleLetter = prepareCoverLetterRenderData({
  personalInfo: { fullName: 'Ana Maria Vega' },
  jobTarget: { companyName: 'Tech Corp', jobTitle: 'Senior Dev' }
});
assert(sampleLetter.sender.fullName === 'Ana Maria Vega', 'Cover letter data adapter fullName mapping failed');
assert(sampleLetter.recipient.company === 'Tech Corp', 'Cover letter data adapter recipient company mapping failed');

// 7. Word (.docx) export execution smoke test
exportCoverLetterToDocx({
  personalInfo: { fullName: 'Prueba Docx' },
  body: { salutation: 'Hola', hookParagraph: 'Texto' }
}).then((blob) => {
  assert(blob.size > 0, 'DOCX exporter returned empty blob');
  console.log('✅ Auditoría del Motor de IA y Cartas de Presentación COMPLETADA CON ÉXITO.');
}).catch((err) => {
  console.error('❌ Error en test de exportación DOCX:', err);
  process.exit(1);
});
