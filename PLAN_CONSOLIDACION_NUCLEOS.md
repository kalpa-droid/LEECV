# Plan de Consolidación de Núcleos, Cierre de Fugas y Gobernanza Léxica Dinámica (v2)

Revisé tu plan contra el repo real (grep directo, no memoria) y corregí 3 tipos de problema:
1. **Archivos/tablas que no coinciden con la realidad** (ej. `AuthCallbackModal.tsx` no existe).
2. **Alcance incompleto** — tu plan no menciona 3 motores que también tienen fuga (`errorHandler`, `validationEngine`, `RecordFormSection`).
3. **Orden de ejecución** — hacer bloqueante el chequeo de léxico antes de arreglar las violaciones existentes rompe `check-all` para todo el equipo el mismo día.

---

## Fase 0 — Gobernanza léxica dinámica ✅ YA HECHA, verificada localmente, falta commit

No es "se actualizará" (futuro) — ya lo hice y lo corrí. `check-module-boundaries.js` ahora importa `UI_GLOSSARY` real vía `npx tsx` (no una copia hardcodeada de 2 términos), y `package.json` ya invoca `npx tsx scripts/check-module-boundaries.js`. Al correrlo encontró **11 violaciones reales** que antes eran invisibles. Estas quedan para la Fase 1, no las toqué.

**Acción:** solo falta `git add` + commit de estos 2 archivos. No hay riesgo, ya está probado.

---

## Fase 1 — Corregir las 11 violaciones léxicas ANTES de que el check sea bloqueante

Orden importa: si mergeás la Fase 0 sola, `check-all` empieza a fallar para cualquiera hasta que se corrijan estas 11. Hacerlo en el mismo PR/commit evita romper el flujo de todo el equipo.

| Archivo | Término prohibido | Cambiar a |
|---|---|---|
| CertCropperModal.tsx | 'Item' | 'Registro' |
| EditorPanel.tsx | 'Item', 'Almacenar' | 'Registro', 'Guardar' |
| SavedCVsModal.tsx | 'Item', 'Almacenar' | 'Registro', 'Guardar' |
| CandidateList.tsx | 'Item' | 'Registro' |
| TemplateRenderer.tsx | 'Item', 'Template' | 'Registro', 'Preset' |
| cardFaceRenderer.tsx | 'Item' | 'Registro' |
| RecordFormSection.tsx | 'Item' | 'Registro' |
| RepeatableSection.tsx | 'Item' | 'Registro' |

**Antes de tocar cada uno:** confirmar que el match es texto visible en JSX/`title`/`label`/`placeholder`, no un identificador de código (`item` como nombre de variable en un `.map()` es legítimo y no debe tocarse — el regex del script ya filtra esto, pero conviene el ojo humano en 2-3 casos límite).

---

## Fase 2 — Capa de Acceso a Datos (`dal`): tablas y métodos reales

Tu plan tenía las tablas equivocadas en 3 de 5 servicios. Esta es la lista real, con lo que el `dal` ya cubre y lo que falta agregar:

### `dal` ya tiene (no reinventar)
`profiles.getById/update/listConnectedDrives`, `adminNotifications.list/markRead/insert`, `paymentClaims.listPending/insert`, `publishedCvs.getBySlugOrId/upsert`, `organizations.list`.

### Métodos nuevos a agregar en `dataAccessLayer.ts`

| Servicio real | Tabla real | Método nuevo a crear |
|---|---|---|
| `adminService.ts` | `admin_audit_logs` | `dal.adminAuditLogs.list()`, `dal.adminAuditLogs.insert(payload)` |
| `adminService.ts` | `retention_offers` | `dal.retentionOffers.insert(payload)` |
| `organizationService.ts` | `organizations` | `dal.organizations.create/getById` (además del `list` que ya existe) |
| `organizationService.ts` | `org_members` | `dal.orgMembers.list/insert/updateRole/remove` — **12 call sites en este archivo, es el de mayor riesgo, revisar 1 por 1, no reemplazo masivo** |
| `organizationService.ts` | `org_candidates` | `dal.orgCandidates.list/insert/update` |
| `paymentService.ts` | `payment_claims` | ampliar `dal.paymentClaims` con el método que use `paymentService` más allá de `listPending`/`insert` (revisar si hace `update` de estado) |
| `documentStorageService.ts` | `cvs` (no `published_cvs` — es otra tabla) | `dal.cvs.getById/upsert/delete` (nuevo namespace, no reusar `publishedCvs`) |
| `googleDriveBackend.ts` | `published_cvs` | ya cubierto por `upsert`, falta `dal.publishedCvs.update(...)` (este archivo usa `update`, no solo `upsert`) |
| `googleDriveBackend.ts` | `profiles` | ya cubierto por `update`, revisar que el payload calce |

**Riesgo a vigilar:** al migrar, mantené exactamente los mismos `.select()`, filtros y `.order()` que la llamada original — un cambio de shape silencioso ahí no lo detecta el build, solo un smoke test manual.

---

## Fase 3 — Motor de navegación (`navigation.ts`): archivos reales + 1 método que falta

Tu plan mencionaba `AdminDashboard.tsx` y `AuthCallbackModal.tsx` — **ninguno de los dos tiene esta fuga** (el segundo ni existe en el repo). La lista real son estos 9:

`authService.ts`, `PublicCVView.tsx`, `ErrorBoundary.tsx`, `cardDataAdapter.ts`, `googleDriveBackend.ts`, `publishService.ts`, `App.tsx`, `main.tsx`, `CVContext.tsx`.

**Gap real en el motor:** `PublicCVView.tsx` y `App.tsx` necesitan parsear *varios* query params juntos (`new URLSearchParams(window.location.search)` completo), y `navigation.ts` solo expone `getQueryParam(unSoloParam)`. Hay que agregar:

```ts
getSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}
```

Sin este método, 2 de los 9 archivos no se pueden migrar limpio y van a terminar con un `window.location.search` residual disfrazado.

---

## Fase 4 — Los 3 motores que tu plan no incluía (mismo patrón de fuga)

| Motor | Consumidores hoy | Qué falta |
|---|---|---|
| `errorHandler.ts` | 1 archivo | Auditar `try/catch` repetidos a mano en servicios (`adminService`, `paymentService`, `organizationService` son buenos candidatos, ya se están tocando en Fase 2) |
| `validationEngine.ts` | 2 archivos | Ver qué formularios siguen validando a mano antes de sumarlo a esta ronda o dejarlo para la siguiente |
| `RecordFormSection.tsx` | 1 archivo (informática, según mencionaste) | El resto de tabs con listas repetibles del `EditorPanel` — evaluar cuáles migran limpio |

Sugiero **no** meter esto en el mismo commit que Fases 1-3 (ya es mucho cambio simultáneo); dejarlo como ronda siguiente una vez que `dal`/`navigation` estén estables.

---

## Fase 5 — Limpieza de los 84 hex restantes: 1 advertencia importante

Tu plan dice "migrar a `var(--color-*)`" — correcto, pero con esto en cuenta: la migración anterior de 477 hex generó un bug silencioso (interpolación `${colorSystem.x.y}` que Tailwind no puede compilar porque escanea texto fuente, no JS en runtime). El código se veía bien, compilaba bien, y aun así 0% del CSS se generaba.

**Verificación obligatoria, no opcional:** después de migrar, no alcanza con `tsc`/lint/build en verde. Hay que grepear el **CSS compilado** (`dist/assets/*.css`) para confirmar que la variable realmente aparece en una regla real, ej.:
```bash
grep -o "\.bg-\[var(--color-accent-base)\][^}]*{[^}]*}" dist/assets/*.css
```
Si no aparece, el estilo no existe aunque todo lo demás esté verde.

---

## Verification Plan (corregido)

**Automatizado:**
```bash
npm run check-all
```
Debe dar 0 en: typecheck cliente, typecheck API, lint, gobernanza (fronteras + léxico + hex), build.

**Manual, por fase:**
- Fase 2: para cada servicio migrado, un smoke test real contra Supabase (no solo que compile) — login admin, ver notificaciones, crear una organización de prueba, invitar un miembro, publicar un CV. `organizationService.ts` en particular necesita probarse con cuidado por el volumen de call sites.
- Fase 3: recargar `/`, `/admin`, y una URL pública `/c/slug` con query params, confirmar que no quedan blanks ni redirecciones rotas.
- Fase 5: el comando de `grep` sobre `dist/*.css` de arriba, no solo mirar la app en el navegador (podés no notar un color por defecto que "por casualidad" se ve parecido).

---

## Orden sugerido de commits

1. Fase 0 (ya lista) + Fase 1 (11 fixes léxicos) — **juntas**, para no romper `check-all` a mitad de camino.
2. Fase 3 (navigation, agregar `getSearchParams` primero, después los 9 archivos) — más chico y más seguro que Fase 2, buen segundo paso.
3. Fase 2 (`dal`) — el más grande y riesgoso, service por service, empezando por `documentStorageService.ts` (1 tabla, bajo riesgo) y dejando `organizationService.ts` (12 call sites) para el final, con más revisión.
4. Fase 5 (hex restantes) — mecánico, en cualquier momento, con la verificación de CSS compilado.
5. Fase 4 (errorHandler/validationEngine/RecordFormSection) — ronda separada, no urgente.
