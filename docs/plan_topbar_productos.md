# Plan: Barra Superior Única entre Productos + Book Studio Conectado al Motor

Extiende el plan del motor de botones (`docs/plan_motor_botones.md`) y el
de la landing (ya implementado en PR #6). Este documento cubre lo que
falta: que CV, Tarjetas y Libros compartan la misma barra superior, con
las acciones que no aplican **visibles pero desactivadas** (no ocultas),
y que Book Studio deje de ser una isla visual.

---

## 0. Diagnóstico — confirmado contra el código, no supuesto

**Book Studio no reusa nada del motor:**
```
grep "ThemeToggleButton|globalThemePreference|Navbar" BookStudio.tsx → 0 resultados
```
Tiene su propio `<header>` escrito a mano (logo + botón volver + badge),
sin selector de tema, sin el menú de Ingresar/Abrir/Guardar/Publicar.
Es un wizard de 4 pasos lineal (Cargar → Config → Preview → Exportar),
un paradigma de interacción completamente distinto al del editor de CV.
Los 4 archivos que lo componen ya están señalados por la propia
auditoría de gobernanza del proyecto (corriendo hoy en modo reporte, no
bloqueante) con **358 clases de Tailwind sueltas combinadas**:
`BookConfigStep.tsx` (164), `BookUploadStep.tsx` (88), `BookPreviewStep.tsx`
(63), `BookExportStep.tsx` (43).

**"Publicar en la Web" y "Guardar en Drive/Nube" son HOY la misma acción:**
Confirmé en `Navbar.tsx` y `SaveModal.tsx` que las dos llaman a
`onOpenCloudStatus()`, que abre un único `CloudStatusModal.tsx` — el
mismo modal mezcla "publicar mi CV con un link público" y "conectar
Google Drive / ver cuota de LEECV Cloud". Son conceptualmente dos cosas
distintas (una expone el documento al mundo, la otra solo lo respalda en
tu propia nube), pero hoy comparten un solo botón. **Esto hay que
separarlo primero** — no se puede "apagar publicar, dejar prendido
guardar en Drive" si ambos son el mismo botón.

**Tarjetas Personales todavía no existe como módulo propio** — hoy vive
como `CardExportModal.tsx` colgado del editor de CV (ver plan de
`docs/plan_multiproducto_landing.md`, sección "hallazgo 0"). Por eso el
diseño de su barra superior es una decisión de **cómo construirlo bien
desde el día uno**, no una corrección de algo que ya está mal — mejor
momento posible para hacerlo bien de entrada.

---

## 1. Separar "Publicar en la Web" de "Guardar en la Nube" (Lote A — toca `shared/core`, requiere tu review)

`[MODIFY] CloudStatusModal.tsx` → se divide en dos componentes:

- **`PublishWebModal.tsx`** — solo la parte de publicar (slug, link
  público, estado "publicado/no publicado"). Queda igual de chico que
  hoy, menos responsabilidad.
- **`CloudBackupModal.tsx`** — solo Drive (conectar cuenta, cuota,
  estado de conexión) + LEECV Cloud 50GB (para Enterprise). Este es el
  que **debe poder abrirse independientemente de si el producto permite
  publicar o no** — Libros y Tarjetas lo van a necesitar, Publicar no.

`onOpenCloudStatus` se reemplaza por dos callbacks separados:
`onOpenPublishWeb` y `onOpenCloudBackup`. `Navbar.tsx`, `SaveModal.tsx` y
`SavedCVsModal.tsx` actualizan sus 3-4 llamados existentes para apuntar
al que corresponda según el botón (hoy los 6 puntos donde se llama a
`onOpenCloudStatus` ya distinguen conceptualmente cuál de las dos cosas
querían — es reconectar el cable correcto, no inventar lógica nueva).

---

## 2. Barra superior compartida, parametrizada por producto (Lote B — nuevo núcleo)

`[NEW] src/shared/core/ui/AppTopBar.tsx` — extrae la estructura visual de
`Navbar.tsx` (que hoy vive atada al editor de CV) a un componente
genérico que reciba **qué puede hacer este producto** como dato, no como
código distinto por producto:

```ts
export interface ProductCapabilities {
  productId: 'cv' | 'tarjetas' | 'libro';
  productLabel: string;       // "Creador de CV", "Tarjetas Personales", "Libros & Folletos"
  productIcon: LucideIcon;
  canPublishWeb: boolean;
  canSaveToDrive: boolean;
  canSaveToCloud50GB: boolean;
  canExportPdf: boolean;
  canDownloadPortable: boolean;
  canSaveAsCopy: boolean;
}
```

**El menú siempre muestra las mismas 6-7 opciones, en el mismo orden, en
los 3 productos** — es lo que pediste explícitamente ("debe mantenerse")
y es además la razón de ser de un solo componente: el usuario aprende un
único lugar donde vive cada acción, sin importar en qué producto esté.
Lo que cambia por producto es el **estado** de cada opción, usando la
variante `disabled` del motor de botones (punto 3):

| Acción | CV | Tarjetas | Libros |
|---|---|---|---|
| Abrir guardados | ✅ | ✅ | ✅ |
| Guardar | ✅ | ✅ | ✅ |
| Guardar copia como | ✅ | ✅ | ✅ |
| Descargar copia portátil (.json) | ✅ | ✅ | ⛔ (no aplica a un PDF ya impuesto) |
| Exportar PDF | ✅ | ✅ | ✅ |
| **Publicar en la Web** | ✅ | ⛔ | ⛔ |
| Guardar en Drive / LEECV Cloud | ✅ | ✅ | ✅ |

`[MODIFY] Navbar.tsx` (CV), `[NEW]` header de `CardStudio` (cuando se
construya) y `[MODIFY] BookStudio.tsx` pasan a renderizar
`<AppTopBar capabilities={...} />` en vez de tener cada uno su propio
`<header>`.

---

## 3. La variante `disabled` del motor de botones (Lote C — extiende `docs/plan_motor_botones.md`)

El plan anterior no definía un tratamiento para "visible pero no
disponible en este contexto" — hace falta agregarlo, porque no es lo
mismo que el `disabled:opacity-50` genérico que ya trae `button.base`
(ese es para "todavía no, esperá" — ej. un botón de guardar mientras
está guardando). Acá el significado es distinto: **"esto existe en la
app, pero no en este producto"**.

`[MODIFY] src/shared/core/uiDesignSystem.ts`, agregar junto a `button.*`:

```ts
/**
 * Estado "no disponible en este producto" — distinto del disabled
 * genérico (que es "esperá un momento"). Este SIEMPRE viene con un
 * title/tooltip explicando por qué, nunca se usa mudo.
 */
export const buttonUnavailable = `${button.base} bg-transparent border border-dashed border-[var(--color-neutral-border)] text-[var(--color-neutral-text-muted)] opacity-60 cursor-not-allowed hover:opacity-60`;
```

`AppTopBar.tsx` (punto 2) lo aplica automáticamente a cualquier opción
cuya capacidad venga en `false`, junto con un `title` obligatorio (ej.
*"Publicar en la Web es para CVs — las tarjetas se descargan listas
para imprimir, no se publican con un link"*) — así el usuario entiende
el porqué, no solo ve un botón muerto.

---

## 4. Book Studio conectado al motor (Lote D)

Con `AppTopBar` ya construido (Lote B), conectar `BookStudio.tsx`:

- Reemplazar su `<header>` a mano por `<AppTopBar capabilities={{ productId: 'libro', canPublishWeb: false, canSaveToDrive: true, canSaveToCloud50GB: true, ... }} />`.
- Agregar `<ThemeToggleButton>` (ya existe, ya lo usa la landing) leyendo
  `getGlobalUiTheme()`/`applyUiTheme()` de `globalThemePreference.ts`
  (también ya existe) — Book Studio no tiene un CV cargado del cual leer
  el tema, así que usa la misma preferencia global que ya resolvimos
  para la landing, no hay que inventar nada nuevo acá.
- Migrar `BookConfigStep.tsx`, `BookUploadStep.tsx`, `BookPreviewStep.tsx`,
  `BookExportStep.tsx` de sus 358 clases sueltas a `button.*` /
  `colorSystem.*` / `elevationSystem.*` / `radius.*` — mismo criterio de
  éxito que el resto del proyecto: deben desaparecer de la lista que
  hoy imprime `check-all` en modo auditoría.
- El wizard de 4 pasos en sí (la línea de progreso, los steps) **se
  mantiene** — no es un problema de UX tener un flujo lineal para
  "subir PDF → configurar → previsualizar → exportar", es coherente con
  la tarea. El problema era solo que no hablaba el mismo idioma visual
  que el resto de la app, no la estructura de pasos.

---

## 5. Spec para Tarjetas Personales (Lote E — cuando se construya, no antes)

Cuando se implemente `CardStudio` (`docs/plan_multiproducto_landing.md`,
sección 1.2), debe nacer usando `<AppTopBar>` desde el primer commit —
nunca construir un header propio como pasó sin querer con Book Studio.
Capacidades sugeridas:

```ts
{
  productId: 'tarjetas',
  canPublishWeb: false,   // con tooltip explicando el porqué (punto 3)
  canSaveToDrive: true,
  canSaveToCloud50GB: true,
  canDownloadPortable: false,
  canExportPdf: true,     // el PDF con sangrado y marcas de corte, vía cardSheetExporter.ts ya existente
  canSaveAsCopy: true,
}
```

---

## Orden de ejecución y verificación

| Lote | Contenido | Toca `shared/core` | Requiere tu review |
|---|---|---|---|
| A | Separar Publicar / Guardar en Nube | Sí (modales de `cv-builder`, pero el patrón de callbacks es núcleo) | Recomendado |
| B | `AppTopBar.tsx` + `ProductCapabilities` | Sí | **Sí (CODEOWNERS)** |
| C | Variante `buttonUnavailable` | Sí | **Sí (CODEOWNERS)** |
| D | Conectar Book Studio (header + 4 pasos) | No | No, pero probalo vos con tus ojos y los 4 temas |
| E | Spec para Tarjetas (documentación, sin código hasta que se construya el módulo) | — | — |

Verificación por lote: `npm run check-ui-tokens` (los 358 hallazgos de
Book Studio deben bajar a 0 tras el Lote D), `npm run check-contrast`,
`npm run check-all` completo, rama → PR → review si toca núcleo → merge.
