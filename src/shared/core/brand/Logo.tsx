import React from 'react';
import { BRAND_ASSETS, THEME_TO_LOGO_VARIANT, LogoLayout, LogoVariant } from './brandAssets';

export interface LogoProps {
  layout?: LogoLayout;
  currentUiTheme?: string;
  forceVariant?: LogoVariant;
  className?: string;
  alt?: string;
}

/**
 * Componente unificado de marca LEECV.
 * Selecciona automáticamente la variante cromática del logo según el tema activo de la UI.
 */
export const Logo: React.FC<LogoProps> = ({
  layout = 'horizontal',
  currentUiTheme = 'day',
  forceVariant,
  className = 'h-7 w-auto',
  alt = 'LEECV'
}) => {
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
