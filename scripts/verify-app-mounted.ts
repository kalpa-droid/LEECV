#!/usr/bin/env tsx
/**
 * verify-app-mounted.ts — Auditoría de montaje en Composition Root (Fase 6).
 *
 * Verifica:
 *   1. Todo `DocumentTypeId` de `DOCUMENT_TYPE_REGISTRY` tiene entrada válida en `APP_REGISTRY`.
 *   2. Paridad de `route` y `effectiveRoute` con `getRouteForDocType`.
 *   3. Las apps standalone definen `StudioComponent` lazy (`react.lazy`).
 *   4. Todas las apps (7/7) registran proveedor en `stepSequenceRegistry` y devuelven pasos > 0.
 *   5. `src/app/App.tsx` usa `<StudioRoute` y se mantiene <= 350 líneas.
 *   6. `NewDocumentMenu.tsx` itera dinámicamente `ALL_DOCUMENT_TYPE_IDS`.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  ALL_DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_REGISTRY,
  getRouteForDocType,
} from '../src/shared/core/capabilities/capabilityRegistry';
import { APP_REGISTRY } from '../src/app/appRegistry';
import {
  getDockTabsForDocType,
  hasDockStepProvider,
} from '../src/shared/core/studio-host/stepSequenceRegistry';

console.log('🔍 Verificando montaje de aplicaciones en APP_REGISTRY (Fase 6)...\n');

const ROOT = process.cwd();
const errors: string[] = [];

for (const id of ALL_DOCUMENT_TYPE_IDS) {
  const manifest = DOCUMENT_TYPE_REGISTRY[id];
  const entry = APP_REGISTRY[id];

  if (!entry) {
    errors.push(`[${id}] Falta entrada en APP_REGISTRY.`);
    continue;
  }
  if (entry.id !== id) {
    errors.push(`[${id}] entry.id ("${entry.id}") no coincide con "${id}".`);
  }
  if (entry.route !== manifest.route) {
    errors.push(`[${id}] entry.route ("${entry.route}") != DOCUMENT_TYPE_REGISTRY.route ("${manifest.route}").`);
  }
  if (entry.effectiveRoute !== getRouteForDocType(id)) {
    errors.push(`[${id}] entry.effectiveRoute ("${entry.effectiveRoute}") != getRouteForDocType("${id}").`);
  }
  if (!entry.usesSharedCvWorkspace) {
    if (!entry.StudioComponent) {
      errors.push(`[${id}] App standalone sin StudioComponent definido.`);
    } else if ((entry.StudioComponent as any)?.$$typeof !== Symbol.for('react.lazy')) {
      errors.push(`[${id}] StudioComponent debe cargarse con React.lazy() para respetar el bundle inicial.`);
    }
  }
  if (!hasDockStepProvider(id)) {
    errors.push(`[${id}] Sin DockStepProvider registrado en stepSequenceRegistry.`);
  } else {
    const tabs = getDockTabsForDocType(id, { bookMode: 'normal' });
    if (tabs.length === 0) {
      errors.push(`[${id}] DockStepProvider devolvió 0 pasos.`);
    }
  }
  if (!entry.newDocumentCopy?.successToast) {
    errors.push(`[${id}] Falta newDocumentCopy.successToast.`);
  }
}

const appPath = path.join(ROOT, 'src/app/App.tsx');
const appSrc = fs.readFileSync(appPath, 'utf8');
const appLines = appSrc.split('\n').length;
if (!appSrc.includes('<StudioRoute')) {
  errors.push('src/app/App.tsx no monta el host genérico <StudioRoute>.');
}
if (appLines > 350) {
  errors.push(`src/app/App.tsx tiene ${appLines} líneas (máximo permitido Fase 6: 350).`);
}

const menuPath = path.join(ROOT, 'src/shared/core/ui/NewDocumentMenu.tsx');
const menuSrc = fs.readFileSync(menuPath, 'utf8');
if (!menuSrc.includes('ALL_DOCUMENT_TYPE_IDS')) {
  errors.push('src/shared/core/ui/NewDocumentMenu.tsx no itera ALL_DOCUMENT_TYPE_IDS del registro.');
}

if (errors.length > 0) {
  console.error(`❌ FALLO MONTAJE EN APP_REGISTRY (${errors.length} error/es):`);
  for (const err of errors) console.error(`   - ${err}`);
  process.exit(1);
}

console.log(
  `✅ Montaje verificado: ${ALL_DOCUMENT_TYPE_IDS.length}/${ALL_DOCUMENT_TYPE_IDS.length} apps registradas en APP_REGISTRY + Dock, App.tsx=${appLines} líneas.\n`,
);
process.exit(0);
