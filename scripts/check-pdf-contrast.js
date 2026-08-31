import { getAllPresets } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';
import { getContrastRatio, hexToOKLCH } from '../src/shared/core/pdf-engine/layers/colors/colorSystem';
import { checkThemeHueCoherence } from '../src/shared/core/pdf-engine/layers/colors/themeLightDarkTranslationEngine';
import { resolveSubtleCardBackground } from '../src/shared/core/pdf-engine/layers/colors/surfaceAwareColorEngine';
import { resolveUnifiedTextSpec } from '../src/shared/core/pdf-engine/layers/typography/unifiedTextHierarchyEngine';

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

    totalChecks++;
    const accentBgContrast = getContrastRatio(variant.bg, variant.pal.accent);
    if (accentBgContrast < 3.0) {
      console.error(`❌ FALLO DE CONTRASTE [Preset: ${preset.id}, Variante: ${variant.name}]: Acento (${variant.pal.accent}) en Fondo (${variant.bg}) da ratio ${accentBgContrast.toFixed(2)}:1 (mínimo 3.0:1).`);
      failedChecks++;
    } else {
      console.log(`  ✓ Preset [${preset.id}] (${variant.name}) - Acento en Fondo ratio ${accentBgContrast.toFixed(2)}:1 OK.`);
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

  // AUDITORÍA INTEGRAL DE JERARQUÍA TIPOGRÁFICA Y CONTRASTE WCAG 2.1 AA EN MOTOR UNIFICADO (resolveUnifiedTextSpec)
  const cardBgHex = resolveSubtleCardBackground('main', mainPal);
  const textRolesToTest = [
    { role: 'title', minRatio: 4.5, name: 'Título (title)' },
    { role: 'subtitle', minRatio: 4.5, name: 'Subtítulo (subtitle)' },
    { role: 'description', minRatio: 4.5, name: 'Cuerpo (description/body)' },
    { role: 'meta', minRatio: 4.5, name: 'Metadata (meta/extra)' }
  ];

  for (const textRole of textRolesToTest) {
    totalChecks++;
    const spec = resolveUnifiedTextSpec(textRole.role, cardBgHex, mainPal, preset.typography);
    const contrastRatio = getContrastRatio(cardBgHex, spec.colorHex);

    if (contrastRatio < textRole.minRatio) {
      console.error(`❌ FALLO DE CONTRASTE EN MOTOR DE JERARQUÍA [Preset: ${preset.id}, Nivel: ${textRole.name}]: Color (${spec.colorHex}) en Fondo de Tarjeta (${cardBgHex}) da ratio ${contrastRatio.toFixed(2)}:1 (mínimo ${textRole.minRatio}:1).`);
      failedChecks++;
    } else {
      console.log(`  ✓ Preset [${preset.id}] - Motor Jerarquía ${textRole.name} (${spec.colorHex}) en Tarjeta (${cardBgHex}) da ratio ${contrastRatio.toFixed(2)}:1 OK (≥ ${textRole.minRatio}:1).`);
    }
  }

  // Verificación explícita de registros inline (skill, contact, quote) en superficies MAIN (clara) y SIDEBAR (oscura)
  const inlineSurfacesToTest = [
    { name: 'Sidebar', bg: sidebarPal.primary || sidebarPal.background, roles: sidebarPal },
    { name: 'Main', bg: mainPal.background || '#ffffff', roles: mainPal }
  ];

  for (const surf of inlineSurfacesToTest) {
    totalChecks++;
    const skillSpec = resolveUnifiedTextSpec('body', surf.bg, surf.roles, preset.typography, 'skill');
    const skillRatio = getContrastRatio(surf.bg, skillSpec.colorHex);
    if (skillRatio < 4.5) {
      console.error(`❌ FALLO DE CONTRASTE EN SKILL [Preset: ${preset.id}, Superficie: ${surf.name}]: Color (${skillSpec.colorHex}) en (${surf.bg}) da ratio ${skillRatio.toFixed(2)}:1 (mínimo 4.5:1).`);
      failedChecks++;
    }
  }

  // AUDITORÍA DE LA PORTADA (COVER PAGE)
  const coverBgHex = preset.surfacePalettes?.dark?.primary || preset.palette.primary;
  const coverRolesColor = preset.surfacePalettes?.dark || preset.palette;
  const coverRolesToTest = [
    { role: 'title', minRatio: 4.5, name: 'Portada Título' },
    { role: 'subtitle', minRatio: 4.5, name: 'Portada Subtítulo/Roles' },
    { role: 'body', minRatio: 4.5, name: 'Portada Quote' },
    { role: 'meta', minRatio: 4.5, name: 'Portada Footer' }
  ];

  for (const cRole of coverRolesToTest) {
    totalChecks++;
    const spec = resolveUnifiedTextSpec(cRole.role, coverBgHex, coverRolesColor, preset.typography);
    const ratio = getContrastRatio(coverBgHex, spec.colorHex);
    if (ratio < cRole.minRatio) {
      console.error(`❌ FALLO DE CONTRASTE EN PORTADA [Preset: ${preset.id}, Elemento: ${cRole.name}]: Color (${spec.colorHex}) en Fondo de Portada (${coverBgHex}) da ratio ${ratio.toFixed(2)}:1 (mínimo ${cRole.minRatio}:1).`);
      failedChecks++;
    } else {
      console.log(`  ✓ Preset [${preset.id}] - Portada ${cRole.name} (${spec.colorHex}) en (${coverBgHex}) da ratio ${ratio.toFixed(2)}:1 OK (≥ ${cRole.minRatio}:1).`);
    }
  }
}

if (failedChecks > 0) {
  console.error(`❌ AUDITORÍA PDF FALLIDA: ${failedChecks} de ${totalChecks} verificaciones no pasaron.`);
  process.exit(1);
}

console.log(`✅ AUDITORÍA DE CONTRASTE Y COHERENCIA PDF EXITOSA: ${totalChecks} verificaciones pasaron al 100%.`);
