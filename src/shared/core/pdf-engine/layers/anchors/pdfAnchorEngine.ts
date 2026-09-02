/**
 * NÚCLEO — MOTOR DE ANCLAJE Y DESPLAZAMIENTO DEL VISOR PDF (pdfAnchorEngine.ts)
 * 
 * Traduce de forma determinista cualquier clic en pestañas de la UI, muelle de secciones
 * o campos del editor en la coordenada vertical exacta dentro del Visor PDF Vectorial.
 */

import { ContentSection } from '../records/recordTypes';
import { Preset } from '../presets/presetSchema';
import { resolveEffectivePresetSectionOrder, CvLayoutOverrides } from '../sectors/layoutResolutionEngine';
import { getPageSize } from '../page/pageSizes';
import { MARGIN_PRESETS, resolveMargins } from '../margins/marginPresets';

export interface PdfAnchorTarget {
  tabId: string;
  sectionId: string;
  pageIndex: number; // 1-based page number
  verticalRatio: number; // 0.0 (top) to 1.0 (bottom) of the target page
  horizontalRatio?: number; // 0.0 (left) to 1.0 (right) of the target page
  hasRecords?: boolean;
}

/**
 * Mapeo canónico entre pestañas de UI / IDs de sección y claves de contenido
 */
export const SECTION_TAB_MAPPING: Record<string, string[]> = {
  personales: ['datos-personales', 'contacto', 'nombre-y-cargo'],
  contacto: ['contacto', 'datos-personales'],
  redes: ['redes'],
  frase: ['frase', 'quote-text', 'marca-y-eslogan'],
  resumen: ['resumen'],
  experiencia: ['experiencia'],
  profesion: ['profesion'],
  formacion: ['formacion', 'education'],
  cursos: ['cursos', 'coursesAndCertificates'],
  competencias: ['competencias', 'skills'],
  habilidades: ['habilidades', 'hardSkills'],
  idiomas: ['idiomas', 'languages'],
  proyectos: ['proyectos', 'projects'],
  publicaciones: ['publicaciones', 'publications'],
  referencias: ['referencias', 'references'],
  informatica: ['informatica'],
  ecologia: ['ecologia'],
  certificados: ['certificados'],
  firma: ['firma']
};

export interface PdfAnchorMapTarget {
  startPage: number;
  startXRatio?: number;
  startYRatio: number;
  endPage: number;
  endXRatio?: number;
  endYRatio: number;
}

export type PdfAnchorMap = Record<string, PdfAnchorMapTarget>;

/**
 * Resuelve determinísticamente el número de página y ratio de desplazamiento 2D
 * para cualquier pestaña o ID de sección recibido, posicionando la vista hacia
 * el último registro o campo visible de dicha sección (o título si está vacía).
 */
export function resolveSectionAnchor(
  activeTab: string | undefined,
  sections: ContentSection[],
  preset: Preset,
  layoutOverrides?: CvLayoutOverrides,
  anchorMap?: PdfAnchorMap
): PdfAnchorTarget {
  const normalizedTab = (activeTab || 'personales').toLowerCase().trim();
  const possibleSectionIds = SECTION_TAB_MAPPING[normalizedTab] || [normalizedTab];

  // 0. Si existe el mapa de marcadores reales de PDF.js, usar la VERDAD DE TERRENO O(1)
  if (anchorMap && Object.keys(anchorMap).length > 0) {
    const candidateKeys = [normalizedTab, ...(SECTION_TAB_MAPPING[normalizedTab] || [])];
    for (const key of candidateKeys) {
      const realAnchor = anchorMap[key];
      if (realAnchor) {
        return {
          tabId: normalizedTab,
          sectionId: key,
          pageIndex: realAnchor.endPage,
          verticalRatio: realAnchor.endYRatio,
          horizontalRatio: realAnchor.endXRatio ?? realAnchor.startXRatio ?? 0.1,
          hasRecords: realAnchor.startPage !== realAnchor.endPage || Math.abs(realAnchor.endYRatio - realAnchor.startYRatio) > 0.02
        };
      }
    }
  }

  // 1. Si es la pestaña personal/header o datos de contacto en primera página
  if (normalizedTab === 'personales') {
    return {
      tabId: normalizedTab,
      sectionId: 'datos-personales',
      pageIndex: 1,
      verticalRatio: 0.0,
      horizontalRatio: 0.0,
      hasRecords: true
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

  // 3. Coincidencia exacta primero; si no existe directa en el maquetador, recurrir a alias de SECTION_TAB_MAPPING
  let matchedIndex = mainSectionIds.indexOf(normalizedTab);
  let isSidebar = false;

  if (matchedIndex === -1) {
    matchedIndex = sidebarSectionIds.indexOf(normalizedTab);
    if (matchedIndex !== -1) {
      isSidebar = true;
    }
  }

  // Si no hubo coincidencia exacta por ID, buscar por alias secundarios
  if (matchedIndex === -1) {
    matchedIndex = mainSectionIds.findIndex(id => possibleSectionIds.includes(id));
    if (matchedIndex === -1) {
      matchedIndex = sidebarSectionIds.findIndex(id => possibleSectionIds.includes(id));
      if (matchedIndex !== -1) {
        isSidebar = true;
      }
    }
  }

  const validIndex = Math.max(0, matchedIndex);
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
    // descripción real: evaluar campos canónicos y variantes
    const descText = String(f.details || f.descripcion || f.description || f.degree || f.role || f.title || f.quote || f.text || '');
    if (descText) lines += Math.ceil(descText.length / charsPerLine);
    return CARD_PADDING_PT + lines * LINE_HEIGHT_PT;
  };

  const estimateSectionHeightPt = (secObj: any, isSidebarSector: boolean): number => {
    const records = secObj?.records || [];
    if (records.length === 0) return 35;
    return 35 + records.reduce((sum: number, r: any) => sum + estimateRecordHeightPt(r, isSidebarSector), 0);
  };

  const pageDef = getPageSize(preset?.pageSizeId || 'a4');
  const marginDef = MARGIN_PRESETS[preset?.marginPresetId || 'normal'] || MARGIN_PRESETS.normal;
  const usableArea = resolveMargins(pageDef, marginDef);
  const USEFUL_PAGE_HEIGHT_PT = usableArea?.heightPt || 680;
  let accumulatedPt = 0;

  for (let i = 0; i < validIndex; i++) {
    const secId = targetSectorIds[i];
    const secObj = (sections || []).find(s => s.id === secId);
    accumulatedPt += estimateSectionHeightPt(secObj, isSidebar);
  }

  const currentSecId = targetSectorIds[validIndex] || possibleSectionIds[0];
  const currentSecObj = (sections || []).find(s => s.id === currentSecId);
  const currentSecHeightPt = estimateSectionHeightPt(currentSecObj, isSidebar);

  const targetPointPt = accumulatedPt + (currentSecHeightPt * 0.85);
  const pageIndex = Math.max(1, Math.floor(targetPointPt / USEFUL_PAGE_HEIGHT_PT) + 1);
  const verticalRatio = Math.min(0.95, (targetPointPt % USEFUL_PAGE_HEIGHT_PT) / USEFUL_PAGE_HEIGHT_PT);

  return {
    tabId: normalizedTab,
    sectionId: possibleSectionIds[0],
    pageIndex,
    verticalRatio,
    horizontalRatio: isSidebar ? 0.2 : 0.7,
    hasRecords: Boolean(currentSecObj?.records && currentSecObj.records.length > 0)
  };
}

/**
 * Ejecuta el desplazamiento suave (smooth scroll) 2D dentro del contenedor HTML del visor PDF.
 */
export function scrollToPdfAnchor(
  container: HTMLElement | null,
  activeTab: string | undefined,
  sections: ContentSection[],
  preset: Preset,
  layoutOverrides?: CvLayoutOverrides,
  anchorMap?: PdfAnchorMap
): void {
  if (!container || !activeTab) return;

  const anchor = resolveSectionAnchor(activeTab, sections, preset, layoutOverrides, anchorMap);
  const canvasElements = container.querySelectorAll('canvas');

  if (canvasElements.length === 0) return;

  const targetCanvasIndex = Math.min(anchor.pageIndex - 1, canvasElements.length - 1);
  const targetCanvas = canvasElements[targetCanvasIndex] as HTMLCanvasElement;

  if (!targetCanvas) return;

  // Encontrar el contenedor ascendente real con scroll (si el contenedor directo es estático).
  // Antes bastaba con que la propiedad CSS overflow-y fuera 'auto' para frenar la
  // búsqueda ahí — pero un wrapper que declara overflow:auto SIN que su contenido
  // realmente exceda su alto (clientHeight === scrollHeight, como el wrapperRef de
  // VectorDocViewer.tsx) no tiene scroll real: scrollTo() ahí no mueve nada, y el
  // contenedor de verdad (el panel de App.tsx) queda inmóvil. Ahora se exige overflow
  // real (con margen de 10px para evitar falsos negativos por redondeo).
  let scrollableParent: HTMLElement = container;
  while (scrollableParent && scrollableParent.parentElement && scrollableParent !== document.body) {
    const style = window.getComputedStyle(scrollableParent);
    const hasOverflowStyle = ['auto', 'scroll'].includes(style.overflowY) || ['auto', 'scroll'].includes(style.overflowX);
    const isActuallyScrollable =
      scrollableParent.scrollHeight > scrollableParent.clientHeight + 10 ||
      scrollableParent.scrollWidth > scrollableParent.clientWidth + 10;
    if (hasOverflowStyle && isActuallyScrollable) {
      break;
    }
    scrollableParent = scrollableParent.parentElement;
  }

  // Calcular la posición real en píxeles de pantalla usando getBoundingClientRect para soportar zoom/scale
  const parentRect = scrollableParent.getBoundingClientRect();
  const canvasRect = targetCanvas.getBoundingClientRect();

  const currentScrollTop = scrollableParent.scrollTop;
  const currentScrollLeft = scrollableParent.scrollLeft;

  const canvasTopRelativeToContainer = canvasRect.top - parentRect.top;
  const canvasLeftRelativeToContainer = canvasRect.left - parentRect.left;

  const viewportHeight = scrollableParent.clientHeight || window.innerHeight || 800;
  const viewportWidth = scrollableParent.clientWidth || window.innerWidth || 1200;

  // Centrado Vertical 2D: Posiciona la coordenada Y objetivo cerca del centro-superior (~45% del viewport)
  const absoluteY = currentScrollTop + canvasTopRelativeToContainer + (canvasRect.height * anchor.verticalRatio);
  const targetScrollTop = absoluteY - (viewportHeight * 0.45);

  // Centrado Horizontal 2D: Centra la vista sobre el margen de la columna objetivo (izquierda o derecha)
  const targetXRatio = anchor.horizontalRatio ?? 0.1;
  const absoluteX = currentScrollLeft + canvasLeftRelativeToContainer + (canvasRect.width * targetXRatio);
  const targetScrollLeft = absoluteX - (viewportWidth * 0.50);

  scrollableParent.scrollTo({
    top: Math.max(0, targetScrollTop),
    left: Math.max(0, targetScrollLeft),
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
