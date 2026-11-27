import React, { useEffect, useRef, useState } from 'react';
import { pdf, Image as PdfImage } from '@react-pdf/renderer';
import { colorSystem } from '../uiDesignSystem';
import { scrollToPdfAnchor } from './layers/anchors/pdfAnchorEngine';
import { ContentSection } from './layers/records/recordTypes';
import { Preset } from './layers/presets/presetSchema';
import { CvLayoutOverrides } from './layers/sectors/layoutResolutionEngine';
import { markRenderAsCompleted } from './layers/presets/presetTransitionEngine';
import { ensurePdfjsWorkerConfigured } from './pdfjsWorkerSetup';
import { initPdfFonts, resetBrokenDynamicFonts } from './layers/typography/pdfFontRegistry';

const pdfjsLib = ensurePdfjsWorkerConfigured();

/** Umbral a partir del cual se virtualizan los <canvas> por página para impedir OOM en libros/informes largos. */
const VIRTUALIZE_PAGES_THRESHOLD = 12;
/** Lado máximo de bitmap por canvas para evitar exceder límites de textura GPU en pantallas 3x o zoom alto. */
const MAX_CANVAS_SIDE_PX = 2400;
/** Máximo de canvases activos simultáneamente en modo virtualizado. */
const MAX_ACTIVE_VIRTUAL_CANVASES = 12;

interface VectorDocViewerProps {
  /** El documento de @react-pdf/renderer a renderizar, ej: <CvPdfDocument cvData={cvData} /> */
  document: React.ReactElement;
  /** Nivel de zoom actual (ej: 1.0, 1.25) para mantener nitidez cristalina en alta resolución */
  zoomLevel?: number;
  /** Pestaña / Sección activa de la UI para desplazamiento e interactividad */
  activeTab?: string;
  sections?: ContentSection[];
  preset?: Preset;
  layoutOverrides?: CvLayoutOverrides;
  /** Callback opcional invocado una vez por render con el texto extraído por página (1-indexado). */
  onDocumentTextScanned?: (pageTexts: Record<number, string>) => void;
}

function releaseContainerCanvases(root: HTMLElement | null): void {
  if (!root) return;
  const oldCanvases = root.querySelectorAll('canvas');
  oldCanvases.forEach((c) => {
    c.width = 0;
    c.height = 0;
  });
}

function styleRenderedCanvas(canvas: HTMLCanvasElement, pageNum: number, insideSlot: boolean): void {
  canvas.setAttribute('data-page-number', String(pageNum));
  canvas.style.width = '100%';
  canvas.style.height = insideSlot ? '100%' : 'auto';
  canvas.style.display = 'block';
  if (!insideSlot) {
    canvas.style.marginBottom = '16px';
    canvas.style.border = '1px solid var(--ui-page-border, rgba(255, 255, 255, 0.1))';
    canvas.style.boxShadow = 'var(--ui-page-shadow, 0 10px 30px -5px rgba(0, 0, 0, 0.3))';
    canvas.style.borderRadius = '8px';
  }
}

function computeSafeViewport(page: any, containerWidth: number, zoomLevel: number) {
  const unscaled = page.getViewport({ scale: 1 });
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const rawScale = (containerWidth / Math.max(1, unscaled.width)) * dpr * Math.max(1, zoomLevel);
  const maxDim = Math.max(unscaled.width * rawScale, unscaled.height * rawScale);
  const clampedScale = maxDim > MAX_CANVAS_SIDE_PX ? rawScale * (MAX_CANVAS_SIDE_PX / maxDim) : rawScale;
  return page.getViewport({ scale: Math.max(0.5, clampedScale) });
}

function sanitizeImageFieldsInData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const cloned = { ...data };
  if (cloned.cover && typeof cloned.cover === 'object') {
    cloned.cover = { ...cloned.cover, qrCodeUrl: undefined };
  }
  if (Array.isArray(cloned.sections)) {
    cloned.sections = cloned.sections.map((sec: any) =>
      sec && Array.isArray(sec.records)
        ? {
            ...sec,
            records: sec.records.map((rec: any) =>
              rec && typeof rec === 'object'
                ? { ...rec, imagePath: undefined, secondaryImagePath: undefined, qrCode: undefined }
                : rec,
            ),
          }
        : sec,
    );
  }
  return cloned;
}

function stripPdfImagesFromElement(node: React.ReactNode): React.ReactNode {
  if (
    node === null ||
    node === undefined ||
    typeof node === 'boolean' ||
    typeof node === 'string' ||
    typeof node === 'number'
  ) {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((child) => stripPdfImagesFromElement(child));
  }
  if (!React.isValidElement(node)) return node;

  const props: any = node.props || {};
  const typeName =
    typeof node.type === 'string'
      ? node.type
      : (node.type as any)?.displayName || (node.type as any)?.name || '';
  if (
    node.type === PdfImage ||
    typeName === 'IMAGE' ||
    (typeof props.src === 'string' && /^(?:data:image\/|https?:\/\/|\/)/i.test(props.src))
  ) {
    return null;
  }

  const nextProps: Record<string, any> = {};
  let changed = false;
  if (props.data && typeof props.data === 'object') {
    nextProps.data = sanitizeImageFieldsInData(props.data);
    changed = true;
  }
  if (props.children !== undefined) {
    nextProps.children = stripPdfImagesFromElement(props.children);
    changed = true;
  }
  return changed ? React.cloneElement(node as React.ReactElement<any>, nextProps) : node;
}

/**
 * Visor universal del motor PDF en `<canvas>`.
 * Incluye guardia contra contenedores ocultos (`clientWidth === 0` en móvil), liberación explícita
 * de memoria `pdf.js` / GPU y virtualización automática para documentos extensos (> 12 páginas).
 */
export function VectorDocViewer({
  document,
  zoomLevel = 1,
  activeTab,
  sections = [],
  preset,
  layoutOverrides,
  onDocumentTextScanned,
}: VectorDocViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleWidthTick, setVisibleWidthTick] = useState(0);
  const lastKnownVisibleRef = useRef<boolean>(false);
  const renderTokenRef = useRef(0);
  const activeCleanupRef = useRef<(() => void) | null>(null);
  const anchorMapRef = useRef<
    Record<
      string,
      {
        startPage: number;
        startXRatio: number;
        startYRatio: number;
        endPage: number;
        endXRatio: number;
        endYRatio: number;
      }
    >
  >({});
  const pendingScrollTabRef = useRef<string | undefined>(activeTab);
  const pendingExplicitScrollRef = useRef(false);
  const onDocumentTextScannedRef = useRef(onDocumentTextScanned);

  useEffect(() => {
    onDocumentTextScannedRef.current = onDocumentTextScanned;
  }, [onDocumentTextScanned]);

  // Detecta cuando el contenedor pasa de oculto (0px, ej. móvil con panel abierto) a visible (>0px)
  // sin caer jamás en un bucle de requestAnimationFrame ni compilar el PDF en vano.
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const el = containerRef.current;
    const parent = wrapperRef.current?.parentElement;
    if (!el && !parent) return;

    const checkVisibility = () => {
      const w = containerRef.current?.clientWidth || 0;
      const isNowVisible = w > 0;
      if (isNowVisible && !lastKnownVisibleRef.current) {
        lastKnownVisibleRef.current = true;
        setVisibleWidthTick((n) => n + 1);
      } else if (!isNowVisible) {
        lastKnownVisibleRef.current = false;
      }
    };

    checkVisibility();
    const observer = new ResizeObserver(checkVisibility);
    if (el) observer.observe(el);
    if (parent) observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      activeCleanupRef.current?.();
      activeCleanupRef.current = null;
      releaseContainerCanvases(containerRef.current);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const initialWidth = container?.clientWidth || 0;
    if (!container || initialWidth <= 0) {
      // Contenedor oculto (p. ej. móvil con panel editor abierto): esperar a ResizeObserver sin gastar CPU/RAM.
      lastKnownVisibleRef.current = false;
      markRenderAsCompleted();
      return;
    }
    lastKnownVisibleRef.current = true;

    const myToken = ++renderTokenRef.current;
    let cancelled = false;
    let localLoadingTask: any = null;
    let localPdfDoc: any = null;
    let virtualObserver: IntersectionObserver | null = null;
    let handedOffToVirtual = false;

    const destroyPdfResources = () => {
      if (virtualObserver) {
        virtualObserver.disconnect();
        virtualObserver = null;
      }
      if (localPdfDoc) {
        try {
          void localPdfDoc.destroy?.();
        } catch {}
        localPdfDoc = null;
      }
      if (localLoadingTask) {
        try {
          void localLoadingTask.destroy?.();
        } catch {}
        localLoadingTask = null;
      }
    };

    async function renderPdf() {
      const scrollElem = wrapperRef.current?.parentElement || wrapperRef.current || containerRef.current;
      const prevScrollTop = scrollElem?.scrollTop || 0;
      const prevScrollHeight = scrollElem?.scrollHeight || 1;
      const relativeScrollRatio =
        prevScrollTop > 0 && prevScrollHeight > 0 ? prevScrollTop / prevScrollHeight : 0;

      setLoading(true);
      setError(null);
      try {
        initPdfFonts();
        let blob: Blob;
        try {
          blob = await pdf(document).toBlob();
        } catch (pdfErr) {
          const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
          if (/DataView|fontkit|Offset is outside|Invalid JPEG|SOI not found|Font family|Could not resolve font/i.test(msg)) {
            resetBrokenDynamicFonts();
            try {
              blob = await pdf(document).toBlob();
            } catch (retryErr) {
              const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
              if (/DataView|Offset is outside|Invalid JPEG|SOI not found|Unknown image format/i.test(retryMsg)) {
                const safeDoc = stripPdfImagesFromElement(document) as React.ReactElement;
                blob = await pdf(safeDoc).toBlob();
              } else {
                throw retryErr;
              }
            }
          } else {
            throw pdfErr;
          }
        }
        if (cancelled || renderTokenRef.current !== myToken) return;

        const arrayBuffer = await blob.arrayBuffer();
        if (cancelled || renderTokenRef.current !== myToken) return;

        localLoadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        localPdfDoc = await localLoadingTask.promise;
        if (cancelled || renderTokenRef.current !== myToken) {
          destroyPdfResources();
          return;
        }

        const liveContainer = containerRef.current;
        const containerWidth = liveContainer?.clientWidth || 0;
        if (!liveContainer || containerWidth <= 0) {
          destroyPdfResources();
          markRenderAsCompleted();
          return;
        }

        const totalPages = localPdfDoc.numPages;
        const useVirtual =
          totalPages > VIRTUALIZE_PAGES_THRESHOLD && typeof IntersectionObserver !== 'undefined';

        const newAnchorMap: Record<
          string,
          {
            startPage: number;
            startXRatio: number;
            startYRatio: number;
            endPage: number;
            endXRatio: number;
            endYRatio: number;
          }
        > = {};
        const scannedPageTexts: Record<number, string> = {};
        const pageDims: Record<number, { widthPt: number; heightPt: number }> = {};

        // 1. Extraer dimensiones, marcadores espaciales e índice de todas las páginas (liviano en RAM)
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          if (cancelled || renderTokenRef.current !== myToken) {
            destroyPdfResources();
            return;
          }
          const page = await localPdfDoc.getPage(pageNum);
          const unscaledViewport = page.getViewport({ scale: 1 });
          const pageWidthPt = unscaledViewport.width;
          const pageHeightPt = unscaledViewport.height;
          pageDims[pageNum] = { widthPt: pageWidthPt, heightPt: pageHeightPt };

          try {
            const textContent = await page.getTextContent();
            const pageTextParts: string[] = [];
            for (const item of textContent.items as any[]) {
              if (typeof item.str === 'string') {
                pageTextParts.push(item.str);
              }
              if (typeof item.str === 'string' && item.str.includes('ANCHOR_')) {
                const str = item.str.trim();
                const xPdf = Array.isArray(item.transform) ? item.transform[4] : 0;
                const yPdf = Array.isArray(item.transform) ? item.transform[5] : 0;

                const xRatio = Math.min(0.98, Math.max(0, xPdf / pageWidthPt));
                const yFromTopPt = Math.max(0, pageHeightPt - yPdf);
                const yRatio = Math.min(0.98, Math.max(0, yFromTopPt / pageHeightPt));

                if (str.startsWith('ANCHOR_START:')) {
                  const secId = str.replace('ANCHOR_START:', '').trim();
                  if (!newAnchorMap[secId]) {
                    newAnchorMap[secId] = {
                      startPage: pageNum,
                      startXRatio: xRatio,
                      startYRatio: yRatio,
                      endPage: pageNum,
                      endXRatio: xRatio,
                      endYRatio: yRatio,
                    };
                  } else {
                    newAnchorMap[secId].startPage = pageNum;
                    newAnchorMap[secId].startXRatio = xRatio;
                    newAnchorMap[secId].startYRatio = yRatio;
                  }
                } else if (str.startsWith('ANCHOR_END:')) {
                  const secId = str.replace('ANCHOR_END:', '').trim();
                  if (!newAnchorMap[secId]) {
                    newAnchorMap[secId] = {
                      startPage: pageNum,
                      startXRatio: xRatio,
                      startYRatio: yRatio,
                      endPage: pageNum,
                      endXRatio: xRatio,
                      endYRatio: yRatio,
                    };
                  } else {
                    newAnchorMap[secId].endPage = pageNum;
                    newAnchorMap[secId].endXRatio = xRatio;
                    newAnchorMap[secId].endYRatio = yRatio;
                  }
                }
              }
            }
            scannedPageTexts[pageNum] = pageTextParts.join(' ');
          } catch {
            // Si falla la extracción de texto en una página, continúa al fallback heurístico
          }

          try {
            page.cleanup?.();
          } catch {}

          if (pageNum % 12 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        if (cancelled || renderTokenRef.current !== myToken) {
          destroyPdfResources();
          return;
        }

        const fragment = window.document.createDocumentFragment();

        if (!useVirtual) {
          // Modo directo (1..12 páginas): rasteriza todas y destruye pdfDoc de inmediato
          for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            if (cancelled || renderTokenRef.current !== myToken) {
              releaseContainerCanvases(fragment as unknown as HTMLElement);
              destroyPdfResources();
              return;
            }
            const page = await localPdfDoc.getPage(pageNum);
            const viewport = computeSafeViewport(page, containerWidth, zoomLevel);
            const canvas = window.document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            styleRenderedCanvas(canvas, pageNum, false);

            const ctx = canvas.getContext('2d');
            if (ctx) {
              fragment.appendChild(canvas);
              await page.render({ canvasContext: ctx, viewport }).promise;
            }
            try {
              page.cleanup?.();
            } catch {}
          }
        } else {
          // Modo virtualizado (> 12 páginas): mantiene slots de alto exacto y limita canvases activos en RAM/GPU
          handedOffToVirtual = true;
          const activeDoc = localPdfDoc;
          const slotsByPage = new Map<number, HTMLDivElement>();
          const renderedPages = new Map<number, HTMLCanvasElement>();
          const renderingPages = new Set<number>();

          const evictDistantIfNeeded = (centerPage: number) => {
            if (renderedPages.size <= MAX_ACTIVE_VIRTUAL_CANVASES) return;
            const entries = Array.from(renderedPages.keys()).sort(
              (a, b) => Math.abs(b - centerPage) - Math.abs(a - centerPage),
            );
            while (renderedPages.size > MAX_ACTIVE_VIRTUAL_CANVASES && entries.length > 0) {
              const victim = entries.shift()!;
              const canvas = renderedPages.get(victim);
              if (canvas) {
                canvas.width = 0;
                canvas.height = 0;
                canvas.remove();
                renderedPages.delete(victim);
              }
            }
          };

          const renderSlotPage = async (pageNum: number) => {
            if (cancelled || renderTokenRef.current !== myToken || !activeDoc) return;
            if (renderedPages.has(pageNum) || renderingPages.has(pageNum)) return;
            const slot = slotsByPage.get(pageNum);
            if (!slot) return;
            renderingPages.add(pageNum);
            try {
              const page = await activeDoc.getPage(pageNum);
              if (cancelled || renderTokenRef.current !== myToken) return;
              const widthNow = liveContainer.clientWidth || containerWidth;
              const viewport = computeSafeViewport(page, widthNow, zoomLevel);
              const canvas = window.document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              styleRenderedCanvas(canvas, pageNum, true);
              const ctx = canvas.getContext('2d');
              if (ctx) {
                await page.render({ canvasContext: ctx, viewport }).promise;
                if (!cancelled && renderTokenRef.current === myToken) {
                  slot.innerHTML = '';
                  slot.appendChild(canvas);
                  renderedPages.set(pageNum, canvas);
                  evictDistantIfNeeded(pageNum);
                } else {
                  canvas.width = 0;
                  canvas.height = 0;
                }
              }
              try {
                page.cleanup?.();
              } catch {}
            } catch {
              // Ignorar cancelación de página individual durante scroll rápido
            } finally {
              renderingPages.delete(pageNum);
            }
          };

          for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const dims = pageDims[pageNum] || { widthPt: 595.28, heightPt: 841.89 };
            const slot = window.document.createElement('div');
            slot.setAttribute('data-page-number', String(pageNum));
            slot.style.width = '100%';
            slot.style.aspectRatio = `${dims.widthPt} / ${dims.heightPt}`;
            slot.style.marginBottom = '16px';
            slot.style.border = '1px solid var(--ui-page-border, rgba(255, 255, 255, 0.1))';
            slot.style.boxShadow = 'var(--ui-page-shadow, 0 10px 30px -5px rgba(0, 0, 0, 0.3))';
            slot.style.borderRadius = '8px';
            slot.style.backgroundColor = '#FFFFFF';
            slot.style.overflow = 'hidden';
            slotsByPage.set(pageNum, slot);
            fragment.appendChild(slot);
          }

          const targetKey = pendingScrollTabRef.current || activeTab;
          const targetAnchorPage = (targetKey && newAnchorMap[targetKey]?.startPage) || 1;
          const initialPages = new Set<number>([1, 2, 3, targetAnchorPage, targetAnchorPage + 1]);
          for (const p of initialPages) {
            if (p >= 1 && p <= totalPages) {
              await renderSlotPage(p);
            }
          }

          const scrollRoot = liveContainer.closest('#preview-viewport-container') as Element | null;
          virtualObserver = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) {
                  const p = Number((entry.target as HTMLElement).getAttribute('data-page-number'));
                  if (p >= 1 && p <= totalPages) {
                    void renderSlotPage(p);
                  }
                }
              }
            },
            { root: scrollRoot || null, rootMargin: '900px 0px' },
          );
          slotsByPage.forEach((slot) => virtualObserver?.observe(slot));
        }

        if (!cancelled && renderTokenRef.current === myToken) {
          // Liberar recursos del render anterior ANTES de adjuntar el nuevo DOM
          activeCleanupRef.current?.();
          releaseContainerCanvases(liveContainer);
          liveContainer.innerHTML = '';
          liveContainer.appendChild(fragment);

          if (handedOffToVirtual) {
            activeCleanupRef.current = destroyPdfResources;
          } else {
            activeCleanupRef.current = null;
            destroyPdfResources();
          }

          anchorMapRef.current = newAnchorMap;
          setLoading(false);
          onDocumentTextScannedRef.current?.(scannedPageTexts);

          requestAnimationFrame(() => {
            markRenderAsCompleted();

            const targetContainer =
              wrapperRef.current?.parentElement || wrapperRef.current || containerRef.current;
            const forcePostRender = pendingExplicitScrollRef.current;
            pendingExplicitScrollRef.current = false;
            if (!forcePostRender && relativeScrollRatio > 0 && targetContainer) {
              targetContainer.scrollTop = Math.round(relativeScrollRatio * targetContainer.scrollHeight);
            }
            const finalTarget = pendingScrollTabRef.current || activeTab;
            if (finalTarget && (forcePostRender || relativeScrollRatio === 0) && preset) {
              scrollToPdfAnchor(
                targetContainer,
                finalTarget,
                sections,
                preset,
                layoutOverrides,
                anchorMapRef.current,
              );
            }
          });
        } else {
          destroyPdfResources();
        }
      } catch (err) {
        destroyPdfResources();
        console.error('Error renderizando el PDF vectorial:', err);
        const detail = err instanceof Error ? err.message : String(err);
        if (!cancelled && renderTokenRef.current === myToken) {
          setError(detail);
          setLoading(false);
        }
        markRenderAsCompleted();
      }
    }

    void renderPdf();
    return () => {
      cancelled = true;
      if (!handedOffToVirtual) {
        destroyPdfResources();
      }
    };
  }, [document, zoomLevel, visibleWidthTick]);

  // Reacciona ante el cambio de activeTab ejecutando scroll suave en el contenedor
  useEffect(() => {
    pendingScrollTabRef.current = activeTab;
    if (!loading && activeTab && containerRef.current && preset) {
      scrollToPdfAnchor(
        wrapperRef.current || containerRef.current,
        activeTab,
        sections,
        preset,
        layoutOverrides,
        anchorMapRef.current,
      );
    }
  }, [activeTab, loading, sections, preset, layoutOverrides]);

  // Escuchar eventos globales pdf-anchor-scroll (disparados al presionar botones de muelle/panel incluso si activeTab no varió)
  useEffect(() => {
    const handleAnchorEvent = (e: Event) => {
      const customEvt = e as CustomEvent;
      const targetTab = customEvt.detail?.tabId || activeTab;
      pendingScrollTabRef.current = targetTab;
      if (customEvt.detail?.forcePostRender) {
        pendingExplicitScrollRef.current = true;
      }
      if (!loading && targetTab && (wrapperRef.current || containerRef.current) && preset) {
        scrollToPdfAnchor(
          wrapperRef.current || containerRef.current,
          targetTab,
          sections,
          preset,
          layoutOverrides,
          anchorMapRef.current,
        );
      }
    };

    window.addEventListener('pdf-anchor-scroll', handleAnchorEvent);
    return () => window.removeEventListener('pdf-anchor-scroll', handleAnchorEvent);
  }, [loading, activeTab, sections, preset, layoutOverrides]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', overflowX: 'hidden' }}>
      {loading && (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            color: colorSystem.neutral.textSecondary,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Preparando la vista previa…
        </div>
      )}
      {error && (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: colorSystem.status.danger.base,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          No se pudo renderizar la vista previa: {error}
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', padding: '0 4px' }} />
    </div>
  );
}
