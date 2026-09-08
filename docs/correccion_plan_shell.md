# Correcciones al Plan de Implementación (Shell Único) — antes de ejecutar

El plan de implementación pegado (basado en `plan_shell_unico.md`) está
bien encaminado en Lotes A y C, pero tiene un hueco de fondo en Lote B
que hay que resolver primero, y dos imprecisiones de menor riesgo. Este
documento se lee **antes** de abrir las PRs de esos lotes.

---

## Corrección 1 (bloqueante) — falta Lote 0: persistencia de Libro por ID

Verificado contra el código, no supuesto: `BookStudio.tsx` no guarda
nada. `selectedFile` es un `File` crudo en `useState`, sin `id`, sin
`saveBook`, sin `loadBookById`. El Lote B del plan pegado asume que
"clickear la pestaña del Libro carga ese documento exacto" — hoy no hay
ningún documento guardado que cargar. Sin esto, Lote B es plomería de
navegación sin datos del otro lado.

**La buena noticia:** no hace falta construir persistencia nueva. Ya
existe un motor genérico:
```ts
export const loadCVById = (id: string) => loadDocumentById(id, 'cv');
```
`saveDocument(data, docTypeId)` / `loadDocumentById(id, docTypeId)`
(`documentStorageService.ts`) ya son genéricos por `docTypeId`, y
`DOCUMENT_TYPE_REGISTRY` (`capabilityRegistry.ts`) ya tiene `cv`,
`business_card` y hasta un `portfolio` sin usar — **`book` nunca se
agregó**. Es el mismo patrón que ya vimos con `<Button>`, `SeoMetaManager`
y el `docType` de `CanvaIconDock`: el motor generalizado existe, un tipo
más no se conectó.

**Lote 0 (nuevo, antes que B y C):**
1. Agregar `book` a `DOCUMENT_TYPE_REGISTRY` (mismo shape que `cv`/
   `business_card` — `id`, `name`, `description`, `iconName`,
   `capabilities: []` ya que un libro no comparte las capacidades de un
   CV).
2. El estado que hoy vive en `BookStudio.tsx` (`options`, `selectedFile`
   referenciado por nombre/metadata, no el `File` binario en sí — eso no
   se persiste, se re-sube) se guarda vía `saveDocument(bookState, 'book')`
   al terminar el paso de configuración, obteniendo un `id`.
3. Al guardar por primera vez, llamar
   `addOpenTab(id, title, undefined, 'book')` — hoy esa llamada no
   existe en ningún lado de `book-studio/`, así que ningún libro
   aparece nunca en la barra de pestañas, sin importar cuánto se
   construya arriba.

Sin este lote, Lote B se puede construir igual, pero quedaría probando
un camino que nunca tiene un libro real del otro lado — mejor
hacerlo en orden.

---

## Corrección 2 — `[DELETE] BookStudio.tsx` es prematuro tal como está escrito

El archivo tiene lógica de orquestación real, no solo layout:
`currentStep`, `selectedFile`, `pdfPageCount`, el objeto completo
`options: BookImpositionOptions`, y `handleReset`. Cambiar
`"[DELETE] BookStudio.tsx"` por:

> `[REFACTOR] BookStudio.tsx` → extraer su estado a
> `BookStudioContent.tsx` (el componente que alimenta los slots
> `panelSlot`/`mainSlot` de `AppShell`). Recién cuando ese estado esté
> confirmado funcionando en el nuevo lugar, el archivo original queda
> vacío y **entonces** se borra — el borrado es el último paso de un
> refactor, no el primero.

---

## Corrección 3 — la navegación cruzada no va dentro de `documentTabEngine.ts`

Ese archivo dice, en su propio comentario de cabecera, que su trabajo es
"mantener la lista liviana de documentos abiertos" — una sola
responsabilidad, ya cumplida bien. Meterle `sessionStorage` +
"a qué ruta navegar según el docType" le agrega una segunda
responsabilidad (orquestación de navegación) a un núcleo que no la tenía
y que otros módulos ya dependen de que siga siendo simple.

**Corrección:** el par `setPendingDocumentToOpen`/
`getPendingDocumentToOpen` (el `sessionStorage` con el id pendiente) va
en un archivo nuevo y chico, `src/shared/core/storage/pendingDocumentHandoff.ts`,
o directamente inline en `App.tsx` si solo se usa ahí. `documentTabEngine.ts`
no cambia — sigue siendo únicamente la lista de pestañas.

---

## Corrección 4 (orden, no arquitectura) — la PR #11 primero

`BookConfigStep.tsx` (que `BookStepPanel.tsx` va a envolver) fue
modificado en la PR #11 (todavía sin tu aprobación al momento de
escribir esto). Antes de ramificar el trabajo de Lote C desde `main`,
confirmar que la PR #11 esté mergeada — si no, la rama de Lote C parte
de una versión vieja de `BookConfigStep.tsx` y el merge después va a
tener conflictos evitables.

---

## Plan de Lotes corregido (reemplaza la numeración del plan pegado)

| Lote | Contenido | Prerrequisito |
|---|---|---|
| **0 (nuevo)** | Registrar `book` en `capabilityRegistry.ts` + wiring de `saveDocument`/`addOpenTab('book')` en Book Studio | Ninguno |
| **A** | `AppShell.tsx` + `DocumentTabsBar.tsx` (extracción, sin cambio visual) | Ninguno — puede ir en paralelo con el Lote 0 |
| **B** | Navegación cruzada de pestañas (`onNavigateToDocument` en `App.tsx` + `pendingDocumentHandoff.ts` aparte de `documentTabEngine.ts`) | Lotes 0 y A |
| **C** | Book Studio como `docType='book'` de `AppShell` (`BookStudioContent.tsx` con el estado migrado, luego sí borrar el `BookStudio.tsx` viejo) | PR #11 mergeada, Lotes 0 y A |

Todo lo demás del plan pegado (extender `resolveActiveDockSections` para
`'book'`, `BookStepPanel`/`BookPreviewArea`, reusar `COVER_PRESETS` ya
construido) queda igual — es correcto tal como está.
