import React from 'react';

interface VintageQuillLoaderProps {
  size?: number;
  className?: string;
}

/**
 * VintageQuillLoader - Pluma Antigua / Lápiz Rotatorio de Alta Caligrafía
 *
 * Renderiza una pluma clásica de tintero con plumín de oro/acero, trazo de caligrafía
 * y un anillo rotatorio de tintero en movimiento continuo.
 */
export const VintageQuillLoader: React.FC<VintageQuillLoaderProps> = ({
  size = 56,
  className = ''
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Anillo de Tintero Exterior Giratorio */}
      <div 
        className="absolute rounded-full border-2 border-dashed border-[var(--color-secondary-bright)] opacity-40 animate-spin"
        style={{ width: size + 16, height: size + 16, animationDuration: '3s' }}
      />
      
      {/* Anillo de Resplandor Interior Counter-Rotating */}
      <div 
        className="absolute rounded-full border border-[var(--color-accent-base)] opacity-60 animate-spin"
        style={{ width: size + 6, height: size + 6, animationDuration: '2s', animationDirection: 'reverse' }}
      />

      {/* Pluma Antigua Vectorial con oscilación suave de escritura */}
      <div className="relative animate-quill-write z-10" style={{ width: size, height: size }}>
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 64 64" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <g filter="url(#quillGlow)">
            {/* Cuerpo de la Pluma Antigua (Feather Vane) */}
            <path
              d="M56 6C42 8 28 20 20 34C18 37.5 16.5 41 15 45L22 47C25 43 28 38 32 32C44 20 54 12 56 6Z"
              fill="url(#quillGradient)"
            />

            {/* Raquis / Eje Central de la Pluma */}
            <path
              d="M58 4C44 12 26 28 14 48L11 53L16 52C28 40 44 20 58 4Z"
              fill="var(--color-secondary-bright)"
            />

            {/* Plumín Metálico de Caligrafía (Nib) */}
            <path
              d="M14 48L7 58L17 53L14 48Z"
              fill="var(--color-accent-base)"
              stroke="var(--color-accent-on-base)"
              strokeWidth="0.8"
            />

            {/* Ranura del Plumín */}
            <line
              x1="7"
              y1="58"
              x2="12.5"
              y2="50.5"
              stroke="var(--ui-bg-header)"
              strokeWidth="0.8"
              strokeLinecap="round"
            />

            {/* Gota de Tinta Ejecutiva */}
            <circle
              cx="6"
              cy="60"
              r="2.5"
              fill="var(--color-secondary-bright)"
              className="animate-ping"
              style={{ animationDuration: '1.8s' }}
            />

            {/* Trazo Curvo de Tinta en Papel */}
            <path
              d="M4 62C12 60 20 63 28 59"
              stroke="var(--color-secondary-bright)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="2 3"
            />
          </g>

          <defs>
            <linearGradient id="quillGradient" x1="56" y1="6" x2="15" y2="45" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--color-secondary-bright)" />
              <stop offset="0.6" stopColor="var(--color-accent-base)" />
              <stop offset="1" stopColor="var(--color-secondary-base)" />
            </linearGradient>
            <filter id="quillGlow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="var(--color-secondary-bright)" floodOpacity="0.4" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
};
