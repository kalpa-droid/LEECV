/**
 * CAPA 6 — SANGRADO (BLEED)
 * Depende SOLO de la Capa 0 (PageSize). Un objeto con fondo o imagen que debe
 * llegar hasta el borde físico de la tarjeta necesita "pasarse" unos mm del
 * borde real, porque ninguna guillotina corta con precisión de 0mm.
 *
 * Estándar de imprenta (no inventado acá): 3mm de sangrado, 5mm de "zona seca"
 * (safe zone) donde no debe haber texto ni logos, para absorber el margen de
 * error del corte.
 */

export interface BleedSpec {
  /** mm que se agrega por fuera del borde de corte real, en los 4 lados */
  bleedMm: number;
  /** mm de margen de seguridad hacia ADENTRO del borde de corte, donde no debe haber texto */
  safeZoneMm: number;
}

export const BLEED_PRESETS: Record<string, BleedSpec> = {
  ninguno: { bleedMm: 0, safeZoneMm: 0 },
  // Estándar de imprenta para tarjetas personales y folletería.
  estandar_tarjeta: { bleedMm: 3, safeZoneMm: 5 },
};

export interface TrimSize {
  /** Tamaño de CORTE real (lo que el cliente pidió, ej. 89x51mm) */
  trimWidthMm: number;
  trimHeightMm: number;
}

export interface BleedBox {
  trim: TrimSize;
  /** Tamaño con sangrado incluido — esto es lo que realmente se dibuja/imprime */
  bleedWidthMm: number;
  bleedHeightMm: number;
  /** Offset del borde de corte respecto a la esquina superior izquierda del bleed box */
  trimOffsetMm: { x: number; y: number };
  /** Rectángulo de zona segura para texto, relativo a la esquina del bleed box */
  safeZone: { x: number; y: number; widthMm: number; heightMm: number };
}

/** Capa 0 (tamaño de corte) + Capa 6 (spec de sangrado) → caja física a imprimir */
export function resolveBleedBox(trim: TrimSize, spec: BleedSpec): BleedBox {
  const bleedWidthMm = trim.trimWidthMm + spec.bleedMm * 2;
  const bleedHeightMm = trim.trimHeightMm + spec.bleedMm * 2;

  return {
    trim,
    bleedWidthMm,
    bleedHeightMm,
    trimOffsetMm: { x: spec.bleedMm, y: spec.bleedMm },
    safeZone: {
      x: spec.bleedMm + spec.safeZoneMm,
      y: spec.bleedMm + spec.safeZoneMm,
      widthMm: trim.trimWidthMm - spec.safeZoneMm * 2,
      heightMm: trim.trimHeightMm - spec.safeZoneMm * 2
    }
  };
}
