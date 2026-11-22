import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

const FILLER_WORDS = [
  'proactivo',
  'orientado a resultados',
  'dinámico',
  'perfeccionista',
  'bajo presión',
  'alta motivación',
  'altamente motivado',
  'excelentes habilidades de comunicación',
  'team player',
  'jugador de equipo',
  'sinergia',
  'fuera de la caja',
  'altamente cualificado',
  'detallista',
  'apasionado'
];

interface FillerWordDetectorProps {
  text: string;
}

export function FillerWordDetector({ text }: FillerWordDetectorProps) {
  const detectedClichs = useMemo(() => {
    if (!text) return [];
    const lowerText = text.toLowerCase();
    return FILLER_WORDS.filter(word => lowerText.includes(word));
  }, [text]);

  if (detectedClichs.length === 0) return null;

  return (
    <div className="mt-2 p-2 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/40 rounded-md flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-[var(--color-status-warning-text)] shrink-0 mt-0.5" />
      <div className="text-[11px] text-[var(--color-status-warning-text)] leading-snug">
        <strong>Clichés detectados:</strong> {detectedClichs.join(', ')}.<br/>
        <em>Los reclutadores prefieren ver logros concretos antes que adjetivos genéricos. Intenta reemplazarlos por ejemplos reales.</em>
      </div>
    </div>
  );
}
