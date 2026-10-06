# Plan v32 (mejorado) — Multi-Parent en Drive, Navegación Segura, Barra Superior

Verifiqué cada punto del plan original contra el código real (no contra lo que
decía el documento). Los 4 diagnósticos son correctos — abajo el detalle de
qué confirmé yo mismo, qué corrijo, y qué le faltaba.

---

## ✅ Confirmado tal cual, sin cambios

- `addFolderAsParent` no existe en ningún lado — el hueco de Drive es real.
- `safeNavigationEngine.ts` y `topBarActionRegistry.ts` no existen todavía.
- **Navbar.tsx** y **DocumentTabBar.tsx** están montados los dos a la vez en
  `App.tsx` (líneas 357 y 382), cada uno con su propio "Nuevo"/"Abrir" —
  confirmado, es duplicación visual real, no una lectura errónea del código.
- `migrateCvData` sí está conectado en los 3 puntos de entrada reales:
  `documentStorageService.ts` (al cargar), y 2 veces en `jsonImporterExporter.ts`
  (2 rutas de importación JSON distintas).

## 🔧 Corrección — Componente 4 del plan original

El plan dice que `SaveModal.tsx`/`SavedCVsModal.tsx` están "recargados", pero
verificado el código real:
- El formulario de "Guardar como" (categoría/puesto/etiqueta) ya está
  **colapsado por defecto** (`isSaveAsActive` arranca en `false`) — no se ve
  a menos que el usuario lo abra a propósito.
- `SavedCVsModal.tsx` ya muestra el badge de puesto/versión correctamente.

No hay nada roto ahí. Bajo el Componente 4 de "obligatorio" a **opcional,
menor prioridad** — si después de los otros 3 cambios sigue sintiéndose
recargado en la práctica, se revisa con capturas reales, no a priori.

## ➕ Lo que le faltaba al plan — Componente 5 (nuevo)

**`handleNewCV` en `App.tsx` es una 5ta duplicación del mismo patrón**, no
las 4 que contaba el plan:

```ts
try {
  await saveCV();
} catch (err) {
  console.warn('Error auto-guardando borrador al crear nuevo CV:', err);
}
```
Tiene que migrar a `runWithSafeSave` igual que las otras 4, o el núcleo
nuevo no cumple su propio propósito (que no quede ni una copia a mano del
patrón dando vueltas).

## ➕ Decisión de diseño que el plan no resuelve, hay que definirla antes de programar

`runWithSafeSave` "atrapa el error sin bloquear, y recién ejecuta la
acción" — pero **si el guardado falla de verdad** (no solo warning), hoy
el usuario navega igual y puede perder cambios sin enterarse. Antes de
implementar, elegir:

1. **Silencioso** (lo que dice el plan): guarda si puede, si falla solo un
   `console.warn`, navega/crea/cambia igual. Nunca bloquea al usuario, pero
   puede perder cambios sin que se entere.
2. **Avisar y dejar decidir**: si el guardado falla, mostrar un toast de
   error ("no se pudo guardar, ¿continuar igual?") antes de ejecutar la
   acción — un paso más, pero nadie pierde trabajo en silencio.

---

## Plan de implementación final (orden sugerido)

### 1. Multi-parent en Drive (el hueco más concreto y aislado)
- `googleDriveBackend.ts`: `addFolderAsParent(fileId, folderId)` vía
  `files.update` + `addParents` de la API v3.
- `driveBackupService.ts`: guardar `{ hash: fileId }` en
  `drive_asset_hashes_global` (hoy guarda otra cosa, verificado), y llamar a
  `addFolderAsParent` en la rama de "ya existe" en vez de solo marcar
  `skippedFiles`.

### 2. `safeNavigationEngine.ts` — con la decisión de diseño ya tomada
```ts
export async function runWithSafeSave(
  saveFn: () => Promise<any>,
  actionFn: () => void | Promise<void>,
  onSaveError?: (err: unknown) => void // para el toast, si se elige la opción 2
): Promise<void>
```
Migrar los **5** casos (no 4): `handleNewClick`, `handleOpenSavedClick`,
`handlePricingClick` en `Navbar.tsx`, `handleSwitchDocumentTab` **y
`handleNewCV`** en `App.tsx`.

### 3. `topBarActionRegistry.ts` + repartir los botones
- Registro declarativo `{ id, label, icon, location: 'navbar' | 'tabbar' }`.
- `DocumentTabBar`: dueña de "Nuevo"/"Abrir" (contexto de sesión).
- `Navbar`: se queda con Guardar/Guardar como/PDF/ATS (acciones del
  documento activo).
- Chequeo de gobernanza en `verify-cv-engine-harmony.js`: cada `id` del
  registro aparece en **exactamente 1** de los 2 componentes.

### 4. SaveModal/SavedCVsModal — solo si hace falta después de ver el resto
Sin cambios forzados; revisar con capturas reales tras el punto 3.

---

## Verificación (sin cambios respecto al plan original, ya estaba bien planteada)
- `npx tsc --noEmit` limpio.
- `npm run check-all` completo (typecheck + API + gobernanza + contraste + build).
- Manual: confirmar que después de deduplicar en Drive, la carpeta de la
  versión nueva SÍ muestra el archivo compartido en la consola web de Drive
  (no solo que el upload se saltee).
- Manual: los 5 casos de `runWithSafeSave` (no 4) probados uno por uno.
