import React from 'react';
import { BRAND_ASSETS, THEME_TO_LOGO_VARIANT, LogoLayout, LogoVariant } from './brandAssets';

export interface LogoProps {
  layout?: LogoLayout;
  currentUiTheme?: string;
  forceVariant?: LogoVariant;
  animatedRainbow?: boolean;
  className?: string;
  alt?: string;
}

/**
 * Componente unificado de marca LEECV.
 * Selecciona automáticamente la variante cromática del logo según el tema activo de la UI,
 * o aplica una máscara CSS con el degradado animado `.ui-topbar-rainbow` cuando `animatedRainbow` está activo.
 */
export const Logo: React.FC<LogoProps> = ({
  layout = 'horizontal',
  currentUiTheme = 'day',
  forceVariant,
  animatedRainbow = false,
  className = 'h-7 w-auto',
  alt = 'LEECV'
}) => {
  if (animatedRainbow) {
    const maskSrc = BRAND_ASSETS[layout]?.negro || BRAND_ASSETS.horizontal.negro;
    return (
      <div
        role="img"
        aria-label={alt}
        className={`ui-topbar-rainbow inline-block ${className}`}
        style={{
          WebkitMaskImage: `url("${maskSrc}")`,
          maskImage: `url("${maskSrc}")`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
    );
  }

  const variant: LogoVariant = forceVariant ?? THEME_TO_LOGO_VARIANT[currentUiTheme] ?? 'negro';
  const src = BRAND_ASSETS[layout]?.[variant] || BRAND_ASSETS.horizontal.negro;

  return (
    <img
      src={src}
      alt={alt}
      className={`inline-block object-contain transition-opacity duration-200 ${className}`}
    />
  );
};

export default Logo;
