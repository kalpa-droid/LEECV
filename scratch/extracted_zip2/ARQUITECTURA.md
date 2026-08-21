# Arquitectura de motor de diseño por capas — LEECV

## El orden resuelto (sin dependencia circular)

```
Capa 0 — PÁGINA           page/pageSizes.ts
                           A4, Carta, Legal, Tarjeta, Afiche. No sabe nada de lo que va adentro.
        ↓
Capa 1 — MÁRGENES         margins/marginPresets.ts
                           Recorta la página → "área útil". Depende solo de la Capa 0.
        ↓
Capa 2 — SECTORES         layout/sectors/resolveSectors.ts
                           Reparte el área útil en cajas (columnas/bandas). Depende solo de la Capa 1.
        ↓
Capa 3 — OBJETOS FIJOS    layout/fixedObjects/placeFixedObjects.ts
                           Se colocan DENTRO de un sector ya resuelto y consumen una porción de su
                           caja (foto, firma, banner, línea decorativa). Lo que sobra = "flowBox",
                           el espacio para contenido dinámico. Depende solo de la Capa 2.
        ↓
Capa 4 — REGISTROS/TEXTOS content/recordTypes.ts
                           Los datos puros (un trabajo, un curso, un dato de contacto), sin color
                           ni tipografía todavía. Agnóstico de si es CV o tarjeta.
        ↓
Capa 5 — PRESET           presets/presetSchema.ts + presets/presets/*.ts
                           Acá nace "una plantilla": combina las capas 0-4 y agrega orden de
                           secciones, jerarquía tipográfica y paleta de colores.
        ↓
Capa 6 — RENDER            renderer/TemplateRenderer.tsx (a construir)
                           Interpreta el árbol ya resuelto y lo dibuja con @react-pdf/renderer.
                           Reemplaza a CvPdfDocument.tsx, que hoy tiene todo esto hardcodeado.
        ↓
Capa 7 — VISTA             viewer/VectorDocViewer.tsx (YA EXISTE, no se toca)
                           Universal, PC y celular, ya resuelto la vuelta pasada.
```

La regla que evita la circularidad que describiste: **cada capa solo lee el resultado de la
anterior, nunca necesita saber nada de la siguiente.** Un sector no sabe cuántos objetos fijos va a
tener — solo expone su caja. Un objeto fijo no decide su sector — lo consume, ya resuelto.

## Paneles, controles y menús (`src/modules/template-editor/`)

Cada panel edita exactamente una capa — así un control nunca necesita saber cómo funciona otro:

| Panel | Edita | Ejemplo de control |
|---|---|---|
| `PageSizePanel.tsx` | Capa 0 | Selector A4 / Carta / Tarjeta |
| `MarginsPanel.tsx` | Capa 1 | Sliders de margen top/bottom/left/right |
| `SectorsPanel.tsx` | Capa 2 | Agregar/quitar columna, ajustar % de ancho |
| `FixedObjectsPanel.tsx` | Capa 3 | Agregar foto/firma/banner, elegir a qué sector va |
| `ContentPanel.tsx` | Capa 4 | Cargar los registros (esto ya existe: `EditorPanel.tsx`) |
| `PresetPanel.tsx` | Capa 5 | Elegir preset, editar paleta de colores, tipografía |

Y el menú de arriba de todo:

| Menú | Función |
|---|---|
| `TemplateMenu.tsx` | Lista de presets disponibles (CV Clásico, CV Moderno, Tarjeta Personal...) — elegir uno carga sus capas 0-5 en los paneles de arriba |

`EditorShell.tsx` es el contenedor: paneles a un lado, `<VectorDocViewer>` mostrando el resultado en
vivo del otro. Este reemplaza al stub `pdf-designer/DesignerCanvas.tsx` que ya tenías (estaba con un
`alert()` en el export — ahora tiene motor real atrás).

## Cómo se agrega una plantilla nueva a futuro
1. Escribís un archivo en `presets/presets/mi-plantilla-nueva.ts` (como los dos ejemplos que te dejé).
2. Elegís `pageSizeId`, `marginPresetId`, definís tus `sectors` y `fixedObjects`.
3. Nada de layout nuevo, nada de componente nuevo — el mismo `TemplateRenderer` y el mismo
   `VectorDocViewer` lo renderizan. Cero duplicación, que era el punto de partida de todo esto.

## Migración (por etapas, sin romper lo que ya anda)
1. **Limpieza de código muerto** — sacar `getDynamicHeightChunks`, `packPrimarySectionsIntoPages`,
   `getItemHeightMm`, `columnVariants.ts`, `sidebarPagination.ts`, `measuredPagination.ts` (ya no
   los usa nadie desde que se sacó la Vista HTML) y los imports huérfanos que quedaron en
   `CVPreview.tsx`.
2. **Construir `TemplateRenderer.tsx`** — el componente react-pdf genérico que interpreta un
   `Preset` + los `ContentRecord[]` reales del usuario y dibuja.
3. **Migrar el CV actual** — convertir lo que hoy está hardcodeado en `CvPdfDocument.tsx` (499
   líneas de JSX) al preset `cv-clasico.ts` que ya te dejé como ejemplo, probando que el resultado
   visual sea idéntico al de hoy.
4. **Recién ahí, agregar la tarjeta personal** — como una segunda fila en la tabla de presets, no
   como código nuevo.
5. **Construir los paneles del `template-editor`** — uno por capa, en el orden de la tabla de arriba.

¿Seguimos con el paso 2 (el `TemplateRenderer.tsx` genérico) o preferís primero el paso 1 (la
limpieza del código muerto)?
