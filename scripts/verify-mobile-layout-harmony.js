import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('📱 Verificando Armonía de Diseño Móvil, Visibilidad de Pestañas y Banners (Plan Maestro v6)...');

// 1. Verificar AppShell.tsx
const appShellPath = path.join(ROOT, 'src/shared/core/ui/AppShell.tsx');
if (!fs.existsSync(appShellPath)) {
  console.error('❌ No se encontró AppShell.tsx');
  process.exit(1);
}
const appShellContent = fs.readFileSync(appShellPath, 'utf-8');
if (appShellContent.includes('<div className="hidden md:block w-full shrink-0">\n        <DocumentTabsBar')) {
  console.error('❌ AppShell.tsx oculta la barra de pestañas en móvil usando hidden md:block.');
  process.exit(1);
}

// 2. Verificar CookieConsentBanner.tsx
const cookieBannerPath = path.join(ROOT, 'src/shared/core/ui/CookieConsentBanner.tsx');
if (!fs.existsSync(cookieBannerPath)) {
  console.error('❌ No se encontró CookieConsentBanner.tsx');
  process.exit(1);
}
const cookieBannerContent = fs.readFileSync(cookieBannerPath, 'utf-8');
if (!cookieBannerContent.includes('z-[60]')) {
  console.error('❌ CookieConsentBanner.tsx no utiliza z-[60] para sobreponerse al banner PWA (z-50).');
  process.exit(1);
}
if (!cookieBannerContent.includes('min-h-[44px]')) {
  console.error('❌ CookieConsentBanner.tsx no utiliza min-h-[44px] para accesibilidad táctil WCAG.');
  process.exit(1);
}

// 3. Verificar Modal.tsx
const modalPath = path.join(ROOT, 'src/shared/core/ui/Modal.tsx');
if (!fs.existsSync(modalPath)) {
  console.error('❌ No se encontró Modal.tsx');
  process.exit(1);
}
const modalContent = fs.readFileSync(modalPath, 'utf-8');
if (!modalContent.includes('dvh')) {
  console.error('❌ Modal.tsx no utiliza unidades dinámicas dvh (max-h-[92dvh]).');
  process.exit(1);
}

// 4. Verificar el margen vertical compacto de la hoja en celular.
// Vive en ScaledPaperSheet.tsx (compartido por CV/tarjeta/carta/agenda) desde que se extrajo
// de CVPreview.tsx; se acepta en cualquiera de los dos para no atarse a dónde vive hoy.
const previewPath = path.join(ROOT, 'src/modules/cv-builder/components/CVPreview.tsx');
const sheetPath = path.join(ROOT, 'src/shared/core/viewport/ScaledPaperSheet.tsx');
if (!fs.existsSync(previewPath)) {
  console.error('❌ No se encontró CVPreview.tsx');
  process.exit(1);
}
const previewContent = fs.readFileSync(previewPath, 'utf-8');
const sheetContent = fs.existsSync(sheetPath) ? fs.readFileSync(sheetPath, 'utf-8') : '';
if (!previewContent.includes('my-1 sm:my-5') && !sheetContent.includes('my-1 sm:my-5')) {
  console.error('❌ Ni CVPreview.tsx ni ScaledPaperSheet.tsx usan my-1 sm:my-5 para el margen vertical compacto del documento en celular.');
  process.exit(1);
}

console.log('✅ Armonía de Diseño Móvil y Blindaje Anti-Regresión v6 VERIFICADOS OK.');
