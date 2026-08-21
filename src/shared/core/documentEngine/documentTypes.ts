// src/shared/core/documentEngine/documentTypes.ts
//
// Un "tipo de documento" es simplemente: un id, un nombre, y una LISTA de
// capacidades que usa. Agregar un tipo nuevo = agregar una entrada acá.
// Apagar una función de un tipo = sacarla de su array `capabilities`.
// Nunca hay que tocar el código de otro tipo, ni el de las capacidades.

import { CapabilityId } from './capabilities';

export interface DocumentTypeDefinition {
  id: string;
  label: string;
  capabilities: CapabilityId[];
  // Layouts/plantillas visuales propias de este tipo (el "layoutStyle" de
  // hoy en el CV) — cada tipo tiene su propio set, no se mezclan.
  availableLayoutStyles: string[];
}

export const DOCUMENT_TYPE_REGISTRY: Record<string, DocumentTypeDefinition> = {
  cv: {
    id: 'cv',
    label: 'Currículum',
    capabilities: [
      'theme_color',
      'typography',
      'paper_size',
      'section_order',
      'multi_page_pagination',
      'certificates',
    ],
    availableLayoutStyles: ['executive-sidebar', 'classic-centered', 'modern-split'],
  },
  business_card: {
    id: 'business_card',
    label: 'Tarjeta Personal',
    capabilities: [
      'theme_color',   // ← misma implementación que usa el CV, cero código nuevo
      'typography',    // ← ídem
      'qr_code',
      'logo_upload',
      // Nota lo que NO está: paper_size, section_order,
      // multi_page_pagination, certificates. Una tarjeta no pagina ni
      // tiene certificados — simplemente no se declaran, y por lo tanto
      // ni el panel ni el motor de esas capacidades se cargan para este tipo.
    ],
    availableLayoutStyles: ['card-horizontal', 'card-vertical-qr'],
  },
};

/** Devuelve true si el tipo de documento activo tiene una capacidad dada. */
export function hasCapability(docTypeId: string, capability: CapabilityId): boolean {
  return DOCUMENT_TYPE_REGISTRY[docTypeId]?.capabilities.includes(capability) ?? false;
}
