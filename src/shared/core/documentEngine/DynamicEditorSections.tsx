// src/shared/core/documentEngine/DynamicEditorSections.tsx
//
// Reemplaza los "if (documentType === 'cv') { ... } else if (...)" que
// habría que escribir a mano por cada tipo nuevo. Este componente no sabe
// qué es un CV ni qué es una tarjeta — solo sabe recorrer capacidades.
import React from 'react';
import { CAPABILITY_REGISTRY } from './capabilities';
import { DOCUMENT_TYPE_REGISTRY } from './documentTypes';

interface Props {
  documentTypeId: string;
  documentData: Record<string, any>; // documentData[capabilityId] = datos de esa capacidad
  onCapabilityChange: (capabilityId: string, next: any) => void;
}

export function DynamicEditorSections({ documentTypeId, documentData, onCapabilityChange }: Props) {
  const docType = DOCUMENT_TYPE_REGISTRY[documentTypeId];
  if (!docType) return null;

  return (
    <>
      {docType.capabilities.map((capId) => {
        const capability = CAPABILITY_REGISTRY[capId];
        const ConfigPanel = capability.ConfigPanel;
        const data = documentData[capId] ?? capability.defaultData;

        return (
          <section key={capId} aria-label={capability.label}>
            <h3>{capability.label}</h3>
            <ConfigPanel data={data} onChange={(next) => onCapabilityChange(capId, next)} />
          </section>
        );
      })}
    </>
  );
}

// Sumar un tipo de documento nuevo (ej. "carta de presentación") en el
// futuro no requiere tocar este archivo: solo una entrada nueva en
// documentTypes.ts con su lista de capabilities. Este componente ya
// sabe renderizarlo porque nunca conoció los tipos, solo la lista.
