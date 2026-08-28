import { getAllPresets } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';
import { getContrastRatio, hexToOKLCH } from '../src/shared/core/pdf-engine/layers/colors/colorSystem';
import { checkThemeHueCoherence } from '../src/shared/core/pdf-engine/layers/colors/themeLightDarkTranslationEngine';

console.log('🔍 Iniciando auditoría de contraste WCAG 2.1 AA y coherencia cromática en presets de PDF...');

const presets = getAllPresets();
let totalChecks = 0;
let failedChecks = 0;

for (const preset of presets) {
  const surfaces = preset.surfacePalettes || {
    light: preset.palette,
    dark: preset.palette
  };

  const variants = [
    { name: 'light', pal: surfaces.light, bg: '#ffffff' },
    { name: 'dark', pal: surfaces.dark, bg: surfaces.dark.primary || '#1e293b' }
  ];

  for (const variant of variants) {
    totalChecks++;
    const textBgContrast = getContrastRatio(variant.bg, variant.pal.text);
    if (textBgContrast < 4.5) {
      console.error(`❌ FALLO DE CONTRASTE [Preset: ${preset.id}, Variante: ${variant.name}]: Texto (${variant.pal.text}) en Fondo (${variant.bg}) da ratio ${textBgContrast.toFixed(2)}:1 (mínimo 4.5:1).`);
      failedChecks++;
    }

    const accentBgContrast = getContrastRatio(variant.bg, variant.pal.accent);
    if (accentBgContrast < 3.0) {
      console.warn(`⚠️ ADVERTENCIA DE CONTRASTE [Preset: ${preset.id}, Variante: ${variant.name}]: Acento (${variant.pal.accent}) en Fondo (${variant.bg}) da ratio ${accentBgContrast.toFixed(2)}:1.`);
    }
  }

  // Verificación de Coherencia de Matiz de Acento entre variante clara y oscura
  const coherence = checkThemeHueCoherence(surfaces.light.accent, surfaces.dark.accent);
  totalChecks++;
  if (!coherence.coherent) {
    console.error(`❌ FALLO DE COHERENCIA CROMÁTICA [Preset: ${preset.id}]: Delta de Hue entre acento claro y oscuro es ${coherence.hueDeltaDeg}° (máximo permitido 15°).`);
    failedChecks++;
  } else {
    console.log(`  ✓ Preset [${preset.id}] - OK (Delta Hue Acentos: ${coherence.hueDeltaDeg}°).`);
  }

  // PRUEBA DE INTEGRACIÓN REAL DE SUPERFICIE DE SECTOR
  const surfaceModes = preset.sectorSurfaceMode || { sidebar: 'dark', main: 'light' };
  const sidebarPal = surfaceModes.sidebar === 'dark' ? surfaces.dark : surfaces.light;
  const mainPal = surfaceModes.main === 'light' ? surfaces.light : surfaces.dark;

  totalChecks++;
  if (surfaceModes.sidebar === 'dark' && surfaceModes.main === 'light') {
    if (sidebarPal.background === mainPal.background) {
      console.error(`❌ FALLO DE INTEGRACIÓN DE SUPERFICIE [Preset: ${preset.id}]: El fondo del sidebar (${sidebarPal.background}) es idéntico al fondo de main (${mainPal.background}) en un tema de superficie oscura.`);
      failedChecks++;
    } else {
      console.log(`  ✓ Preset [${preset.id}] - Integración de superficie de sector OK (Sidebar: ${sidebarPal.background}, Main: ${mainPal.background}).`);
    }
  }
}

if (failedChecks > 0) {
  console.error(`❌ AUDITORÍA PDF FALLIDA: ${failedChecks} de ${totalChecks} verificaciones no pasaron.`);
  process.exit(1);
}

console.log(`✅ AUDITORÍA DE CONTRASTE Y COHERENCIA PDF EXITOSA: ${totalChecks} verificaciones pasaron al 100%.`);
