# Plan de Fondo: Un Solo Shell de Aplicación para CV, Tarjetas y Libros

Este documento **corrige y profundiza** el borrador de "Lote D" generado
por otra sesión (pegado en el chat). Ese borrador proponía extender
`CanvaIconDock.tsx` y luego "adaptar el layout de `BookStudio.tsx` a la
estructura de 2 columnas que ya usa el CV" — eso es exactamente el tipo
de duplicación que venimos evitando en todo este proceso: **"adaptar"
un layout a mano es escribirlo dos veces con otro nombre.** Este plan
reemplaza esa idea por una real: que Book Studio no tenga su propio
layout en absoluto, sino que **sea contenido dentro del mismo shell**
que ya usa el editor de CV.

---

## 0. El hallazgo que cambia todo el enfoque: Tarjetas ya funciona así

Antes de proponer nada, miré cómo "Tarjetas Personales" funciona HOY.
Resultado: **ya es exactamente el patrón que necesitamos, funcionando en
producción** — no hay que inventarlo, hay que extendérselo a Libros.

Confirmé en `App.tsx`:
```ts
const activeDocType: 'cv' | 'business_card' | 'book' =
  cvData?.activePresetId === 'tarjeta-personal' ? 'business_card' : 'cv';
```
Una tarjeta personal **es un `cvData` con un preset especial**, guardado
en la misma tabla, cargado con la misma función (`loadCVById`), mostrado
en el mismo `<Navbar>`, el mismo `<CanvaIconDock docType={activeDocType}>`,
el mismo `<EditorPanel docType={activeDocType}>` y el mismo `<CVPreview>`.
**Cero código nuevo de layout para Tarjetas** — solo una rama de datos
distinta fluyendo por el mismo shell. Es la prueba de que el enfoque
funciona, no una teoría.

**Libros es hoy la única excepción**, con su propio archivo `BookStudio.tsx`
que no comparte ni el `<Navbar>`, ni el dock, ni el panel, ni el área de
preview, ni la barra de pestañas de documentos abiertos.

---

## 1. El shell real de hoy — extraído tal cual está en `App.tsx`

```
<div class="h-screen flex-col">              ← CONTENEDOR RAÍZ
  <Navbar ... />                              ← BARRA SUPERIOR
  <main class="flex-1 flex">
    <CanvaIconDock docType={activeDocType} /> ← DOCK LATERAL DE ICONOS
    <div class="w-[460px]">
      <EditorPanel docType={activeDocType} /> ← PANEL DE EDICIÓN (según sección/paso activo)
    </div>
    <div class="flex-1">
      <CVPreview ... />                       ← ÁREA DE VISTA PREVIA / LIENZO
    </div>
  </main>
  <footer>{tabs.map(...)}</footer>            ← BARRA DE PESTAÑAS DE DOCUMENTOS
</div>
```

**Hallazgo extra sobre la barra de pestañas:** revisé
`src/shared/core/storage/documentTabEngine.ts` — **ya tiene**
`docType?: 'cv' | 'business_card' | 'book'` en su tipo `OpenTabItem`, y
`addOpenTab()` ya arma el título correcto por tipo ("Mi Libro / Folleto",
"Mi Tarjeta Personal", "Mi Currículum Vitae"). El motor de datos de
pestañas **ya está listo para los 3 productos**. Lo que falta:
1. Hoy la barra de pestañas está *inline* dentro del `<footer>` de
   `AppContent` — no es un componente aparte, así que Book Studio no la
   tiene en absoluto.
2. `handleSwitchDocumentTab` (el que corre al clickear una pestaña) hoy
   solo sabe hacer `loadCVById()` — funciona para CV y Tarjeta porque
   comparten tabla, pero un libro vive en un modelo de datos totalmente
   distinto (`impositionEngine.ts`, no `cvData`) y en otra ruta
   (`/crear-libro`, no la misma pantalla). Cambiar de una pestaña de CV
   a una de Libro no es "cargar otro documento en la misma pantalla" —
   es **navegar a otra ruta y cargar ese documento ahí**. Este es el
   punto más delicado de todo el plan, ver sección 4.

---

## 2. `AppShell` — extraer el contenedor genérico (Lote A, toca `shared/core`)

`[NEW] src/shared/core/ui/AppShell.tsx` — el mismo layout de arriba,
pero como componente con "huecos" (slots) en vez de contenido fijo:

```tsx
export interface AppShellProps {
  docType: 'cv' | 'business_card' | 'book';
  navbarProps: NavbarProps;          // se lo pasamos tal cual a <Navbar>, sin cambios
  dockProps: Omit<CanvaIconDockProps, 'docType'>;
  panelSlot: React.ReactNode;        // reemplaza a <EditorPanel> cuando no es CV/Tarjeta
  mainSlot: React.ReactNode;         // reemplaza a <CVPreview> cuando no es CV/Tarjeta
  tabsBarProps: DocumentTabsBarProps;
}

export function AppShell({ docType, navbarProps, dockProps, panelSlot, mainSlot, tabsBarProps }: AppShellProps) {
  return (
    <div className="h-screen h-[100dvh] ... flex flex-col overflow-hidden">
      <Navbar {...navbarProps} />
      <main className="flex-1 flex overflow-hidden relative min-h-0 md:pl-24">
        <CanvaIconDock docType={docType} {...dockProps} />
        <div className="... w-[460px] ...">{panelSlot}</div>
        <div className="flex-1 ...">{mainSlot}</div>
      </main>
      <DocumentTabsBar {...tabsBarProps} />
    </div>
  );
}
```

`AppContent` (CV/Tarjeta) queda reducido a:
```tsx
<AppShell
  docType={activeDocType}
  navbarProps={{ ...todos los props que ya arma hoy... }}
  dockProps={{ cvData, setCvData, activeTab, setActiveTab, isPanelOpen, setIsPanelOpen }}
  panelSlot={<EditorPanel cvData={cvData} setCvData={setCvData} activeTab={activeTab} docType={activeDocType} ... />}
  mainSlot={<CVPreview cvData={cvData} setCvData={setCvData} activeTab={activeTab} zoomLevel={zoomLevel} />}
  tabsBarProps={{ tabs, activeId: cvData?.id, onSwitch: handleSwitchDocumentTab, onAdd: handleNewDocument }}
/>
```
**Ningún cambio visual** — es exactamente el mismo JSX de hoy, movido a
un componente reusable. Este es el paso que hace posible todo lo demás.

---

## 3. `DocumentTabsBar` — extraer la barra de pestañas (Lote A, mismo commit que arriba)

`[NEW] src/shared/core/ui/DocumentTabsBar.tsx` — el `<footer>` con
`tabs.map(...)` que hoy vive pegado dentro de `AppContent`, extraído tal
cual (mismo JSX, mismas clases, mismo scroll con rueda del mouse que ya
tiene resuelto). Vive **dentro de `AppShell`**, así que **CV, Tarjetas y
Libros la tienen automáticamente, siempre** — responde directamente tu
pedido de "que esa barra de pestaña también esté siempre".

Diferencia real de comportamiento a agregar (hoy no existe, porque hoy
solo hay un `docType` por sesión de `AppContent`):
```tsx
onClick={() => {
  if (tab.docType === docType) {
    onSwitch(tab.cvId);              // mismo comportamiento de hoy: loadCVById en el mismo shell
  } else {
    onNavigateToDocument(tab.docType, tab.cvId);  // NUEVO: cruza de producto
  }
}}
```

---

## 4. Cruzar de producto (CV ↔ Tarjeta ↔ Libro) desde la pestaña — la parte delicada (Lote B, toca `shared/core` y `App.tsx`)

Esto es lo más fino de todo el plan, así que lo explico paso a paso:

1. `App.tsx` (el componente raíz, dueño de `navigateTo` y `currentRoute`)
   es el único lugar que sabe cómo cambiar de ruta. Hoy `AppShell` (Lote
   A) vive *adentro* de cada ruta, sin acceso a `navigateTo`.
2. Se le pasa `onNavigateToDocument: (docType, cvId) => void` como prop
   desde `App.tsx` hacia abajo, hasta `DocumentTabsBar`.
3. Esa función hace 2 cosas en orden:
   - Guarda el `cvId` a abrir en un lugar que sobreviva el cambio de
     ruta (ej. `sessionStorage.setItem('leecv_pending_open_id', cvId)` —
     patrón simple, ya hay precedente de usar `localStorage` para
     `cv_open_tabs` en el mismo motor).
   - Llama a `navigateTo('/crear-libro')` (o `/crear-cv`, `/crear-tarjeta`
     según corresponda).
4. El componente de destino (Book Studio, o `AppContent` con el preset
   correspondiente), al montar, revisa `leecv_pending_open_id`: si hay
   uno, carga ESE documento en vez del último editado — mismo patrón que
   ya existe hoy para "recordar el último CV abierto" al recargar la
   página (línea 283 de `App.tsx`, `handleSwitchDocumentTab(lastTab.cvId)`),
   solo que ahora dispara *después* de un cambio de ruta en lugar de
   después de un refresh.

**Por qué no alcanza con solo extender `resolveActiveDockSections`
(lo único que proponía el borrador anterior):** eso resuelve la
navegación *dentro* de un documento ya abierto (pasos del libro), pero
no dice nada sobre cómo saltar *entre* documentos de distinto tipo desde
la pestaña — son dos problemas relacionados pero distintos, y el
borrador solo cubría el primero.

---

## 5. Book Studio como contenido de `AppShell`, no como página aparte (Lote C, toca `shared/core` y `book-studio`)

Con `AppShell` ya armado (Lote A), Book Studio dejar de tener su propio
`<header>` y su propio layout de wizard horizontal. En su lugar:

- `[MODIFY] CanvaIconDock.tsx` — extender `resolveActiveDockSections`
  (esto sí viene del borrador anterior, y es correcto) para
  `docType === 'book'`: los 4 pasos (Cargar PDF, Tapas e Imprenta,
  Previsualizar, Exportar) como ítems del dock, con la variante
  `buttonUnavailable` (`plan_topbar_productos.md`, Lote C) para pasos
  posteriores a uno incompleto — ej. no se puede ir a "Previsualizar"
  sin haber subido un PDF, con tooltip explicativo.
- `[NEW] src/modules/book-studio/BookStepPanel.tsx` — va en el
  `panelSlot` de `AppShell`. Es un wrapper delgado que, según el paso
  activo, renderiza `BookUploadStep` / `BookConfigStep` /
  `BookPreviewStep` / `BookExportStep` — los 4 componentes que **ya
  existen**, sin reescribirlos, solo movidos de "página completa" a
  "contenido del panel de 460px", igual que `EditorPanel` muestra una
  sección de CV distinta según `activeTab`.
- `[NEW] src/modules/book-studio/BookPreviewArea.tsx` — va en el
  `mainSlot`. Muestra, según el paso: el PDF subido (paso 1), un preview
  en vivo de la tapa con el preset elegido del Lote C ya mergeado (paso
  2), la previsualización del pliego imponible (paso 3), o el estado de
  exportación (paso 4) — mismo rol que `CVPreview` cumple para el CV.
- `BookConfigStep.tsx`'s selector de presets (ya construido en el Lote
  C, PR #11) **se reusa tal cual acá** — el mismo panel de diseño de
  tapa/contratapa que ya construimos, sin duplicarlo.
- `src/modules/book-studio/BookStudio.tsx` (el archivo actual) se
  retira — su contenido pasa a vivir como `docType='book'` dentro del
  mismo punto de montaje que hoy usa `AppContent`, en vez de ser una
  página aparte en el router de `App.tsx`.

---

## 6. Corrección a `plan_topbar_productos.md` (ya mergeado) — no hace falta un `AppTopBar` nuevo

Ese plan proponía construir `AppTopBar.tsx` desde cero para reemplazar
`Navbar.tsx`. Con esta nueva evidencia, **eso ya no hace falta**:
`Navbar.tsx` ya es genérico y ya recibe `activeDocType` indirectamente a
través de `currentCvData` — con el Lote A de este documento, `Navbar`
pasa a vivir dentro de `AppShell` y listo, sin necesitar un componente
nuevo. Lo que sí sigue en pie de ese plan: la separación de "Publicar en
la Web" vs "Guardar en Drive/Nube" (siguen siendo la misma acción hoy) y
la variante `buttonUnavailable` del motor de botones — ambos se
mantienen, solo se cae la parte de "construir `AppTopBar.tsx` nuevo".

---

## Orden de ejecución y verificación

| Lote | Contenido | Toca `shared/core` | Requiere tu review |
|---|---|---|---|
| A | `AppShell.tsx` + `DocumentTabsBar.tsx` (extraídos de `App.tsx`, sin cambio visual) | Sí | **Sí (CODEOWNERS)** |
| B | Navegación cruzada de pestañas entre productos (`onNavigateToDocument` + pending-open-id) | Sí | **Sí (CODEOWNERS)** |
| C | Book Studio como `docType='book'` de `AppShell` (dock de pasos + `BookStepPanel` + `BookPreviewArea`) | Sí | **Sí (CODEOWNERS)** |

Verificación en cada lote: `npm run check-all` completo, y **probar a
mano** (ningún script detecta esto): abrir un CV, abrir un Libro en otra
pestaña, volver al CV clickeando su pestaña, confirmar que no se pierde
el trabajo no guardado de ninguno de los dos (mismo cuidado que ya tiene
`runWithSafeSave` en `handleSwitchDocumentTab` hoy — extenderlo al cruce
de rutas es parte del Lote B, no algo aparte).

## Lo que este plan evita, explícitamente

No se construye: un segundo `<Navbar>`, un segundo dock lateral, un
segundo diseñador de tapas, ni una segunda barra de pestañas. Book
Studio dejar de ser "una página parecida" para ser, literalmente, el
mismo shell con otro contenido adentro — como Tarjetas ya lo es hoy.
