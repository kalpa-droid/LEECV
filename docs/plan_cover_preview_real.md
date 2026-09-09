# Plan: Vista Previa Real de Tapa/Contratapa en el Visor

Único punto confirmado como pendiente tras la verificación de esta
ronda. Todo lo demás de la lista de 17 puntos (badges numéricos, íconos,
i18n en los 7 pasos, spinner infinito, corte manual, foliado como paso
propio) ya está implementado y verificado contra el código real.

**No incluye nada sobre la protección de rama de GitHub** — queda fuera
de este documento a pedido explícito.

---

## El problema, confirmado línea por línea

`PdfPreviewStrip.tsx` línea 213-226 ya tiene un bloque que muestra la
tapa en el visor:
```tsx
{(options.hasCover || options.customCover) && (
  ...
  {options.customCover?.imageUri ? (
    <img src={options.customCover.imageUri} ... />
  ) : (
    <span>{options.customCover?.title || 'Tapa del PDF'}</span>
    // ...solo texto plano, sin fondo/tipografía del preset elegido
  )}
)}
```
Funciona bien **solo** si el usuario subió una imagen (`customCover.imageUri`).
Si en cambio eligió un preset de diseño (`type: 'template'`, con
`coverStyle` apuntando a `COVER_PRESETS_CATALOG`), lo único que se ve es
un texto genérico sobre fondo vacío — no el diseño real que va a salir
en el PDF final.

**La pieza para arreglarlo ya existe, en el mismo archivo del motor:**
```ts
// src/shared/core/book-engine/impositionEngine.ts
export async function crearCanvasTapaCustom(config: CoverConfig, size: {width,height}): Promise<HTMLCanvasElement>
export async function crearCanvasContratapaCustom(config: BackCoverConfig, size: {width,height}): Promise<HTMLCanvasElement>
```
Esta es la función que YA dibuja el preset elegido (colores, tipografía,
título/autor/editorial) en un `<canvas>` — es la misma que se usa para
generar el PDF final. Nunca se llama desde `PdfPreviewStrip.tsx`.

---

## El plan (un solo lote, toca `shared/core` por tocar `book-engine`)

### 1. Nuevo componente: `CoverPreviewThumbnail.tsx`
`src/modules/book-studio/components/CoverPreviewThumbnail.tsx` — recibe
`config: CoverConfig | BackCoverConfig`, `kind: 'cover' | 'backCover'`,
y `size` (mismo `getCoverCanvasSize()` que ya existe). Por dentro:

```tsx
const canvasRef = useRef<HTMLCanvasElement>(null);

useEffect(() => {
  let cancelled = false;
  (async () => {
    const size = getCoverCanvasSize(paperSize);
    const source = kind === 'cover'
      ? await crearCanvasTapaCustom(config as CoverConfig, size)
      : await crearCanvasContratapaCustom(config as BackCoverConfig, size);
    if (cancelled || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = source.width;
    canvasRef.current.height = source.height;
    ctx?.drawImage(source, 0, 0);
  })();
  return () => { cancelled = true; };
}, [config, kind, paperSize]);

return <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />;
```

**Ojo con el bug que ya arreglamos en `ThumbnailCard.tsx`:** este
componente nuevo tiene que nacer con el `<canvas>` siempre montado (sin
condicionarlo a un `isLoading`) — es exactamente el mismo patrón de
efecto-que-dibuja-en-canvas que ya causó el spinner infinito. No repetir
el error en el componente nuevo.

### 2. `PdfPreviewStrip.tsx` — reemplazar el bloque de texto plano

Reemplazar el `<span>{options.customCover?.title || 'Tapa del PDF'}</span>`
(y su equivalente de contratapa) por:

```tsx
{options.customCover?.imageUri ? (
  <img src={options.customCover.imageUri} ... />
) : options.customCover?.type === 'template' ? (
  <CoverPreviewThumbnail config={options.customCover} kind="cover" paperSize={options.paperSize} />
) : (
  <span>Tapa del PDF (Página 1)</span>  // caso "ya incluye tapa", sin config propia
)}
```

Mismo tratamiento espejado para `customBackCover`.

### 3. Actualización en vivo al cambiar el preset

Confirmar que cambiar el preset en el Paso 5 ("Tapa & Retiro") dispare
el re-render de este componente sin recargar toda la tira — como
`config` ya es prop y está en el array de dependencias del `useEffect`,
esto debería funcionar solo con los pasos 1 y 2 hechos, pero **probarlo
a mano** es el criterio de aceptación real, no algo que un test
automático vaya a confirmar.

---

## Verificación

1. `npx tsc --noEmit` — 0 errores.
2. `npm run check-all` completo.
3. A mano: elegir cada uno de los 6 presets de `COVER_PRESETS_CATALOG`
   en el Paso 5, confirmar que el visor muestra el diseño real (no
   texto plano) y que cambia al instante al tocar otro preset.
4. A mano: subir una imagen propia — confirmar que ese camino (ya
   andaba bien) sigue sin romperse.
5. A mano: repetir todo para contratapa (Paso 6).

## Alcance explícitamente fuera de este plan

- Protección de rama de GitHub — lo maneja el usuario aparte.
- Cualquier otro punto de la lista de 17 — ya verificados como
  implementados en esta misma ronda (badges numéricos, íconos, i18n en
  los 7 pasos, corte manual `splitOffset`, foliado como paso propio,
  spinner infinito).
