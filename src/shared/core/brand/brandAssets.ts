export type LogoVariant = 'degradado' | 'negro' | 'blanco' | 'violeta';

export type LogoLayout = 
  | 'master'
  | 'horizontal'
  | 'isotipo'
  | 'texto'
  | 'slogan'
  | 'submarca_curriculo';

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
