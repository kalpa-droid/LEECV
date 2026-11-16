/**
 * CANONICAL VERSION TRACKER — LEECV Master Plan
 * Regla de gobernanza para todos los agentes (AGENTS.md / Regla 8+):
 *
 * - Pequeños cambios (fixes, ajustes UI mínimos): incrementa PATCH (V2.1 → V2.2)
 * - Cambios medianos (nueva funcionalidad, componente, integración backend): incrementa MINOR (V2.2 → V2.3)
 * - Grandes cambios (cambio de arquitectura, nuevo esquema DB principal, nuevo eje del plan): incrementa MAJOR (V2.x → V3.0)
 *
 * El archivo debe ser actualizado ANTES del commit que aplica el cambio.
 */

export const LEECV_VERSION = {
  major: 2,
  minor: 17,
  patch: 0,
  label: 'V2.17.0',
  lastUpdated: '2026-11-16',
  lastAgent: '@opencode',
  stage: 'Motor Editorial completo en Book Studio (Fases 0-4 del plan integral): armar libros en cuadernillos de 4/8/16 hojas con calculo de lomo y desplazamiento por hoja (creep), cubierta envolvente o aparte (destinos B y C), paginas copiadas tal cual sin conversion para el modo normal (copyPages), guias de armado dibujadas en la hoja (linea de doblez, margen de seguridad, lineas guia para recortar (marcas de corte)), ZIP por cuadernillo, perfil de impresora casera con margen no imprimible configurable (0 = imprimir hasta el borde), direccion de lectura RTL/LTR (parejo de hojas espejado y contenedor dir=rtl), resumen previo a la impresion ampliado y segundo boton "Descargar el PDF original (tal cual lo subiste)" sin consumir credito; memoria local del PDF y biblioteca de imagenes en IndexedDB (Fase 1), grilla de miniaturas y visor grande mas rapidos (Fase 2), tapas y contratapas negras en canvas corregidas (Fase 0).',
} as const;
