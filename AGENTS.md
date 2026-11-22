# AGENTS.md — Reglas del repo, para humanos y agentes de IA por igual

Este archivo es la fuente de verdad de qué núcleo/motor usar para cada tipo de
cambio. Si estás por escribir código que "se parece" a algo que ya existe en
otro lado del repo, casi seguro ya hay un motor para eso — usalo, no lo
reescribas a mano. Esta tabla se generó grepeando el código real, no de memoria.

## Regla 0 — Antes de terminar cualquier tarea

```bash
npm run check-all
```

Tiene que dar 0 errores. Esto **ya está forzado** por:
- `.husky/pre-commit` (rápido: tokens, contraste, léxico, fronteras de módulo)
- `.husky/pre-push` (completo: typecheck + lint + gobernanza + build)
- `.github/workflows/check-all.yml` (corre en GitHub, no se puede saltear ni con `--no-verify` local)

Si estás evaluando saltear un chequeo, no lo hagas — arreglá el caso real o
agregalo a la lista de excepciones explícita del script correspondiente (están
todas documentadas con motivo en `scripts/*.js`), nunca lo ignores en silencio.

## Regla 1 — Tabla: "voy a hacer X → tengo que usar Y"

| Si vas a... | NO hagas esto | Usá este motor |
|---|---|---|
| Consultar/escribir en Supabase | `supabase.from('tabla')` directo en un componente/servicio | `dal.*` — `src/shared/core/storage/dataAccessLayer.ts`. Si la tabla que necesitás no tiene método ahí, agregalo ahí, no hagas la query suelta. |
| Llamar a un endpoint `/api/*` | `fetch('/api/...')` directo | `apiClient.*` / `apiFetch()` — `src/shared/core/utils/apiClient.ts` |
| Leer/cambiar la URL, query params, o navegar | `window.location.*`, `window.open(...)` | `navigation.*` — `src/shared/core/utils/navigation.ts` (incluye `getSearchParams()` para leer varios params juntos) |
| Envolver una operación async que puede fallar | `try { ... } catch (e) { console.error(e) }` a mano | `withErrorHandling()` — `src/shared/core/utils/errorHandler.ts` |
| Validar email / teléfono / DNI / CUIT / URL / un campo de formulario | Un regex nuevo a mano | `isValidEmail`, `isValidPhone`, `isValidDni`, `isValidCuit`, `isValidUrl`, `validateFieldValue` — `src/shared/core/utils/validationEngine.ts` |
| Poner un color (fondo, texto, borde) en un componente de UI (no PDF) | Un hex suelto, `bg-[#xxxxxx]`, o `` `bg-[${colorSystem.x.y}]` `` (¡esto último NO genera CSS real, ver nota abajo) | `colorSystem.*` de `uiDesignSystem.ts` combinado con las variables reales de `src/index.css` (`var(--color-x-y)`) |
| Definir tipografía, radios, sombras, spacing, elevación, z-index de UI | Valores sueltos (`text-[13px]`, `shadow-[0_2px...]`) | `typeScale`, `radius`, `shadow`, `spacing`, `elevationSystem`, `zIndex` de `uiDesignSystem.ts` |
| Mostrar un modal | Reinventar el overlay/backdrop a mano | `Modal.tsx` — `src/shared/core/ui/Modal.tsx` |
| Mostrar una notificación efímera | Un `<div>` de aviso a mano | `Toast.tsx` / `useToast()` — `src/shared/core/ui/Toast.tsx` |
| Pedir confirmación antes de una acción destructiva | `window.confirm(...)` nativo | `ConfirmDialog.tsx` / `useConfirm()` — `src/shared/core/ui/ConfirmDialog.tsx` |
| Un input de texto en un panel/formulario | `<input className="...">` a mano | `Field.tsx` — `src/shared/core/ui/Field.tsx` |
| Una lista editable (agregar/duplicar/eliminar ítems: experiencia, cursos, etc.) | Un `.map()` con botones de editar a mano por sección | `RepeatableSection.tsx` + `RecordFormSection.tsx` — `src/shared/core/ui/` |
| Cualquier cosa relacionada a generar un PDF (CV, tarjeta) | Un renderer nuevo desde cero | Las capas de `src/shared/core/pdf-engine/layers/` (page, márgenes, sectores, objetos fijos, registros, presets, bleed, imposición, colorSystem) + `presetRegistry.ts`. Un documento nuevo = un `Preset` nuevo, nunca un renderer nuevo. |
| Decidir qué features tiene un usuario según su plan | Chequear `plan === 'pro'` a mano en el componente | `useEntitlements()` — `src/shared/core/entitlements/` |
| Texto de UI: nombre de la entidad principal, verbo de exportar/eliminar/guardar | Palabras sueltas a criterio propio | `UI_GLOSSARY` — `src/shared/core/uiTextGlossary.ts` (lo audita `check-module-boundaries.js` automáticamente) |
| Poner un ícono a una sección, producto o acción (Dock, Wizard, Navbar, PDF) | Elegir un ícono Lucide/SVG a ojo, o repetir un mismo ícono entre secciones/botones distintos | `iconCatalog.ts` + `ICON_REGISTRY` — `resolveSectionIconId()` para secciones; `PRODUCT_ICON_IDS` / `UI_ICON_IDS` para productos y acciones. Misma entidad = mismo ícono; entidades distintas = ícono distinto (cero colisiones; lo audita `scripts/check-icon-uniqueness.js`). |
| Diferenciar roles de botones en Dock/Paneles o aplicar config global sin pisar ajustes manuales | Usar el mismo estilo genérico para presets, registros, IA y handoffs, o sobrescribir preferencias manuales en silencio | `DockButtonRole` (`stepSequenceRegistry.ts`), `UiButtonRole` (`uiDesignSystem.ts` + `ActionTileButton role=...`), píldora `globalContextPill` en `StudioNavbar.tsx`, y `configCascadeEngine.ts` + `ManualOverrideBadge.tsx` (cascada 3 niveles con `manualOverrides`). |
| Crear o integrar una nueva app o documento nativo | Pantallas o flujos aislados o importar desde `cv-builder` | Crear cápsula vertical con `npm run new-app` (`src/modules/<app>/{manifest.ts,domain,pdf,ui}`), declarar contrato en `capabilityRegistry.ts` + `appSurfaceManifest.ts`, montar en `src/app/appRegistry.ts` y pasar `verify:app-contract`. |

## Regla 2 — La trampa de los colores dinámicos en clases de Tailwind

**Nunca** escribas `className={`bg-[${algunaVariableJS}]`}` ni `className="bg-[${algo}]"`.
Tailwind genera CSS escaneando el TEXTO FUENTE en build-time — si el valor
depende de JS en runtime, Tailwind nunca genera la regla y el elemento queda
sin estilo, en silencio, sin ningún error. Esto ya pasó una vez en este repo
(220+ casos) y el bug era invisible hasta grepear el CSS compilado.

Si necesitás un color que varía dinámicamente: usá `var(--color-x-y)` (texto
literal, Tailwind lo puede compilar) o pasalo por `style={{ backgroundColor: ... }}`
inline (los estilos inline de React sí evalúan JS en runtime sin problema).

## Regla 3 — Motores con baja adopción todavía (revisar antes de escribir código nuevo en su dominio)

`errorHandler.ts` y `validationEngine.ts` tienen pocos consumidores todavía —
no es que estén mal, es que la migración del código viejo no terminó. Si
tocás un archivo que tiene un `try/catch` o una validación de email/teléfono
a mano, aprovechá y migralo de paso.

## Regla 4 — Antes de crear un motor/núcleo nuevo

Buscá primero si ya existe algo con un nombre parecido (`grep -rn "nombreConcepto" src/shared/core`).
Este repo ya tuvo el problema de tener DOS sistemas para el mismo concepto
(`documentEngine/` vs `capabilities/capabilityRegistry.ts`, `coverPreset`/`layoutStyle`/`layout.layoutStyle`/`activePresetId`
todos significando "qué plantilla está elegida") — uno de los dos siempre
termina muerto y confunde a quien lo encuentra después. Si dudás si ya existe, preguntá antes de crear uno nuevo.

## Regla 5 — Limitaciones conocidas de scripts de auditoría

- **`scripts/check-contrast.js`**: No resuelve gradientes `bg-[image:var(--gradient-X)]`, sólo fondos de color sólido (`bg-[var(--color-X)]`). Al usar un gradiente para el fondo de un botón u objeto interactivo (ej. `--gradient-gold`), verificar manualmente que el color del texto sobre el gradiente cumpla la relación de contraste WCAG 2.1 AA (mínimo 4.5:1).

## Regla 6 — Protocolo obligatorio de fin de sesión de Agentes de IA

**`main` está protegido por un GitHub Ruleset (activo desde 2026-09-06).**
Ningún push directo a `main` es posible, de ningún agente, con o sin
`--no-verify` — GitHub lo rechaza en el servidor (`GH013: Repository rule
violations`). Esto ya no es una convención de texto, es mecánico.

El flujo obligatorio para CUALQUIER cambio, de cualquier sesión de agente:

1. Crear una rama descriptiva (`git checkout -b feat/lo-que-sea`), nunca
   trabajar directo sobre `main`.
2. `git push origin <rama>`.
3. Abrir un Pull Request contra `main` (vía la UI de GitHub, o vía la API
   `POST /repos/kalpa-droid/LEECV/pulls` con el token que corresponda).
4. Esperar a que el check `check-all` corra en GitHub Actions y quede en
   verde — no alcanza con que `npm run check-all` haya pasado en local.
5. Si la PR toca `src/shared/core/` o `api/_lib/` (los núcleos
   compartidos: motor de pagos, catálogo de precios, motor de PDF/tarjetas,
   entitlements), el `CODEOWNERS` exige que **el dueño del repo apruebe la
   PR** antes de poder mergear — es la salvaguarda contra parches o
   duplicación de lógica que ya vive en un núcleo existente, para los
   casos que `check-all` todavía no sabe detectar automáticamente.
6. Recién con el check en verde (y la aprobación si aplica) se puede
   mergear.
7. Después de mergear: ejecutar `git fetch origin && git log origin/main -1
   --format="%H %s"`, confirmar que el hash coincide con lo recién
   mergeado, y registrar la intervención en `SESSION_LOG.md`.

Ninguna sesión puede reportar "pusheado a producción" sin haber completado
los 7 pasos. Un push directo rechazado por GitHub (paso 2 sobre `main`
directamente) no es un error a resolver reintentando — es la señal de que
hay que abrir una rama y una PR en su lugar.

### Versionado obligatorio en cada cambio (desde 2026-11-17, V2.19.1)

**Toda PR que modifique código de producto (`src/` o `api/`) DEBE incluir
el bump de `src/shared/core/version.ts` EN EL MISMO COMMIT que aplica el
cambio** — es lo que ya exigía el encabezado de `version.ts` ("El archivo
debe ser actualizado ANTES del commit que aplica el cambio"); ahora lo
hace cumplir la máquina:

- Fix / ajuste mínimo → incrementa **PATCH** (V2.19.0 → V2.19.1).
- Funcionalidad nueva → incrementa **MINOR** (V2.19.x → V2.20.0).
- Cambio de arquitectura / nuevo esquema / nuevo eje del plan → **MAJOR**
  (V2.x → V3.0).
- El bump viaja con el cambio (no en una PR de release aparte) y cuenta como
  suyo: una PR con N commits de código y un solo bump es válida.
- PRs solo de docs/CI/scripts no requieren bump (no tocan `src/` ni `api/`).
- Lo audita `scripts/check-version-bump.js`, cableado a `npm run check-all`
  y por lo tanto al pre-push, al workflow `check-all` de GitHub Actions
  (que hace checkout con `fetch-depth: 0` para poder comparar contra
  `origin/main`): una PR de código sin bump **no pasa** `check-all` y no se
  puede mergear.
- La edición de `version.ts` toca `src/shared/core/`: el PR que la incluya
  sigue requiriendo la aprobación del dueño del repo (paso 5).

## Regla 7 — Planificación previa obligatoria antes de modificar código

Cada vez que hablemos o se plantee un cambio o nueva funcionalidad para la web:
1. **NO modificar código de inmediato ni ejecutarse sin consultar ("no mandarse de una")**.
2. **Presentar primero un plan claro y conciso**:
   - Qué se va a hacer y objetivo del cambio.
   - Qué componentes/archivos se intervendrán.
   - Qué precauciones o validaciones se considerarán.
3. **Esperar el visto bueno o indicaciones del usuario** antes de escribir código o aplicar cambios.



## Lenguaje sencillo (texto visible) — dos zonas
LEECV es para gente común: tiene una impresora en casa o quiere llevar el archivo a una imprenta.
- **Zona pública** (landing, blog, SEO, `index.html`, manifest, imagen para compartir, textos de compartir y cookies): **cero jerga**. Se habla de lo que la persona hace: "imprimilo en tu casa" / "llevalo a una imprenta". Nunca "vectorial", "imprenta pro", tamaños (A3/A4/A5, "tamaño de hoja/papel"), mm, sangrado, marcas de corte, imposición/pliegos, "PDF nativo" ni DPI.
- **Zona app** (editor, ventanas, menús, Book Studio): ahí hay que elegir hoja, corte, etc., así que el nombre técnico **sí va**, pero **entre paréntesis y después de la explicación sencilla**: `📄 Hoja común (A4)`, `Margen extra para el corte (sangrado)`. Suelto en el texto ("Imprimí en hojas A4") no se admite. "Vectorial", "imprenta pro", "PDF nativo" y DPI siguen prohibidos en toda la app.
- Reglas, modo por zona y ejemplos: `src/shared/core/plainLanguage/plainLanguageRules.ts`; qué archivo es de cada zona: `zoneOfPath` en `plainLanguageEngine.ts`. Para prohibir o permitir una palabra nueva, agregá/cambiá una regla ahí.
- Lo audita `npm run check-plain-language` (pre-commit, `check-all` y `tests/plainLanguage.test.ts`). Un caso interno legítimo (nunca visible) se exime con `plain-language:allow` en la misma línea o la anterior.
- Los códigos internos (`'A4'`, `paperSize: 'A3'`) no son texto visible y no se tocan; lo que cambia es la **etiqueta** que ve la persona.

## Regla 8 — Identidad Canónica y Heurísticas Léxicas (Semántica de Datos)

- **La semántica viaja con el dato:** `sectionId` (p. ej. `experience`, `education`) y `pdfRole` (p. ej. `title`, `badge`, `extra`) son la identidad **canónica**. Nunca se debe derivar la identidad o el tipo de dato a partir de strings visibles o títulos ingresados por el usuario.
- **Las heurísticas léxicas son FALLBACK:** Si se necesita inferir el tipo de un campo dinámico (como en las secciones personalizadas), esa heurística debe ejecutarse *solamente* si el ID o el rol canónico no resuelve.
- **Reglas de implementación para heurísticas:** Al implementar una heurística de matching de texto, siempre se debe:
  1. **Normalizar diacríticos:** Usar `.normalize('NFD')` para no fallar por tildes o acentos extraños (ej: "Período" vs "Periodo").
  2. **Matching estricto:** Anclar la búsqueda (`^...$`) cuando aplique, o usar palabras completas seguras (`\b`), en lugar de `.includes()` débiles para evitar falsos positivos ("Cosas de mi equipo" -> "equipo").
  3. **Trazabilidad obligatoria:** Toda invocación a una adivinanza/heurística debe reportarse (p. ej., `reportMessage`) para saber cuándo se invoca y detectar falsos positivos/negativos en uso real.

## Regla 9 — División de Roles y Flujo de Trabajo Multi-Agente

Para mantener la máxima seguridad, velocidad y orden arquitectónico en LEECV, el trabajo se distribuye entre 4 actores con responsabilidades y etapas estrictas:

### 1. Mapa de Roles

| Actor | Rol Principal | Responsabilidades Clave |
|---|---|---|
| **Kalpa** (Humano) | **Dueño del Producto y Codeowner** | • Define requisitos y prioridades de negocio.<br>• Aprueba o rechaza planes propuestos (**Regla 7**).<br>• Autoriza cualquier acción que afecte producción o secretos.<br>• Revisa y aprueba Pull Requests en GitHub (**Regla 6**). |
| **Antigravity** (IA) | **Agente Ejecutor Principal y Orquestador** | • Crea y gestiona ramas de Git (`feat/...`).<br>• Implementa código, migraciones SQL y tests unitarios.<br>• Ejecuta la suite local de calidad (`npm run check-all`, `vitest`).<br>• Empuja cambios, abre PRs y registra sesiones en `SESSION_LOG.md`. |
| **Claude** (IA) | **Auditor de Seguridad y Segunda Opinión** | • Audita arquitecturas críticas, RLS de PostgreSQL y seguridad de webhooks.<br>• Revisa edge-cases de concurrencia e idempotencia.<br>• Sugiere mejoras defensivas antes de promover a producción. |
| **VS Code / Copilot / Gemini** (IDE) | **Entorno de Trabajo y Control Visual** | • Panel visual donde Kalpa inspecciona los diffs de código.<br>• Asistencia en caliente y autocompletado contextual durante la edición. |

### 2. Flujo de Trabajo por Etapas (Lifecycle de Tareas)

1. **Etapa 1: Definición y Planificación (Kalpa + Agente)**
   - Se plantea la necesidad o plan de mejora.
   - **Puerta de Control (Gate):** Kalpa debe dar el visto bueno explícito al plan antes de modificar código ("no mandarse de una", **Regla 7**).

2. **Etapa 2: Aislamiento y Diagnóstico (Antigravity)**
   - Creación de rama de trabajo descriptiva (`git checkout -b feat/...`). Nunca sobre `main`.
   - Inspección previa del código existente, migraciones aplicadas y tests relacionados.

3. **Etapa 3: Implementación Quirúrgica y Validación Local (Antigravity)**
   - Escritura de código modular reutilizando motores canónicos (**Regla 1**).
   - Desarrollo o actualización de tests unitarios y de integración con mocks seguros.
   - Ejecución de `npm run check-all` hasta obtener **0 errores** (**Regla 0**).

4. **Etapa 4: Auditoría Cruzada (Claude / Gemini)**
   - En cambios sensibles (pagos, base de datos, seguridad, entitlements), se contrasta la solución con Claude para detectar posibles vectores de ataque o fallas de concurrencia.

5. **Etapa 5: Apertura de Pull Request y Verificación en CI (Antigravity)**
   - `git push origin <rama>` y apertura de Pull Request contra `main`.
   - Verificación de que la suite `check-all` en GitHub Actions complete en verde.

6. **Etapa 6: Aprobación Humana y Merge (Kalpa)**
   - Kalpa inspecciona el diff en GitHub o VS Code.
   - Kalpa aprueba como CODEOWNER y ejecuta el merge.
   - Registro obligatorio en `SESSION_LOG.md`.

## Regla 10 — Protocolo Obligatorio para Apps y Subproductos Nativos

Toda nueva aplicación, herramienta o tipo de documento que se integre a LEECV **DEBE construirse como cápsula vertical aislada (`src/modules/<app>/{manifest.ts,domain,pdf,ui}`)** consumiendo la plataforma compartida (`src/shared/{contracts,core,kits}`), sin importar nunca de otro módulo ni tocar el código común del tronco. Ver `docs/ARQUITECTURA_PLATAFORMA.md` y `docs/APP_BLUEPRINT.md`.

### Los 8 Pilares Canónicos de Integración (Innegociables)

1. **Identidad, Contratos y Composition Root:**
   - Registrar en `src/shared/core/capabilities/capabilityRegistry.ts` (`DOCUMENT_TYPE_REGISTRY`, con tipos puros en `src/shared/contracts/`) y `src/shared/core/capabilities/appSurfaceManifest.ts` (`APP_SURFACE_MANIFEST`).
   - Montar el estudio lazy y su proveedor de Dock en `src/app/appRegistry.ts` (`APP_REGISTRY` + `registerDockStepProvider`), dejando a `<StudioRoute />` y `StudioHost` (`StudioNavbar`, `StudioDock`) operar sin `if (docType === ...)` en el tronco.
   - Generar el esqueleto inicial con `npm run new-app -- --id=<id> --title="<Nombre>"`.

2. **Formularios, Paneles UI Canónicos, Ayudas y Taxonomía (Estándar Cero Ruido V3.2):**
   - Inputs: `<Field />` (`src/shared/core/ui/Field.tsx`); listas: `<RepeatableSection />` + `<RecordFormSection />`; íconos: `iconCatalog.ts` + `ICON_REGISTRY`.
   - **3 Canales de Ayuda bien diferenciados:** (1) `<PanelSection helpText="..." />` + `<LidioHelpTrigger />` (globo `?` bajo demanda para explicar *para qué sirve* un botón o control), (2) `<ContextualGuideBox />` (siempre visible solo para orientar *qué redactar o cargar*), y (3) avisos de cambio de estado vía `emitLidioMessage({ kind: 'state' })` en `<SectionSwitch />` (perilla en vez de `ACTIVADA/DESACTIVADA`) y `<VisibilityEyeToggle />` (ojo abierto/tachado en vez de checkbox).
   - **Taxonomía de Botones:** en el Dock lateral asignar siempre `role: DockButtonRole` (`catalog`, `preset`, `record`, `custom_record`, `ai_utility`, `handoff`) con grupos separados por `--ui-dock-separator`; en paneles usar `<ActionGrid />` + `<ActionTileButton role="..." />` (`preset`, `record`, `io`, `export_paid`, `ai`, `handoff`, `destructive`) y `<AIButton />` (solo símbolo IA animado).
   - **Configuración Global + Cascada Anti-Pisado (3 Niveles):** las decisiones globales del documento (región ATS, Casa vs Imprenta, norma editorial) van declaradas con capability `global_context` en la píldora superior `globalContextPill` de `StudioNavbar`. Toda actualización masiva usa `configCascadeEngine.ts` + `<ManualOverrideBadge />` (Nivel 1 Global → Nivel 2 Preset → Nivel 3 `manualOverrides` puntuales) sin pisar nunca en silencio ajustes manuales del usuario.
   - Guardado en disco transparente: `nativeFileDocumentService.ts` + `fileHandleStore.ts` para "Carpeta Segura" y avisos explícitos vía `lidioBus.ts`.
   - Tokens y colores: exclusivamente desde `src/shared/core/uiDesignSystem.ts` y variables CSS de `src/index.css`.

3. **Motor PDF Universal y Registro por Categoría:**
   - Cada cápsula puede definir sus presets/adaptadores/documento PDF dentro de `src/modules/<app>/pdf/` registrando su categoría vía `registerPdfCategoryExporter()` (`src/shared/core/pdf-engine/pdfCategoryRegistry.ts`), sin que `pdfExporter.ts` importe módulos de producto.
   - La vista previa usa `VectorDocViewer` y mantiene el bundle inicial liviano sin `@react-pdf/renderer` en preloads (`check-bundle-budget`).

4. **Gating de Créditos y Pasarela Unificada:**
   - Toda exportación protegida invoca `consumeCreditIfNeeded()` (`useExportEntitlement()`) y abre `PdfCheckoutModal` desde `src/shared/core/studio-host/PdfCheckoutModal.tsx`. Jamás importar modales desde `cv-builder`.

5. **Persistencia Local-First y Puertos Tipados entre Apps:**
   - Guardado local obligatorio por `documentStorageService` (`localDocumentStore` + `localAssetStore`), o bóveda cifrada local (`encryptedVaultDriver`) para datos sensibles.
   - El respaldo en nube es estrictamente opt-in y solo para texto estructurado ligero (`cloudBackupProjections` + `user_preferences`), jamás imágenes ni bóvedas cifradas.
   - Para compartir datos entre apps sin acoplarse (ej. CV → Tarjeta), usar puertos versionados vía `portBroker.ts` (`src/shared/contracts/ports/`).

6. **Trazabilidad y Observabilidad Obligatoria:**
   - Envolver operaciones async con `withErrorHandling()` (`errorHandler.ts`).

7. **IA Unificada y Lidio Modular + Privacidad:**
   - Despachar tareas de IA por `aiClient.executeAiTask()` y `api/_lib/aiTasks/catalog.ts`.
   - Declarar el conocimiento modular de Lidio en `api/_lib/aiTasks/appKnowledge/<id>.ts`.
   - Respetar la política `assistant.privacy`: `'full-summary'` o `'metadata-only'` (las apps cifradas nunca exponen valores ya cargados a Lidio).

8. **Verificación Automática Innegociable:**
   - Ejecutar `npm run check-all` (incluye `verify:app-completeness`, `verify:registry-coverage`, `verify:app-mounted`, `verify:app-contract`, `new-app:selftest`, `check-import-graph`, `check-docType-leaks`, `check-forbidden-doctypes`, `check-bundle-budget`).

> 📖 **Guía Paso a Paso:** Consultar [`docs/APP_BLUEPRINT.md`](file:///c:/Users/Kalpa/Proyectos/LEECV/docs/APP_BLUEPRINT.md) y el mapa maestro en [`docs/ARQUITECTURA_PLATAFORMA.md`](file:///c:/Users/Kalpa/Proyectos/LEECV/docs/ARQUITECTURA_PLATAFORMA.md).



