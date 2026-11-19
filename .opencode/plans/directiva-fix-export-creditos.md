# Directiva: Fix Export PDF y Créditos — Fase A

Lee `AGENTS.md` antes de tocar código. Regla 0 (check-all=0), Regla 2 (nunca interpolar JS en clases Tailwind), Regla 6 (rama+PR, nunca push a main).

## Rama: `fix/export-credits-phase-a`

## Paso 1 — E1: Cerrar bypass de créditos en AppModals

**`src/app/AppModals.tsx` línea 250:**
```tsx
// DE:
onConfirm={triggerPdfGeneration}
// A:
onConfirm={proceedWithExport}
```

## Paso 2 — E2: Migrar handleStartPDFGeneration a withErrorHandling

**`src/app/App.tsx` líneas 520-542.** Reescribir así:

```tsx
const handleStartPDFGeneration = async () => {
  setIsGeneratingPDF(true);
  setIsPdfComplete(false);
  setPdfProgress(15);

  const result = await withErrorHandling(
    async () => {
      const { exportDocumentToPDF } = await import('../shared/core/pdf-engine/pdfExporter');
      return exportDocumentToPDF(cvData, resolveActivePreset(cvData));
    },
    {
      context: 'Exportar PDF',
      errorMessage: 'Hubo un inconveniente al generar el PDF. Por favor verifica las imágenes o intenta nuevamente.',
      notify: (msg) => showError(msg)
    }
  );

  setPdfProgress(100);
  if (result.success && result.data) {
    setIsGeneratingPDF(false);
    setIsPdfComplete(true);
  } else {
    setIsGeneratingPDF(false);
  }
};
```

## Paso 3 — E3: Regla 2 — Reemplazar 20 interpolaciones de radius

Valores fijos de `uiDesignSystem.ts`: `radius.modal`=`10px`, `radius.card`=`8px`, `radius.control`=`6px`.

### 3a) `src/modules/cv-builder/components/modals/PdfCheckoutModal.tsx`
Reemplazar TODAS las ocurrencias de:
- `` rounded-[${radius.modal}] `` → `rounded-[10px]`
- `` rounded-[${radius.card}] `` → `rounded-[8px]`
- `` rounded-[${radius.control}] `` → `rounded-[6px]`

### 3b) `src/modules/cover-letter/components/CoverLetterExportModal.tsx`
Mismo reemplazo. También agregar prop `purpose="export"` al `<PdfCheckoutModal` de línea 134.

### 3c) `src/modules/cv-builder/components/CardSheetExportSelector.tsx`
Mismo reemplazo de radius.

## Paso 4 — E7: Comentario documental en CardExportModal

**`src/modules/cv-builder/components/modals/CardExportModal.tsx` línea 19**, agregar antes de la función:
```tsx
/** El consumo de crédito ocurre internamente en CardSheetExportSelector (useExportEntitlement). */
```

## Paso 5 — Bump version

En `src/shared/core/version.ts` incrementar PATCH (ej. V2.24.0 → V2.24.1).

## Paso 6 — Validar

```bash
npm run check-all
```

Tiene que dar 0 errores. Después: `git add -A && git commit` y `git push origin fix/export-credits-phase-a`.
