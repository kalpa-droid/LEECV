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

  const USEFUL_PAGE_HEIGHT_PT = 680;
  let accumulatedPt = 0;

  for (let i = 0; i < validIndex; i++) {
    const secId = targetSectorIds[i];
    const secObj = (sections || []).find(s => s.id === secId);
    const recCount = secObj?.records?.length || 1;
    accumulatedPt += 35 + (recCount * 50);
  }

  const currentSecId = targetSectorIds[validIndex] || possibleSectionIds[0];
  const currentSecObj = (sections || []).find(s => s.id === currentSecId);
  const currentRecCount = currentSecObj?.records?.length || 1;
  const currentSecHeightPt = 35 + (currentRecCount * 50);

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

  const canvasTop = targetCanvas.offsetTop;
  const canvasHeight = targetCanvas.offsetHeight;
  const targetScrollTop = canvasTop + (canvasHeight * anchor.verticalRatio);

  container.scrollTo({
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
