## [2026-11-14] - OCR: Mapeo Completo IA->PDF sin Perdida de Datos (PR #91, feat/ocr-full-pdf-mapping)

**Resumen:**
- Cierra los 6 cortes de contrato diagnosticados por Kalpa en el flujo Importar CV con IA -> PDF:
  1. Header del PDF con solo `fullName`: `TemplateRenderer` cae a `resolveDisplayName` (ya existia) y `resolveInitials` resuelve las iniciales en los 6 placeholders de foto (antes "CV" generico).
  2. `IMPORTABLE_SCALAR_FIELDS` ampliado: `titlePrefix`, `dni`, `cuit`, `birthDate`, `nacionalidad`, `estadoCivil`, `disponibilidad`, `licenciaConducir`, `frase` ya no se descartan.
  3. Aliases sin traductor resueltos en `normalizeImportedCvData`: `location->cityProvince`, `role->quote`, `linkedin/portfolio->redes+website` (API devuelve `linkedin` minuscula), `summary/objective/frase` raiz o dentro de `personalInfo` -> raiz.
  4. `proficiency` de idiomas perdido: `cvDataAdapter.ts` lee `proficiency -> nivel`; normalizacion deriva `nivelDominio/nivel` dentro del loop de listas (no antes, donde `normalized.languages` no existia).
  5. `extract-page` ampliado: schema + prompt piden `givenNames`/`surname` y las 9 secciones faltantes (`objective`, `frase`, `redes`, `hardSkills`, `informatics`, `profession`, `references`, `portfolio`); `consolidate-ats` alineado.
  6. `mergePageFragments` fusiona `summary`/`objective`/`frase`; al confirmar la importacion se activan `contacto` y `datos-personales` (id canonico; `personales` es solo la pestaña del editor); `initialCVData.ts` alineado a `datos-personales`.
- Bonus UX: boton "Usar todo lo detectado" en `ImportReviewDiffModal` (scalars=replace, listas=add o replace sobre duplicado detectado).
- Nuevo contrato de tests `tests/importToPdfPipeline.test.ts` (11 tests end-to-end OCR->PDF). Durante el test se encontraron y arreglaron 5 bugs propios: `linkedIn` vs `linkedin`, copia de summary/objective/frase solo desde personalInfo, derivacion de nivel de idiomas no-op, loop IMPORTABLE_LIST_FIELDS pisando `redes` ya enriquecidas (bloque movido despues del loop) y crash si el raw no trae `personalInfo` (inicializado siempre a `{}`).
- Versiones: Fase 1 commit `b0c1eaf`; Fases 2+3 commit `da7431d`.

**Decision tomada:** un solo PR para las 3 fases (aprobado por Kalpa, Regla 7). `'personales'` es id de pestaña del editor, no seccion renderizable; el id canonico es `'datos-personales'`. Las políticas de formato (`us-resume` oculta dni/birthDate/estadoCivil/etc.) siguen vigentes al render: activar secciones no rompe políticas porque el adapter filtra campos con `resolvePersonalFieldVisibility`.

**Merge (Regla 6 paso 7 - confirmacion de hash):**
- PR: #91 (`feat/ocr-full-pdf-mapping`) mergeada a `main` (squash) por orden explicita de Kalpa.
- Hash confirmado en `origin/main`: `14aab1b3af06ba856e2ea555f4f2b7ffa3577172`.
- CI GitHub Actions: check-all en 1m4s (0 errores). Vercel: deployment completed (preview pass).
- Local antes del push: `npx tsc --noEmit` exit 0; vitest 363 passed / 2 skipped; `npm run check-all` exit 0 (SEO 40/40).

## [2026-11-16] - Book Studio / Lidio: Fase 1+2 — Apertura y Origen PDF (PR #118, fix/book-studio-lidio-integration)

**Resumen:**
- `inferDocumentTypeId` reconoce presets `libro-*`/`book` → docType `"book"` (`capabilityRegistry.ts`); guarda anti-bucle `lastCreatedTabIdRef` en `App.tsx` para `/crear-libro`.
- Origen PDF híbrido: `canUseNativeFilePicker()` (iframe cross-origin → false) + `pickSourcePdf()` tipado (`picked | cancelled | fallback-required`) en `bookAssetManager.ts`; `BookSourceTypeStep.tsx` con `triggerPick` único (nativo → input de respaldo siempre montado).
- Instancia ÚNICA de pdf.js en `BookStudioContent.tsx` (`loadSourcePdf`): arrayBuffer 1 vez, auto-rotación fotocopia, `pdfDoc` compartido con preview, conteo real persistido. Eliminado `handleFileSelect`.
- `PdfPreviewStrip.tsx`: error de apertura visible + "Probar con otro PDF"; miniaturas por `assetId` (getThumbUrl).
- cMaps locales: `impositionEngine.ts` usa `/cmaps/` → CDN → sin cMaps; `scripts/copy-pdfjs-cmaps.mjs` + `prebuild` copian `node_modules/pdfjs-dist/cmaps` a `public/cmaps/` (gitignored).
- Tests nuevos: `inferDocumentTypeId('libro-standard') === 'book'` (+ inferencias existentes) y `pickSourcePdf` fallback en Node.

**Estado:** PR #118 abierta (commit `a87e9e1`); pendiente CI verde + aprobación CODEOWNER (toca `src/shared/core/`). NO mergeada.

**Validación local:** `npm run check-all` EXIT=0 (tests, typecheck, lint, gobernanza, build, SEO 40/40, plain-language OK, contraste 0 nuevas). Pre-commit/pre-push husky verdes. Artefactos (`tsconfig.tsbuildinfo`, `install-windows.ps1`) excluidos.

**Siguiente paso:** Kalpa aprueba #118 → merge squash (sin `--delete-branch`) → verificar hash en `origin/main` → Fase 3 (paridad tapa/contratapa: retiro en blanco sin contratapa en `impositionEngine.ts:~1104`, `calculateFinalBookPageCount`, botón "sin tapa" en UI) en PR aparte.

# Registro de Intervenciones de Agentes (SESSION_LOG)

## [2026-11-13] - Iconos Unicos Canonicos + Blindaje de Contraste (PR #89, feat/unique-icons-contrast)

**Resumen:**
- **Nucleo (Fase 1):** `src/shared/core/ui/iconCatalog.ts` (nuevo) — catálogo central con `SECTION_ICON_IDS` (26 canónicas + `personalizada-1..5` + `card_*` + `social-*`), `PRODUCT_ICON_IDS`, `UI_ICON_IDS` y `resolveSectionIconId(sectionId, cvData)` puro (precedencia: `sectionIconOverrides[slot]` > `customSections[].iconId` > slot determinista > mapeo canónico > `fallback`; normaliza sufijo `-cont` de banners de contenedor).
- `src/shared/core/pdf-engine/layers/icons/iconRegistry.ts`: 58 trazados SVG únicos, cero duplicados (eliminadas colisiones históricas: personales/card_front, cursos/card_back, competencias/objetivo, resumen/experiencia, profesion/portafolio, premios/logros, publicaciones/cursos).
- Motor PDF respeta overrides/iconId: `cvDataAdapter.ts`, `recordTypes.ts`, `TemplateRenderer.tsx`; `activeSectionsDockEngine.ts` lee el resolver central.
- **UI (Fase 2):** `CanvaIconDock.tsx` (desktop+móvil), `WizardModal.tsx`, `Navbar.tsx`, `NewDocumentMenu.tsx` consumen el catálogo; swaps en Portada/Diseno/NuevaSeccion/CardBack/CardSize/LandingPage/RecordFormSection (emoji fuera).
- `NuevaSeccionSection.tsx` persiste `sectionIconOverrides` por slot: ícono determinista para `personalizada-N` sin preset.
- **Contraste (Fase 3):** 25 usos de `--color-primary-*` fantasma corregidos a `--color-accent-*` reales en 10 archivos; 0 referencias restantes en `src/`.
- **Gobernanza (Fase 4):** `scripts/check-icon-uniqueness.js` (Check A trazados duplicados, Check B cobertura canónica + card_* + social-*, Check C colisiones intra-mapa y entre familias) enganchado a `npm run check-all` y `.husky/pre-commit`; `tests/iconUniqueness.test.ts` (10 invariantes); fila nueva en AGENTS.md Regla 1.

**Decisión tomada:** un solo PR para las 4 fases (aprobado por Kalpa, Regla 7). Misma entidad/acción = mismo ícono; entidades distintas = ícono distinto (cero colisiones).

**Merge (Regla 6 paso 7 - confirmación de hash):**
- PR: #89 (`feat/unique-icons-contrast`) mergeada a `main` (squash).
- Hash confirmado en `origin/main`: `8bee26eada9481073f008f7f1ad365aeeedaa5fd`.
- CI GitHub Actions: check-all en 59s (0 errores).
- Vercel Deployment: Deployment has completed.

---
## [2026-11-12] - V2.8.4: Reclasificación Dinámica a 20+ Secciones, Borrador Persistente Anti-Pérdidas y Extracción Completa sin Podas

**Resumen:**
- `src/modules/cv-builder/components/modals/ImportReviewDiffModal.tsx`:
  - Selector de sección por cada registro con dropdown con las 14 categorías canónicas (`SECTION_OPTIONS`).
  - Reclasificación instantánea con adaptación dinámica de campos en vivo (`reclassifyRecord`).
  - Activación automática de cada sección con registros asignados al aplicar (`activateSection`).
- `src/modules/cv-builder/utils/cvImportReview.ts`:
  - `SECTION_OPTIONS` y función `reclassifyRecord(fromField, toField, item)` que convierte atributos (cargo/empresa <-> curso/institución/año <-> proyecto, etc.).
- `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx`:
  - Reinicio automático a `idle` en cada apertura/cierre (`isOpen`).
  - Resguardo automático del borrador extraído en `localStorage` (`leecv_last_imported_draft`).
- `src/modules/cv-builder/components/editor/sections/ImportDataSection.tsx`:
  - Banner de rescate ante cierres accidentales: *"Extracción reciente guardada... [Revisar y clasificar] [Descartar]"*.
  - Limpieza de borrador tras confirmación o descarte.
- `api/cv-import-api.ts`:
  - Ampliado el esquema de extracción y prompt para capturar `coursesAndCertificates`, `projects`, `publications`, `achievements`.
  - Orden estricta a la IA: prohibido recortar a un "top 3"; conservar el 100% de los registros de todas las páginas.
- `src/shared/core/cv-import/mergeFragments.ts` y `mergePageFragments.ts`:
  - Cobertura completa de todas las listas en la fusión de páginas.
- `tests/cvImportReview.test.ts` y `tests/mergeFragments.test.ts`:
  - Pruebas unitarias de reclasificación y fusión multilínea (17/17 pasaron).
- `src/shared/core/version.ts`:
  - Bump a V2.8.4.

**Merge (Regla 6 paso 7 — confirmación de hash):**
- PR: #78 (`feat/ocr-reclassify-and-draft-v284`) mergeada a `main`.
- Hash confirmado en `origin/main`: `bbee47e68aa2676711a9f8bd80abfdcc90184b23`.
- CI GitHub Actions: ✅ `check-all` en 1m7s (0 errores).
- Vercel Deployment: ✅ `Deployment has completed`.

---

## [2026-11-11] - V2.8.3: Resiliencia Total de OCR — canvas 1400px, reintentos con backoff, tolerancia a fallos y fallback Gemini 2.0

**Resumen:**
- `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx`:
  - Canvas optimizado: escala adaptativa con límite de altura a 1400px.
  - Progreso transparente en tiempo real ("Leyendo página X de Y...").
  - Reintentos con backoff y tolerancia a fallos parciales.
- `src/shared/core/cv-import/pageImageEncoder.ts`:
  - Calidad JPEG optimizada `[0.75, 0.62, 0.48, 0.35]`, imágenes livianas (~300KB) que Gemini procesa en 3-5 segundos.
- `api/_lib/aiProviders/gemini.ts`:
  - Timeout 28s y fallback automático a `gemini-2.0-flash` si Gemini 3.8 está saturado (503).
- `api/cv-import-api.ts`:
  - Consolidación ATS resiliente con Groq y fallback a Gemini.

**Merge (Regla 6 paso 7 — confirmación de hash):**
- PR: #77 (`feat/ocr-resilience-fast-pipeline`) mergeada a `main`.
- Hash confirmado en `origin/main`: `ae92192e1998997ad28ece22b497f8b8edc3284d`.
- CI GitHub Actions: ✅ `check-all` en 51s (0 errores).
- Vercel Deployment: ✅ `Deployment has completed`.

---

## [2026-11-09] - V2.5.2 (feat/ocr-fase1-v252): Fase 1 OCR Estabilizado — jobs async, polling, límite 10 páginas

**Resumen:**
- `api/cv-import-api.ts`: nueva ruta `job-status`, límite 10 páginas por job, creación/actualización de jobs en tabla `ocr_jobs`, errores (`ai_not_configured`, `ai_rate_limited`, `ai_provider_error`) marcan job como `failed`.
- `api/_lib/serverDal.ts`: sección `ocrJobs` con 4 métodos (create, getById, update, listByUser) usando `supabaseAdmin`.
- `src/shared/core/storage/dataAccessLayer.ts`: sección `ocrJobs` cliente con los mismos 4 métodos.
- `ImportCvAiModal.tsx`: modo async con polling cada 3s, timeout 5 min, fallback sync, estados visuales "Procesando..." / done / error.

**Flujo implementado:** PDF subido → job `processing` en Supabase → frontend polling 3s → `completed` muestra CV / `failed` muestra error traducido. PDF >10 páginas → mensaje inmediato + sólo primeras 10.

**Estado:** ✅ MERGEADA — PR #68 mergeada a `main`. Hash confirmado: `356a682a3f31d37c97a51ff0e27aa159aaa3d32d`. CI ✅ / Vercel ✅.

**Versión:** V2.5.1 → V2.5.2

---

## [2026-11-09/10] - V2.6.0 (feat/ats-cro-fase2-auditor-pseo): Auditor ATS en vivo + pSEO 52 profesiones

**Resumen:**
- **Eje 1 – Auditor ATS en vivo:** `useAtsLiveScore`, `AtsLiveAuditorPanel`, score pill en `Navbar`, wiring en `App.tsx`/`AppModals.tsx`.
- **Eje 2 – pSEO masivo:** `jobTemplatesCatalog.ts`, `jobTemplatesData.json` (52 profesiones, 7 categorías), `prerenderMeta.mjs`, `JobRoleLandingPage.tsx` (hero AA-safe), sitemap actualizado (83 URLs).
- **Eje 3 – Gobernanza:** bump de versión a `V2.6.0`, `tests/jobTemplatesCatalog.test.ts`, `tests/atsLiveAuditor.test.ts`, `check-all` 0 errores.

**Estado:** PR #69 abierta https://github.com/kalpa-droid/LEECV/pull/69 — CI ✅ SUCCESS (1m21s) / Vercel ✅ — `mergeStateStatus: CLEAN` — pendiente aprobación CODEOWNER (toca `src/shared/core/`).

**Versión:** V2.5.2 → V2.6.0

## [2026-11-01] - V2.5.0 (feat/hotfix-login-validaciones-v250): Hotfix validaciones + mejoras landing + artículos blog

**Resumen (Fase A + Fase B + landing/blog):**
- Fase A (hotfix): corregida regex email (`[^\s@]`) que bloqueaba correos con 's'; corregido patrón código (`^[0-9]{6}$`); `requestOtp` con `shouldCreateUser`.
- Fase B (pestañas): modo `login` (`shouldCreateUser: false`) / `register` (`true`); sin alta silenciosa.
- Landing: 3 FeatureCards (`coverLetter`, `professionalDesign`, `transparency`); Portal con `Cartas`; i18n actualizado.
- Blog: artículos existentes cubren todos los dolores (`MANUAL_DOLORES_Y_BENEFICIOS.md`).

**3 decisiones confirmadas:** 2 pestañas ✅ / no alta silenciosa ✅ / conservar CV local ✅

**Estado:** rama `feat/hotfix-login-validaciones-v250` (`ade7449`); `check-all` 0 errores; build OK; 284 tests passed.

## [2026-11-01 22:54] - Merge registrado: Fase D (`23c6702`) + Fase A/B (`ade7449`) sobre base `71c4f91`

**Merge (Regla 6 paso 7 — confirmación de hash):**
- `main` confirmado: `71c4f91` (`Feat/estrategia ats cro (#64)`)
- Ramas lista para PR: `feat/hotfix-login-validaciones-v250` (`ade7449`) + `feat/panel-cuenta-creditos-fase-d` (`23c6702`)
- No push directo a `main` (GitHub Ruleset `GH013` activo desde 2026-09-06).
- `.opencode/CONTEXT.md`: creado con registro de traspaso completo (agente, archivos, decisiones, próxima acción: Fase C/E/F).
- CV local conservado en logout confirmado: `authService.ts:109-128` solo limpia claves `sb-`/`auth-token`; IndexedDB y datos de editor no se tocan.

Este archivo documenta los cambios realizados en el repositorio por agentes de IA, para mantener un rastro histórico de qué se hizo, por qué y en qué momento.

## [2026-10-31] - V2.3.3: Motor Canónico de Acreditación y Consumo de Créditos Unificado

**Resumen:**
Se eliminaron discrepancias entre el motor de visualización de créditos y el motor de consumo. `getTokenStats` en el DAL ahora consulta de forma unificada por `user_id` y `email`, `useEntitlements` sincroniza en tiempo real tanto los derechos como el balance visual ante consumos y recargas, y se conectó la auto-acreditación (`claimCreditsOnAuth`) inmediatamente al retornar de pasarelas de pago en `App.tsx`.

**Acciones Tomadas:**
- **Núcleo de Datos (`src/shared/core/storage/dataAccessLayer.ts`)**:
  - `getTokenStats` adaptado para aceptar identificador compuesto (`{ userId?: string, email?: string }`) y realizar consulta combinada con `.or(user_id.eq,email.eq)`. Resuelve cualquier desfasaje por tokens acreditados a nivel UUID vs email.
- **Motor de Derechos (`src/shared/core/entitlements/useEntitlements.ts`)**:
  - `fetchStats` refactorizado con `useCallback` para consultar tokens por identidad canónica.
  - `consumeExport` actualiza el balance de tokens localmente de inmediato tras cada exportación exitosa.
  - `refreshEntitlements` ejecuta concurrentemente la actualización de derechos (`useExportEntitlement`) y el balance de tokens (`fetchStats`).
- **Retorno de Pagos (`src/app/App.tsx`)**:
  - `procesarRetornoPago` ahora invoca `claimCreditsOnAuth(user)` y `refreshEntitlements()` tras capturas de PayPal o confirmaciones de Mercado Pago, asegurando que los créditos aparezcan sin necesidad de refrescar el navegador.
- **Gobernanza y Calidad**:
  - Versión actualizada a `V2.3.3` en `src/shared/core/version.ts`.

## [2026-10-31] - V2.3.2: Botón de Iniciar Sesión en Landing Page, Login OTP/Contraseña Robusto y Extracción de PDF con IA sin Bloqueos

**Resumen:**
Se incorporó el botón de "Iniciar sesión" en la cabecera y el hero de la Landing Page, se resolvió la persistencia de sesión al registrarse o iniciar sesión (sincronización síncrona en React y soporte a código OTP de 6 dígitos que entrega sesión activa sin trabas de confirmación de email), y se eliminó la restricción que bloqueaba la extracción de PDF con IA para usuarios invitados.

**Acciones Tomadas:**
- **Landing Page (`src/modules/landing/LandingPage.tsx`)**:
  - Incorporado botón visible de "Iniciar sesión" en la barra de navegación superior (junto al selector de temas) y en la sección Hero como botón secundario. Si el usuario ya está autenticado, muestra una píldora con su nombre/correo y acceso a "Mi Cuenta".
  - Enrutamiento y modal conectados en `src/app/App.tsx` mediante estado y callback `onOpenLogin`.
- **Autenticación y Persistencia (`AuthContext.tsx`, `authService.ts`, `LoginModal.tsx`)**:
  - `authService.ts`: `signup` devuelve tanto el usuario como la sesión (`{ user, session }`). Al hacer login con contraseña se ejecutan reclamos de créditos huérfanos con `claimCreditsOnAuth`.
  - `AuthContext.tsx`: `initAuth` sincroniza `user` y `profile` de manera síncrona en React utilizando `supabase.auth.getUser()`. Las funciones `login`, `signup` y `logout` actualizan el estado de forma inmediata.
  - `LoginModal.tsx`: selector de pestañas que permite el acceso rápido vía código por email (OTP de 6 dígitos) recomendado y acceso tradicional por contraseña. Si el registro con contraseña requiere confirmación de correo en Supabase, muestra mensaje instructivo claro sin cerrar el modal engañosamente.
  - `CreditsModal.tsx`: botón de rescate "Iniciar sesión" para usuarios que abren el modal de créditos como invitados.
- **Extracción de PDF con IA (`ImportCvAiModal.tsx`)**:
  - Eliminado el bloqueo estricto que abortaba la importación si no existía sesión de Supabase previa. La extracción utiliza el rate limiting por IP del backend `cv-import-api.ts` y asocia las credenciales de sesión cuando están disponibles.
- **Gobernanza y Control de Calidad**:
  - Versión actualizada a `V2.3.2` en `src/shared/core/version.ts`.
  - Typecheck: 0 errores.
  - Pruebas unitarias: 273 pasadas, 0 fallidas.
  - Auditoría de contraste WCAG 2.1 AA: 0 violaciones nuevas.
  - Límites de módulos y lenguaje sencillo: 0 violaciones.

## [2026-10-31] - Etapas 2 y 3: Webhook Guest Credits, Alertas WhatsApp Admin (+5493878342772), Login OTP Passwordless y Panel Admin 360° (PR #54)

**Resumen:**
Se completaron las Etapas 2 y 3 del plan maestro (`.opencode/plans/plan-pagos-admin-magic-link.md`): backend de pagos adaptado para escribir créditos huérfanos a `unclaimed_email_credits`, alertas automáticas de WhatsApp al administrador ante eventos críticos, modal de login passwordless (OTP/Magic Link de 6 dígitos) en 2 pasos, botón de rescate por WhatsApp en checkout de PDF, y panel administrativo con búsqueda instantánea de clientes, acreditación rápida de créditos con motivo obligatorio y visor de auditoría de errores `admin_error_logs`.

**Acciones Tomadas:**
- **Backend de Pagos y Webhooks (Etapa 2 - PR #54)**:
  - `api/_lib/applyPayment.ts`: cuando un usuario invitado compra un pack (5 o 10 PDFs), los créditos se registran en `unclaimed_email_credits` con estado `held` en lugar de fallar o requerir sesión previa.
  - `api/_lib/whatsappAlert.ts`: módulo no bloqueante para despacho de alertas a WhatsApp admin (`+5493878342772`) ante pagos huérfanos, incidencias o compras de invitados.
  - `supabase/migrations/20261031_fix_payments_admin_contracts.sql`: corrección de contratos SQL: agregada columna `detail` y CHECK expandido en `admin_notifications` (incluye `'payment_held_guest'`), y columna `updated_at` en `payment_claims`.
- **Frontend y Panel Admin (Etapa 3 - PR #54)**:
  - `src/modules/auth/components/LoginPasswordlessModal.tsx`: interfaz passwordless en 2 pasos (ingreso de email con solicitud de OTP de 6 dígitos + ingreso de código con confirmación y auto-claim automático).
  - `src/modules/cv/components/modals/PdfCheckoutModal.tsx`: agregado botón directo de rescate y consulta por WhatsApp contextual antes de abonar.
  - `src/modules/admin/components/UsersTab.tsx`: buscador de usuarios por email, botones rápidos de acreditación manual (+1, +5, +10 créditos) con prompt de justificación obligatoria que invoca `grant_export_tokens`, y botón de contacto por WhatsApp.
  - `src/modules/admin/components/AuditAndErrorsTab.tsx`: visor filtrable de `admin_error_logs` por nivel (ERROR, WARN, INFO), origen y fingerprint para trazabilidad y diagnóstico en tiempo real.
- **Auditoría y Pruebas**:
  - Corrección de pruebas en `tests/applyPayment.test.ts` para validar inserción en `unclaimed_email_credits`.
  - Corrección de ratios de contraste WCAG AA en `AuditAndErrorsTab.tsx`, `LoginPasswordlessModal.tsx` y botón WhatsApp en `UsersTab.tsx`.

**Validación y publicación:**
- `npm run check-all`: 257 pruebas aprobadas, typecheck en verde, 0 violaciones de tokens y contraste (0 en modales), prerenderizado de 25 rutas completado.
- PR [#54](https://github.com/kalpa-droid/LEECV/pull/54) aprobada y fusionada con squash a `main`. Commit de merge: `fd20051cc94bb2aca889f66510667d7f747a7286`.

## [2026-10-30] - Etapa 1: Autenticación Passwordless (OTP/Magic Link), Auto-Acreditación por Email y Bolsillo de Créditos (PR #51 y #52)

**Resumen:**
Se incorporó el plan maestro integral en `.opencode/plans/plan-pagos-admin-magic-link.md` (PR #51) y se completó la Etapa 1 de la arquitectura (PR #52) reemplazando la dependencia de contraseñas por autenticación OTP/Magic Link, creando el bolsillo de créditos de invitado en `unclaimed_email_credits` y asegurando la auto-acreditación inmediata al iniciar sesión.

**Acciones Tomadas:**
- **Plan Maestro (PR #51)**: Documentación de los 6 ejes canónicos: coherencia de precios PayPal/Mercado Pago, auto-acreditación por email, autenticación passwordless (Magic Link / OTP 6 dígitos), alertas WhatsApp (+5493878342772), auditoría nativa de errores y panel admin 360°.
- **Autenticación Passwordless (PR #52)**:
  - `src/shared/core/auth/authService.ts`: implementación de `requestOtp(email)` y `verifyOtp(email, token)` sobre Supabase Auth; función `claimCreditsOnAuth(user)` no bloqueante e idempotente.
  - `src/shared/core/auth/AuthContext.tsx`: expone `requestOtp` y `verifyOtp` actualizando reactivamente la sesión y el perfil.
  - `src/shared/core/storage/dataAccessLayer.ts`: nuevo método `dal.createUnpaidToken()` con fallback seguro a RPC para checkout sin sesión previa.
  - Checkout de invitados en `PdfCheckoutModal.tsx` y `PricingModal.tsx` actualizado para usar la RPC de invitado.
- **Base de Datos (`supabase/migrations/20261030_email_credit_claim_and_admin_error_logs.sql`)**:
  - Tabla `unclaimed_email_credits` con índice único sobre `payment_id` (`<proveedor>:<external_id>`) y RLS estricto.
  - Función transaccional y `SECURITY DEFINER` `claim_credits_on_auth()` que traspasa los créditos al balance real en el primer login.
  - RPC `create_guest_export_token()` para emitir tokens pagables de invitado sin comprometer la tabla `pdf_export_tokens`.
  - Tabla `admin_error_logs` con RLS para registro nativo de excepciones de frontend, webhooks y APIs.
  - Políticas de RLS corregidas en `pdf_export_tokens` para permitir que el usuario consulte sus propios tokens válidos.

**Validación y publicación:**
- `npm run check-all`: 258 pruebas unitarias aprobadas, typecheck en verde, 0 violaciones de gobernanza, prerenderizado de 25 rutas completado.
- PR [#52](https://github.com/kalpa-droid/LEECV/pull/52) aprobada y fusionada con squash a `main`. Commit de merge: `8681abdcf7dda6b1c87ff105447618e78e1651b0`.

## [2026-10-29] - Corrección de hallazgos de auditoría frontend-visual A–F (UI-001 a UI-016)

**Resumen:**
Se implementaron las correcciones de la auditoría UI en modo local (servidor preview sobre `dist`, 3 temas nativos `day`, `night`, `teal_ocean` y simulación móvil 360/390/412 px). Se corrigieron problemas de capas (z-index), contraste WCAG, consistencia de planes de pago, prerenderizado y robustecimiento de scripts de gobernanza.

**Acciones Tomadas:**
- **P1 (Bloqueos de compra y consistencia):**
  - **UI-001** `Modal.tsx`: actualizado a `zIndex.modal` (9999) para evitar que el dock cubra los footers en pantallas de 360 px.
  - **UI-002** `CreditsModal.tsx`: migración de variables inexistentes `--color-accent-blue-*` a tokens semánticos oficiales; el bloque de IA ahora es visible en tema default.
  - **UI-003** `useExportEntitlement.ts`: chequeo de `plan_vence` antes de otorgar exportación ilimitada a planes vencidos.
  - **UI-004** `scripts/prerender.mjs`: canonical tag individualizado por ruta (ya no todas apuntan al home).
  - **UI-005** `scripts/prerenderMeta.mjs`: landing (`/`) incluida en prerenderizado estático con metadatos completos.
  - **UI-006** `CreditsModal.tsx` y `PdfCheckoutModal.tsx`: aplicación de `button.base` (padding, radio y tipografía del sistema de diseño).
  - **UI-007** `PersonalInfoFields.tsx` y `VectorDocViewer.tsx`: contraste corregido a ratios superiores a 4.5:1.
- **P2 (SEO e integridad de textos):**
  - **UI-008** `public/sitemap.xml`: agregados los 21 artículos del blog al sitemap canónico.
  - **UI-009** `index.html`: remoción de `maximum-scale=1.0` (WCAG 1.4.4) y placeholder de verificación de Google; prevención de H1 duplicado en páginas legales.
  - **UI-013** `pricing.ts`: corrección de paréntesis huérfano y traducción de términos técnicos a lenguaje sencillo.
- **P3 (Reglas de prevención y scripts):**
  - **UI-014**: Corrección de 8 interpolaciones rotas de `${elevationSystem.*}` con comillas simples a template literals reales.
  - **UI-015**: Endurecimiento de `audit-ui-tokens.js` (ejecuta `RAW_HEX_REGEX`), `check-token-usage.js` y `check-contrast.js` (detecta variables CSS indefinidas).
  - Creación de allowlist y baselines documentados (`scripts/ui-tokens-allowlist.json` y `scripts/contrast-baseline.json`).

**Validación y publicación:**
- `npm run check-all`: 0 errores en todas las suites.
- PR [#49](https://github.com/kalpa-droid/LEECV/pull/49) fusionada con squash a `main`. Commit de merge: `ad3b2c40531acc1fc5af8b73c9226d8c91101ee1`.

## [2026-10-29] - Suite de auditoría multiagente, SEO y fiscalización de núcleos

**Resumen:**
Se configuró el entorno OpenCode multiagente con delimitación estricta y checklists especializadas para LEECV (PR #46, #47, #48), estableciendo a `@gestor` como orquestador y asignando mandatos profundos de contraste, motores anti-parche, SEO técnico/semántico y pruebas de navegador.

**Acciones Tomadas:**
- Creación de `opencode.json` y `.opencode/agents/` (`gestor`, `arquitecto`, `desarrollo-rapido`, `frontend-visual`, `testing-qa`).
- Integración del comando `/auditar` y checklists en `.opencode/audits/` con registro en `docs/auditoria/registro.md`.
- Mandato a `@frontend-visual` para contraste en 3 temas, gradientes y SEO semántico / Google Search Console.
- Mandato a `@desarrollo-rapido` para fiscalización de motores oficiales según Regla 1 de `AGENTS.md` (DAL, apiClient, navegación, withErrorHandling, validaciones).
- Mandato a `@testing-qa` para auditoría no cosmética (validación de consecuencias de pagos en Supabase), DOM real y SEO técnico (prerender de 24 rutas, sitemap, robots).
- PR [#48](https://github.com/kalpa-droid/LEECV/pull/48) fusionada con squash a `main`. Commit de merge: `5bc7a14ec12b59628aa4ffeb627bc80fb48c48a7`.

## [2026-10-25] - Control manual de exportación PDF, bandeja de pagos retenidos y acreditación idempotente

**Resumen:**
Se incorporó un interruptor administrativo de tres estados para la exportación PDF (`automatic` / `enabled` / `disabled`, es decir automático / permitido manual / bloqueado manual), con auditoría obligatoria y motivo, más una bandeja de pagos retenidos para los cobros que Mercado Pago y PayPal informan como pendientes o en revisión.

**Acciones Tomadas:**
- **Migración `20261014_admin_pdf_export_access.sql`**: agrega `profiles.pdf_export_access_mode`, columnas de resolución en `pending_grants`, índice de retenidos sin resolver y la RPC `check_and_consume_export_entitlement` (permitido manual devuelve `true` sin consumir créditos; bloqueado devuelve `false`; automático respeta plan pro y tokens pagos).
- **Migración `20261025_pdf_export_access_hardening.sql`**: cierra un hueco crítico — `pdf_export_access_mode` no estaba protegido por `protect_privileged_columns`, por lo que cualquier usuario podía auto-habilitarse. Se agrega el trigger, las RPC `admin_set_pdf_export_access` y `admin_export_token_balances`, la vista de auditoría `pdf_status_logs` sobre `admin_audit_logs`, `hold_reason`/`export_token` en `pending_grants` y los checks de estado.
- **Pagos retenidos**: `applyPayment` ahora retiene los pagos con `providerStatus === 'pending'` (motivo `provider_pending`) sin acreditar nada, y guarda `export_token` para poder resolver ventas individuales. Se suman los motivos `amount_mismatch` y `missing_profile`. Mercado Pago interpreta `pending`/`in_process`/`authorized`/`in_mediation`; PayPal interpreta `PAYMENT.CAPTURE.PENDING`.
- **Acreditación idempotente**: el webhook de aprobación acredita el pago y luego resuelve automáticamente la retención previa (`resolveIfPending`), sin reabrir pagos ya completados. La limpieza fallida no tumba el webhook: se registra en Sentry y la fila queda resoluble a mano.
- **Panel admin**: selector de modo con motivo obligatorio (5–500 caracteres), badge de modo, saldo real de exportaciones vía `admin_export_token_balances`, historial de acreditación y bandeja de retenidos (`PaymentsAdminTab`, `PendingGrantsTab`) con resolución manual de packs y de ventas `single_pdf`.
- **Cliente**: `useExportEntitlement` lee el modo y llama a la RPC de consumo; `PdfCheckoutModal` decide el botón con `canExport` en lugar de `credits > 0` y muestra un mensaje específico cuando el acceso está bloqueado.
- **Pruebas**: retención de pagos pendientes, no reapertura de un pago completado, extracción de estados pendientes de ambos proveedores y un test de integración local de los tres estados (incluido el bloqueo de auto-escalada y el registro de auditoría).

**Validación y publicación:**
- `npm run check-all`: aprobado en local y en el hook de pre-push; 258 pruebas OK, 2 omitidas por requerir Supabase local; typecheck, lint, gobernanza, build y SEO en verde.
- `git diff --check`: sin errores de espacios.
- Rama `feat/admin-credit-account-controls`, PR [#44](https://github.com/kalpa-droid/LEECV/pull/44) abierta contra `main`. `check-all` en GitHub Actions ✅.
- PR #44 fusionada con squash el 2026-10-26. Commit de merge en `main`: `fd94f3b117e768cff70604628aaf7ce24b97c194`.

**Despliegue de base de datos:**
- Ambas migraciones quedaron aplicadas en el proyecto `gzsdmsiefswgnyycrmsk` (verificado con `supabase migration list`: `20261014` y `20261025` figuran en remoto).
- Hallazgo durante la aplicación: la base no tenía `public.admin_audit_logs` porque `20260820_protect_plan_columns_and_claims.sql` nunca se aplicó completa (sólo existía `payment_claims`). La `20261025` ahora crea la tabla de forma idempotente con su RLS y política de lectura para admin, así que la vista `pdf_status_logs` y el RPC funcionan sin depender de esa migración vieja.
- Prueba de humo ejecutada en una transacción revertida: `admin_set_pdf_export_access` devolvió `automatic -> enabled`, la vista registró el motivo y `admin_export_token_balances` respondió vacío. No quedaron cambios de datos.
- Durante la verificación se corrigió el consumidor que ya existía roto: `dal.adminAuditLogs` (`src/shared/core/storage/dataAccessLayer.ts`) escribía y buscaba `performed_by`/`action`, pero el esquema canónico usa `admin_id`/`action_type`. Ahora inserta y lista con las columnas correctas; la búsqueda por admin compara `admin_id` por igualdad y solo con un uuid completo (la columna es uuid, no admite ILIKE).
- Además, `admin_audit_logs` no tenía política de INSERT, así que el panel no podía registrar acciones aunque las columnas fueran correctas. Se agregó la política `admin inserta logs` para `authenticated` con `is_admin(auth.uid())` y `admin_id = auth.uid()`, y ya está aplicada en la base.

## [2026-10-10] - Integración del flujo de postulaciones, cartas e importación revisable

**Resumen:**
Se integró la preparación de postulaciones al editor de CV, manteniendo intacto el CV maestro y vinculando cada copia a su vacante y carta de presentación.

**Acciones Tomadas:**
- Se agregó la creación de una copia independiente para cada postulación, con captura compartida de información de la vacante.
- Se integró una pestaña de carta editable al CV, con borrador de IA revisable, visor y exportación separada. La carta reutiliza colores y tipografía de la versión del CV.
- Se centralizó la importación de copia de LinkedIn, archivos PDF/foto y texto pegado. Los datos extraídos pasan por una revisión explícita antes de combinarse; los datos existentes se conservan por defecto y las listas se revisan por registro.
- Se añadieron propuestas asistidas por IA para adaptar el objetivo, el resumen y las competencias con base en la información disponible, sin aplicarlas automáticamente.
- Se ajustaron estilos y se ejecutó la auditoría de contraste en los temas soportados.

**Validación y publicación:**
- `npm run check-all`: aprobado; 33 archivos de prueba y 236 pruebas pasaron.
- La PR [#32](https://github.com/kalpa-droid/LEECV/pull/32) se fusionó el 2026-10-10. Commit de merge: `4f2852686417b002bceba11219cd75d5abd6747e`.
- Verificación manual de navegación en escritorio y móvil, creación de postulación, vista de carta y apertura de la exportación separada.
- Durante la prueba local, Supabase respondió 404 para `template_presets`; se registró como incidencia ajena a la integración y pendiente de revisión del backend.

## [2026-09-27] - Remoción de Lógica Stateful de Pagos y Publicación Web

**Resumen:**
Migración a una arquitectura de facturación stateless ("guest-first") donde el estado del checkout depende únicamente de un `exportToken` emitido por Lemon Squeezy en lugar de una sesión de usuario.

**Acciones Tomadas:**
- **Eliminación de features deprecadas**: Se removieron por completo `AuthProvider`, `CloudStatusModal`, `AccountMenuButton`, e integraciones con `seoIndexingEngine` relacionadas con publicación web.
- **Refactorización de `applyPayment`**: Se actualizó `src/shared/core/payments/applyPayment.ts` para soportar pago sin autenticación, usando el `exportToken` (pasado en custom_data de Lemon Squeezy o webhook metadata) para activar el documento en la tabla `pdf_export_tokens`.
- **Mocking en Tests**: Se actualizaron las baterías de tests (`tests/applyPayment.test.ts` y `tests/paymentProviders/paymentWebhookIntegration.test.ts`) pasando un `fakeAdminClient` explícito para testear las llamadas de Supabase Admin (utilizando `from().update().eq()`).
- **Unificación de Componentes**:
  - `PdfCheckoutModal.tsx` fue actualizado para manejar el flujo sin Auth y despachar el `exportToken`.
  - Se creó/actualizó `usePageAwareCreditGate` y se incorporó exitosamente en el Navbar del CV, en el `TemplateMenu.tsx` y en el export de `App.tsx` para interceptar descargas de forma unificada en todo el proyecto.
- **Auditorías**: Se removieron chequeos de `canPublish` de `verify-document-engine-contract.cjs` ya que la función ya no existe.

**Estado Actual:**
- La base de código compila satisfactoriamente.
- `npm run check-all` debe pasar exitosamente.

---

## [2026-11-01] — Registro Regla 6 paso 7 (Post-merge feat/estrategia-ats-cro)
- **Merge confirmado**: `feat/estrategia-ats-cro` → `main` (hash `71c4f91`, mensaje: `Feat/estrategia ats cro (#64)`).
- **Estado**: `main` = `71c4f91`; `origin/main` sincronizado. Working tree limpio.
- **Verificación**: `npm run typecheck` = 0 errores; `npm test` = 284 passed / 2 skipped; `npm run build` = OK; `verify:seo` = 40/40.
- **Acción**: Registro completado en `.opencode/CONTEXT.md` y `SESSION_LOG.md`. No requiere más acciones de merge.

## [2026-11-13] â€” Registro Regla 6 paso 7 (Post-merge PR #79 â€” V2.8.6)
- **Merge confirmado**: PR #79 (`feat/gemini-multimodal-resilience`) â†’ `main` vÃ­a squash. Hash: `1729cc28ccff4872569cbec5d2669928012615b8`. Mensaje: `feat(ai): pipeline OCR completo Groq Vision, multi-key rotation, presupuesto 50s, guardado progresivo (V2.8.6) (#79)`.
- **VerificaciÃ³n post-merge**: `git fetch origin` â†’ `origin/main` = `1729cc2` (coincide con `mergeCommit.oid` devuelto por la API y con `mergedAt: 2026-11-13T01:35:08Z`).
- **Contexto del merge**: la web de GitHub bloqueaba el merge con "Merge already in progress" y luego "The server is currently unable to perform this operation", sin incidente activo en githubstatus.com y con `mergeStateStatus: CLEAN`. `gh pr merge` (GraphQL) fallÃ³ con error 5xx genÃ©rico. Se completÃ³ vÃ­a REST `PUT /repos/kalpa-droid/LEECV/pulls/79/merge` con `merge_method=squash` (autenticado como kalpa-droid).
- **Nota de protocolo**: la PR toca `src/shared/core/` y `api/`; el merge se hizo por orden directa de Kalpa en esta sesiÃ³n, **sin aprobaciÃ³n CODEOWNER registrada** en la PR (`reviewDecision` vacÃ­o).
- **Estado del cÃ³digo**: `npm run check-all` en verde antes del push (tests 300 passed / 2 skipped, SEO 40/40, prerender 80 rutas). Checks de GitHub Actions y Vercel en verde sobre la PR.
- **Working tree**: `SESSION_LOG.md` con cambios previos de Kalpa (V2.8.4) + esta entrada, sin commitear. `mejoraocr.docx` sigue sin trackear. Rama local `feat/gemini-multimodal-resilience` conservada en `68648a7`.

## [2026-11-13] — Registro Regla 6 paso 7 (Post-merge PR #81 — V2.8.7)
- **Merge confirmado**: PR #81 (`fix/groq-live-models-retry`) → `main` vía squash. Hash: `6e7d8fea1e3f1b3026265de74dc9733361c7669a`. Mensaje: `fix: Groq con modelos vigentes (GPT-OSS 120B / Qwen 3.8 Vision), telemetria con modelo real, reintento selectivo persistente (V2.8.7) (#81)`.
- **Contexto**: remediación de hallazgos post-V2.8.6 — las 3 referencias de modelo Groq estaban deprecadas para el tier free/developer (`llama-3.3-70b-versatile` shutdown 2026-08-16 → `openai/gpt-oss-120b`; `llama-3.2-11b-vision-preview` shutdown 2025-04-14 → `qwen/qwen3.8-27b`; fallback `llama-4-scout` shutdown 2026-07-17). Incluye: reintento selectivo conserva páginas que vuelven a fallar; rotación multi-key (8 claves/proveedor, salto con 429) en `extract-page` y `ai-generate`; telemetría con el modelo efectivo (`AiCompletionResponse.modelUsed`); `consolidate-ats` ahora loguea uso.
- **Verificación post-merge**: `git fetch` + `git pull --ff-only` → `main` = `6e7d8fe` (idéntico a `mergeCommit.oid`); `mergedAt: 2026-11-13T02:25:29Z`; checks verdes (check-all 50s, Vercel).
- **Working tree**: limpio tras el merge. `mejoraocr.docx` eliminado (a Papelera) por orden de Kalpa.
- **Nota de protocolo**: merge por orden directa de Kalpa (la web de GitHub fallaba; merge vía REST squash). Sin aprobación CODEOWNER registrada en la PR.

## [2026-11-13] — Registro Regla 6 paso 7 (Post-merge PRs #82 y #83 — V2.9.0)
- **Merge #82**: PR #82 (`docs/session-log-v2.8.7`) → `main` vía squash. Hash: `5705f8bf22bc73680108999332e7f8e2bba4aeca`. Registra el merge de #81 en `SESSION_LOG.md` (paso 7 de #81).
- **Merge #83**: PR #83 (`feat/shared-key-cooldown`) → `main` vía squash. Hash: `d676f49d5716d96ef68eefc32fb9907ce31ab766`. Mensaje: `feat: cooldown compartido de API keys de IA en Supabase + cron de ping (V2.9.0) (#83)`. `mergedAt: 2026-11-13T03:56:48Z`.
- **Contexto**: cooldowns de API keys de IA compartidos entre lambdas vía tabla `public.ai_key_cooldowns` (migración aplicada por Kalpa en el SQL Editor de Supabase antes del merge; CLI con token 401). RLS ON sin policies (solo service_role); se guarda únicamente SHA-256 de la key. `keyRotation.ts` híbrido async (timeout 1500 ms → fallback fail-safe a memoria local). Cron `api/cron-ai-keys-ping` diario `0 6 * * *` (plan Hobby de Vercel: máx. 1 cron/día; el schedule inicial de 6h hacía fallar el deploy) pinguea Gemini/Groq y reporta degradación a Sentry. Call sites con `await`; `scripts/verify-ai-engine.ts` adaptado a async. `version.ts` → V2.9.0.
- **Verificación post-merge**: `git fetch` + `git pull --ff-only` → `main` = `d676f49` (idéntico a `mergeCommit.oid`). Checks verdes tras `gh pr update-branch` (check-all 1m18s; Vercel pass). Deploy de producción disparado por Vercel: `dpl_HQ8PWtUfoQSUhaXRkwzm19d14hJW` (BUILDING al momento del registro).
- **Verificación extra post-deploy pendiente de Kalpa**: `curl -H "Authorization: Bearer $CRON_SECRET" https://leecv.app/api/cron-ai-keys-ping` → debe responder `200` con `success: true` y estado `active` de groq/gemini.
- **Nota de protocolo**: merges por orden directa de Kalpa (web de GitHub fallaba; squash vía REST). Sin aprobación CODEOWNER registrada.
## [2026-11-13] — Optimización integral OCR: conversión local + lectura estructural (V2.10.0)
- **Merge #85**: PR #85 (`ci/ping-ai-keys-cron`) → `main` vía squash. Hash: `010e982dd7eabaa8535e0eb3e18842a1b8461855`. Workflow `ping-ai-keys.yml`: ping a `/api/cron-ai-keys-ping` cada 6h vía GitHub Actions. **Incidente**: run de prueba manual falló (`env: CRON_SECRET:` vacío) — `gh secret list`/`gh variable list` del repo salen vacíos; Kalpa confirmó haberlo cargado pero GitHub no lo ve (posible Environment/Dependabot/Codespaces, u otro repo). Pendiente de Kalpa: cargar `CRON_SECRET` en Settings > Secrets and variables > Actions (pestaña Secrets) y re-probar con Run workflow.
- **Implementación V2.10.0** (rama `feat/ocr-local-y-contexto-estructural`, pendiente de PR y de orden de merge de Kalpa):
  - Nuevo `src/shared/core/cv-import/pdfPageLayout.ts`: ordenamiento espacial de TextItem por (x,y), renglones con tolerancia por altura de fuente, detección de gutter vertical persistente (2 columnas) y decisión de 3 modos por página (`text` / `hybrid` / `image`).
  - `pageImageEncoder.ts`: MAX_IMAGE_DIMENSION 1600→1920; fondo blanco opaco obligatorio; `computeRenderScale` (1.5–2.6, objetivo 1920px); escalera JPEG [0.88,0.78,0.65,0.48]; páginas digitales intentan WebP q0.9 ≤1.2MB → PNG ≤1.2MB → JPEG; `applySoftContrast` (estiramiento 2%–98% luminancia, nunca binariza) y EXIF `imageOrientation: 'from-image'` para fotos; devuelve `{ base64, mimeType }`.
  - Nuevo `src/shared/core/cv-import/cvContextSummary.ts`: resumen rodante (~150 tokens: nombre, idioma, última sección, último registro) que el modal envía como `contextSummary` a la página i+1.
  - Nuevo `api/_lib/cvImportGate.ts` (GEMELO backend de la misma heurística, el frontend no puede exportar a api/): `isFragmentEffectivelyEmpty` para el Completeness Gate.
  - `ImportCvAiModal.tsx`: usa `analyzePdfPage` (3 modos), render con fondo blanco a 1920px, MIME real en el payload, contexto rodante entre páginas (también en reintento selectivo), `encodeImageFileWithinBudget` con EXIF+contraste suave.
  - `api/_lib/aiProviders/types.ts`: mimeType ampliado a webp + `mediaResolution` opcional. `gemini.ts`: `MEDIA_RESOLUTION_HIGH` automática con imágenes + fallback seguro (reintento sin el campo si el modelo devuelve 400 mediaResolution). `groq.ts`: temperatura 0.1 por defecto cuando hay responseSchema.
  - `api/cv-import-api.ts`: prompt con protocolo estructural (segmentación, regla de columnas, regla híbrida, reglas de elementos gráficos y certificados, tipos estrictos para Groq), MIME desde el body, `contextSummary` etiquetado, Completeness Gate con un reintento de verificación automático cuando la página tenía contenido y la IA devuelve vacío.
  - Regla 4: borrado `src/shared/core/cv-import/mergePageFragments.ts` (duplicado muerto; el canónico es `mergeFragments.ts`).
  - Versión: V2.10.0 (MINOR). Tests nuevos: pdfPageLayout (7), cvContextSummary (4), cvImportGate (5), aiProviderMediaResolution (6); cvImportEncoder actualizado a la nueva firma.
## [2026-11-13] — Registro Regla 6 paso 7 (Post-merge PR #86 — V2.10.0)
- **Merge #86**: PR #86 (`feat/ocr-local-y-contexto-estructural`) → `main` vía squash. Hash: `3a6ac44c44f3ca1a5b84375a5eb7b5937a0653d3`. Mensaje: `feat: pipeline OCR integral - conversion local optima y lectura estructural en la nube (V2.10.0) (#86)`. `check-all` ✅ (1m2s) y Vercel Preview ✅ pre-merge; `npm run check-all` local exit 0 (344 tests passed / 2 skipped).
- **Merge #85** (misma ronda, orden de Kalpa): `010e982dd7eabaa8535e0eb3e18842a1b8461855`. Workflow `ping-ai-keys.yml` 6h vía GitHub Actions. Verificación pública post-merge: sitio HTTP 200; `/api/cron-ai-keys-ping` responde **401 sin Bearer** (bien).
- **Incidente CRON_SECRET para GitHub Actions**: Kalpa cargó `CRON_SECRET` en **Vercel production** — correcto para el cron diario Hobby (`0 6 * * *`), pero GitHub Actions NO ve variables de Vercel (repo secrets/variables vacíos por `gh secret list`/`gh variable list`; los 6 Environments del repo tampoco exponen secrets por API). El run manual del 2026-11-13 16:54Z falló por el guard del workflow (`CRON_SECRET` vacío). **Fix (Kalpa)**: duplicarlo como repo secret — GitHub → repo → Settings → Secrets and variables → Actions → pestaña Secrets → New repository secret → `CRON_SECRET` → mismo valor que Vercel production → luego Actions → "Ping AI keys" → Run workflow (esperado: 200, `degradedProviders=0`).
- **V2.10.0 en `main`**: pipeline OCR integral (motor espacial `pdfPageLayout.ts` con 3 modos text/hybrid/image, render 1920px fondo blanco, WebP/PNG/JPEG presupuestado, contraste suave EXIF para fotos, contexto rodante entre páginas, protocolo estructural en prompt + `MEDIA_RESOLUTION_HIGH` en Gemini + temperatura 0.1 Groq con responseSchema, MIME real en payload, Completeness Gate). Duplicado `mergePageFragments.ts` borrado (Regla 4). Versión `version.ts` → V2.10.0.
- **Limitación de verificación**: el MCP de Vercel no respondió en la sesión (namespace vacío); la verificación pública fue sitio HTTP 200 y endpoint 401 sin auth. El deploy de producción se dispara desde `main` como en merges anteriores.
## [2026-11-13] — Incidente CRON_SECRET RESUELTO (ping 6h verde)
- **Cierre del incidente abierto en PR #87 / sesiones previas**: Kalpa duplicó el `CRON_SECRET` (mismo valor que Vercel production) como **repo secret** de GitHub Actions (Settings → Secrets and variables → Actions → pestaña Secrets → `CRON_SECRET`).
- **Verificación**: run `43475363785` (2026-11-13T17:41:59Z, `workflow_dispatch` sobre `main`) → **completed success**: el endpoint respondió HTTP 200 y `degradedProviders=0` (el script del workflow sale en error ante no-200 o proveedores degradados; run anterior `43474392415` 17:36Z falló por el secret antes de la duplicación).
- **Lección asentada**: GitHub Actions NO puede leer variables de entorno de Vercel. Todo secret que un workflow de GitHub necesite debe existir en el scope de GitHub (repo secret o Environment, atando el job con `environment: <nombre>`).
- El cron diario de Vercel (`0 6 * * *`, plan Hobby) sigue activo en paralelo como red de seguridad.

## [2026-11-14] - Registro Regla 6 paso 7 (Post-merge PR #93 - V2.11.0)
- **Merge confirmado**: PR #93 (`feat/modelo-plantillas-secciones-ia`) → `main` vía squash. Hash: `cf573e97ea97ee918729b2e9785c7620fa606f5c`. Mensaje: `feat(sections): plantilla respeta columnas manuales, IA por seccion y candados visibles (V2.11.0)`. `mergedAt: 2026-11-14T16:32:47Z`; checks verdes en GitHub (check-all 1m19s; Vercel Preview + Deployment pass).
- **Verificación post-merge**: `git fetch origin` + `git log origin/main -1` = `cf573e97...` (idéntico a `mergeCommit.oid` y a `main` local); working tree limpio; rama feature borrada en remote (`--delete-branch`).
- **Autorización CODEOWNER**: Kalpa dio permiso explícito en sesión ("te doy el permiso para CODEOWNER para el merge"); la PR toca `src/shared/core/` y `api/_lib/` (núcleos compartidos: templateApplicationEngine, presetHierarchyEngine, aiClient, catálogo de tareas IA).
- **Contenido**: Fases A–F del plan aprobado — full-template conserva columna manual elegida por el usuario; banner en Datos Personales cuando el formato oculta datos cargados; nivel preset ya no enciende slots `personalizada-1..5` vacíos; scroll al PDF + toast al reordenar; candado visible en certificados/firma; IA por sección (`suggest_achievement_acr`, `suggest_records` por kind, `explain_ats` conectado al modal ATS, prompt `ats_analysis` endurecido); versión V2.11.0.
- **Validación**: `npm run check-all` local EXITCODE=0 (372 tests); `templateSemantics` 14/14; typecheck limpio; baseline de contraste actualizado por corrimiento de líneas (mismas 8 entradas, 0 violaciones nuevas).

## [2026-11-14] - Registro Regla 6 paso 7 (Post-merge PR #95 - V2.11.1)
- **Merge confirmado**: PR #95 (`fix/v2-11-section-ai-audit`) a `main` via squash. Hash: `5039028c304766691b6a25032e2ab45afdef492e`. Mensaje: `fix(audit): candado vivo, scroll forzado post-render y contratos IA para Gemini (V2.11.1) (#95)`. Checks verdes en GitHub: `check-all` 1m18s; Vercel Preview + Deployment pass.
- **Verificacion post-merge**: `git fetch origin` + `git log origin/main -1` = `5039028` (identico a `mergeCommit.oid` y a `main` local); working tree limpio; rama feature borrada en remote (`--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio permiso explicito en sesion ("te doy el permiso para CODEOWNER para el merge"). La PR tocaba `src/shared/core/` y `api/_lib/` (nucleos compartidos: templateApplicationEngine, presetHierarchyEngine, VectorDocViewer, SectionPositionControl, RecordFormSection, PersonalInfoFields, aiTasks/catalog).
- **Contenido** (Plan de Correcciones aprobado sobre la auditoria de `0616d7e`, 2 bugs criticos + Fases A-F):
  - Candado vivo: `SectionManualAdjustment` ya no esconde el control de ubicacion/orden en secciones no asignables a columna (`certificados`/`firma` siempre muestran candado con razon).
  - Scroll sincronizado: `pdf-anchor-scroll` con `forcePostRender`; `VectorDocViewer` saltea el restore de ratio y fuerza `scrollToPdfAnchor`.
  - IA/Gemini (bug critico): `responseSchema` OpenAPI 3.0 validos en `api/_lib/aiTasks/catalog.ts` (sin `type` array, sin `additionalProperties`); `suggest_records` con properties explícitas por ids reales de `FIELD_CATALOG`; schema nuevo en `explain_ats` y `ats_analysis`; kindLabels +portfolio/+custom.
  - Normalizacion de registros IA: `normalizeAiDraftRecord` (exportada) traduce alias canonicos, descarta claves desconocidas, ids unicos; portfolio/custom en `RecordFormSection`; aliases+id en `HabilidadesSection`; selector "Experiencia destino" + "Aplicar a esta experiencia" (ACR) en `ExperienciaSection`; `AtsAiAnalysisModal` con reset total al reabrir/cambiar texto, "Volver a analizar" y reintento de error.
  - Plantillas/presets: `applyTemplateMode` preserva columna manual en los 3 modos y persiste `columnAssignments`; `certificados` fuera de la distribucion por columnas (resuelve `layoutResolutionEngine` por rol canonico); nivel preset no enciende opcionales no universales vacias (`logros`/`publicaciones`/`referencias`/`idiomas`/`redes`); `activeFormatId` conservado si el preset es compatible.
  - Datos Personales: `contacto`/`datos-personales` con visibilidad independiente; formato ATS ya no apaga todo ni esconde Nombre/Contacto; banners de politica de formato y de preferencia manual.
- **Tests**: 3 archivos nuevos (`aiTasksCatalog`, `aiDraftNormalize`, `sectionManualAdjustment`); actualizados por diseño `templateApplicationEngine`, `templateSemantics`, `snapshots_baseline`, `presetComposition`. `npm run check-all` local EXITCODE=0 + pre-push completo OK. `scripts/contrast-baseline.json` actualizado SOLO por corrimiento de lineas (153 a 162, 87 a 81; mismas 20 entradas, 0 violaciones nuevas).
- **Nota de version**: el commit de codigo olvido el bump de `version.ts` (Regla de Versionado); el PATCH a V2.11.1 se asienta en esta PR docs junto al stage actualizado.
- **Pendiente historico (no bloqueante)**: Kalpa - probar Editor - Importar CV con IA con PDF de 2 columnas y escaneado.
## [2026-11-14] - Registro Regla 6 paso 7 (Post-merge PR #97 - V2.12.0)
- **Merge confirmado**: PR #97 (`feat/dock-personalizada-ai`) a `main` via squash. Hash: `3b648afde3a6cd3fe54c4aa2deb5e96bf6b294af`. Mensaje: `feat(ia+dock): reescritura de registros con IA (rewrite_record) y dock Opcion 2 (V2.12.0) (#97)`. `mergedAt: 2026-11-14T23:31:45Z`; checks verdes en GitHub (`check-all` 1m4s; Vercel Preview + Deployment pass).
- **Verificacion post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `3b648af` (identico a `mergeCommit.oid`); working tree limpio; rama feature borrada en remote (`--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio permiso explicito en sesion ("te autorizo para que lo hagas por mi"). La PR tocaba `src/shared/core/` y `api/_lib/` (nucleos compartidos: motor de secciones/dock en activeSectionsDockEngine, catalogo de tareas IA, RecordFormSection, PresetSectionPicker nuevo).
- **Contenido** (Bloques 2+3 del plan aprobado sobre 0c58fb4; Bloque 1 tipografia va en PR B):
  - Nueva tarea `rewrite_record` (`api/_lib/aiTasks/catalog.ts`): OpenAPI 3.0 desde el dia 1 (`required: ["improvedFields"]`, properties explicitas, `missingDataNote` nullable); focos claridad (default) / ats / breve; reglas duras anti-invencion.
  - Contexto de candidato con ALLOWLIST (`candidateContext.ts`): solo trayectoria util (personalInfo redactada, jobTarget, secciones de registros), salida de 1 linea, nada de metadata de UI/presentacion. PII intacta (dni/cuit/phone/email/address/photoUrl) + redaccion de emails/telefonos en texto libre.
  - Guia compacta de esquema para Groq (`schemaGuide.ts`, NUEVO): Groq fuerza json_object pero no valida; se inyecta guia inline en systemPrompt marcando requeridas. Gemini sigue validando con responseSchema.
  - UI (`RecordFormSection.tsx`): boton "Mejorar texto" por campo textarea libre (`isAiRewritableField`, normaliza NFD) y "Mejorar registro con IA" por tarjeta con chips de foco; panel de revision "Vista previa de la IA" con Reemplazar / Agregar debajo / Descartar (campo) y Aplicar cambios / Descartar (registro); NUNCA se auto-aplica ni auto-anexa. CV `jobTarget` (jobTitle+companyName+jobDescription) como vacante de enfoque.
  - Dock Opcion 2 (`activeSectionsDockEngine.ts`): slots `personalizada-N` vacios ocultos aunque un formato los encienda (excepto las secciones canonicas vacias, que siguen visibles: decision documentada del motor); `findFreeCustomSlot` ignora visibilidad (alta por "+"); `PresetSectionPicker.tsx` (NUEVO) grilla compartida de Secciones Predisenadas + tarjeta punteada "Seccion a Medida" entre alta (nueva_seccion) y panel de slot (personalizada-N, colapsable con defaultOpen cuando vacio).
- **Tests**: 3 nuevos (`candidateContext`, `schemaGuide`, `customSlotsDock`) + 2 extendidos (`aiTasksCatalog` contrato rewrite_record, `aiDraftNormalize` isAiRewritableField NFD). `npm run check-all` local EXITCODE=0 (415 tests passed / 2 skipped); pre-push repite typecheck+lint+gobernanza+build OK.
- **Version**: V2.11.1 -> V2.12.0 (MINOR, nueva funcionalidad; bump asentado ANTES del merge dentro de la misma PR -- leccion #95 aplicada).
- **Nota**: el pre-push timeout local a los 300s en el primer intento; el push posterior completo (con la suite completa como gate) confirmo el push; la segunda llamada de push fue rechazada por "reference already exists" porque el primer push ya habia subido la rama. Sin impacto: la rama remota quedo con b705aff (commit correcto).
- **Pendiente para proxima sesion (PR B - Bloque 1)**: unificar `recordScaleRatios` como ratios reales en AMBOS productores (`presetCompositionInstances.ts` guarda pt disfrazados de ratios; `typographyHarmonyEngine.ts` genera ratios); clamp body 10.0->8.0; `quote-text`->rol `body`; test de invariante `extra <= meta <= body <= subtitle <= itemTitle <= sectionHeading <= title`; `typographyOverrides` greenfield en `resolveActivePreset`+`presetSchema.ts`; `densityMode` en 1 helper central; lenguaje sencillo.
- **Pendiente historico (no bloqueante)**: Kalpa - probar Editor - Importar CV con IA con PDF de 2 columnas y escaneado.
## [2026-11-14] - Registro Regla 6 paso 7 (Post-merge PR #99 - V2.13.0)
- **Merge confirmado**: PR #99 (`feat/typography-hierarchy-density`) a `main` via squash. Hash: `7f4a72b2759eb27662afb2adf09f9e5f5306b5d6`. Mensaje: `feat(typography): jerarquia tipografica y densidad (Bloque 1, V2.13.0) (#99)`. Checks verdes en GitHub (`check-all` 1m10s; Vercel Preview + Deployment pass).
- **Verificacion post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `7f4a72b` (identico a `mergeCommit.oid` y al squash en `main` local, fast-forward d8c46ea..7f4a72b); working tree limpio; rama feature borrada en remoto y en local (`-D` seguro: squash, trabajo ya en `main`).
- **Autorizacion CODEOWNER / flujo**: Kalpa aprobo el plan ("confirmo", 2026-11-14) con el flujo completo de Regla 6 incluido (rama -> push -> PR -> CI verde -> merge). La PR tocaba `src/shared/core/`; GitHub no exhibio `reviewDecision` bloqueante al momento del merge (`mergeStateStatus: CLEAN`, `reviewDecision: ""`, 0 reviews).
- **Bloque 1 (jerarquia tipografica y densidad) implementado** (PR B del plan de 3 bloques):
  - **Causa raiz**: `recordScaleRatios` se guardaba/generaba como puntos (9, 8, 8...) y `deriveRecordScale` lo multiplicaba contra `body` (ratios ~10x -> clamp -> jerarquia aplastada); piso de body 10.0 pt; `quote-text` resolvia rol `subtitle`.
  - **Capa A (motor)**: `deriveRecordScale` con ratios reales + blindaje de valores > 2.0 (pt confundidos -> neutralizados), piso body 8.0 pt y cadena estricta por tarjeta `title > subtitle > body >= meta >= extra` (ajuste suave conservador si se invierte). `presetCompositionInstances.ts`: ratios reales por plantilla (editorial 1.08/0.89/0.84; moderna 1.06/0.88/0.86; clasica 1.05/0.90/0.88; condensada 1.04/0.92/0.90). `typographyHarmonyEngine.ts`: emite ratios reales (÷ body). `cvRecordRenderers.tsx`: `quote-text` pasa a rol `body` con `summaryScaleFactor`.
  - **Capa B (densidad)**: nuevo `densityEngine.ts` con `resolveDensityFactors(compact|normal|relaxed)` (compact 0.5/0.625/0.55/0.95; relaxed 1.35/1.25/1.3/1.05) y `applyTypographyOverrides(bodyPt, contrastScheme, sectionHeadingScale, summaryScaleFactor)`. `SectionBannerCard` escala margenes del banner por densidad (firma intacta en TemplateRenderer); `recordSpatialLayoutEngine.resolveRecordLayout(template, densityMode)` escala padding/marginBottom; `pageOverflowEngine.estimateRecordHeightPt(..., densityMode)` usa el padding real del layout espacial.
  - **Capa C (UI Diseno, opcional y granular)**: panel "Ajustar tamanos y espacio en la hoja" en `DisenoSection.tsx`: 5 grupos (Tamano de lectura 8.5/9.5/10.5; Diferencia titulos/texto Suave 1.12/Equilibrada 1.20/Marcada 1.28; Tamano de titulos de seccion Chico 0.85x/Normal/Destacado 1.15x; Tamano del Extracto/Resumen Compacto/Igual al texto/Destacado; Espacio entre bloques Compact/Normal/Relaxed) + boton "Volver al ajuste de la plantilla". Persiste en `cvData.typographyOverrides`; `resolveActivePreset` lo aplica SOBRE el preset resuelto y propaga `densityMode` sin tocar paleta ni layout. Contraste/overrides en variables CSS (sin colores dinamicos en className).
  - **Preset schema**: `DensityMode`, `TypographyOverrides`, `summaryScaleFactor` en TypographyScale, `densityMode?` y `typographyOverrides?` en Preset.
- **Tests**: nuevo `tests/typographyHierarchy.test.ts` (9 tests: invariante de jerarquia en 4 plantillas, piso 8.0 pt, blindaje ratios > 2, overrides bodyPt/densityMode en `resolveActivePreset`). Suite completa: 424 passed / 2 skipped. `npm run check-all` local EXITCODE=0 (lint, tokens, contraste, pdf-contrast 1236, cv-harmony 60/60, build + prerender). Pre-push (husky, suite completa) OK.
- **Version**: V2.12.0 -> V2.13.0 (MINOR, bump asentado ANTES del merge dentro de la misma PR).
- **Nota de proceso (2 lecciones)**: (1) el primer `gh pr merge 99 --squash` timeouteo el pty a los 120s PERO el merge YA estaba ejecutado en GitHub; el reintento reporto "already merged" (exit 0) - confirmar siempre con `gh pr view --json state,mergeCommit` antes de reintentar una operacion de escritura. (2) `git push --delete` tambien dispara el pre-push (suite completa); el primer borrado timeouteo el pty a 120s pero el remoto YA estaba borrado; verificar con `git ls-remote --heads origin <rama>` antes de asumir fallo.
- **Ajuste conocido no aplicado (si Kalpa lo pide)**: `contrastScheme` hoy escala title/sectionHeading/itemTitle como `body x factor x 2.2/1.3/1.1` (implementacion absoluta; si los titulos quedan grandes en bodyPt alto, afinar a ratio relativo).
- **Pendiente historico no bloqueante**: Kalpa - probar Editor - Importar CV con IA con PDF de 2 columnas y escaneado.

## [2026-11-15] — Registro Regla 6 paso 7 (Post-merge PR #101 — V2.14.0)
- **Merge confirmado**: PR #101 (`feat/typography-sliders-ai-retry-defaults`) → `main` vía squash. Hash: `f081fe565a716917f7cbbe51699e9c70e749ce0c`. Mensaje: `feat: tiradores continuos, reintentos IA silenciosos, mojibake y defaults de CV nuevo (V2.14.0) (#101)`. `main` local fast-forward `2f33b90..f081fe5` tras `git fetch`. Checks verdes: `check-all` local EXITCODE=0 (incl. 4 archivos de tests nuevos), pre-push completo OK, CI GitHub Actions `check-all` success (~77 s; 12 annotations = warnings no bloqueantes), Vercel Preview + Deployment pass.
- **Verificación post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `f081fe565a716917f7cbbe51699e9c70e749ce0c` (idéntico al squash devuelto por la API de merge); trabajar en `main` limpio tras fast-forward. Rama feature borrada en remoto (`git push origin --delete` timeouteó el pty a 120 s pero el remoto ya estaba sin la rama, confirmado con `git ls-remote --heads origin <rama>` → 0 líneas; exit=0) y en local (`-D` seguro: squash, trabajo ya en `main`).
- **Autorización CODEOWNER**: Kalpa dio OK explícito en sesión ("Sí, mergeá después de tu re-check") tras mi re-check previo (PR abierta, 22 archivos, CI `check-all` verde, `mergeStateStatus: CLEAN`, Vercel success). La PR toca `src/shared/core/` y `api/_lib/`.
- **Bloque 1 (tiradores continuos + preview reactivo — causa raíz)**: el bug "los tiradores del panel no respondían en la vista previa" era que `CVPreview.tsx` tenía el `useMemo` del preset activo **sin** `typographyOverrides` ni `theme?.primaryColor` en las deps → el preview nunca re-resolvía el preset. `densityEngine.ts` reescrito: motor **continuo 0.50–1.35** interpolando linealmente entre las anclas compact 0.50 / normal 1.0 / relaxed 1.35 (válido para `densityMode`, `recordCardPaddingFactor`, `quoteTextPaddingFactor`, `lineHeightFactor`, `sectionBannerMarginFactor`); acepta enum legado o número (retrocompatibilidad total con borradores). Exports nuevos: `CONTRAST_FACTORS`, `SECTION_HEADING_FACTORS`, `SUMMARY_FACTORS`, `DENSITY_FACTORS`. `applyTypographyOverrides`: escala `lineHeightBody` por el factor de densidad y redondea pt a 0.5 (`Math.round(x*2)/2`); factores numéricos acotados a rangos seguros; enums históricos con los mismos valores de siempre. `cvRecordRenderers.tsx`: quote-text ahora consume `quoteTextPaddingFactor` (paddingVertical/marginBottom/marginTop) y `lineHeightFactor` (antes eran código muerto). `DisenoSection.tsx`: componente a nivel módulo `TypographySlider` (mismo look que "Ancho Sidebar") con badge de valor + Reset por control y reset global "Volver al ajuste de la plantilla"; 5 tiradores (Tamaño de lectura 8.0–11.5/0.5 pt; Diferencia títulos/texto 1.08–1.32; Tamaño de títulos de sección 0.75–1.20; Tamaño del Extracto 0.80–1.20; Espacio entre bloques 0.50–1.35). Fix adicional latente: `rounded-[${radius.control}]` (Tailwind no genera la clase dinámica, Regla 2) → `rounded-[10px]` en 2 sitios.
- **Bloque 2 (IA silenciosa)**: servidor `api/ai-generate.ts`: si la tarea espera JSON (`responseSchema`), valida/sanea en el servidor **antes** de responder 200 — `api/_lib/aiProviders/jsonRecovery.ts` (NUEVO): quita fences ```json, recorta del primer `{`/`[` al último `}`/`]`, devuelve `{ok, cleanText, value}`. JSON vacío/roto/truncado = **fallo recuperable** → `continue` a la siguiente clave del mismo proveedor → si se agotan, el siguiente proveedor (groq→gemini). NO usa `markKeyRateLimited`. Cliente `aiClient.ts`: `executeAiTask` reintenta hasta **3 intentos** con backoff 500/1200 ms, solo ante transitorios (status 0 red / 408 / 429 / 5xx o JSON inválido); 4xx no transitorio aborta de inmediato; reintentos **silenciosos** (el botón no cambia); `onRetry?` opcional; cartel de error solo si se agotan los 3. `tryParseAiJson` con fence-stripping.
- **Bloque 3 (mojibake UTF-8)**: 18 líneas con doble codificación en `presetCompositionInstances.ts` corregidas (NÚCLEO, Composición, Armónicas, Carmesí, Clásico Ejecutivo, Borgoña Noble, JÓVENES, Coral Neón, Cyber Índigo, Ámbar Solar, Navy Cónsul, Marrón Tabaco, Hielo Nórdico, Terracota Cálido, Carbón Monocromo, Jerarquías Tipográficas, Clásica Tradicional, Columna Única Completa, Disposición). Escaneo repo-wide (src/ api/ public/ tests/ scripts/) = 0 restos. Nuevo `tests/noMojibake.test.ts` (regresión).
- **Bloque 4 (defaults de CV nuevo)**: pestaña inicial de docType `cv` = **`importar_datos`** (3 puntos en `App.tsx`: useState inicializador, efecto de cambio de documento, `handleNewCV`). `createBlankCVTemplate`: defaults solo para docType `cv` inferido (`colorPresetId: 'hielo-nordico'` + `typographyOverrides` con enums ancla: `bodyPt 8.5, contrastScheme 'equilibrada', sectionHeadingScale 'chico', summaryScale 'compacto', densityMode 'compact'`); los overrides del caller siempre ganan; tarjetas/cartas/libros sin cambios. **Fix crítico descubierto en la implementación**: `sanitizeCvData` descartaba `typographyOverrides` en cada carga (mismo bug class que el histórico de `theme`, ya mitigado una vez en ese archivo) → ahora los preserva; sin esto el Bloque 4 era no-op y cualquier ajuste del usuario se perdía al recargar.
- **Tests**: 4 archivos nuevos (densityEngineContinuous 13, aiClientRetry 9, jsonRecovery 7, noMojibake 1). 46 tests focalizados verdes + suite completa vía `check-all` verde.
- **Versión**: V2.13.0 → V2.14.0 (MINOR; bump asentado dentro de la PR de código).
- **Protocolo merge (lección #101)**: `gh` y `git push --delete` timeoutean el pty a 120 s pero las escrituras SÍ se ejecutan; confirmar siempre con `gh pr list --head` / `git ls-remote --heads origin <rama>` (o la API vía MCP de GitHub) antes de reintentar. En esta PR, `gh pr create` timeouteó el pty pero el PR #101 ya estaba creado.
- **Ajuste conocido no aplicado (si Kalpa lo pide)**: `contrastScheme` escala niveles de forma absoluta (`body × factor × 2.2/1.3/1.1`); afinar a ratio relativo si los títulos quedan grandes en bodyPt alto. Opcional: limpieza de ramas locales viejas.
- **Pendiente histórico no bloqueante**: Kalpa — probar Editor → Importar CV con IA con PDF de 2 columnas y escaneado.

## [2026-11-15] - Registro Regla 6 paso 7 (Post-merge PR #103 - V2.14.1)
- **Merge confirmado**: PR #103 (`fix/ats-rule-target-tabs-blog-prose`) a `main` via squash. Hash: `92f9e574ec4af5facd8b03141910923762e284a6`. Mensaje: `fix(ats+blog): botones ATS con destino canónico y blog legible en los 4 temas (V2.14.1) (#103)`. Checks verdes en GitHub: `check-all` success (1 check-run en el commit squash).
- **Verificación post-merge**: `git fetch origin` + `git log origin/main -1` = `92f9e57` (idêntico al squash de la API de merge); `main` local fast-forward limpio en ese hash antes de continuar con PR B; rama feature borrada (remoto y local).
- **Autorización CODEOWNER**: Kalpa dio OK explícito en sesión tras CI verde. La PR tocaba `src/shared/core/` (`recruiter-rules/ruleTargetTabs.ts`, núcleo compartido).
- **Contenido** (Partes 2+4 del plan integral aprobado sobre la auditoría de botones ATS y contraste del blog):
  - `src/shared/core/recruiter-rules/ruleTargetTabs.ts` (NUEVO): mapa canónico `resolveRuleTargetTab` (regla ATS → pestaña del panel editor) + `isValidPanelTab` + `FALLBACK_TAB`. Los modales ATS ("Ir a corregir" en pre-exportación y en el diagnóstico, y la "Guía ACR" apuntando a experiencia) ya no saltan a pestañas inexistentes (`experience`, `frase`) que dejaban el panel en blanco.
  - Rama `edit_section` del modal de pre-exportación conectada al mapa canónico (antes era un no-op/salto roto).
  - Blog: prosa vinculada a los tokens de tema vía `.prose-leecv` (en vez de `dark:prose-invert`, que obedece al SO y no al tema elegido); blog legible en los 4 temas; hover AA en títulos de artículos; ThemeToggleButton en el header del blog (V2.14.1).
- **Tests**: `tests/ruleTargetTabs.test.ts` (16 casos) + `tests/blogProseTheme.test.ts` (4 casos) verdes; suite completa `npm run check-all` EXIT=0.
- **Versión**: V2.14.0 → V2.14.1 (PATCH; bump asentado dentro de la PR de código).
- **Nota de proceso**: el registro docs de esta PR (paso 7 de la Regla 6) quedó pendiente por orden de ejecución (PR B #104 se abrió antes); se asienta ahora junto con el registro de #104 en esta misma PR docs.
- **Pendiente histórico no bloqueante**: Kalpa - probar Editor → Importar CV con IA con PDF de 2 columnas y escaneado.

## [2026-11-15] - Registro Regla 6 paso 7 (Post-merge PR #104 - V2.15.0)
- **Merge confirmado**: PR #104 (`feat/applications-variant-flow`) a `main` via squash. Hash: `c21820e04dcaccab58f504c503b20973d30a93b8`. Mensaje: `feat(postulaciones): postulación independiente desde el CV base — motor único (V2.15.0) (#104)`.
- **Verificación post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `c21820e04dcaccab58f504c503b20973d30a93b8` (idéntico al squash devuelto por la API de merge); `main` local fast-forward `92f9e57..c21820e`; rama `feat/applications-variant-flow` borrada en local (`-D` seguro: squash) y en remoto (`git push origin --delete` timeouteó el pty a 120 s pero la escritura SÍ se ejecutó; confirmado con `git ls-remote --heads origin feat/applications-variant-flow` → 0 líneas, exit=0). Checks verdes: `check-all` success (commit squash), Vercel Preview + Deployment pass (observado en la PR).
- **Autorización CODEOWNER**: Kalpa dio OK explícito en sesión ("Sí, mergeá PR B") tras CI verde y re-check previo (PR abierta, mergeStateStatus CLEAN). La PR tocaba `src/shared/core/documents/` (núcleo compartido).
- **Contenido** (Parte 1 del plan integral aprobado; V2.15.0 MINOR):
  - `src/shared/core/documents/applicationVariant.ts` (NUEVO, fuente única de verdad para clonar el CV como postulación): `buildApplicationVersionLabel` (`Puesto · Empresa` / provisional `Nueva postulación`), `isProvisionalApplicationLabel`, `isApplicationVariant`, `resolveBaseSourceTabId` (**`sourceCvTabId` siempre apunta al CV base original — nunca encadena A→B→C**), `buildApplicationVariantData` (reset de cuerpo de carta con `keptJobTarget`/`versionLabel` explícitas o reset), `computeApplicationRename` (auto-rename del label SOLO si es provisional), `createApplicationVariant` (orquestador: `saveAs` + `ensureDocumentTab` SIEMPRE; si falla storage no crea pestañas fantasma).
  - Flujo único `createApplicationVariantFor` en `App.tsx` (decisión aprobada: "Guardar copia" unificada con "Crear postulación" en la misma función, copia fiel: conserva carta y vacante, `goTo: 'keep'`). Los 6 puntos de entrada usan el mismo motor: Vacante (mini-formulario Puesto/Empresa + "Se llamará: …"), Carta bloqueada en CV base ("Crear postulación y escribir la carta"), banner de postulación en Diseño, menú "+" → Nueva postulación, botón "Carta" en Guardados (conserva `jobTarget` del CV elegido), "Guardar copia".
  - EditorPanel: tira de identidad `CV Base` / `💼 Postulación · <label>` con botón **Volver al CV Base**; pasa `onEditVacante` a la carta. JobTargetSection: banner de variante con Volver al CV Base; auto-rename en vivo del label provisional (`updateTabTitle` + `computeAutoDocumentTitle`); fix Regla 2 (`rounded-[${radius.control}]` → literal). ApplicationCoverLetterSection: botón **Editar vacante**. SavedCVsModal: chips `📄 CV Base` / `💼 Postulación: <label>` (solo contexto CV).
  - Aterrizaje inteligente: en **Vacante** si la copia no trae datos de oferta; en **Carta** si ya los trae. La pestaña de la copia se registra siempre (antes quedaba la barra apuntando al documento anterior).
- **Tests**: `tests/applicationVariant.test.ts` NUEVO (22 casos: labels, provisional, no-encadenamiento, construcción de datos, `computeApplicationRename`, orquestador con deps inyectadas). 42 tests focalizados verdes (22 + 16 ruleTargetTabs + 4 blogProseTheme). `npm run check-all` EXIT=0 local; CI `check-all` verde.
- **Versión**: V2.14.1 → V2.15.0 (MINOR; bump dentro de la PR de código).
- **Archivos afectados**: 8 (+612/−111): `applicationVariant.ts` (nuevo), `tests/applicationVariant.test.ts` (nuevo), `App.tsx`, `EditorPanel.tsx`, `JobTargetSection.tsx`, `ApplicationCoverLetterSection.tsx`, `SavedCVsModal.tsx`, `version.ts`.
- **Pendiente (Plan integral, Parte 3)**: PR C (V2.16.0) — Asistente Flotante + prompt IA (`app_guide_assistant`); incluir bloque de conocimiento sobre mover secciones entre columna principal ↔ barra lateral y cuáles convienen en la principal. Pendiente histórico no bloqueante: Kalpa - probar Editor → Importar CV con IA con PDF de 2 columnas y escaneado.

## [2026-11-15] - Registro Regla 6 paso 7 (Post-merge PR #106 - V2.16.0)
- **Merge confirmado**: PR #106 (`feat/assistant-flotante-lidio`) a `main` via squash. Hash: `9013dfcd763e91e2f21b2e5eaf7d1ab1bad9f736`. Mensaje: `feat: asistente flotante Lidio en el editor (V2.16.0) (#106)`. Checks verdes: `check-all` local EXIT=0 (incluye 24 tests nuevos), CI GitHub `check-all` success (1m22s), Vercel Preview + Deployment pass.
- **Verificacion post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `9013dfc...` (identico al squash devuelto por la API de merge); `main` local fast-forward `6178aaa..9013dfc`; rama `feat/assistant-flotante-lidio` borrada en local (`-d` seguro: squash, trabajo ya en `main`) y en remoto (`git push origin --delete` timeouteo el pty a 180 s pero la escritura SI se ejecuto; confirmado con `git ls-remote --heads origin feat/assistant-flotante-lidio` = 0 lineas).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion ("Aprobado (recomendado)") tras CI verde. La PR tocaba `src/shared/core/` (assistant, ai, icons, iconCatalog, version) y `api/_lib/` (catalog.ts).
- **Contenido** (Parte 3 del plan integral, V2.16.0 MINOR): asistente flotante **Lidio** en el editor (zona app; nunca landing/blog). FAB esquina inferior derecha; panel con tabs Tips/Preguntar.
  - Tips 100% LOCALES (cero IA): por pestaña + transversales, inactividad ~20 s primer tip / ~90 s siguientes, max 3 por sesion (sessionStorage), silenciable con checkbox, estado en localStorage `leecv.assistant`. Incluye el bloque de conocimiento de columnas aprobado: Columna Principal (derecha, lectura prioritaria) vs Barra Lateral (izquierda, escaneo rapido); Experiencia/Resumen/Objetivo SIEMPRE en la principal; Habilidades/Idiomas/Informatica/Cursos/Redes en la sidebar; candado en Certificados y Firma (van al final por formato).
  - Chat IA solo ante pregunta explicita: tarea `app_guide_assistant` (OpenAPI 3.0, `required:['answer']`, suggestedActions sin nullable — patron Gemini); respuesta `{answer, suggestedActions?}`; acciones filtradas con `filterSuggestedActions` (descarta targetTabs inventados, conserva label, max 2) y CTAs validadas con `isValidPanelTab` que navegan via `changeActiveTab`. Sin `cvData` en el payload (no se envia PII). Footer estandar "Respuestas generadas por IA...". `prefers-reduced-motion` respetado; `print:hidden`.
  - Motores canonicos: `isValidPanelTab` (ruleTargetTabs.ts), iconCatalog/ICON_REGISTRY (icono `assistant`, unicidad verificada), tokens CSS `var(--*)`, Regla 2 sin colores dinamicos, lenguaje sencillo zona app.
- **Fix de contraste aplicado**: avatar en `accent-muted`/`accent-text` (antes `accent-base` emparejaba el tagline contra #FF2E63 en el bgStack del auditor); `check-contrast` = 0 violaciones nuevas.
- **Version**: V2.15.0 -> V2.16.0 (MINOR; bump dentro de la PR de codigo).
- **Archivos afectados**: 10 (+968/-5): `assistantTips.ts` (NUEVO), `FloatingAssistant.tsx` (NUEVO), `tests/assistantTips.test.ts` (NUEVO), `catalog.ts`, `aiClient.ts`, `iconRegistry.ts`, `iconCatalog.ts`, `EditorPanel.tsx`, `index.css`, `version.ts`.
- **Pendiente historico no bloqueante**: Kalpa — probar Editor → Importar CV con IA con PDF de 2 columnas y escaneado.

## [2026-11-16] - Registro Regla 6 paso 7 (Post-merge Fase 0 PR #108)
- **Merge confirmado**: PR #108 (`fix/book-covers-negras`) a `main` via squash. Hash: `f028cab679641fd79b8580e0272ea04221eec4ec`. Mensaje: `fix: tapas y contratapas negras en canvas + miniatura a 320px (Fase 0 motor editorial) (#108)`. Checks verdes en GitHub: `check-all` success (run 43757896513, 1m17s), Vercel pass.
- **Contenido (Fase 0 Motor Editorial)**: `canvasColors.ts` (NUEVO): paleta canónica de colores de canvas para las tapas; `impositionEngine.ts` la consume; `BookCoverStep.tsx`, `BookBackCoverStep.tsx` y `CoverPreviewThumbnail.tsx` alineados (miniatura a 320px); `ui-tokens-allowlist.json` +4 tokens; `tests/book-engine/canvasColors.test.ts` NUEVO. Difencial: 7 archivos (+330/−76).
- **Verificación post-merge**: hash visto en `git log origin/main` (`f028cab`); rama de trabajo `feat/book-asset-memory` partió de este punto.

## [2026-11-16] - Registro Regla 6 paso 7 (Post-merge Fases 1-2 PRs #111 y #110)
- **Merge #111 confirmado** (`feat/book-asset-memory`, Fase 1): `main` ← hash `2caa8d2c973001ae75958f699a5719a3e1720bd9`. Mensaje: `feat: memoria local del PDF y biblioteca de imagenes en IndexedDB (Fase 1)`. CI `check-all` success (run 43772475492, 1m18s), Vercel Preview + Deployment pass.
- **Merge #110 confirmado** (`perf/book-render-3-niveles`, Fase 2): `main` ← hash `f34dde1b5b3b39fb94c899359204dff9ad56a6b8`. Mensaje: `perf: rendimiento de la grilla de miniaturas y lightbox (Fase 2)`. CI `check-all` success (run 43808938339, 1m4s), `mergeStateStatus: CLEAN`, Vercel pass (invocación a los ~8 min del push del commit vacío de disparo).
- **Verificación post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` igualó la API en ambos casos (`2caa8d2`, luego `f34dde1`).
- **Autorización CODEOWNER**: Kalpa dio OK explícito en sesión ("mergea todo") tras CI verde en cada PR. #111 tocaba `src/shared/core/` (librería de assets en IndexedDB) → aprobación de CODEOWNER requerida y otorgada.
- **Nota de proceso (PRs apiladas)**: la cadena era #111 → #110 → #112 con bases apuntando la una a la otra. Al mergearse #111, las bases de #110 y #112 se re-apuntaron a `main` (`gh pr edit --base main`); como `.github/workflows/check-all.yml` solo corre con `pull_request: branches: [main]`, se pushearon commits vacíos ("chore: disparar check-all...") para forzar el evento `synchronize`. NUNCA se usó `--delete-branch` en merges de PRs apiladas. Un cambio de base por sí solo NO relanza el workflow (el evento `edited` no está en el set por defecto).

## [2026-11-16] - Registro Regla 6 paso 7 (Post-merge Fases 3-4 PR #112 — V2.17.0)
- **Merge #112 confirmado** (`feat/book-imposition-math`): `main` ← hash `e54a1a84c30d350e7c44e371be72b1dad7078983`. Mensaje: `feat: matematica de impresion editorial (Fase 3+4)`. CI `check-all` success (run 43813771767, 54s), `mergeStateStatus: CLEAN`, Vercel pass.
- **Verificación post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `e54a1a84c30d350e7c44e371be72b1dad7078983` (idéntico al squash devuelto por la API de merge).
- **Autorización CODEOWNER**: Kalpa dio OK explícito en sesión ("sigue y mergea todo hasta el fin, adelante avanza") tras CI verde. La PR tocaba `src/shared/core/book-engine/` (núcleo compartido) → aprobación de CODEOWNER requerida y otorgada.
- **Contenido (Fases 3+4, Motor Editorial InDesign del Book Studio)**:
  - Fase 3 parte 1 (`430d0c0`): `impositionPlanner.ts` (NUEVO, +353) — `getSignatureSheetPairs(len, offset, readingDirection)` (pareo espejado LTR/RTL), `planBookletSignatures` (cuadernillos de 4/8/16 hojas, armado cortar-y-apilar), `calculateSpineWidth`, `calculateCreepOffset`, `checkHomePrinterMargins`.
  - Fase 3 parte 2 (`6ad1014`): UI paso «Armado y Guías» (cubierta, lomo, creep y estilo de exportación) en `BookImpositionStep.tsx`.
  - Fase 3 parte 3 (`c8fd134`, `e4bf0c2`, `776c1cb`, `db46971`): `impositionEngine.ts` (+501) — camino vectorial en `processBookImposition` (`copyPages` sin rasterizar para modo normal sin rotaciones ni cortes), integración de opciones (lomo, creep, destino, estilo), guías de armado dibujadas en la hoja (línea de doblez, margen de seguridad, líneas guía para recortar (marcas de corte)), destinos B (cubierta aparte) y C, ZIP por cuadernillo. Tests de integración headless `tests/book-engine/processBookImposition.test.ts`.
  - Fase 4 (`abe6abc`): perfil de impresora casera con `unprintableMarginMm` (0 = imprimir hasta el borde; escala el contenido con `effectiveMarginPt`), `readingDirection` RTL/LTR (invierte el pareo de dos en dos por `getSignatureSheetPairs(..., 'rtl')` + contenedores `dir="rtl"` en pasos 6 y 7), resumen pre-impresión ampliado, Botón 2 «Descargar el PDF original (tal cual lo subiste)» visible solo en modo normal y sin consumir crédito, prop `setOptions` en `BookPreviewExportStep` cableada en `BookStudioContent.tsx`. Tests: +3 casos RTL en `impositionPlanner.test.ts` (58/58 book-engine verdes).
- **Lección de proceso (stacked PR + squash en serie)**: al mergear #110 por squash, #112 quedó marcada `CONFLICTING` (`mergeStateStatus: DIRTY`) porque su historia incluía los commits originales de #110, ahora duplicados en `main` con hash distinto. Se resolvió con `git rebase origin/main` (Git descartó automáticamente los duplicados: "skipped previously applied commit 550a1b2") sin conflictos de contenido, y `git push --force-with-lease`. Resultado: la rama quedó con solo sus 13 commits propios (diferencial definitivo +1587/−79 en 11 archivos) y CI verde en 54s.
- **Versión**: V2.16.0 → V2.17.0 (MINOR; los 4 merges del motor editorial omitieron el bump — precedente PR #96: se asienta en esta PR docs, en el mismo PR que registra los merges).
- **Plan integral Motor Editorial InDesign (Fases 0-4): COMPLETO y en producción.** `main` final = `e54a1a84c30d350e7c44e371be72b1dad7078983`. Fases 1 (#111), 2 (#110), 3+4 (#112) mergeadas el 2026-11-16 con CI verde en cada una; Fase 0 (#108) el 2026-11-15.
- **Pendiente histórico no bloqueante**: Kalpa - probar Editor → Importar CV con IA con PDF de 2 columnas y escaneado. Pendiente NUEVO (post-sesión): probar el Book Studio completo en producción (armar un libro de 16-32 páginas con tapa envolvente, JPG por cuadernillo y ZIP).

## [2026-11-16] - Registro Regla 6 paso 7 (Post-merge Lidio macOS-style PR #114 - V2.18.0)
- **Merge #114 confirmado** (`feat/lidio-macos-notifications`): `main` → hash `182a1af91088a9fe37dbd18a489d8124bec2982d`. Mensaje (squash): `feat(lidio): notificacion toast macOS y rediseño minimal del asistente (#114)`. CI `check-all` success (run 43894628802, 1m10s), Vercel pass. Verificado post-merge: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `182a1af91088a9fe37dbd18a489d8124bec2982d` (idéntico al squash devuelto por la API de merge).
- **Incidente GitHub en la ventana del merge**: desde las 11:59 UTC hay un incidente activo ("Incident with Pull Requests", githubstatus.com - timeouts elevados de merge ~4.75% vs 0.2% baseline; Actions también degradado). El primer `gh pr merge --squash` devolvió 502 y luego 405 `Merge already in progress`; los reintentos manuales por API seguían devolviendo 502. El merge se completó al reintentar tras la ventana de incidente (`PUT /repos/kalpa-droid/LEECV/pulls/114/merge` → `merged:true`, sha `182a1af9…`). Cero cambios de código.
- **Autorización CODEOWNER**: Kalpa dio OK explícito en sesión ("Aprobá y mergeá (squash)") tras CI verde. La PR tocaba `src/shared/core/` (assistantTips.ts, iconRegistry.ts, iconCatalog.ts) y `api/_lib/` (catalog.ts) → aprobación requerida y otorgada.
- **Contenido** (V2.18.0, MINOR): NUEVO `AssistantNotificationToast.tsx` (ritmo macOS: ~9s auto-descarte, pausa en hover/focus, cola sutil apuntando al FAB, backdrop-blur, acciones solo-ícono Ir(ArrowUpRight)/Silenciar(BellOff)/Cerrar(X), `role="status"`, `print:hidden`, `.ui-assistant-notif-enter/exit` con `cubic-bezier(0.22,1,0.36,1)`); `FloatingAssistant.tsx` rediseñado (SIN tagline en UI; header limpio con mute Bell/BellOff `aria-pressed`; tabs solo-ícono Lightbulb/MessageCircleQuestion; toggle List con badge `{vistos}/{total}`; 3 chips rápidos en chat; puntos "escribiendo" `.ui-assistant-typing-dot`); `app_guide_assistant` enriquecida (conocimiento V2.17.0: portada, 6 formatos regionales, tiradores/cascada de diseño, secciones a medida, importar CV, privacidad por campo, candados, flujo CV → Vacante → Postulación → Carta, ATS en vivo; `<editorState>` estructural SIN PII — isBaseCV, activeFormatId, visibleSections, hasVacante, atsScore; `<history>` últimos 4 turnos escapados como datos; regla anti-inyección; responseSchema OpenAPI 3.0 SIN cambios); `assistantTips.ts` (`buildAssistantEditorSnapshot(cvData, activeTab, atsScore?)` sin PII vía `isApplicationVariant`/`resolveActiveFormatId`/`layout.sectionOrders`/`sectionVisibility`; set de tips enriquecido); `index.css` (`.ui-assistant-pop`, notif enter/exit, typing dots; todos deshabilitados bajo `prefers-reduced-motion`); `iconRegistry.ts` +10 íconos de acción con trazados únicos (list, book, bell, bellOff, messageCircle, send, rotateCcw, arrowUpRight, x, lightbulb — messageCircle reescrito para no duplicar `assistant`); `UI_ICON_IDS` registra los 10 y restaura `assistant`; `EditorPanel`/`App.tsx` reenvían `atsLiveScore` hasta Lidio.
- **Tests**: 575 passed (asistente 34/34: motor de tips + contrato OpenAPI de `app_guide_assistant` + unicidad de íconos); `npm run check-all` EXIT=0 local; CI GitHub `check-all` success en PR #114 (1m10s).
- **Versión**: V2.17.0 → V2.18.0 (MINOR; el bump se asienta en esta PR docs, precedente V2.17.0).
- **Diferencial PR #114**: 9 archivos, +582/-269. `tsconfig.tsbuildinfo` e `install-windows.ps1` excluidos (artefactos; nunca commitear).
- **Pendiente NUEVO**: Kalpa — probar Lidio en producción (toast de inactividad, chat, acciones sugeridas, silenciado y badge). Pendiente histórico no bloqueante: Editor → Importar CV con IA con PDF escaneado / 2 columnas. Pendiente del Book Studio: armar un libro de 16-32 páginas.

## [2026-11-16] - Registro Regla 6 paso 7 (Post-merge pulido visual Lidio PR #116 - V2.18.1)
- **Merge #116 confirmado** (`feat/lidio-panel-polish`): `main` -> hash `027d7be50b8cbfcf19963ec7aa674af660f0dd09`. Mensaje (squash): `fix(lidio): compactar banda de tabs y enriquecer estado vacio de tips (#116)`. CI `check-all` success (run 43906745681, 54s), Vercel pass. Verificado post-merge: `git log origin/main -1 --format="%H %s"` = `027d7be50b8cbfcf19963ec7aa674af660f0dd09` (identico al squash de la API).
- **Autorizacion**: Kalpa dio OK explicito en sesion ("Mergea vos (squash)") tras CI verde. La PR solo tocaba `src/modules/cv-builder/components/FloatingAssistant.tsx` (sin `src/shared/core/` ni `api/_lib/` -> no requeria CODEOWNER formal).
- **Contenido (pulido visual post V2.18.0)**: banda de tabs icon-only compacta (`py-2` -> `h-9` fija, 36px - dejaba de verse como losa oscura); estado vacio de Tips convertido en mini-tarjeta con acciones visibles ("Ver todos los tips" / "Preguntarle a Lidio"); stack del contenido mas denso (`space-y-2.5`). Sin cambios de logica, motor de tips ni IA. Diferencial: 1 archivo (+11/-6).
- **Version**: V2.18.0 -> V2.18.1 (PATCH; ajuste UI minimo - asentada en esta PR docs, precedente V2.17.0).
- **Pendiente NUEVO**: Kalpa - probar el panel pulido en produccion (tabs compactos, estado vacio accionable). Pendientes previos sin cambios.

## [2026-11-16] - Regla 6 paso 7 (Post-merge Fases 1+2 Book Studio PR #118)
- **Merge #118 confirmado** (`fix/book-studio-lidio-integration`, head `634845c`): `main` -> hash `c310c2e6b689d549af84d4e5229ea468de50b09f`. Squash msg: `fix(book-studio): origen PDF hibrido con fallback + instancia unica de pdf.js (F1+F2) (#118)`. CI `check-all` success (run 43940040133, 49s), Vercel pass. Verificado post-merge: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `c310c2e6...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion ("ok sigue") tras CI verde. La PR tocaba `src/shared/core/` (capabilityRegistry.ts, bookAssetManager.ts, impositionEngine.ts) -> aprobacion de CODEOWNER requerida y otorgada.
- **Contenido (F1+F2)**: `capabilityRegistry.ts` presets `libro-*`/`book` -> 'book' (App.tsx guarda `lastCreatedTabIdRef`); `bookAssetManager.ts` `canUseNativeFilePicker()` + `pickSourcePdf()` tipado `picked|cancelled|fallback-required`; `BookSourceTypeStep.tsx` `triggerPick` unico + input off-screen siempre montado + tarjeta clickeable; `BookStudioContent.tsx` `loadSourcePdf()` instancia unica pdf.js + `persistBookState(file, opts, pageCount)` (eliminado `handleFileSelect`); `PdfPreviewStrip.tsx` error visible + "Probar con otro PDF" + thumbs por `assetId`; `impositionEngine.ts` cMapUrl `/cmaps/` local -> CDN -> sin cMaps (3 retries con `pdfBytes.slice()`); `scripts/copy-pdfjs-cmaps.mjs` + `prebuild`; `public/cmaps/` gitignored. Tests: `tests/capabilities/capabilityRegistry.test.ts` (nuevo), `bookAssetManager.test.ts` actualizado.

## [2026-11-16] - Regla 6 paso 7 (Post-merge Fase 3 paridad tapa/contratapa PR #119)
- **Merge #119 confirmado** (`fix/book-tapa-contratapa-parity`, head `d8971a5` rebaseado sobre main post-#118): `main` -> hash `2e22ece79ff02653466eab842776fa1e5d393081`. Squash msg: `fix(book-studio): paridad tapa/contratapa y fin de la hoja en blanco fantasma (#119)`. CI `check-all` success (run 43955639355, 1m20s), Vercel pass. Verificado post-merge: `git log origin/main -1` = `2e22ece...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion ("ok sigue") tras CI verde. La PR tocaba `src/shared/core/book-engine/` -> aprobacion requerida y otorgada.
- **Contenido (Fase 3)**: fix retiro fantasma (`blankInFrontBackCover` solo si `backCoverCanvas` existe); `bookPageCount.ts` reescrito (`FinalBookPageCountInput`, `hasCustomCoverConfig()`, `effectiveSourcePageCount()`, `calculateFinalBookPageCount()` con sobrecarga legada conservada y replicacion exacta del armado del motor, verificado numericamente en 9 escenarios); callers `BookOrganizeStep`/`BookPreviewExportStep` pasan input object completo; UI paridad (`BookCoverStep` 4 tarjetas + "Sin Tapa"; `BookBackCoverStep` presets COVER_PRESETS + publisher + imageFit + aspect 1/1.41); tests `bookPageCount.test.ts` (nuevo, 22 asserts) + 2 casos headless en `processBookImposition.test.ts`. Suite book-engine 54/54 verde.
- **Leccion de proceso (base avanzada entre PRs apiladas)**: al mergear #118 primero, #119 quedo `BEHIND`; se rebaseo `fix/book-tapa-contratapa-parity` sobre `origin/main` (sin conflictos, regiones disjuntas en impositionEngine.ts) + `push --force-with-lease` antes del merge. Stash intermedio del handoff de CONTEXT.md para permitir el rebase; pop posterior limpio.

## [2026-11-16] - Regla 6 paso 7 (Post-merge Fase 4 PR #120)
- **Merge #120 confirmado** (`feat/book-studio-fase-4`, head `23ae9d9` ya en remote): `main` -> hash `38dd91fcd45a8ead5c22aabb960cb6f5e4ae9b02`. Squash msg: `fix(book-studio): flujo pasos 1-7 coherente y catalogo i18n alineado (Fase 4) (#120)`. CI `check-all` success (run 43963418594, 1m15s), Vercel pass. Verificado post-merge: `git log origin/main -1` = `38dd91f...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion (pregunta en chat tras CI verde). La PR toca `src/shared/i18n/` y `src/modules/` -> aprobacion requerida y otorgada.
- **Contenido (Fase 4)**: `src/shared/i18n/catalog/bookStudio.ts` reescrito alineado 1:1 con `BOOK_STEP_SEQUENCE` (1 Origen … 7 Exportar; seccion `paperStep` huerfana eliminada; `nextStep*` corregidos: paso 5 apuntaba a "6. Exportar", ahora "Siguiente: 6. Armado y Guías"); migracion mecanica de labels hardcodeados a `t.bookStudio.*` en los 7 steps (BookImpositionStep 28, BookFoliadoStep 8, BookCoverStep 3, BookBackCoverStep 3, BookOrganizeStep 2, BookPreviewExportStep 1, BookSourceTypeStep 1; BookImpositionStep y BookFoliadoStep ahora usan `useText`); cero labels de navegacion hardcodeados restantes; `tests/i18n/bookStudio.test.ts` nuevo (5 casos). Copy de campos de cuerpo deja hardcodeado a proposito (deuda anotada en handoff).
- **Siguiente paso recomendado**: Fase 5 (Lidio en Book Studio): rama nueva desde `main` (`38dd91f`); extender `assistantTips.ts` (`AssistantDocType`, keys de storage por docType, `BOOK_TAB_TIPS`/`BOOK_ALWAYS_TIPS` con destinos `book_*`, `validateAssistantTargetTab` 3er parametro opcional `docType`, `buildAssistantEditorSnapshot` soporte book sin PII); `FloatingAssistant.tsx` (prop `docType`, QUICK_QUESTIONS por docType, snapshot por docType); montar en `BookStudioContent.tsx`; extender `app_guide_assistant` en `api/_lib/aiTasks/catalog.ts:489-583` con bloque Book Studio (responseSchema OpenAPI 3.0 sin cambios, cero PII) + chips Lidio book; tests de tips/destinos `book_*`.
- **COMPLETADO**: ver entrada post-merge Fase 5 PR #121 al final de este archivo.

## [2026-11-17] - Regla 6 paso 7 (Post-merge Fase 5 PR #121)
- **Merge #121 confirmado** (`feat/lidio-book-studio-fase-5`, head `e8d9a80f0e806350e00f4e684b3fc565e41240cf` — commits `56e93c8` + `e8d9a80`): `main` -> hash `3bc95793bb4026adec508d62bb4bd13d3036f008`. Squash msg: `feat(book-studio): Lidio en Book Studio (Fase 5) (#121)`. CI `check-all` success (run 43997760657, 56s), Vercel pass. Verificado post-merge: `git log origin/main -1` = `3bc95793...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion (pregunta en chat tras CI verde). La PR toca `src/shared/core/` y `api/_lib/` -> aprobacion requerida y otorgada.
- **Contenido (Fase 5)**: `assistantTips.ts` (AssistantDocType 'cv'|'book'; storage keys por docType `leecv.assistant.book` / `leecv.assistant.session.book`; `BOOK_TAB_TIPS`/`BOOK_ALWAYS_TIPS`/`ALL_BOOK_TIPS` con destinos `book_*` reales de BOOK_STEP_SEQUENCE; `buildAssistantBookSnapshot` estructural sin PII; `validateAssistantTargetTab` 3er param docType validando contra la secuencia real; `getTipsForTab`/`pickNextTip`/`filterSuggestedActions` con docType); `FloatingAssistant.tsx` (prop `docType` default 'cv' + `bookOptions`; `QUICK_QUESTIONS_BY_DOC`; storage/loadState por docType; `editorState` book; header y copy de bienvenida del chat por docType); `BookStudioContent.tsx` monta `<FloatingAssistant docType="book" activeTab={activeStepTab} onNavigate={setActiveStepTab} bookOptions={options} />`; `catalog.ts` `app_guide_assistant` con pasos `book_*` + "FLUJO TIPICO BOOK STUDIO" + editorState book documentado + hint en `buildUserPrompt` (responseSchema OpenAPI 3.0 INTACTO; cero PII); `tests/assistantTipsBook.test.ts` NUEVO (12 casos). Verificacion local: `tsc` 0 errores, `vitest` 41/41, `check-all` EXIT=0.
- **Siguiente paso recomendado**: Docs PR final con bump V2.19.0 (MINOR) en `src/shared/core/version.ts` (plan de 5 fases COMPLETO: Fases 1-4 en #118/#119/#120, Fase 5 en #121).
- **COMPLETADO en rama `docs/release-v2.19.0`**: ver entrada Docs PR V2.19.0 al final de este archivo.

## [2026-11-17] - Regla 6 paso 7 (Docs PR V2.19.0 — cierre del plan Book Studio/Lidio)
- **Version**: V2.18.1 -> V2.19.0 (MINOR; 5 fases del plan Book Studio/Lidio entregadas: #118 Fases 1+2, #119 Fase 3, #120 Fase 4, #121 Fase 5). Bump en `src/shared/core/version.ts` (minor 19, label V2.19.0, lastUpdated 2026-11-17, stage con resumen de las 5 fases). Rama `docs/release-v2.19.0` desde `main` `3bc95793`. Incluye asiento post-merge de #121 en SESSION_LOG.md y en `.opencode/CONTEXT.md`.
- **Verificacion**: `npm run check-all` EXIT=0 (corrida local en esta sesion); cambios sin comportamiento nuevo (docs/versionado).
- **Siguiente paso recomendado**: CI verde en la PR -> OK CODEOWNER de Kalpa (toca `src/shared/core/version.ts`) -> squash-merge sin `--delete-branch` -> verificar hash post-merge -> registrar aqui.
- **COMPLETADO**: ver entrada post-merge Docs PR #122 al final de este archivo.

## [2026-11-17] - Regla 6 paso 7 (Post-merge Docs PR #122 - V2.19.0 en produccion)
- **Merge #122 confirmado** (`docs/release-v2.19.0`, head `fd2335f` ya en remote): `main` -> hash `dec82a03fa021f183dc95459decee218e76eca9c`. Squash msg: `docs(release): V2.19.0 — cierre del plan Book Studio/Lidio (#122)`. CI `check-all` success (run 44009832828, 1m29s), Vercel pass. Verificado post-merge: `git log origin/main -1` = `dec82a03...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion (pregunta en chat tras CI verde). La PR tocaba `src/shared/core/version.ts` -> aprobacion requerida y otorgada.
- **Contenido**: bump MINOR V2.18.1 -> V2.19.0 en `src/shared/core/version.ts` (stage resume las 5 fases: PR 118/119/120/121); asientos en `SESSION_LOG.md` + `.opencode/CONTEXT.md`. Plan Book Studio/Lidio de 5 fases COMPLETO y en produccion.
- **COMPLETADO**: ver entrada post-merge Docs PR #123 al final de este archivo.

## [2026-11-17] - Regla 6 paso 7 (Post-merge Docs PR #123 — asiento final del ciclo V2.19.0)
- **Merge #123 confirmado** (`docs/handoff-v219-post-merge`, head `9cfb8a7` ya en remote): `main` -> hash `e5b4561c4532c559da00a60dc842ea9e1b6d027e`. Squash msg: `docs(handoff): post-merge V2.19.0 (PR #122) en SESSION_LOG y CONTEXT (#123)`. CI `check-all` success (run 44011586324, 1m22s), Vercel pass. Verificado post-merge: `git log origin/main -1` = `e5b4561c...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion. La PR era docs-only (no tocaba nucleos) -> aprobacion otorgada igual por consistencia de proceso.
- **Contenido**: asiento de post-merge de #122; `SESSION_LOG.md` y `.opencode/CONTEXT.md` quedan con el ciclo completo cerrado.
- **Ciclo cerrado**: plan Book Studio/Lidio 5 fases (#118, #119, #120, #121) + release V2.19.0 (#122) + asientos de handoff (#123). `version.ts` = V2.19.0; `main` = `e5b4561c`.

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #125 - deuda de copy i18n del Book Studio)
- **Merge #125 confirmado** (`feat/book-studio-i18n-body-copy`, head `968cac060fcccd4e93b21cb36cee7010a6ebac5c`): `main` -> hash `434ebd272548eebf82f384976143103102dd143f`. Squash msg: `feat(book-studio): migra campos de cuerpo hardcodeados al catalogo i18n (#125)`. CI `check-all` success (run 44022173471, 1m19s), Vercel pass, Vercel Preview Comments pass. Verificado post-merge: `gh pr view 125 --json mergeCommit` + `git fetch origin && git log origin/main -1 --format="%H %s"` = `434ebd27...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`). PR: https://github.com/kalpa-droid/LEECV/pull/125. `main` local fast-forward `c62d308..434ebd2`.
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion ("si") tras CI verde. La PR no tocaba nucleos (`src/modules/book-studio/` + `src/shared/i18n/`) -> no requerida formalmente, aprobada igual.
- **Contenido**: cierre de la deuda de copy de la Fase 4 - ~100 strings visibles de steps y componentes internos del Book Studio migradas al catalogo i18n `t.bookStudio.*` (`src/shared/i18n/catalog/bookStudio.ts`, tipado por `typeof`: falta de clave = error de TS). 12 archivos (+387/-178): `BookCoverStep`, `BookBackCoverStep`, `BookFoliadoStep`, `BookOrganizeStep`, `BookPreviewExportStep`, `BookSourceTypeStep`, `BookStudioContent`, `components/PdfPreviewStrip`, `LightboxModal`, `ThumbnailCard`, `CoverPreviewThumbnail` + catalogo. Copy verbatim (incluido tuteo preexistente) salvo 3 cambios de fondo documentados en la PR: `emptyDescription` `"1. Cargar PDF"` -> `"1. Origen"` (referencia obsoleta), `metricSheets` `'Pliegos'` -> `'Hojas'` (exigido por el escaner de lenguaje sencillo), `generatingPdf` alineada a `'Generando PDF de Imprenta...'`. Tokens `{name}|{count}|{pdf}|{book}|{active}|{deleted}|{side}|{mm}|{sheets}|{page}|{max}` via `.replace()` encadenados. Sin cambios de logica, `BOOK_STEP_SEQUENCE` ni `responseSchema` OpenAPI. Bug propio detectado y corregido en revision de diff: `title="{t.x}"` (string literal con llaves) -> `title={t.x}` en `ThumbnailCard.tsx` (8 casos).
- **Version**: sin bump (migracion mecanica; `version.ts` sigue V2.19.0). Tests: 611 passed; `check-all` EXIT=0 local y en pre-push; lenguaje sencillo 0 violaciones.
- **Corte de la recursion de PRs docs**: las sesiones previas encadenaban una docs PR por cada asiento (#123 asentaba #122, #124 asentaba #123...). Esta sesion asienta #124 y #125 solo en `SESSION_LOG.md` + `.opencode/CONTEXT.md` **sin abrir PR de asiento**; los cambios quedan en el working tree para que la proxima PR de trabajo real los lleve.
- **Deuda fuera de scope (documentada en la PR)**: default prop `documentTabs` de `BookStudio.tsx` (`'Libro Principal'`) sigue hardcodeado - no era un step ni estaba en el plan aprobado.
- **Pendiente NUEVO**: Kalpa - probar el Book Studio en produccion (todos los steps con copy desde el catalogo; verificar en ingles/locales si aplica). Pendientes previos sin cambios: Lidio en Book Studio en produccion; Importar CV con IA con PDF escaneado/2 columnas.

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #126 - firma vacia + hojas fantasma del CV)
- **Merge #126 confirmado** (`fix/firma-vacia-y-pagina-fantasma`, head `fc602d9`): `main` -> hash `3c22fa65272dd943450f3cdcf63b611b2b8f92ec`. Squash msg: `fix(cv): firma digital visible con datos personales + cero hojas fantasma en blanco (#126)`. CI `check-all` success (run 44029212655, 1m12s), Vercel pass. Verificado post-merge: `gh pr view 126 --json mergeCommit` + `git fetch origin && git log origin/main -1` = `3c22fa65...` (identico). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward. PR: https://github.com/kalpa-droid/LEECV/pull/126.
- **Autorizacion**: Kalpa dio OK explicito en sesion ("ok") tras CI verde.
- **Contenido**: 2 bugs reproducidos con render real + PDF.js ground truth. (1) Firma vacia: el guard de `cvDataAdapter.ts` exigia `signature.dataUrl || signature.signerName`, pero el sanitizador solo hidrataba ese nombre desde `personalInfo.fullName` (legacy) -> con esquema moderno (givenNames/surname) la firma JAMAS aparecia. Fix: firma emitida con nombre real resuelto EN VIVO (nunca 'Postulante'), `signature?.dataUrl` (TypeError con signature undefined), `cvDataSchema.ts` intacto (el nombre nunca se congela). (2) Hoja fantasma: el marginBottom terminal del ultimo registro de cada sector arrastraba una caja casi vacia a una pagina nueva (0 textos, solo fondos con minHeight 100%). Fix: flag `isTrailingRecord` (ultima seccion x ultimo registro por sector) anulando el margen final en CardObjectRenderer, quote-text, course, social-link, skill, languages, contact-item y qr + keys deterministas (sin Math.random()).
- **Validacion**: `tests/cvDataAdapterFirma.test.ts` (NUEVO, 10 casos) + `scripts/verify-firma-and-blank-pages.tsx` (NUEVO, wireado a `check-all` como `verify:firma-and-blank-pages`: 16 verificaciones - 9 firma + 7 renders headless con 0 paginas sin texto; antes el baseline reproducia 1 hoja fantasma). 9 archivos, +406/-31. Sin cambios de OpenAPI ni BOOK_STEP_SEQUENCE.
- **Comportamiento nuevo intencional**: todo CV con nombre y firma visible muestra el bloque de firma (con o sin imagen dibujada).
- **Deuda documentada fuera de alcance**: registro individual mas alto que una pagina queda recortado (`wrap={false}` atomico en TemplateRenderer) - candidato a PR siguiente.
- **Pendiente NUEVO**: Kalpa - verificar en produccion: firma visible con datos personales (sin dibujar firma) y CV denso sin hoja en blanco al final.

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #127 - Lidio siempre con tip + PDFs problematicos)
- **Merge #127 confirmado** (`feat/lidio-siempre-con-tip-y-pdf-problematicos`, head `795596d`): `main` -> hash `b0e212b0793f5a90daf8a7cdcd29b0f6cd58eea8`. Squash msg: `feat(lidio+book): Lidio siempre con tip + PDFs problematicos con aviso, contraseña y rescate a imagenes (#127)`. CI `check-all` success (run 44034697699, 1m30s), Vercel pass. Verificado post-merge: `gh pr view 127 --json mergeCommit` + `git fetch origin && git log origin/main -1` = `b0e212b...` (identico). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward. PR: https://github.com/kalpa-droid/LEECV/pull/127.
- **Autorizacion**: Kalpa dio OK explicito x2 en sesion tras CI verde ("ok" / "ok").
- **Contenido**: (1) Lidio SIEMPRE CON TIP: `pickAlwaysTip` (nunca null: pestaña -> transversales -> repaso rotativo con afterTipId) y `pickNextTipCycled` (avance manual circular). FloatingAssistant: tip resuelto AL INSTANTE al abrir el panel o entrar a la vista Tips (antes esperaba 20s y podia quedar vacio); boton "Otro tip"; "Entendido" precarga el siguiente en el panel; cerrar el panel libera el tip (el flujo automatico sigue con tope 3/sesion); el repaso rota desde el ultimo tip mostrado. 3 tips nuevos (creep, doble cara/borde corto, guias de armado/marcas de corte). (2) PDFs problematicos: nuevo modulo puro `pdfSourceClassifier.ts` (PdfSourceError con codigos estables empty-file/password/corrupt/missing/empty-pdf/unknown, clasificados por err.name y file.size===0); `loadSourcePdf` valida 0 bytes y numPages===0 y no marca selectedFile hasta el exito; contraseña de apertura con cuadro INLINE (sin window.prompt) retenida SOLO en memoria de sesion y pasada como parametro explicito al motor (JAMAS en options persistidas); proteccion contra edicion detectada con pdf-lib (ignoreEncryption) en la carga -> conmutacion AUTOMATICA a exportMode 'raster' + avisos en pasos 1, 6 (selector bloqueado) y 7; red de seguridad en el camino vectorial (mensaje de rescate). Avisos en lenguaje sencillo por codigo.
- **Validacion**: tests extendidos (+14 en assistantTips/assistantTipsBook), `tests/pdfSourceClassifier.test.ts` NUEVO (10 casos), `scripts/verify-lidio-and-pdf-errors.tsx` NUEVO wireado a check-all (`verify:lidio-and-pdf-errors`, 28 verificaciones). 16 archivos, +937/-29. Sin cambios de OpenAPI ni BOOK_STEP_SEQUENCE. Incluyo los asientos de handoff de #126.
- **Pendiente NUEVO**: Kalpa - probar en produccion: abrir Lidio con tips agotados (debe mostrar tip igual), boton "Otro tip", y Book Studio con un PDF protegido con contraseña + uno protegido contra edicion. Pendientes previos sin cambios: firma visible con datos personales, CV denso sin hoja en blanco al final; Book Studio en produccion (steps con copy desde el catalogo; verificar en ingles/locales si aplica); Importar CV con IA con PDF escaneado/2 columnas.
- **Siguiente paso (PR 2b, aprobada en el plan)**: rediseño visual del paso 6 BookImpositionStep (botones rapidos casa/imprenta, destinos A/B/C con mini-diagramas SVG, grosor en tarjetas + pill de lomo en vivo, switches, botones segmentados calidad/lectura, QUITAR `dir={rtl}` del formulario, coverStyle `<input type="text">` crudo por selector de presets, preview de imposicion lineal vs pares "Pares de hoja doblada").

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #128 - rediseño visual paso 6 + preview doblada)
- **Merge #128 confirmado** (`feat/book-step6-visual-redesign`, head `30a754c`): `main` -> hash `dff87ac8261005f65d2cb3d552f5e205a7922f73`. Squash msg: `feat(book): rediseño visual del paso 6 + preview de imposicion doblada (#128)`. CI `check-all` success (run 44042897212, 1m31s), Vercel pass + Preview Comments pass. Verificado post-merge: `gh pr view 128 --json mergeCommit` + `git fetch origin && git log origin/main -1` + `git ls-remote origin main` = `dff87ac...` (identicos, triple fuente). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward. PR: https://github.com/kalpa-droid/LEECV/pull/128.
- **Autorizacion**: Kalpa dio OK explicito en sesion tras CI verde ("si").
- **Contenido (corte 2b del plan aprobado)**: (1) Botones rapidos "¿En mi casa?" / "¿En imprenta?" (margen/grosor/destino en un clic + aviso de doble cara). (2) Destino A/B/C en tarjetas con mini-diagrama SVG inline + subtitulo de una linea. (3) Grosor en 4 tarjetas (0 / 0.10 comun / 0.12 ahuesado / Otro -> input) + pill "Lomo estimado: X.X mm" EN VIVO. (4) Switches en tarjetas para creep / guias / ZIP por cuadernillo. (5) Botones segmentados calidad (bloqueado en automatico si sourceProtected) y sentido lectura (se va el `<select>`). (6) Se quita `dir={rtl}` del formulario (BookImpositionStep y BookPreviewExportStep). (7) coverStyle: selector de presets (reusa COVER_PRESETS del Paso 3) en lugar del input de texto crudo. (8) Visor: toggle "Orden lineal" vs "Pares de hoja doblada" (`getSignatureSheetPairs`; misma estrategia multi-balanced que el motor cuando aplica ZIP por cuadernillo).
- **Nuevo helper puro**: `computeBookFinalPageCount(options, pdfPageCount)` en `bookPageCount.ts` (fuente de verdad del conteo final; lo usan Paso 6 pill, Paso 7 resumen y el preview doblado). `renderPdfPreviewStrip`/`BookImpositionStep` recibe `pdfPageCount` prop desde `BookStudioContent`.
- **Validacion**: `tsc --noEmit` 0 errores; `check-all` EXIT=0 local + CI; gobernanza OK; verify-lidio-and-pdf-errors 28/28; sin cambios de OpenAPI ni BOOK_STEP_SEQUENCE; sin bump de version (V2.19.0). 8 archivos, +537/-152. Detalle completo en la PR #128.
- **Con esto el corte 2b queda en produccion; el Plan Integral Mejorado (PRs 1, 2a, 2b) queda COMPLETO**.
- **Pendiente NUEVO**: Kalpa - probar en produccion el paso 6 rediseñado (botones casa/imprenta, tarjetas de grosor + pill de lomo, switches, segmentados, presets de cubierta) y el toggle "Orden lineal"/"Pares de hoja doblada" en el visor. Pendientes previos sin cambios: firma visible con datos personales, CV denso sin hoja fantasma; Lidio con tips agotados + boton "Otro tip"; Book Studio con PDF protegido con contraseña y contra edicion; Importar CV con IA con PDF escaneado/2 columnas.
- **Deuda fuera de scope** (sin cambios): registro gigante recortado (`wrap={false}` atomico); default prop `documentTabs` hardcodeado; `getQuarterSheet`/`getOctavoSheet`/`cutAndStackPlan` (codigo muerto).

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #129 - 3 huecos del plan original)
- **Merge #129 confirmado** (`fix/book-three-gaps`, head `d483981`): `main` -> hash `50a4a145b63ed37787c4f0113a2006b364ed2b31`. Squash msg: `fix(book): 3 gaps del plan original - IndexedDB handle, retiros sin tapa, Lidio casa/imprenta (#129)`. CI `check-all` success (run 44049754108, 1m19s), Vercel pass + Preview Comments pass. Verificado post-merge: `gh pr view 129 --json mergeCommit` + `git fetch origin && git log origin/main -1` + `git ls-remote origin main` = `50a4a14...` (identicos, triple fuente). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward. PR: https://github.com/kalpa-droid/LEECV/pull/129.
- **Autorizacion**: Kalpa dio OK explicito en sesion ("dale merge te autorizo") tras abrir la PR.
- **Contenido (reconciliacion del plan original pegado por Kalpa; Bloques A-D ya cerrados por #118-121/#126/#127/#128, estos eran los 3 gaps reales)**: (1) `pickSourcePdf` guarda el FileSystemFileHandle en IndexedDB en try/catch INDEPENDIENTE: si el guardado falla (incognito/cuota) el archivo ya elegido NO se descarta; se retorna `{status:'picked', file}` (comentario del resultado tipado actualizado). (2) Retiros en blanco (`blankBehindCover`/`blankInFrontBackCover`) solo visibles cuando hay tapa/contratapa (`hasCover||customCover`, `hasBackCover||customBackCover`) en BookCoverStep/BookBackCoverStep; motor (`impositionEngine.ts:708,806,698,1131,1151`), conteo (`bookPageCount.ts:162-186`) y badges (`PdfPreviewStrip.tsx:436,502`) ya filtraban - solo la UI quedaba desincronizada. (3) Lidio: nuevo "BLOQUE DE CONOCIMIENTO - IMPRIMIR EN CASA VS LLEVAR A LA IMPRENTA" en `app_guide_assistant` (`api/_lib/aiTasks/catalog.ts`): borde blanco impresora doméstica, destino A vs C, lomo en vivo, margen para el corte (sangrado) y líneas guía (marcas de corte), cuadernillos/ZIP, compensación de creep, regla simple de recomendación + consejo de consultar requisitos a la imprenta. `responseSchema` OpenAPI 3.0 intacto.
- **Validacion**: `tsc --noEmit` EXIT=0; `check-plain-language` OK (455 archivos, 0 jerga); `check-all` EXIT=0 local + CI; gobernanza OK; 6 archivos, +54/-4. Sin bump de version (V2.19.0).
- **Con esto el plan original pegado por Kalpa queda 100% reconciliado: cero items pendientes de implementacion** (deuda documentada fuera de scope sin cambios).
- **Pendiente NUEVO**: Kalpa - probar en produccion: elegir PDF en incognito/cuota (ya no se descarta), "Sin tapa"/"Sin contratapa" (retiros ocultos) y preguntarle a Lidio "¿imprimo en casa o imprenta?" en un libro. Pendientes previos sin cambio: firma visible con datos personales, CV denso sin hoja fantasma; Lidio con tips agotados + boton "Otro tip"; PDF protegido con contraseña y contra edicion; Importar CV con IA con PDF escaneado/2 columnas.
- **Deuda fuera de scope** (sin cambios): registro gigante recortado (`wrap={false}` atomico); default prop `documentTabs` hardcodeado; `getQuarterSheet`/`getOctavoSheet`/`cutAndStackPlan` (codigo muerto).
