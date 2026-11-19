/**
 * CANONICAL VERSION TRACKER — LEECV Master Plan
 * Regla de gobernanza para todos los agentes (AGENTS.md / Regla 8+):
 *
 * - Pequeños cambios (fixes, ajustes UI mínimos): incrementa PATCH (V2.1 → V2.2)
 * - Cambios medianos (nueva funcionalidad, componente, integración backend): incrementa MINOR (V2.2 → V2.3)
 * - Grandes cambios (cambio de arquitectura, nuevo esquema DB principal, nuevo eje del plan): incrementa MAJOR (V2.x → V3.0)
 *
 * El archivo debe ser actualizado ANTES del commit que aplica el cambio.
 */

export const LEECV_VERSION = {
  major: 2,
  minor: 24,
  patch: 3,
  label: 'V2.24.3',
  lastUpdated: '2026-11-19',
  lastAgent: '@opencode',
  stage: 'fix(export): cierra el bypass de créditos de AppModals (onConfirm=proceedWithExport) y deja un único gate de cobro en el llamador (PdfCheckoutModal.handleConfirmExport ya no consume, elimina el doble cobro en CV, cartas y tarjetas) + handleStartPDFGeneration migrado a withErrorHandling + 20 radios interpolados rounded-[${radius.X}] migrados a style={{ borderRadius: radius.X }} en PdfCheckoutModal, CoverLetterExportModal y CardSheetExportSelector (Regla 2).',
} as const;
