#!/usr/bin/env tsx
/**
 * verify-registry-coverage.ts — Validación exhaustiva del contrato v2 del registro (Fase 2).
 *
 * Verifica:
 *   1. Todos los DocumentTypeId activos declaran el contrato completo (rutas, prefijos,
 *      storage, privacidad de Lidio, estrategia de creación, formatos y capacidades).
 *   2. Unicidad de rutas primarias, titlePrefix, draftIdPrefix, stepSequenceId y knowledgeId.
 *   3. Invariantes de seguridad:
 *      - `local-encrypted` nunca admite `cloudBackup` ni `assistant.privacy === 'full-summary'`.
 *      - `cloudBackup` siempre es `structured-text` con tope <= 128 KB.
 *   4. Paridad 1:1 con APP_SURFACE_MANIFEST, DOC_TITLE_PREFIX y helpers de borrador.
 */

import {
  ALL_DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_REGISTRY,
  getCloudBackupDocumentTypeIds,
  getDefaultTitleForDocType,
  getDocTypeForRoute,
  getRouteForDocType,
  isEncryptedVaultDocumentType,
} from '../src/shared/core/capabilities/capabilityRegistry';
import { APP_SURFACE_MANIFEST } from '../src/shared/core/capabilities/appSurfaceManifest';
import { DOC_TITLE_PREFIX } from '../src/shared/core/documents/documentEngine/titleEngine';
import {
  getDraftIdForDocType,
  inferDocTypeFromDraftId,
  isDraftDocumentId,
} from '../src/shared/core/documents/documentEngine/documentHelpers';

console.log('🔍 Verificando cobertura e invariantes del registro v2 (Fase 2)...\n');

const errors: string[] = [];

const seenRoutes = new Set<string>();
const seenTitlePrefixes = new Set<string>();
const seenDraftIds = new Set<string>();
const seenStepSequences = new Set<string>();
const seenKnowledgeIds = new Set<string>();

const registryIds = [...ALL_DOCUMENT_TYPE_IDS].sort();
const surfaceIds = Object.keys(APP_SURFACE_MANIFEST).sort();

if (JSON.stringify(registryIds) !== JSON.stringify(surfaceIds)) {
  errors.push(
    `Desfase entre DOCUMENT_TYPE_REGISTRY (${registryIds.join(', ')}) y APP_SURFACE_MANIFEST (${surfaceIds.join(', ')}).`
  );
}

for (const id of ALL_DOCUMENT_TYPE_IDS) {
  const entry = DOCUMENT_TYPE_REGISTRY[id];

  if (entry.id !== id) errors.push(`[${id}] entry.id ("${entry.id}") no coincide con la clave.`);
  if (!entry.capsuleId) errors.push(`[${id}] falta capsuleId.`);
  if (!entry.name) errors.push(`[${id}] falta name.`);
  if (!entry.description) errors.push(`[${id}] falta description.`);
  if (!entry.iconName) errors.push(`[${id}] falta iconName.`);
  if (!entry.route.startsWith('/')) errors.push(`[${id}] route inválida: "${entry.route}".`);
  if (!entry.defaultTitle) errors.push(`[${id}] falta defaultTitle.`);
  if (!entry.titlePrefix) errors.push(`[${id}] falta titlePrefix.`);
  if (!entry.draftIdPrefix.startsWith('draft_')) {
    errors.push(`[${id}] draftIdPrefix debe iniciar con 'draft_': "${entry.draftIdPrefix}".`);
  }
  if (!entry.stepSequenceId) errors.push(`[${id}] falta stepSequenceId.`);
  if (!entry.exportFormats || entry.exportFormats.length === 0) {
    errors.push(`[${id}] exportFormats no puede estar vacío.`);
  }

  // Unicidad
  if (seenRoutes.has(entry.route)) errors.push(`[${id}] route duplicada: "${entry.route}".`);
  seenRoutes.add(entry.route);

  if (seenTitlePrefixes.has(entry.titlePrefix)) {
    errors.push(`[${id}] titlePrefix duplicado: "${entry.titlePrefix}".`);
  }
  seenTitlePrefixes.add(entry.titlePrefix);

  if (seenDraftIds.has(entry.draftIdPrefix)) {
    errors.push(`[${id}] draftIdPrefix duplicado: "${entry.draftIdPrefix}".`);
  }
  seenDraftIds.add(entry.draftIdPrefix);

  if (seenStepSequences.has(entry.stepSequenceId)) {
    errors.push(`[${id}] stepSequenceId duplicado: "${entry.stepSequenceId}".`);
  }
  seenStepSequences.add(entry.stepSequenceId);

  if (seenKnowledgeIds.has(entry.assistant.knowledgeId)) {
    errors.push(`[${id}] assistant.knowledgeId duplicado: "${entry.assistant.knowledgeId}".`);
  }
  seenKnowledgeIds.add(entry.assistant.knowledgeId);

  // Seguridad de persistencia y Lidio
  if (entry.storage.kind === 'local-encrypted') {
    if ('cloudBackup' in entry.storage && (entry.storage as any).cloudBackup) {
      errors.push(`[${id}] SEGURIDAD: local-encrypted no puede declarar cloudBackup.`);
    }
    if ((entry.assistant.privacy as string) === 'full-summary') {
      errors.push(`[${id}] SEGURIDAD: local-encrypted no puede usar assistant.privacy='full-summary'.`);
    }
  } else if ('cloudBackup' in entry.storage && entry.storage.cloudBackup) {
    if (entry.storage.cloudBackup.projection !== 'structured-text') {
      errors.push(`[${id}] cloudBackup.projection debe ser 'structured-text'.`);
    }
    if (entry.storage.cloudBackup.maxBytes <= 0 || entry.storage.cloudBackup.maxBytes > 131072) {
      errors.push(`[${id}] cloudBackup.maxBytes fuera de rango (1..131072): ${entry.storage.cloudBackup.maxBytes}.`);
    }
  }

  // Coherencia con helpers derivados
  if (DOC_TITLE_PREFIX[id] !== entry.titlePrefix) {
    errors.push(`[${id}] DOC_TITLE_PREFIX ("${DOC_TITLE_PREFIX[id]}") != titlePrefix ("${entry.titlePrefix}").`);
  }
  if (getDraftIdForDocType(id) !== entry.draftIdPrefix) {
    errors.push(`[${id}] getDraftIdForDocType != draftIdPrefix.`);
  }
  if (!isDraftDocumentId(entry.draftIdPrefix)) {
    errors.push(`[${id}] isDraftDocumentId("${entry.draftIdPrefix}") devolvió false.`);
  }
  if (inferDocTypeFromDraftId(entry.draftIdPrefix) !== id) {
    errors.push(`[${id}] inferDocTypeFromDraftId("${entry.draftIdPrefix}") no devolvió "${id}".`);
  }
  if (getDefaultTitleForDocType(id) !== entry.defaultTitle) {
    errors.push(`[${id}] getDefaultTitleForDocType != defaultTitle.`);
  }
  const expectedStudioRoute = 'studioRoute' in entry && entry.studioRoute ? entry.studioRoute : entry.route;
  if (getRouteForDocType(id) !== expectedStudioRoute) {
    errors.push(`[${id}] getRouteForDocType ("${getRouteForDocType(id)}") != "${expectedStudioRoute}".`);
  }
  if (!('studioRoute' in entry && entry.studioRoute)) {
    if (getDocTypeForRoute(entry.route) !== id) {
      errors.push(`[${id}] getDocTypeForRoute("${entry.route}") devolvió "${getDocTypeForRoute(entry.route)}".`);
    }
  }
}

const cloudIds = getCloudBackupDocumentTypeIds();
for (const cid of cloudIds) {
  if (isEncryptedVaultDocumentType(cid)) {
    errors.push(`SEGURIDAD: getCloudBackupDocumentTypeIds() incluyó tipo cifrado "${cid}".`);
  }
}

if (errors.length > 0) {
  console.error(`❌ COBERTURA DE REGISTRO FALLIDA (${errors.length} error/es):`);
  for (const e of errors) console.error(`   - ${e}`);
  process.exit(1);
}

console.log(
  `✅ Cobertura de registro v2 superada (${ALL_DOCUMENT_TYPE_IDS.length} tipos verificados; respaldo nube opt-in: [${cloudIds.join(', ')}]).\n`
);
process.exit(0);
