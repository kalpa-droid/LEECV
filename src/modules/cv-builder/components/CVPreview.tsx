import React, { useState, useEffect, useMemo, useRef } from 'react';
// ⚠️ NO envolver estos dos imports en React.lazy()/Suspense. @react-pdf/renderer usa su
// propio reconciler para pdf(document).toBlob() (ver VectorDocViewer.tsx) y no soporta
// React.lazy/Suspense — produce "Cannot read properties of null (reading 'props')".
// Esto ya se revirtió una vez (PR fix/vector-doc-viewer-lazy-suspense) y volvió a
// reintroducirse por accidente en un merge posterior (PR #5, "restaurar lazy-loading").
// Ver el test de regresión: tests/cvPreviewNoLazyReactPdf.test.ts — si falla, es esto.
import { TemplateRenderer } from '../../../shared/core/pdf-engine/renderer/TemplateRenderer';
import { CardSheetDocument } from '../../../shared/core/pdf-engine/renderer/CardSheetDocument';
import { CoverLetterPdfDocument } from '../../../shared/core/pdf-engine/renderer/CoverLetterPdfDocument';
import { getPreset, resolveActivePreset, subscribeToPresetChanges, getPresetsSnapshot } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { cvDataToContentSections } from '../../../shared/core/pdf-engine/layers/records/cvDataAdapter';
import { buildCardDataFromCV, BusinessCardData } from '../../../shared/core/pdf-engine/layers/records/cardDataAdapter';
import { VectorDocViewer } from '../../../shared/core/pdf-engine/VectorDocViewer';
import { ErrorBoundary } from '../../../shared/core/ui/ErrorBoundary';
import { usePresetTransition } from '../../../shared/core/pdf-engine/layers/presets/presetTransitionEngine';
import { PresetTransitionOverlay } from '../../../shared/core/ui/PresetTransitionOverlay';
import { elevationSystem } from '../../../shared/core/uiDesignSystem';
import { resolveDocumentCanvasPx } from '../../../shared/core/pdf-engine/layers/page/pageSizes';

export interface CVPreviewProps {
  cvData?: any;
  setCvData?: any;
  activeTab?: string;
  zoomLevel?: number;
  onZoomChange?: (action: number | ((prev: number) => number)) => void;
  containerRef?: React.Ref<HTMLDivElement>;
  paperSheetRef?: React.Ref<HTMLDivElement>;
  pageSizeId?: string;
}

export default function CVPreview({ 
  cvData, 
  setCvData: _setCvData, 
  activeTab, 
  zoomLevel = 0.85,
  onZoomChange,
  containerRef: externalContainerRef,
  paperSheetRef: externalPaperSheetRef,
  pageSizeId = 'a4'
}: CVPreviewProps) {
  const fallbackContainerRef = useRef<HTMLDivElement>(null);
  const fallbackPaperSheetRef = useRef<HTMLDivElement>(null);

  const paperSheetRef = (externalPaperSheetRef as React.RefObject<HTMLDivElement | null>) || fallbackPaperSheetRef;

  // Motor de transición de presets con animación de Pluma Antigua / Lápiz Rotatorio
  const transitionState = usePresetTransition(cvData);

  // Suscripción reactiva para re-renderizado automático sin F5 al cambiar plantillas
  const [presetsVersion, setPresetsVersion] = useState<number>(getPresetsSnapshot);
  useEffect(() => {
    return subscribeToPresetChanges(() => {
      setPresetsVersion(getPresetsSnapshot());
    });
  }, []);

  // Debounce de cvData para evitar re-generar el PDF en cada pulsación de tecla
  const [debouncedCvData, setDebouncedCvData] = useState(cvData);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCvData(cvData);
    }, 300);
    return () => clearTimeout(handler);
  }, [cvData]);

  const [cardData, setCardData] = useState<BusinessCardData | null>(null);
  const { theme = {} } = debouncedCvData || {};

  const activePreset = useMemo(
    () => resolveActivePreset(debouncedCvData),
    [
      debouncedCvData?.activePresetId,
      debouncedCvData?.colorPresetId,
      debouncedCvData?.typographyPresetId,
      debouncedCvData?.columnLayoutPresetId
    ]
  );
  const sections = useMemo(() => cvDataToContentSections(debouncedCvData), [debouncedCvData]);

  useEffect(() => {
    buildCardDataFromCV(debouncedCvData).then(setCardData);
  }, [debouncedCvData]);

  const dynamicThemeStyle = useMemo(() => ({
    fontFamily: theme.fontFamily || 'Arial, sans-serif'
  }), [theme.fontFamily]);

  // MOTOR DE ZOOM POR RUEDA (PC) Y GESTOS TÁCTILES (CELULAR)
  useEffect(() => {
    const container = (externalContainerRef as React.RefObject<HTMLDivElement | null>)?.current || paperSheetRef.current;
    if (!container || !onZoomChange) return;

    // 1. ZOOM POR RUEDA DIRECTA (PC): sin apretar tecla Ctrl sobre la hoja
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      const isOverPaper = target && paperSheetRef.current && paperSheetRef.current.contains(target);

      if (isOverPaper) {
        // Intercepta solo el área de la hoja para hacer zoom directo sin alterar el navegador
        e.preventDefault();
        e.stopPropagation();

        const zoomDelta = -e.deltaY * 0.0012;
        onZoomChange((prev: number) => {
          const next = Math.min(Math.max(prev + zoomDelta, 0.35), 2.5);
          return Number(next.toFixed(3));
        });
      }
      // Si el cursor está fuera de la hoja (en márgenes o barra de scroll lateral),
      // el evento no se previene, permitiendo scroll vertical continuo normal.
    };

    // 2. PINCH-TO-ZOOM MULTI-TOUCH (CELULAR): 2 dedos ajustan zoom del visor de forma aislada
    let initialPinchDistance: number | null = null;
    let initialZoomOnPinch = zoomLevel;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialPinchDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        initialZoomOnPinch = zoomLevel;
      } else {
        initialPinchDistance = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance !== null) {
        e.preventDefault(); // Prevenir zoom de toda la interfaz del navegador
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        const ratio = currentDist / initialPinchDistance;

        const newZoom = Math.min(Math.max(initialZoomOnPinch * ratio, 0.3), 2.5);
        onZoomChange(Number(newZoom.toFixed(3)));
      }
      // Con 1 dedo se permite desplazamiento nativo libre en 2D (pan X e Y)
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialPinchDistance = null;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onZoomChange, zoomLevel]);

  const renderedDocument = useMemo(() => {
    if (activePreset.pageCategory === 'tarjeta') {
      return <CardSheetDocument card={cardData} preset={activePreset} />;
    }
    if (activePreset.pageCategory === 'carta') {
      return <CoverLetterPdfDocument data={debouncedCvData} presetId={activePreset.id} theme={debouncedCvData?.theme} />;
    }
    return (
      <TemplateRenderer
        preset={activePreset}
        sections={sections}
        personalInfo={debouncedCvData?.personalInfo || {}}
        activeFormatId={debouncedCvData?.activeFormatId}
        certificatesScanned={debouncedCvData?.certificatesScanned || []}
        showCoverPage={debouncedCvData?.showCoverPage !== false}
        coverStyle={debouncedCvData?.coverStyle}
        coverFeaturedEducationId={debouncedCvData?.coverFeaturedEducationId}
        coverFeaturedProfessionId={debouncedCvData?.coverFeaturedProfessionId}
        roles={debouncedCvData?.roles || []}
        education={debouncedCvData?.education || []}
        professions={debouncedCvData?.professions || []}
        userFontFamily={debouncedCvData?.theme?.fontFamily}
        layoutOverrides={debouncedCvData?.layout}
        customRecordCardDesigns={debouncedCvData?.recordCardDesigns}
        interactiveAnchors={true}
      />
    );
  }, [activePreset, sections, cardData, debouncedCvData]);

  const { widthPx, heightPx } = useMemo(() => resolveDocumentCanvasPx(pageSizeId), [pageSizeId]);

  return (
    <div 
      className="w-full flex flex-col items-center justify-start print-wrapper relative touch-pan-x touch-pan-y"
      style={dynamicThemeStyle}
    >
      {/* Capa de Transición de Preset con Pluma Antigua / Lápiz Rotatorio */}
      <PresetTransitionOverlay 
        isApplying={transitionState.isApplying} 
        presetName={transitionState.presetName}
        presetType={transitionState.presetType}
      />

      {/* Contenedor adaptativo geométricamente proporcional al zoom y centrado sin cortes */}
      <div 
        ref={paperSheetRef}
        className={`my-1 sm:my-5 no-print mx-auto shrink-0 flex justify-center ${elevationSystem.overlay} transition-[width,height] duration-75 ease-out`}
        style={{ 
          width: `${Math.round(widthPx * zoomLevel)}px`,
          minHeight: `${Math.round(heightPx * zoomLevel)}px`,
          maxWidth: 'none'
        }}
      >
        <div 
          className="shrink-0 transition-transform duration-75 ease-out origin-top-left"
          style={{ 
            transform: `scale(${zoomLevel})`,
            width: `${widthPx}px`
          }}
        >
          <ErrorBoundary 
            compact 
            title="Inconveniente en la vista previa" 
            subtitle="Ocurrió un problema al procesar la plantilla del PDF. Tu información guardada no se ve afectada."
          >
            <VectorDocViewer 
              key={`${activePreset.id}_v${presetsVersion}`} 
              document={renderedDocument} 
              zoomLevel={zoomLevel}
              activeTab={activeTab}
              sections={sections}
              preset={activePreset}
              layoutOverrides={debouncedCvData?.layout}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
