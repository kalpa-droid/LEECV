#!/usr/bin/env node
/**
 * check-version-bump.js — Versionado obligatorio en cada PR de código.
 *
 * Regla (AGENTS.md Regla 6, "Versionado obligatorio", y encabezado de
 * src/shared/core/version.ts): toda PR que modifique código de PRODUCTO
 * (`src/` o `api/`) DEBE incluir el bump de `src/shared/core/version.ts`
 * en el mismo commit que aplica el cambio.
 *   - Fix / ajuste mínimo            -> PATCH (V2.19.0 -> V2.19.1)
 *   - Funcionalidad nueva            -> MINOR (V2.19.x -> V2.20.0)
 *   - Cambio de arquitectura / plan  -> MAJOR (V2.x -> V3.0)
 *
 * El chequeo compara el diff de la rama contra su merge-base con la base
 * (origin/main o la env var VERSION_CHECK_BASE / GITHUB_BASE_REF), más los
 * cambios staged para los commits locales. PRs solo de docs/CI/scripts no
 * requieren bump (no tocan src/ ni api/). version.ts cuenta como "el bump",
 * no como código de producto a satisfacer por sí mismo.
 *
 * Alcance consciente: los bumps van por PR, no por commit — un PR con N
 * commits de código y un solo bump de version.ts es válido.
 *
 * Comportamiento sin base resolvible: en CI FALLA (misconfiguración del
 * checkout: debe tener fetch-depth suficiente); en local OMITE con aviso
 * (nunca bloquea el trabajo por falta de red/remoto).
 */
import { execSync } from 'node:child_process';

const VERSION_FILE = 'src/shared/core/version.ts';
const PRODUCT_PREFIXES = ['src/', 'api/'];

const run = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();

const baseRef =
  process.env.VERSION_CHECK_BASE ||
  (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main');

const isCI = process.env.CI === 'true';

function resolveDiffFiles() {
  let mergeBase = null;
  try {
    mergeBase = run(`git merge-base HEAD ${baseRef}`);
  } catch {
    mergeBase = null;
  }
  if (!mergeBase) {
    if (isCI) {
      console.error(`✗ check-version-bump: no se pudo resolver el merge-base contra "${baseRef}".`);
      console.error('  En CI el checkout debe incluir la rama base (fetch-depth: 0 en actions/checkout).');
      process.exit(1);
    }
    console.warn(`⚠ check-version-bump: sin base "${baseRef}" (offline o remoto ausente); se omite la verificación.`);
    process.exit(0);
  }
  const branchFiles = run(`git diff --name-only ${mergeBase}...HEAD`).split('\n').filter(Boolean);
  let stagedFiles = [];
  try {
    stagedFiles = run('git diff --cached --name-only').split('\n').filter(Boolean);
  } catch {
    stagedFiles = [];
  }
  return [...new Set([...branchFiles, ...stagedFiles])];
}

const files = resolveDiffFiles();
const productCode = files.filter(
  (f) => PRODUCT_PREFIXES.some((prefix) => f.startsWith(prefix)) && f !== VERSION_FILE
);
const touchesVersion = files.includes(VERSION_FILE);

if (productCode.length > 0 && !touchesVersion) {
  console.error('✗ check-version-bump: esta PR modifica código de producto sin bumpear la versión.');
  for (const f of productCode) console.error(`    - ${f}`);
  console.error(`  Bumpeá ${VERSION_FILE} EN EL MISMO COMMIT (PATCH fix / MINOR funcionalidad / MAJOR arquitectura).`);
  process.exit(1);
}

if (touchesVersion) {
  console.log(`✓ check-version-bump: bump de versión incluido (${VERSION_FILE}) — ${productCode.length} archivo(s) de producto en la PR.`);
} else {
  console.log(`✓ check-version-bump: PR sin código de producto (${files.length} archivo(s)); bump no requerido.`);
}
