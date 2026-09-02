import React from 'react';
import { CoverOrnamentRenderer } from './CoverOrnamentRenderer';

interface OrnamentRendererProps {
  ornamentKind?: string;
  color?: string;
}

/**
 * DEPRECADO: Los adornos de esquinas en páginas de contenido fueron eliminados.
 * Todos los adornos visuales están centralizados en la Portada de Presentación (Página 1)
 * gobernados por CoverOrnamentRenderer.tsx y coverOrnamentEngine.ts.
 */
export function OrnamentRenderer({ ornamentKind }: OrnamentRendererProps) {
  if (!ornamentKind || ornamentKind === 'none') {
    return null;
  }
  return null;
}
