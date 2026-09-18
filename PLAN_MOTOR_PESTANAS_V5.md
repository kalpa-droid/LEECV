# Plan — Motor de pestañas tras Document Engine v5 (rev. 2, integra el Plan v7)

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
- **La barra de pestañas está oculta en mobile** desde `b22f6e1` (17/09): `AppShell` la envolvió en `hidden md:block`. Antes se mostraba siempre, y la propia barra tiene `mb-[76px]` para apoyarse sobre el dock móvil, así que el ocultamiento es una regresión. (No explica el caso de escritorio, pero es un bug aparte.)
- **`CVContext.setCvData` llamaba `updateTabTitle` dentro del updater de `setState`.** Eso dispara un `dispatchEvent` global que hace `setTabs` en `App` mientras React renderiza `CVProvider` (render impuro; en dev, warning de "Cannot update a component while rendering a different component").

---

## 2. Fase 0 — Arreglo (HECHO, verificado)

- `workspaceController.ensureDocumentTab(id, docType, docData)`: función pura (sin React), idempotente, crea la pestaña si falta y la marca activa.
- `App.tsx`: estado hidratado con `useState(() => getOpenTabs())`; registro de la pestaña inicial **una sola vez al montar** (un efecto reactivo resucitaría la pestaña recién cerrada, bug de `8b1f619`); efecto de renombrado que solo **actualiza** pestañas existentes y deriva siempre el título del motor; "Mis archivos" registra su pestaña.
- `CVContext.tsx`: se sacó el efecto secundario del updater de `setState`.
- `AppShell.tsx`: la barra se muestra en todos los anchos.
- `titleEngine.ts`: formato de título normativo (ver sección 3) y sello con décima de segundo congelado en el propio documento.
- `tests/tabsEngine.test.ts` (15 tests): comportamiento real de `tabStore`/`titleEngine` con `localStorage` simulado, más guardias de cableado (`App.tsx`, `AppShell.tsx`). Se verificó que la guardia falla si se revierte el arreglo.
- `scripts/verify-document-engine-contract.cjs` chequea el cableado de pestañas **y ahora está dentro de `check-all`** (antes existía pero no figuraba en `package.json`).

Resultado: `tsc` 0 errores · vitest 119/119 · `build` OK · lint 0 errores · contrato OK · fronteras de módulo 0 violaciones.

---

## 3. Contraste con el Plan v7

| Punto del v7 | Veredicto | Qué se hizo |
|---|---|---|
| Causa 1: barra `hidden md:block` en mobile | **Correcta** (y yo la había pasado por alto) | Quitado el ocultamiento. Pendiente cosmético: ver Fase 1.4 |
| Causa 2: el documento inicial no tiene pestaña | Correcta, coincide con esta auditoría | Registro al montar, una sola vez |
| Causa 3: `updateTabTitle` no hace nada si no existe | Correcta | Se mantiene ese comportamiento (ver abajo) |
| Causa 4 / Paso 3: formato `CV - DD/MM HH:mm:ss.d` → `CV - Nombre` | **Aporte nuevo, incorporado** | Implementado en `titleEngine`; el sello sale del id (`generateDocumentId` ya codifica la décima) o queda congelado en `title` para los borradores de id fijo (`draft_cv`) |
| Paso 2: que `updateTabTitle` cree la pestaña si no existe | **Rechazado** | Reintroduce el bug de `8b1f619`: con la última pestaña cerrada `cvData` sigue en memoria y cualquier tecla la resucita. El registro es explícito (montaje, "+", "Mis archivos"), nunca por efecto colateral del renombrado. Hay un test que lo fija |
| Paso 2: efecto de registro sin guarda de "una sola vez" | Parcialmente | Con dependencia `[activeCvId]` es casi equivalente, pero la guarda `didRegisterInitialTabRef` lo hace explícito y no depende de cómo cambie el id |
| Paso 4: notificar a `tabStore` de forma síncrona dentro de `CVContext` | **Rechazado** | Es justo el patrón que se sacó: `dispatchEvent` dentro del updater de `setState` hace `setTabs` en `App` durante el render de `CVProvider`. El título del documento sí se recalcula síncrono en `setCvData`; la pestaña se actualiza en el efecto inmediatamente posterior (sin guardar ni Enter) |
| Paso 5: cookies, modales `dvh`, auto-fit del visor | Válido pero **fuera de alcance** | Va en un plan aparte; no se mezcla con pestañas |
| Paso 6: tests y `check-all` | Correcta, ampliada | Tests de comportamiento en lugar de solo greps del código fuente |

Decisión pendiente sobre el v7: propone `CV - José Ramiro Burgos — Desarrollador Frontend` cuando hay versión de puesto. La barra ya muestra `versionLabel` como insignia al lado del título, así que agregarlo al título lo duplicaría. **No se implementó**; confirmar si se quiere igual.

---

## 4. Fase 1 — Decisiones que v5 dejó abiertas

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

### 1.4 Barra de pestañas en mobile (pulido)
Ya es visible. Falta pulirla para táctil: altura ~36px, `touch-pan-x`, títulos con elipsis más cortos y `pb-[env(safe-area-inset-bottom)]`. Probar en un celular real: en el dock móvil de 76px conviene confirmar que la barra no queda tapada.

### 1.5 Límite de 6 pestañas
`openTab` descarta en silencio la más antigua no sucia al abrir la séptima. Avisar con `Toast` o subir el límite.

---

## 5. Fase 2 — Gobernanza

- **Regla nueva para `AGENTS.md`:** un refactor que invalida un test-guardia lo *migra* a comportamiento; no lo borra.
- **`npm ci` falla:** `.github/workflows/check-all.yml` usa `npm ci` pero no hay `package-lock.json` versionado. Commitear el lockfile (o cambiar el workflow a `npm install`).
- **Mover el cableado de pestañas de `App.tsx` a un hook `useDocumentTabs`.** El motor ya es puro; `App.tsx` sigue siendo el archivo donde se acumulan los efectos y donde v5 perdió código sin que nada lo detectara.

---

## 6. Verificación manual (después de desplegar)

1. Abrir `/crear-cv` en ventana privada → hay **una** pestaña "Mi Currículum Vitae".
2. La pestaña dice `CV - DD/MM HH:mm:ss.d`. Cargar Nombres "José Ramiro" y Apellidos "Burgos" → pasa a `CV - José Ramiro Burgos`. Borrar el nombre → vuelve al sello original (no uno nuevo).
   Tarjeta y Carta igual (`Tarjeta - …`, `Carta - …`); el Libro queda en `Libro - <sello>` para siempre.
3. Cerrar la pestaña → vuelve a la landing y **no reaparece**.
4. "+" → CV nuevo: pestaña nueva y la anterior sigue.
5. "Mis archivos" → abrir un documento → su pestaña aparece y queda activa.
6. Recargar la página → las pestañas persisten.
7. Abrir en un celular (o ventana < 768px) → la barra de pestañas se ve sobre el dock inferior.
