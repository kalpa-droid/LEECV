/**
 * NÚCLEO — MOTOR DE ANCLAJE Y DESPLAZAMIENTO DEL VISOR PDF (pdfAnchorEngine.ts)
 * 
 * Traduce de forma determinista cualquier clic en pestañas de la UI, muelle de secciones
 * o campos del editor en la coordenada vertical exacta dentro del Visor PDF Vectorial.
 */

import { ContentSection } from '../records/recordTypes';
import { Preset } from '../presets/presetSchema';
import { resolveEffectivePresetSectionOrder, CvLayoutOverrides } from '../sectors/layoutResolutionEngine';

export interface PdfAnchorTarget {
  tabId: string;
  sectionId: string;
  pageIndex: number; // 1-based page number
  verticalRatio: number; // 0.0 (top) to 1.0 (bottom) of the target page
}

/**
 * Mapeo canónico entre pestañas de UI / IDs de sección y claves de contenido
 */
export const SECTION_TAB_MAPPING: Record<string, string[]> = {
  personales: ['datos-personales', 'contacto', 'nombre-y-cargo'],
  contacto: ['contacto', 'datos-personales'],
  redes: ['redes'],
  frase: ['frase', 'quote-text', 'marca-y-eslogan'],
  experiencia: ['experiencia', 'profesion'],
  formacion: ['formacion', 'education', 'cursos'],
  competencias: ['competencias', 'skills', 'informatica'],
  habilidades: ['habilidades', 'hardSkills'],
  idiomas: ['idiomas', 'languages'],
  proyectos: ['proyectos', 'projects'],
  publicaciones: ['publicaciones', 'publications'],
  referencias: ['referencias', 'references'],
  cursos: ['cursos', 'coursesAndCertificates'],
  informatica: ['informatica'],
  ecologia: ['ecologia'],
  firma: ['firma']
};

/**
 * Resuelve determinísticamente el número de página y ratio de desplazamiento
 * para cualquier pestaña o ID de sección recibido, posicionando la vista hacia
 * el último registro o campo visible de dicha sección.
 */
export function resolveSectionAnchor(
  activeTab: string | undefined,
  sections: ContentSection[],
  preset: Preset,
  layoutOverrides?: CvLayoutOverrides
): PdfAnchorTarget {
  const normalizedTab = (activeTab || 'personales').toLowerCase().trim();
  const possibleSectionIds = SECTION_TAB_MAPPING[normalizedTab] || [normalizedTab];

  // 1. Si es la pestaña personal/header o datos de contacto en primera página
  if (normalizedTab === 'personales') {
    return {
      tabId: normalizedTab,
      sectionId: 'datos-personales',
      pageIndex: 1,
      verticalRatio: 0.0
    };
  }

  // 2. Buscar posición en la lista de secciones efectivas resolviendo preferencia de usuario
  const sectionOrder = resolveEffectivePresetSectionOrder(preset, layoutOverrides);
  let mainSectionIds: string[] = [];
  let sidebarSectionIds: string[] = [];

  for (const s of sectionOrder) {
    if (s.sectorRole === 'main') {
      mainSectionIds = [...(s.sectionIds || [])];
    } else if (s.sectorRole === 'sidebar') {
      sidebarSectionIds = [...(s.sectionIds || [])];
    }
  }

  // Incorporar cualquier sección dinámicamente presente en 'sections' que no esté en el preset base
  if (Array.isArray(sections)) {
    for (const sec of sections) {
      if (sec.id && !mainSectionIds.includes(sec.id) && !sidebarSectionIds.includes(sec.id)) {
        mainSectionIds.push(sec.id);
      }
    }
  }

  // Buscar coincidencia en la columna principal primero, luego en sidebar
  let matchedIndex = mainSectionIds.findIndex(id => possibleSectionIds.includes(id));
  let isSidebar = false;

  if (matchedIndex === -1) {
    matchedIndex = sidebarSectionIds.findIndex(id => possibleSectionIds.includes(id));
    isSidebar = true;
  }

  const totalMain = Math.max(1, mainSectionIds.length);
  const totalSidebar = Math.max(1, sidebarSectionIds.length);
  const totalInSector = isSidebar ? totalSidebar : totalMain;

  const validIndex = matchedIndex >= 0 ? matchedIndex : 0;
  const targetSectorIds = isSidebar ? sidebarSectionIds : mainSectionIds;

  const CHARS_PER_LINE_MAIN = 68;   // ancho útil típico de la columna principal
  const CHARS_PER_LINE_SIDEBAR = 28; // columna angosta, menos caracteres por línea
  const LINE_HEIGHT_PT = 12.5;
  const CARD_PADDING_PT = 26; // padding + margen entre tarjetas

  const estimateRecordHeightPt = (rec: any, isSidebarSector: boolean): number => {
    const f = rec?.fields || {};
    const charsPerLine = isSidebarSector ? CHARS_PER_LINE_SIDEBAR : CHARS_PER_LINE_MAIN;
    // encabezado: título + subtítulo, ~2 líneas siempre
    let lines = 2;
    // descripción real: el campo puede venir con nombre viejo o canónico
    const descText = String(f.details || f.descripcion || f.description || '');
    if (descText) lines += Math.ceil(descText.length / charsPerLine);
    return CARD_PADDING_PT + lines * LINE_HEIGHT_PT;
  };

  const estimateSectionHeightPt = (secObj: any, isSidebarSector: boolean): number => {
    const records = secObj?.records || [];
    if (records.length === 0) return 35;
    return 35 + records.reduce((sum: number, r: any) => sum + estimateRecordHeightPt(r, isSidebarSector), 0);
  };

  const USEFUL_PAGE_HEIGHT_PT = 680;
  let accumulatedPt = 0;

  for (let i = 0; i < validIndex; i++) {
    const secId = targetSectorIds[i];
    const secObj = (sections || []).find(s => s.id === secId);
    accumulatedPt += estimateSectionHeightPt(secObj, isSidebar);
  }

  const currentSecId = targetSectorIds[validIndex] || possibleSectionIds[0];
  const currentSecObj = (sections || []).find(s => s.id === currentSecId);
  const currentSecHeightPt = estimateSectionHeightPt(currentSecObj, isSidebar);

  const targetPointPt = accumulatedPt + (currentSecHeightPt * 0.8);
  const pageIndex = Math.max(1, Math.floor(targetPointPt / USEFUL_PAGE_HEIGHT_PT) + 1);
  const verticalRatio = Math.min(0.95, (targetPointPt % USEFUL_PAGE_HEIGHT_PT) / USEFUL_PAGE_HEIGHT_PT);

  return {
    tabId: normalizedTab,
    sectionId: possibleSectionIds[0],
    pageIndex,
    verticalRatio
  };
}

/**
 * Ejecuta el desplazamiento suave (smooth scroll) dentro del contenedor HTML del visor PDF.
 */
export function scrollToPdfAnchor(
  container: HTMLElement | null,
  activeTab: string | undefined,
  sections: ContentSection[],
  preset: Preset,
  layoutOverrides?: CvLayoutOverrides
): void {
  if (!container || !activeTab) return;

  const anchor = resolveSectionAnchor(activeTab, sections, preset, layoutOverrides);
  const canvasElements = container.querySelectorAll('canvas');

  if (canvasElements.length === 0) return;

  const targetCanvasIndex = Math.min(anchor.pageIndex - 1, canvasElements.length - 1);
  const targetCanvas = canvasElements[targetCanvasIndex] as HTMLCanvasElement;

  if (!targetCanvas) return;

  // Encontrar el contenedor ascendente real con scroll (si el contenedor directo es estático)
  let scrollableParent: HTMLElement = container;
  while (scrollableParent && scrollableParent !== document.body) {
    const style = window.getComputedStyle(scrollableParent);
    if (['auto', 'scroll'].includes(style.overflowY) || scrollableParent.scrollHeight > scrollableParent.clientHeight) {
      break;
    }
    if (scrollableParent.parentElement) {
      scrollableParent = scrollableParent.parentElement;
    } else {
      break;
    }
  }

  const canvasTop = targetCanvas.offsetTop;
  const canvasHeight = targetCanvas.offsetHeight;
  const targetScrollTop = canvasTop + (canvasHeight * anchor.verticalRatio);

  scrollableParent.scrollTo({
    top: Math.max(0, targetScrollTop - 40),
    behavior: 'smooth'
  });

  // Efecto sutil de resalte (pulse glow) en el lienzo del PDF
  targetCanvas.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
  const originalShadow = targetCanvas.style.boxShadow;
  targetCanvas.style.boxShadow = '0 0 0 3px rgba(171, 91, 161, 0.6), 0 10px 30px rgba(0, 0, 0, 0.4)';

  setTimeout(() => {
    targetCanvas.style.boxShadow = originalShadow;
  }, 1200);
}
