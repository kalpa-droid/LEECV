/**
 * Fixtures de prueba para el self-test de scripts/audit-ui-tokens.js (Mejora 1)
 */

export const testFixtures = {
  // Casos que DEBEN marcarse como fugas cromáticas (falsos negativos si no se detectan)
  leaks: [
    { code: `const bg = "bg-slate-900";`, expectedRule: 'tailwind-color-leak' },
    { code: `const color = "text-purple-500";`, expectedRule: 'tailwind-color-leak' },
    { code: `const border = "border-amber-500";`, expectedRule: 'tailwind-color-leak' },
    { code: `const style = { color: "#FF2E63" };`, expectedRule: 'raw-hex-leak' },
    { code: `const bg = "bg-[#4285F4]";`, expectedRule: 'arbitrary-tailwind-hex-leak' }
  ],
  // Casos válidos que NO deben marcarse como fugas (falsos positivos si se marcan)
  valid: [
    { code: `const style = { color: 'var(--color-accent-base)' };` },
    { code: `const cls = "bg-[var(--color-neutral-surface)]";` },
    { code: `import { colorSystem } from '../shared/core/uiDesignSystem';` },
    { code: `const c = colorSystem.accent.base;` }
  ]
};
