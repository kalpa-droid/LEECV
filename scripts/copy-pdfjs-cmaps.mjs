#!/usr/bin/env node
/**
 * copy-pdfjs-cmaps.mjs — Copia los cMap de pdfjs-dist a public/cmaps/.
 *
 * Por qué existe: impositionEngine.ts abre el PDF con cMapUrl local
 * ('/cmaps/') primero, luego CDN, luego sin cmaps. Los cMaps locales se
 * sirven desde el propio dominio de la app (sin depender de una CDN externa
 * ni de que su versión coincida byte a byte con pdfjs-dist instalado).
 *
 * Se ejecuta en `prebuild` (npm run build) y es idempotente: si
 * public/cmaps/ ya está poblado, no copia nada (devuelve 0 rápido).
 * public/cmaps/ está en .gitignore: no se commitea, se regenera en build.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'node_modules', 'pdfjs-dist', 'cmaps');
const destDir = path.join(root, 'public', 'cmaps');

if (!fs.existsSync(srcDir)) {
  console.error('[copy-pdfjs-cmaps] node_modules/pdfjs-dist/cmaps no existe — ¿corriste npm install?');
  process.exit(1);
}

if (fs.existsSync(destDir) && fs.readdirSync(destDir).length > 0) {
  console.log('[copy-pdfjs-cmaps] public/cmaps/ ya poblado — nada que hacer.');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.cpSync(srcDir, destDir, { recursive: true });

const files = fs.readdirSync(destDir);
const bytes = files.reduce((acc, f) => acc + fs.statSync(path.join(destDir, f)).size, 0);
console.log(`[copy-pdfjs-cmaps] ${files.length} archivos (${(bytes / 1024 / 1024).toFixed(2)} MB) copiados a public/cmaps/`);
