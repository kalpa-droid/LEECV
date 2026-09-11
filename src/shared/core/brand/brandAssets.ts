export type LogoVariant = 'degradado' | 'negro' | 'blanco' | 'violeta';

export type LogoLayout = 
  | 'master'
  | 'horizontal'
  | 'isotipo'
  | 'texto'
  | 'slogan'
  | 'submarca_curriculo';

/**
 * Relación de aspecto real (ancho/alto) de cada layout, tomada del viewBox de sus SVG.
 * Necesaria porque el modo `animatedRainbow` de Logo.tsx renderiza un <div> vacío enmascarado
 * (no un <img>), que no tiene contenido propio para derivar su ancho — sin esto, cualquier
 * className que solo defina alto (ej. "h-9 sm:h-10", sin ancho) colapsa a 0px de ancho y el
 * logo queda invisible aunque la máscara y el color sean correctos.
 */
export const LOGO_ASPECT_RATIO: Record<LogoLayout, number> = {
  master: 267.95099 / 100,
  horizontal: 316.237 / 100,
  isotipo: 100 / 97.873001,
  texto: 229.869 / 100,
  slogan: 171.173 / 100,
  submarca_curriculo: 737.713 / 100,
};

/**
 * Mapeo de tema de interfaz (UI Theme) a la variante cromática de logo correspondiente.
 * Previene problemas de contraste sin importar qué tema elija el usuario.
 */
export const THEME_TO_LOGO_VARIANT: Record<string, LogoVariant> = {
  day: 'negro',
  default: 'negro',
  dark: 'blanco',
  night: 'blanco',
  teal_ocean: 'blanco',
  ink: 'blanco',
};

/**
 * Registro único de rutas de activos de marca.
 */
export const BRAND_ASSETS: Record<LogoLayout, Record<LogoVariant, string>> = {
  master: {
    degradado: '/brand/lee-master-degradado.svg',
    negro:     '/brand/lee-master-negro.svg',
    blanco:    '/brand/lee-master-blanco.svg',
    violeta:   '/brand/lee-master-violeta.svg',
  },
  horizontal: {
    degradado: '/brand/lee-navbar-horizontal-degradado.svg',
    negro:     '/brand/lee-navbar-horizontal-negro.svg',
    blanco:    '/brand/lee-navbar-horizontal-blanco.svg',
    violeta:   '/brand/lee-navbar-horizontal-violeta.svg',
  },
  isotipo: {
    degradado: '/brand/lee-isotipo-degradado.svg',
    negro:     '/brand/lee-isotipo-negro.svg',
    blanco:    '/brand/lee-isotipo-blanco.svg',
    violeta:   '/brand/lee-isotipo-violeta.svg',
  },
  texto: {
    degradado: '/brand/lee-texto-degradado.svg',
    negro:     '/brand/lee-texto-negro.svg',
    blanco:    '/brand/lee-texto-blanco.svg',
    violeta:   '/brand/lee-texto-violeta.svg',
  },
  slogan: {
    degradado: '/brand/lee-slogan-degradado.svg',
    negro:     '/brand/lee-slogan-negro.svg',
    blanco:    '/brand/lee-slogan-blanco.svg',
    violeta:   '/brand/lee-slogan-violeta.svg',
  },
  submarca_curriculo: {
    degradado: '/brand/lee-submarca-curriculo-degradado.svg',
    negro:     '/brand/lee-submarca-curriculo-negro.svg',
    blanco:    '/brand/lee-submarca-curriculo-blanco.svg',
    violeta:   '/brand/lee-submarca-curriculo-violeta.svg',
  },
};
