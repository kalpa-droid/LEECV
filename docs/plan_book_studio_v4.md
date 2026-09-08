# Plan Book Studio v4 — Motores faltantes (puntos 4-9 verificados)

Continúa el trabajo de la PR #16 (mergeada: worker de pdf.js centralizado
+ 31 violaciones de contraste corregidas). Este documento cubre los
puntos pendientes de tu lista, cada uno **verificado contra el código
real de LEECV y de Kalpagrafica**, no supuesto.

---

## Punto 3 — Confirmado: el panel de rotación en lote no tiene base real

Ya verificado en la ronda anterior: Kalpagrafica (la herramienta de
referencia, probada) corrige 180° **por hoja individual**, nunca en
lote. Tu duda estaba bien fundada. **Acción: retirar el panel de
"Acciones en Lote" de `BookOrganizeStep.tsx`** — no es un motor que
falte, es una función que no debería existir en esta forma.

---

## Punto 4 — Motor de corte manual por página (el más importante de esta lista)

**Confirmado en LEECV:** `impositionEngine.ts` línea 678 —
```ts
const halfWidth = sheetWidth / 2;
```
El corte de una hoja "fotocopia" (libro escaneo abierto, 2 páginas en 1)
es **siempre exactamente al medio**, sin excepción. Si el escaneo no
quedó centrado, corta letra — exactamente el problema que describís.

**Confirmado en Kalpagrafica** (`src/sections/impresion/PdfPreviewStrip.jsx`):
ya existe, probado, el mecanismo correcto:
```js
splitOffset = 50,                    // porcentaje, no fijo
onAdjustSplit(sheetNum, Math.max(35, splitOffset - 2))   // ◄ ajusta -2%
onAdjustSplit(sheetNum, Math.min(65, splitOffset + 2))   // ► ajusta +2%
// línea roja overlay en `${splitOffset}%` con label "✂ 50%"
```
Rango ±15% desde el centro (35%-65%), en pasos de 2%, por hoja
individual — no global.

**Plan (toca `shared/core`, requiere tu review):**
1. `impositionEngine.ts`: agregar `splitOffset?: number` (default `50`)
   **por hoja**, no una sola opción global — cada hoja escaneada puede
   tener su propio desvío de escaneo.
2. Reemplazar `const halfWidth = sheetWidth / 2` por
   `const splitPoint = sheetWidth * ((sheet.splitOffset ?? 50) / 100)`.
3. `ThumbnailCard.tsx` (ya existe, ya dibuja cada página en canvas):
   agregar la línea roja overlay + los botones `◄ ✂ 50% ►` — mismo
   patrón visual que Kalpagrafica, adaptado a los tokens de LEECV
   (`--color-status-danger-base` en vez del rojo a mano `#F87171`).
4. Solo se muestra este control cuando `options.mode === 'fotocopia'`
   — en modo "PDF normal" no aplica, no hay nada que cortar al medio.

---

## Punto 5 — Textos del panel: van al motor de i18n, no se reescriben sueltos

Comparé el texto que pegaste (de la app original, más claro) contra
`BookSourceTypeStep.tsx`/`BookOrganizeStep.tsx` actuales. Antes de
reescribir nada: **confirmar si estos componentes ya usan `useText()`**
(el motor AST/i18n que ya gobierna Landing/Blog) o si tienen strings
sueltos en el JSX.

```
grep -c "useText\|t\.book\." src/modules/book-studio/*.tsx
```

Si todavía tienen strings sueltos, el trabajo no es "cambiar el texto"
— es (a) migrarlos a `src/shared/i18n/catalog/bookStudio.ts` (mismo
patrón que `catalog/landing.ts`), y (b) *en ese mismo catálogo* escribir
la versión más clara que pegaste. Así el texto vive en un solo lugar
versionable, no se vuelve a desalinear la próxima vez que alguien lo
edite a mano en el JSX.

---

## Punto 6 — Número + ícono del paso, y elección de íconos

**Confirmado:** los labels ya tienen el número (`"1. Origen"`, `"2.
Páginas"`, etc. en `CanvaIconDock.tsx`) — pero el número solo aparece en
el tooltip de texto, no es visible en el ícono en sí (que es lo que
pediste: "el icono con su número de etapa primero"). En mobile, sin
hover, el número nunca se ve.

**Aclaración importante sobre "el motor de íconos SVG":** ya existe uno
(`src/shared/core/pdf-engine/layers/icons/iconRegistry.ts`), pero es
para íconos que se **dibujan dentro del PDF** (ej. un maletín junto a
"Experiencia" en el CV) — no es el motor que corresponde acá. Los
íconos del dock (chrome de la interfaz, no contenido del documento) usan
`lucide-react` directo, que es la elección correcta para esto — no hay
que forzarlos al motor de íconos de PDF.

**Sí encontré un caso de mal ajuste semántico:** el paso "2. Páginas"
(reordenar/organizar) usa el ícono `Eye` (ojo = "ver/previsualizar"),
que encaja mejor con el paso 7 ("Exportar/Preview"). Para "Organizar
Páginas" un ícono de grilla (`LayoutGrid` o `Rows3` de lucide-react)
comunica mejor la acción.

**Plan (toca `shared/core`):**
1. Agregar un badge numérico chico (círculo con el número) superpuesto
   en la esquina del ícono de cada paso — visible siempre, no solo en
   el tooltip. Mismo patrón que ya usa `elevationSystem`/`radius` del
   motor de diseño, no un badge nuevo inventado.
2. Cambiar el ícono de "2. Páginas" de `Eye` a `LayoutGrid`.

---

## Punto 7 — Preview de tapa/contratapa insertado en el visor (confirmado: no existe)

Grepeé referencias cruzadas entre `BookCoverStep.tsx`/
`BookBackCoverStep.tsx` y `PdfPreviewStrip.tsx`/`BookPreviewStep.tsx`:
cero. Elegís o creás una tapa, pero nunca la ves insertada en su lugar
real dentro de la tira de páginas — no hay forma de confirmar visualmente
cómo va a quedar antes de exportar.

**Plan (toca `shared/core`, mismo motor que ya construimos):**
1. El renderer de miniaturas (`ThumbnailCard.tsx`) ya sabe dibujar una
   página de PDF en canvas. Necesita un segundo modo: dibujar la tapa
   generada (usando el mismo `crearCanvasTapaCustom`/
   `crearCanvasContratapaCustom` de `impositionEngine.ts` que ya
   construimos en el trabajo de presets) en vez de una página del PDF
   subido.
2. `PdfPreviewStrip.tsx` inserta esa miniatura especial en la posición
   correcta: antes de la página 1 (tapa) y después de la última (contra-
   tapa) — incluyendo la hoja en blanco de retiro si está activada
   (`Mantener el dorso... en blanco`), como una miniatura marcada
   visualmente distinta ("Hoja en blanco").
3. Se actualiza en vivo: cambiar el preset de tapa en el paso 4 debe
   verse reflejado inmediatamente en la miniatura del visor principal,
   sin tener que ir al paso de exportación para confirmar.

---

## Punto 8 — Motor de zoom: la causa raíz encontrada, un motor duplicado y más débil

**Confirmado, con la línea exacta:** `BookStudioContent.tsx` línea 114:
```ts
triggerAutoFit={() => setBookZoom(1)}
```
Esto no es un "encajar" real — es un reset fijo a 100%, sin importar el
tamaño de pantalla. El "encajar" que sí funciona bien vive en `App.tsx`
(`triggerAutoFit`, usado por CV/Tarjeta): calcula `isMobile`, resta el
ancho del panel lateral, y clampea el resultado entre 0.25x y 2.0x
contra el ancho real disponible. **Book Studio nunca heredó ese motor**
— tiene su propia versión, más simple y rota, en vez de reusar la que
ya funciona.

**Plan (toca `shared/core`):**
1. Extraer la lógica de `triggerAutoFit` de `App.tsx` a
   `src/shared/core/utils/useAutoFitZoom.ts` — un hook parametrizado por
   `contentWidthPx` (794 para A4 en CV, el ancho real de la tira de
   miniaturas para Book) y `isPanelOpen`.
2. `App.tsx` y `BookStudioContent.tsx` usan el mismo hook — CV/Tarjeta
   sin cambios de comportamiento, Book Studio pasa a tener un "encajar"
   real por primera vez, mobile incluido.

---

## Punto 9 — Páginas en blanco / de texto con jerarquía tipográfica (función nueva, no existe en ninguno de los dos repos)

Confirmé que esto **tampoco existe en Kalpagrafica** — no es "portar",
es diseñar algo nuevo. Encaja con el motor de presets de tapa que ya
construimos (mismo espíritu: elegís un estilo, no armás desde cero).

**Plan (toca `shared/core`):**
1. `BookOrganizeStep.tsx`: botón "+ Agregar página" con 2 opciones:
   - **Hoja en blanco** (fondo blanco liso, sin texto).
   - **Hoja de texto con jerarquía** — reusa exactamente el mismo
     patrón de `displayScale` (`hero`/`sectionHeading`/`lead`, ya
     definidos en `uiDesignSystem.ts` para la landing) para 3 niveles de
     texto (título grande tipo "Capítulo 3", subtítulo, texto de cuerpo
     corto) — mismo motor tipográfico que ya gobierna el resto de la
     app, no una escala nueva inventada para esto.
   - Ofrecer los mismos `COVER_PRESETS` como fondo/color para esta hoja
     (ya construidos, reusados por tercera vez: tapa del libro,
     contratapa, y ahora páginas internas).
2. Esta página nueva se inserta en la posición elegida del array de
   páginas y aparece en el visor (punto 7) igual que cualquier otra.

---

## Resumen de motores reusados vs. nuevos en este plan

| Punto | Motor que reusa | Motor nuevo a crear |
|---|---|---|
| 4 (corte manual) | Ninguno reusable — algoritmo propio del book-engine | `splitOffset` por hoja en `impositionEngine.ts` |
| 5 (textos) | `useText()` / catálogos i18n ya existentes | — |
| 6 (íconos+número) | `lucide-react`, `elevationSystem`, `radius` | Badge numérico chico (patrón, no motor nuevo) |
| 7 (preview tapa) | `crearCanvasTapaCustom`/`ThumbnailCard.tsx` ya existentes | — (es cablear, no construir) |
| 8 (zoom) | Lógica de `triggerAutoFit` de `App.tsx` | Extraerla a `useAutoFitZoom.ts` compartido |
| 9 (páginas nuevas) | `displayScale`, `COVER_PRESETS` ya existentes | Solo el flujo de inserción en el array de páginas |

**Solo 2 piezas son genuinamente nuevas** (`splitOffset` y
`useAutoFitZoom`) — el resto es cablear motores que este mismo proceso
ya construyó en rondas anteriores. Ninguna requiere código duplicado a
mano.

---

## Orden sugerido

1. **Punto 8 (zoom)** — el más aislado, arregla un bug visible ahora mismo, bajo riesgo.
2. **Punto 4 (corte manual)** — el de mayor impacto funcional real, la queja original más concreta.
3. **Punto 6 (íconos)** — chico, cosmético, rápido.
4. **Punto 7 (preview tapa)** — depende de tener ya el visor estable (punto 8 resuelto ayuda a probarlo bien).
5. **Punto 3 (retirar lote)** — trivial, en cualquier momento.
6. **Punto 5 (textos)** — en paralelo, no depende de código.
7. **Punto 9 (páginas nuevas)** — el de mayor alcance, dejarlo para el final.

Verificación en cada lote: `npm run check-all`, y en los puntos 4/7/8
específicamente **probar a mano en mobile real o emulado** — son los 3
puntos donde el bug original solo se ve con las manos, no con un script.
