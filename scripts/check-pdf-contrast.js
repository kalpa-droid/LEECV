import { getAllPresets, PRESET_COLORS, resolveActivePreset } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';
import { getContrastRatio } from '../src/shared/core/pdf-engine/layers/colors/colorSystem';
import { checkThemeHueCoherence } from '../src/shared/core/pdf-engine/layers/colors/themeLightDarkTranslationEngine';
import { resolveSubtleCardBackground } from '../src/shared/core/pdf-engine/layers/colors/surfaceAwareColorEngine';
import { resolveUnifiedTextSpec } from '../src/shared/core/pdf-engine/layers/typography/unifiedTextHierarchyEngine';

console.log('🔍 Iniciando auditoría de contraste WCAG 2.1 AA y coherencia cromática cartesiana en presets de PDF...');

const basePresets = getAllPresets();
const colorPresets = Object.values(PRESET_COLORS);

let totalChecks = 0;
let failedChecks = 0;

// 1. Auditoría Base de Presets Integrados
for (const preset of basePresets) {
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
    }
  }

  // Verificación de Coherencia de Matiz de Acento entre variante clara y oscura
  const coherence = checkThemeHueCoherence(surfaces.light.accent, surfaces.dark.accent);
  totalChecks++;
  if (!coherence.coherent) {
    console.error(`❌ FALLO DE COHERENCIA CROMÁTICA [Preset: ${preset.id}]: Delta de Hue entre acento claro y oscuro es ${coherence.hueDeltaDeg}° (máximo permitido 15°).`);
    failedChecks++;
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
    }
  }
}

// 2. AUDITORÍA CARTESIANA DE COMBINACIONES (Presets Base × Paletas de Color)
console.log('\n🎨 Ejecutando Auditoría Cartesiana de Combinaciones (Presets × Paletas)...');

for (const baseP of basePresets) {
  for (const colorP of colorPresets) {
    const combinedPreset = resolveActivePreset({
      activePresetId: baseP.id,
      colorPresetId: colorP.id
    });

    const mainPal = combinedPreset.surfacePalettes?.main || combinedPreset.palette;
    const sidebarPal = combinedPreset.surfacePalettes?.sidebar || combinedPreset.palette;

    const mainCardBg = resolveSubtleCardBackground('main', mainPal);
    const sidebarBg = sidebarPal.surfaceBg || sidebarPal.background || '#1e293b';

    const textRoles = [
      { role: 'title', minRatio: 4.5, name: 'Título' },
      { role: 'subtitle', minRatio: 4.5, name: 'Subtítulo' },
      { role: 'description', minRatio: 4.5, name: 'Cuerpo' },
      { role: 'meta', minRatio: 4.5, name: 'Meta' }
    ];

    for (const tr of textRoles) {
      totalChecks++;
      const mainSpec = resolveUnifiedTextSpec(tr.role, mainCardBg, mainPal, combinedPreset.typography);
      const mainRatio = getContrastRatio(mainCardBg, mainSpec.colorHex);

      if (mainRatio < tr.minRatio) {
        console.error(`❌ FALLO CARTESIANO [Preset: ${baseP.id}, Color: ${colorP.id}, Sector: Main, Nivel: ${tr.name}]: Ratio ${mainRatio.toFixed(2)}:1 < ${tr.minRatio}:1`);
        failedChecks++;
      }

      totalChecks++;
      const sideSpec = resolveUnifiedTextSpec(tr.role, sidebarBg, sidebarPal, combinedPreset.typography);
      const sideRatio = getContrastRatio(sidebarBg, sideSpec.colorHex);

      if (sideRatio < tr.minRatio) {
        console.error(`❌ FALLO CARTESIANO [Preset: ${baseP.id}, Color: ${colorP.id}, Sector: Sidebar, Nivel: ${tr.name}]: Ratio ${sideRatio.toFixed(2)}:1 < ${tr.minRatio}:1`);
        failedChecks++;
      }
    }

    // AUDITORÍA DE BANNER DE SECCIÓN (SectionBannerCard) SOBRE CUALQUIER ROL DE COLOR DE FONDO
    const bannerBgRoles = ['primary', 'accent', 'secondary', 'background', 'transparent'];
    for (const bgRole of bannerBgRoles) {
      totalChecks++;
      const bannerBg = bgRole === 'transparent' ? mainPal.background : (mainPal[bgRole] || mainPal.primary);
      const bannerSpec = resolveUnifiedTextSpec('title', bannerBg, mainPal, combinedPreset.typography, 'section-banner');
      const bannerRatio = getContrastRatio(bannerBg, bannerSpec.colorHex);

      if (bannerRatio < 3.0) {
        console.error(`❌ FALLO BANNER DE SECCIÓN [Preset: ${baseP.id}, Color: ${colorP.id}, RolFondo: ${bgRole}]: Texto (${bannerSpec.colorHex}) en Fondo de Banner (${bannerBg}) da ratio ${bannerRatio.toFixed(2)}:1 < 3.0:1`);
        failedChecks++;
      }
    }
  }
}

if (failedChecks > 0) {
  console.error(`❌ AUDITORÍA PDF CARTESIANA FALLIDA: ${failedChecks} de ${totalChecks} verificaciones no pasaron.`);
  process.exit(1);
}

console.log(`✅ AUDITORÍA DE CONTRASTE CARTESIANA PDF EXITOSA: ${totalChecks} verificaciones pasaron al 100%.`);
