# Plan de Fondo: Reusar Motores Existentes (Tapa de Libro, Dock de Pasos, Scroll, Título de Pestaña)

Extiende `plan_topbar_productos.md` y `plan_multiproducto_landing.md`.
Los 4 pedidos de esta ronda tienen algo en común, confirmado contra el
código: **en 2 de los 4 casos, el motor correcto ya existe, a medio
terminar o sin conectar** — no hay que construir nada nuevo, hay que
terminar de cablear lo que ya está.

---

## 1. Scroll roto en la Landing — causa raíz confirmada, fix de una línea de concepto

`src/index.css`, línea 3-11:
```css
html, body, #root {
  height: 100dvh;
  max-height: 100vh;
  overflow: hidden !important;   /* <- acá */
}
```
Esta regla es correcta **para el editor de CV** (es una app de una sola
pantalla, cada panel tiene su propio scroll interno — por eso tiene
`!important`, a propósito). El problema es que `LandingPage.tsx` hereda
esta regla global sin poder salir de ella: su contenedor raíz es
`<div className="min-h-screen ...">` — `min-h-screen` hace que el
contenido *quiera* medir más que la pantalla, pero como el padre
(`#root`) tiene `overflow: hidden`, ese excedente queda cortado, sin
scroll posible. Confirmado leyendo el archivo, no es una suposición.

**Fix (Lote A, no toca `shared/core`, es CSS + un contenedor):**
El contenedor raíz de `LandingPage.tsx` (y de `BlogModule.tsx`, mismo
problema potencial) necesita crear su **propia región de scroll**, ya
que no puede cambiar la regla global sin arriesgar el editor de CV:
```tsx
<div className="h-[100dvh] overflow-y-auto ...">
```
en vez de `min-h-screen`. Esto convierte a la landing en un contenedor
que ocupa el alto de pantalla pero se desplaza *puertas adentro* — el
mismo patrón que ya usa cada panel del editor, aplicado acá.

---

## 2. La pestaña dice "Mi CV" en todos lados — el motor ya existe, nunca se conectó

Encontré `src/shared/core/seo/seoIndexingEngine.ts` (función
`updatePageSeo()`, ya escribe `document.title`) y su wrapper
`src/shared/core/seo/SeoMetaManager.tsx` — **ninguno de los dos tiene un
solo import en todo el proyecto.** Es exactamente el mismo patrón que ya
vimos con el componente `<Button>` huérfano: se construyó una vez, nunca
se conectó, y todo el resto del código siguió con el `<title>` estático
de `index.html` ("LEECV — Creador de Currículum...") sin importar en qué
pantalla estuvieras.

**Fix (Lote B, no requiere nada nuevo, solo cablear):**
`src/app/main.tsx` ya tiene el switch de rutas por `pathname` — se le
agrega, junto a cada rama, una llamada a `updatePageSeo({ title: ... })`:

| Ruta | Título de pestaña |
|---|---|
| `/` (landing) | "LEECV — CVs, Tarjetas y Libros en Calidad Imprenta" |
| `/crear-cv` | "Mi CV — LEECV" |
| `/crear-tarjeta` (cuando exista, ver `plan_topbar_productos.md`) | "Mi Tarjeta Personal — LEECV" |
| `/crear-libro` | "Mi Libro / Folleto — LEECV" |
| `/blog` y `/blog/:slug` | Título del post o "Blog — LEECV" |

Con esto resuelto de raíz **el mismo mecanismo sirve para los 3
productos** — cuando Tarjetas nazca como ruta propia (Lote E de
`plan_topbar_productos.md`), ya hereda el título correcto sin volver a
tocar este archivo.

---

## 3. Tapa y Contratapa del Libro — dejar de reinventar, reusar el motor de portadas del CV

Miré `BookConfigStep.tsx` línea por línea: tiene su propio "Diseñador
Tipográfico de Tapa" escrito a mano — 3 `<input type="text">` (título,
autor, editorial) + 2 `<input type="color">` (fondo, texto), con clases
`slate-*`/`emerald-*` sueltas, cero relación con el motor de diseño.

**Y acá está el hallazgo bueno:** el CV **ya tiene** un motor de tapas
profesional, con 6 presets basados en investigación real de diseño
editorial (Van de Graaf / proporción áurea, Bento Grid, minimalista,
etc.):
```
src/shared/core/pdf-engine/layers/presets/coverPresetCatalog.ts
```
Ya está en uso hoy, en `EditorPanel.tsx`, para la portada del CV.
Título/autor/editorial de un libro es conceptualmente el mismo problema
que título/subtítulo/marca de una portada de CV — **es el mismo motor**,
no dos parecidos.

**Fix (Lote C, toca `shared/core` → requiere tu review):**
- `BookConfigStep.tsx` deja de tener su propio formulario de tapa.
  En su lugar, reusa el selector de `COVER_PRESETS_CATALOG` (los mismos
  6 presets) + el renderer que ya pinta esos presets en el CV
  (`coverOrnamentEngine.ts`), alimentado con los datos del libro
  (título, autor, editorial) en vez de los del CV.
- Si algún campo es específico de libro y no de CV (ISBN, sinopsis para
  la contratapa), se agrega como campo opcional al mismo esquema
  (`CardDesign`/`CoverPresetDefinition`), no como un formulario aparte.
- Resultado: la tapa de un libro hecho en LEECV automáticamente se ve
  con la misma calidad tipográfica que la portada de un CV — porque
  literalmente es el mismo motor, no una imitación.

---

## 4. Navegación de pasos del Libro — el dock lateral ya anticipa esto, solo falta terminarlo

Pediste que la interfaz de Libros sea "casi idéntica" a la de Tarjetas,
con los pasos como botones en la barra izquierda en vez del stepper
horizontal actual. Revisé `CanvaIconDock.tsx` (el dock de iconos lateral
que ya usa el editor de CV) y encontré esto en su propia definición de
props:
```ts
docType?: 'cv' | 'business_card' | 'book';
```
**Alguien ya diseñó este componente para soportar los 3 productos** —
pero la lógica interna solo está implementada para `'cv'`:
```ts
const dockSections = docType === 'cv' ? resolveActiveDockSections(cvData) : [];
```
Para `'book'` y `'business_card'`, hoy devuelve un array vacío — el dock
existe, el enchufe existe, pero del otro lado no hay nada conectado
todavía. Es una pieza a medio terminar, no una nueva a inventar.

**Fix (Lote D, toca `shared/core` → requiere tu review):**
- Extender `resolveActiveDockSections` (o crear su equivalente
  `resolveBookDockSteps`) para devolver, cuando `docType === 'book'`,
  los 4 pasos actuales de Book Studio como items del dock: Cargar PDF →
  Tapas e Imprenta → Previsualizar → Exportar PDF.
- **Lógica de secuencia:** un paso posterior se muestra en el dock con
  la variante `buttonUnavailable` del motor de botones (la misma que
  definimos en `plan_topbar_productos.md`, Lote C) hasta que el paso
  anterior esté completo — ej. "Previsualizar" queda visualmente
  presente pero no clickeable hasta que haya un PDF cargado, con el
  mismo patrón de tooltip explicativo ("Subí un PDF primero"). No se
  oculta el paso, se deshabilita — coherente con cómo ya pedimos tratar
  "Publicar en la Web" en Tarjetas.
- `BookStudio.tsx` reemplaza su stepper horizontal (línea conectora +
  círculos arriba) por `<CanvaIconDock docType="book" activeTab={currentStep} setActiveTab={setCurrentStep} ... />` — mismo componente que ya
  renderiza el editor de CV, ninguno nuevo.
- Cuando se construya Tarjetas (`docType="business_card"`), se resuelve
  con el mismo mecanismo — el trabajo de "conectar el enchufe" para
  libro deja el patrón listo para copiar, no para reinventar otra vez.

---

## Orden de ejecución y verificación

| Lote | Contenido | Toca `shared/core` | Requiere tu review |
|---|---|---|---|
| A | Fix de scroll en Landing/Blog | No | No |
| B | Conectar `updatePageSeo` en `main.tsx` por ruta | No (usa un motor que ya existe) | No |
| C | Tapa/contratapa del libro reusando `coverPresetCatalog.ts` | Sí | **Sí (CODEOWNERS)** |
| D | Dock lateral de pasos del libro vía `CanvaIconDock` | Sí | **Sí (CODEOWNERS)** |

Verificación: `npm run check-all` completo en cada PR. Para el Lote A,
probar manualmente con rueda del mouse y trackpad en `/` y `/blog` antes
de mergear — ningún script detecta "no se puede scrollear", hace falta
que alguien lo pruebe con sus manos.

## Lo que este plan evita, explícitamente

No se escribe: un segundo diseñador de tapas, un segundo dock de
navegación lateral, un segundo mecanismo de título de pestaña, ni una
segunda regla de scroll. Los 4 problemas de esta ronda tenían, en 3 de
los 4 casos, la solución correcta ya viviendo en el repo — sin conectar.
Este plan es, literalmente, terminar de cablear lo que ya se construyó
una vez, no construirlo de nuevo.
