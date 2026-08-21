// src/shared/core/documentEngine/coreActions.ts
//
// Guardar, Abrir y Exportar NO son capacidades opcionales por tipo de
// documento — son universales, todo documento las tiene. Por eso no viven
// en `capabilities[]` de cada tipo (eso es para lo que SÍ varía: QR, color,
// certificados). Viven acá, una sola vez, y se aplican a cualquier
// documentTypeId sin volver a escribir la lógica.
//
// Lo único que cambia según el usuario no es el tipo de documento — es su
// PLAN. Por eso el gate de plan (usePdfExportGate) es completamente
// independiente de qué tipo de documento se está exportando: un CV y una
// tarjeta personal consumen el mismo crédito, respetan el mismo plan.

import { usePdfExportGate } from '../entitlements/usePdfExportGate';
import { saveDocument, loadDocument } from './documentStorageService';

export interface CoreDocumentActions {
  save: (documentTypeId: string, data: unknown) => Promise<{ success: boolean }>;
  open: (documentId: string) => Promise<unknown>;
  requestExport: () => { allowed: boolean; reason: string | null };
  consumeExportCredit: () => Promise<boolean>;
}

/**
 * Hook único para las 3 acciones núcleo. Se usa igual sin importar si el
 * documento activo es un CV, una tarjeta personal, o lo que se agregue
 * después — el tipo de documento es solo un parámetro, nunca cambia la
 * lógica de guardado/apertura/exportación en sí.
 */
export function useCoreDocumentActions(): CoreDocumentActions {
  const { canExport, reason, consumeCreditIfNeeded } = usePdfExportGate();

  return {
    // Guardar y Abrir son GRATIS para todos los planes (incluido anónimo,
    // local) — es la exportación la que está sujeta a plan, según el
    // modelo de negocio ya definido. No hay gate acá adentro.
    save: (documentTypeId, data) => saveDocument(data, documentTypeId),
    open: (documentId) => loadDocument(documentId),

    // Exportar SÍ está sujeto al plan — mismo gate para cualquier tipo de
    // documento, no hay una versión del gate "para CV" y otra "para tarjeta".
    requestExport: () => ({ allowed: canExport, reason }),
    consumeExportCredit: () => consumeCreditIfNeeded(),
  };
}
