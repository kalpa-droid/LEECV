/**
 * check-icon-uniqueness.js
 * Auditoría del catálogo canónico de íconos (iconCatalog.ts + iconRegistry.ts).
 * Bloquea el build (exit 1) si hay violaciones. Se corre en check-all y pre-commit.
 *
 * Regla que defiende (AGENTS.md, Regla 1 — íconos): misma entidad/acción = mismo
 * ícono; entidades distintas = ícono distinto e inequívoco (cero colisiones).
 *
 *   A) Trazados duplicados: dos ids del registro no pueden dibujar lo mismo
 *      (salvo alias documentados en ICON_ALIASES).
 *   B) Cobertura: toda sección canónica (CANONICAL_SECTION_ORDER), todo slot
 *      personalizada-1..N, toda sección card_* y red social-* tiene ícono
 *      asignado, y todo id del catálogo existe en el registro (nada colgado).
 *   C) Colisiones: un mismo ícono no puede servir a dos entidades distintas —
 *      dentro de SECTION_ICON_IDS, ni entre SECTION / PRODUCT / UI.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { ICON_REGISTRY } from '../src/shared/core/pdf-engine/layers/icons/iconRegistry.ts';
import {
  SECTION_ICON_IDS,
  PRODUCT_ICON_IDS,
  UI_ICON_IDS,
  resolveSectionIconId
} from '../src/shared/core/ui/iconCatalog.ts';
import {
  CANONICAL_SECTION_ORDER,
  MAX_CUSTOM_SLOTS
} from '../src/shared/core/sections/canonicalSectionOrder.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let violations = 0;
function fail(msg) {
  violations++;
  console.error('  ✗ ' + msg);
}
function ok(msg) {
  console.log('  ✓ ' + msg);
}

// --- Alias documentados -------------------------------------------------
// Solo aquí: pares de ids que comparten trazado a propósito (mismo concepto,
// dos nombres). Si el par ya no es intencional, borrá la línea y el chequeo
// vuelve a bloquear. Hoy no hay ninguno: cero colisiones es la regla.
const ICON_ALIASES = [
  // ['alias-a', 'alias-b'],
];

// Normaliza un conjunto de trazados: orden de sub-paths no importa para
// detectar "dibuja lo mismo" (mismo multiset de caminos = mismo ícono).
function normalizePaths(paths) {
  return paths
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .sort()
    .join('|');
}

console.log('');
console.log('🔎 Auditoría de íconos únicos canónicos (iconCatalog + iconRegistry)');
console.log('');

// --- Check A: trazados SVG duplicados ------------------------------------
const byPath = new Map(); // pathNormalizado -> ids[]
for (const [id, def] of Object.entries(ICON_REGISTRY)) {
  if (!Array.isArray(def.paths) || def.paths.length === 0) {
    fail(`A: '${id}' no tiene paths (registro corrupto)`);
    continue;
  }
  const key = normalizePaths(def.paths);
  const list = byPath.get(key) || [];
  list.push(id);
  byPath.set(key, list);
}
let aliasGroups = 0;
for (const [, ids] of byPath) {
  if (ids.length < 2) continue;
  const sorted = [...ids].sort();
  const isAllowedAlias = ICON_ALIASES.every(([a, b]) => {
    const both = sorted.includes(a) && sorted.includes(b);
    return !both || sorted.length === 2;
  }) && ICON_ALIASES.some(([a, b]) => sorted.includes(a) && sorted.includes(b));
  if (isAllowedAlias) {
    aliasGroups++;
    console.log('  ◦ alias documentado: ' + sorted.join(', '));
  } else {
    fail(`A: trazados SVG duplicados entre íconos distintos: ${sorted.join(', ')}`);
  }
}
if (violations === 0) {
  ok(`A: ${byPath.size} íconos registrados, ${aliasGroups} alias documentado(s), 0 trazados duplicados`);
}

// --- Check B: cobertura ----------------------------------------------------
let covered = 0;
for (const secId of CANONICAL_SECTION_ORDER) {
  if (!Object.prototype.hasOwnProperty.call(SECTION_ICON_IDS, secId)) {
    fail(`B: sección canónica '${secId}' sin ícono en SECTION_ICON_IDS`);
    continue;
  }
  if (!ICON_REGISTRY[SECTION_ICON_IDS[secId]]) {
    fail(`B: sección '${secId}' apunta a ícono inexistente '${SECTION_ICON_IDS[secId]}'`);
    continue;
  }
  covered++;
}
ok(`B: ${covered}/${CANONICAL_SECTION_ORDER.length} secciones canónicas cubiertas`);

for (let i = 1; i <= MAX_CUSTOM_SLOTS; i++) {
  const slot = `personalizada-${i}`;
  if (!Object.prototype.hasOwnProperty.call(SECTION_ICON_IDS, slot)) {
    fail(`B: slot '${slot}' sin ícono (debe ser determinista, nunca fallback)`);
  } else if (SECTION_ICON_IDS[slot] === 'fallback') {
    fail(`B: slot '${slot}' resuelve al círculo fallback común (prohibido)`);
  } else if (resolveSectionIconId(slot) !== SECTION_ICON_IDS[slot]) {
    fail(`B: resolveSectionIconId('${slot}') no es determinista`);
  }
}
ok(`B: slots personalizada-1..${MAX_CUSTOM_SLOTS} con ícono determinista propio`);

const CARD_SLOTS = ['card_size', 'card_extract', 'card_logo', 'card_front', 'card_back', 'card_qr'];
const SOCIAL_SLOTS = ['social-professional', 'social-code', 'social-email', 'social-web'];
for (const slot of [...CARD_SLOTS, ...SOCIAL_SLOTS]) {
  if (!Object.prototype.hasOwnProperty.call(SECTION_ICON_IDS, slot)) {
    fail(`B: slot '${slot}' sin entrada en SECTION_ICON_IDS`);
  } else if (!ICON_REGISTRY[SECTION_ICON_IDS[slot]]) {
    fail(`B: slot '${slot}' apunta a ícono inexistente '${SECTION_ICON_IDS[slot]}'`);
  }
}
ok(`B: ${CARD_SLOTS.length} slots card_* y ${SOCIAL_SLOTS.length} redes social-* cubiertos`);

// Todo valor del catálogo debe existir en el registro (nada colgado).
for (const [mapName, map] of [
  ['SECTION_ICON_IDS', SECTION_ICON_IDS],
  ['PRODUCT_ICON_IDS', PRODUCT_ICON_IDS],
  ['UI_ICON_IDS', UI_ICON_IDS]
]) {
  for (const [key, iconId] of Object.entries(map)) {
    if (!ICON_REGISTRY[iconId]) {
      fail(`B: ${mapName}['${key}'] = '${iconId}' no existe en ICON_REGISTRY`);
    }
  }
}
ok('B: todos los ids del catálogo existen en ICON_REGISTRY (0 colgados)');

// -cont (banners de contenedor) debe normalizar al ícono de la sección.
const contSample = CANONICAL_SECTION_ORDER[0];
if (resolveSectionIconId(`${contSample}-cont`) !== SECTION_ICON_IDS[contSample]) {
  fail(`B: resolveSectionIconId no normaliza '-cont' para '${contSample}'`);
} else {
  ok(`B: banner '${contSample}-cont' resuelve al ícono de '${contSample}'`);
}

// --- Check C: colisiones ---------------------------------------------------
function checkUniqueValues(mapName, map) {
  const seen = new Map(); // iconId -> primer key que lo usó
  for (const [key, iconId] of Object.entries(map)) {
    if (seen.has(iconId)) {
      fail(`C: ${mapName}: '${key}' repite el ícono '${iconId}' ya usado por '${seen.get(iconId)}'`);
    } else {
      seen.set(iconId, key);
    }
  }
}
checkUniqueValues('SECTION_ICON_IDS', SECTION_ICON_IDS);
checkUniqueValues('PRODUCT_ICON_IDS', PRODUCT_ICON_IDS);
checkUniqueValues('UI_ICON_IDS', UI_ICON_IDS);

// Disjunción entre familias: una sección, un producto y una acción de UI son
// entidades distintas; compartir ícono entre ellas es colisión.
const sectionIcons = new Set(Object.values(SECTION_ICON_IDS));
const productIcons = new Set(Object.values(PRODUCT_ICON_IDS));
const uiIcons = new Set(Object.values(UI_ICON_IDS));
const cross = (a, b, nameA, nameB) => {
  for (const iconId of a) {
    if (b.has(iconId)) fail(`C: ícono '${iconId}' usado tanto en ${nameA} como en ${nameB}`);
  }
};
cross(sectionIcons, productIcons, 'secciones', 'productos');
cross(sectionIcons, uiIcons, 'secciones', 'acciones de UI');
cross(productIcons, uiIcons, 'productos', 'acciones de UI');

if (violations === 0) {
  ok('C: 0 colisiones dentro de cada mapa y entre familias (sección/producto/UI)');
}

// --- Resultado --------------------------------------------------------------
console.log('');
if (violations > 0) {
  console.error(`❌ ÍCONOS: ${violations} violación(es) de unicidad canónica.`);
  console.error('   Misma entidad = mismo ícono; entidades distintas = ícono distinto.');
  process.exit(1);
}
console.log('✅ ÍCONOS ÚNICOS: catálogo canónico íntegro (trazados, cobertura y colisiones OK).');
console.log('');
