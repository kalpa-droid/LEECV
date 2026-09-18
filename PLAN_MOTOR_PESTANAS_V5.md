# Plan — Motor de pestañas tras Document Engine v5

Verificado contra `origin/main` (`0c54f38`) leyendo el código y ejecutando tests/build, no de memoria.

**Síntoma:** editás un CV y la barra de pestañas (pie de pantalla) muestra solo el "+". Además la pestaña no se renombra cuando cargás el nombre.

---

## 1. Diagnóstico (causa raíz confirmada)

El commit `97e752f` (Document Engine v5) sacó 143 líneas de `App.tsx`. Entre ellas, cuatro piezas que sostenían las pestañas:

| Pieza borrada | Para qué servía | Consecuencia hoy |
|---|---|---|
| Registro de la pestaña inicial (`didRegisterInitialTabRef`, fix de `73a06e6`) | Crear la pestaña del documento con el que arranca la sesión | Nadie la crea: la barra queda vacía |
| Sincronizador Núcleo 1 | Mantener título/versión de la pestaña activa | El renombrado no llega a la barra |
| Sincronizador Núcleo 2 | Alinear la ruta (`/crear-tarjeta`, etc.) con el documento activo | Ver Fase 1.1 |
| Reconciliación de provisionales + purga de fantasmas | Limpiar pestañas de documentos inexistentes o vacíos | Ver Fase 1.2 |

Dos agravantes que hicieron que nadie lo notara:

1. **`useState<OpenTabItem[]>([])`** — el estado de pestañas arrancaba vacío y nunca se hidrataba desde `tabStore`; solo se llenaba si algún evento disparaba `setTabs`.
2. **`updateTabTitle` no hace nada si la pestaña no existe.** El renombrado automático (`titleEngine` → `CVContext`) funcionaba bien, pero renombraba una pestaña que nunca fue creada.
3. **El test-guardia fue borrado**, no migrado: `0c54f38` eliminó "REGRESIÓN — App.tsx registra explícitamente la pestaña del documento inicial…" para que la suite pasara. Con el bug presente, 104/104 tests en verde.

Hallazgos secundarios encontrados en la misma auditoría:

- **Abrir desde "Mis archivos"** (`SavedCVsModal` → `onSelectCV`) hacía `setCvData()` directo y jamás registraba pestaña (ni antes de v5).
- **`CVContext.setCvData` llamaba `updateTabTitle` dentro del updater de `setState`.** Eso dispara un `dispatchEvent` global que hace `setTabs` en `App` mientras React renderiza `CVProvider` (render impuro; en dev, warning de "Cannot update a component while rendering a different component").

---

## 2. Fase 0 — Arreglo (HECHO, verificado)

- `workspaceController.ensureDocumentTab(id, docType, docData)`: función pura (sin React), idempotente, crea la pestaña si falta y la marca activa.
- `App.tsx`: estado hidratado con `useState(() => getOpenTabs())`; registro de la pestaña inicial **una sola vez al montar** (un efecto reactivo resucitaría la pestaña recién cerrada, que es el bug de `8b1f619`); efecto de renombrado que solo **actualiza** pestañas existentes; "Mis archivos" registra su pestaña.
- `CVContext.tsx`: se sacó el efecto secundario del updater de `setState`.
- `tests/tabsEngine.test.ts` (8 tests): prueban **comportamiento** contra `tabStore` real con `localStorage` simulado, más una guardia de cableado de `App.tsx`. Verificado que la guardia falla si se revierte el arreglo.
- `scripts/verify-document-engine-contract.cjs` ahora chequea el cableado de pestañas **y está dentro de `check-all`** (antes existía pero nadie lo ejecutaba: no figuraba en `package.json`).

Resultado: `tsc` 0 errores · vitest 112/112 · `build` OK · lint 0 errores · contrato OK · fronteras de módulo 0 violaciones.

---

## 3. Fase 1 — Decisiones que v5 dejó abiertas

### 1.1 Sincronizador de ruta (Núcleo 2)
Sin él, si hay un CV abierto y navegás a `/crear-tarjeta`, nada conmuta el documento. **Antes de restaurarlo, verificar** si el componente raíz (`App`, ~línea 998) remonta `AppContent` por ruta: si lo hace, no hace falta. Si no, restaurarlo como efecto que llame a `switchToTab` (que ya sabe ir al borrador fijo del tipo).

### 1.2 Purga de pestañas fantasma
Ahora que las pestañas persistidas **sí** se hidratan al arrancar, cualquier residuo viejo en `cv_open_tabs` (documentos borrados o borradores vacíos) va a verse. Restaurar la purga como función pura del motor (`purgeGhostTabs`) llamada una vez al montar, con la regla que ya existía: nunca tocar el documento activo.

### 1.3 Un solo modelo de ids
Hoy conviven tres:
- `draft_cv` / `draft_card`… fijos (`CVContext`, `workspaceController`).
- `doc_<tipo>_<fecha>_…` (`generateDocumentId`, usado por "+").
- El "Plan v3 Opción B" (UUID + `isProvisional`), cuya reconciliación fue borrada pero cuyos helpers (`markAsConfirmed`, `isProvisionalDocument`) siguen usándose en `closeTab`.

Elegir uno y eliminar los restos de los otros. Además, el test de "ids únicos entre dos CVs en blanco" fue reemplazado por uno más débil (solo prefijo): recuperar el original.

### 1.4 Límite de 6 pestañas
`openTab` descarta en silencio la más antigua no sucia al abrir la séptima. Avisar con `Toast` o subir el límite.

---

## 4. Fase 2 — Gobernanza

- **Regla nueva para `AGENTS.md`:** un refactor que invalida un test-guardia lo *migra* a comportamiento; no lo borra.
- **`npm ci` falla:** `.github/workflows/check-all.yml` usa `npm ci` pero no hay `package-lock.json` versionado. Commitear el lockfile (o cambiar el workflow a `npm install`).
- **Mover el cableado de pestañas de `App.tsx` a un hook `useDocumentTabs`.** El motor ya es puro; `App.tsx` sigue siendo el archivo donde se acumulan los efectos y donde v5 perdió código sin que nada lo detectara.

---

## 5. Verificación manual (después de desplegar)

1. Abrir `/crear-cv` en ventana privada → hay **una** pestaña "Mi Currículum Vitae".
2. Cargar Apellidos "Burgos" → la pestaña pasa a "Mi Currículum Vitae de Burgos". (Si querés otro formato de nombre, se cambia en `titleEngine.deriveDocumentTitle`.)
3. Cerrar la pestaña → vuelve a la landing y **no reaparece**.
4. "+" → CV nuevo: pestaña nueva y la anterior sigue.
5. "Mis archivos" → abrir un documento → su pestaña aparece y queda activa.
6. Recargar la página → las pestañas persisten.
