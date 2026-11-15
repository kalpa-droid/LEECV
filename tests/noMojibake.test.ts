/**
 * Regresión anti-mojibake (UTF-8 doble codificado) en el código fuente.
 *
 * En 2026-11 se corrigieron 18 líneas dañadas en presetCompositionInstances.ts
 * (p. ej. "NÃšCLEO" por "NÚCLEO", "â€”" por "—"). Este test impide que vuelva
 * a colarse texto así en src/ o api/.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src', 'api'];

const EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.md', '.html', '.css', '.json',
]);

// "Ã" + cualquier char (típico de UTF-8 leído como Latin-1/cp1252),
// "â€" (marca de "—"/"…" mal decodificados), "ï¿½" / U+FFFD (caracteres de reemplazo),
// "Â" + cualquier char (otro patrón clásico de doble codificación).
const MOJIBAKE = /(Ã.)|(Â.)|(â€)|(ï¿½)|(\uFFFD)/;

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

describe('Anti-mojibake — fuentes sin texto UTF-8 doble codificado', () => {
  it('src/ y api/ no contienen patrones de mojibake', () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      if (!fs.existsSync(root)) continue;
      for (const file of collectFiles(root)) {
        const text = fs.readFileSync(file, 'utf8');
        const lines = text.split('\n');
        lines.forEach((line, idx) => {
          if (MOJIBAKE.test(line)) {
            offenders.push(`${file}:${idx + 1}  ${line.trim().slice(0, 120)}`);
          }
        });
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
