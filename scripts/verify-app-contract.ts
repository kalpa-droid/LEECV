#!/usr/bin/env tsx
/**
 * verify-app-contract.ts — Auditoría unificada de Contrato por Aplicación (Fase 10).
 *
 * Verifica en una única pasada sobre `ALL_DOCUMENT_TYPE_IDS` que cada app cumple:
 *   1. Contrato completo en `DOCUMENT_TYPE_REGISTRY`, `APP_SURFACE_MANIFEST` y `APP_REGISTRY`.
 *   2. Existencia en disco del Studio primario declarado y ausencia de tipos purgados (`portfolio`, `certificate`).
 *   3. Dock registrado con >= 1 paso en `stepSequenceRegistry`.
 *   4. Conocimiento modular de Lidio en servidor (`APP_KNOWLEDGE_BY_ID`) + tips locales no vacíos (`getAllTips`).
 *   5. Invariantes de almacenamiento Local-First y privacidad (`local-encrypted` nunca permite nube ni `full-summary`).
 *   6. Grafo AST de fronteras y ciclos limpio (`import-graph-baseline.json` en 0/0).
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  ALL_DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_REGISTRY,
  isEncryptedVaultDocumentType,
} from '../src/shared/core/capabilities/capabilityRegistry';
import { APP_SURFACE_MANIFEST } from '../src/shared/core/capabilities/appSurfaceManifest';
import { APP_REGISTRY } from '../src/app/appRegistry';
import {
  getDockTabsForDocType,
  hasDockStepProvider,
} from '../src/shared/core/studio-host/stepSequenceRegistry';
import { getAllTips, pickAlwaysTip } from '../src/shared/core/assistant/assistantTips';
import { APP_KNOWLEDGE_BY_ID } from '../api/_lib/aiTasks/appKnowledge/index';
import {
  getCloudBackupProjector,
  validateCloudBackupProjection,
} from '../src/shared/core/storage/cloudBackupProjections';

console.log('🔍 Verificando contrato de plataforma por app (Fase 10 — verify:app-contract)...\n');

const ROOT = process.cwd();
const errors: string[] = [];

for (const forbidden of ['portfolio', 'certificate']) {
  if (forbidden in DOCUMENT_TYPE_REGISTRY) {
    errors.push(`Tipo purgado presente en DOCUMENT_TYPE_REGISTRY: "${forbidden}".`);
  }
  if (forbidden in APP_SURFACE_MANIFEST) {
    errors.push(`Tipo purgado presente en APP_SURFACE_MANIFEST: "${forbidden}".`);
  }
}

const baselinePath = path.join(ROOT, 'scripts/import-graph-baseline.json');
if (fs.existsSync(baselinePath)) {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const bv = Array.isArray(baseline.boundaryViolations) ? baseline.boundaryViolations.length : -1;
  const cy = Array.isArray(baseline.cycles) ? baseline.cycles.length : -1;
  if (bv !== 0 || cy !== 0) {
    errors.push(`import-graph-baseline.json debe permanecer en 0/0 (actual: ${bv} fronteras, ${cy} ciclos).`);
  }
} else {
  errors.push('Falta scripts/import-graph-baseline.json.');
}

for (const id of ALL_DOCUMENT_TYPE_IDS) {
  const manifest = DOCUMENT_TYPE_REGISTRY[id];
  const surface = APP_SURFACE_MANIFEST[id];
  const runtime = APP_REGISTRY[id];

  if (!surface) {
    errors.push(`[${id}] Falta en APP_SURFACE_MANIFEST.`);
  } else {
    const studioPath = path.join(ROOT, surface.primaryStudioFile);
    if (!fs.existsSync(studioPath)) {
      errors.push(`[${id}] Studio primario inexistente en disco: ${surface.primaryStudioFile}.`);
    }
    if (surface.route !== manifest.route) {
      errors.push(`[${id}] Ruta inconsistente entre registro ("${manifest.route}") y superficie ("${surface.route}").`);
    }
  }

  if (!runtime) {
    errors.push(`[${id}] Falta en APP_REGISTRY.`);
  } else if (!runtime.usesSharedCvWorkspace && !runtime.StudioComponent) {
    errors.push(`[${id}] App standalone sin StudioComponent en APP_REGISTRY.`);
  }

  if (!hasDockStepProvider(id) || getDockTabsForDocType(id, { bookMode: 'normal' }).length === 0) {
    errors.push(`[${id}] Dock sin pasos registrados en stepSequenceRegistry.`);
  }

  const knowledgeId = manifest.assistant.knowledgeId as keyof typeof APP_KNOWLEDGE_BY_ID;
  if (!APP_KNOWLEDGE_BY_ID[knowledgeId]) {
    errors.push(`[${id}] Falta conocimiento modular de Lidio ("${manifest.assistant.knowledgeId}").`);
  }
  if (getAllTips(id).length === 0 || !pickAlwaysTip(undefined, [], id)) {
    errors.push(`[${id}] Tips locales vacíos para Lidio.`);
  }

  if (isEncryptedVaultDocumentType(id)) {
    if (manifest.storage.kind !== 'local-encrypted') {
      errors.push(`[${id}] Debe declarar storage.kind === "local-encrypted".`);
    }
    if ('cloudBackup' in manifest.storage && manifest.storage.cloudBackup) {
      errors.push(`[${id}] Bóveda cifrada no puede habilitar cloudBackup.`);
    }
    if (manifest.assistant.privacy !== 'metadata-only') {
      errors.push(`[${id}] Bóveda cifrada debe usar assistant.privacy === "metadata-only".`);
    }
  } else if ('cloudBackup' in manifest.storage && manifest.storage.cloudBackup) {
    const projector = getCloudBackupProjector(id);
    if (!projector) {
      errors.push(`[${id}] Declara cloudBackup pero falta proyector en cloudBackupProjections.ts.`);
    } else {
      const sampleProj = projector.toCloudProjection({
        personalInfo: { fullName: 'Demo', profilePhoto: 'data:image/png;base64,AAA' },
      });
      if (!validateCloudBackupProjection(id, sampleProj).valid) {
        errors.push(`[${id}] Proyección de respaldo opt-in inválida.`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`❌ FALLO verify:app-contract (${errors.length} error/es):`);
  for (const err of errors) console.error(`   - ${err}`);
  process.exit(1);
}

console.log(
  `✅ Contrato de plataforma verificado al 100%: ${ALL_DOCUMENT_TYPE_IDS.length}/${ALL_DOCUMENT_TYPE_IDS.length} apps cumplen registro, cápsula, Dock, Lidio y Local-First.\n`,
);
process.exit(0);
