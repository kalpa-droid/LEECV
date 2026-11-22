# ARQUITECTURA_PLATAFORMA.md — Mapa de LEECV (V2.28.0 — Fases 0–10 Implementadas)

> Referencia canónica para agentes y desarrolladores sobre capas, cápsulas verticales, contratos, Local-First, privacidad en Lidio y guardrails automáticos verificados en CI.

---

## 1. Las 4 Capas y Reglas de Dependencia (AST verificado)

```
┌──────────────────────────────────────────────────────────────────────┐
│ CAPA A — CÁPSULAS VERTICALES (`src/modules/<app>-studio/`)           │
│   `{ manifest.ts, domain/, pdf/, ui/, <App>StudioContent.tsx }`      │
│   cv-builder (+ Cover Letter) · card-studio · book-studio ·          │
│   planner-studio · facturador-studio · editor-lee-studio             │
├──────────────────────────────────────────────────────────────────────┤
│ CAPA C — COMPOSICIÓN & CONTRATOS (`src/shared/contracts/`, `src/app/`)│
│   DOCUMENT_TYPE_REGISTRY · APP_SURFACE_MANIFEST · APP_REGISTRY ·     │
│   StudioRoute · Puertos tipados (`contact-profile@1`)                │
├──────────────────────────────────────────────────────────────────────┤
│ CAPA K — KITS REUTILIZABLES (`src/shared/kits/`)                     │
│   `print-imposition/` (compartible entre apps sin acoplar al core)   │
├──────────────────────────────────────────────────────────────────────┤
│ CAPA T — TRONCO (`src/shared/core/`)                                 │
│   studio-host (AppShell, StudioNavbar, StudioDock, FloatingAssistant,│
│   PdfCheckoutModal, stepSequenceRegistry) · storage (Local-First) ·  │
│   pdf-engine (pdfCategoryRegistry) · payments · entitlements · ai    │
└──────────────────────────────────────────────────────────────────────┘
```

### Matriz de dependencias aplicada por `scripts/check-import-graph.ts`
- **`src/shared/contracts/**`**: solo importa otros contratos.
- **`src/shared/core/**`**: no importa `src/modules/**`, `src/shared/kits/**`, `src/app/**`, `src/context/**`, `src/data/**`, ni antiguos `*-engine`.
- **`src/shared/kits/**`**: puede importar `contracts/` y `core/`, nunca `modules/` ni `app/`.
- **`src/modules/<app>/manifest.ts`**: pureza estricta (`[manifest-purity]`, solo `contracts/`).
- **`src/modules/<app>/domain/**`**: lógica de negocio pura (`[domain-purity]`, sin `react`, `react-dom`, `@react-pdf/renderer`, ni `ui/`).
- **Zero cross-module imports**: ninguna cápsula importa de otra cápsula.
- **Bóveda aislada (`facturador-studio/**`)**: `[vault-network-isolation]` prohíbe `supabaseClient`, `@supabase/*`, `syncEngine`, `cloudBackup*`.

---

## 2. Catálogo de Apps Activas (7/7 Montadas en `APP_REGISTRY`)

| `id` (`DocumentTypeId`) | Cápsula / Módulo | Ruta | Almacenamiento | Privacidad Lidio | Puerto Inter-App |
|---|---|---|---|---|---|
| `cv` | `src/modules/cv-builder/` | `/crear-cv` | `local` + backup opt-in texto | `full-summary` | Provee `contact-profile@1` |
| `cover_letter` | `src/modules/cv-builder/` (integrada en CV) | `/crear-carta` → `/crear-cv` | `local` + backup opt-in texto | `full-summary` | — |
| `business_card` | `src/modules/card-studio/` | `/crear-tarjeta` | `local` + backup opt-in texto | `full-summary` | Consume `contact-profile@1` |
| `book` | `src/modules/book-studio/` | `/crear-libro` | `local` (PDF local + handle) | `full-summary` | Consume `kits/print-imposition` |
| `planner` | `src/modules/planner-studio/` | `/crear-agenda` | `local` | `full-summary` | — |
| `invoice` | `src/modules/facturador-studio/` | `/crear-factura` | `local-encrypted` (bóveda AES-GCM) | `metadata-only` | — |
| `editorial` | `src/modules/editor-lee-studio/` | `/crear-editor` | `local` | `full-summary` | — |

> `portfolio` y `certificate` fueron eliminados por completo del código y registros (verificado por `scripts/check-forbidden-doctypes.ts`).

---

## 3. Estrategia Local-First, Activos y Respaldo en Nube Opt-In

1. **Almacenamiento primario 100% local (`localDocumentStore` + `documentEnvelope`):**
   - Cada documento vive envuelto en `StoredDocumentEnvelope` versionado (`envelopeVersion`, `docType`, `schemaVersion`, `revision`) bajo claves aisladas por `docType`.
   - Los binarios/imágenes (`data:image/...`) se externalizan a IndexedDB en `localAssetStore` con referencias `asset://<sha256>`.
   - La migración/sanitización se despacha por `docType` (`registerDocumentSchemaHandler`), evitando aplicar `migrateCvData` a otras apps.
   - Bóvedas locales (`encryptedVaultDriver`) nunca transmiten payloads a la nube.
2. **Respaldo en nube ligero y opt-in (`user_preferences` + `document_backups`):**
   - Migración aditiva `supabase/migrations/20261121_local_first_cloud_backups.sql`.
   - Solo proyecciones de texto estructurado (`<= 64 KB`, sin `asset://` ni binarios) para `cv`, `cover_letter` y `business_card` cuando el usuario activa el respaldo.
   - `legacyCloudImporter` realiza la importación única de la tabla legada `cvs` hacia `localDocumentStore` clasificando cada fila por su `docType` real.

---

## 4. Composición en `src/app/` y Rendimiento Inicial

- `src/app/appRegistry.ts`: única tabla exhaustiva (`as const satisfies Record<RegisteredDocumentTypeId, AppRuntimeEntry>`), registra los proveedores de Dock de las 7 apps en `stepSequenceRegistry` y carga los estudios mediante `React.lazy`.
- `src/app/StudioRoute.tsx`: monta cualquier estudio standalone de forma declarativa.
- `vite.config.js`: `codeSplitting.groups` nativo de Vite 8 / Rolldown separa `vendor-react`, `vendor-lucide` y `vendor-react-pdf` (`includeDependenciesRecursively: false`), manteniendo `0` librerías pesadas (`@react-pdf`, `pdf-lib`, `exceljs`, `mammoth`) en el chunk inicial y sus preloads (`check-bundle-budget`).

---

## 5. Estado de Deuda Técnica (D1–D18 Resueltas)

- **D1 / D14 / D15 / D18 (Fronteras AST):** cerradas. `check-import-graph.ts` en **0 violaciones de frontera** y **0 ciclos runtime** (`scripts/import-graph-baseline.json` vacío `[] / []`).
- **D2 / D3 / D4 / D17 (Montaje y God Files del Shell):** cerradas. `EditorLeeStudioContent` montado, `NewDocumentMenu` iterado por registro, `CanvaIconDock` eliminado y reemplazado por `StudioDock`, `App.tsx` reducido bajo 350 líneas.
- **D5 (Fugas de `docType`):** `shared/` y `src/app/` saneados; `card-studio` separado de `cv-builder` bajando el baseline total de 199 → 54.
- **D6 / D12 (Lidio 7/7 + Privacidad FacturLee):** cerrada. Conocimiento modular servidor en `api/_lib/aiTasks/appKnowledge/`, `FloatingAssistant` en 7/7 apps y detector de completitud `metadata-only` para FacturLee (`facturadorCompleteness.ts`).
- **D7 / D8 / D9 / D10 (Integridad y Contratos):** cerrada. Contratos puros en `src/shared/contracts/`, registro `satisfies`, `portfolio`/`certificate` purgados y sobres versionados Local-First.
- **D11 / D13 / D16:** tokens definidos, `APP_BLUEPRINT.md` corregido sin imports cruzados, y migraciones SQL aditivas e idempotentes.

---

## 6. Guardrails Automáticos en `npm run check-all`

| Script | Responsabilidad |
|---|---|
| `check-import-graph` | Fronteras entre capas, pureza de `manifest`/`domain`, aislamiento de bóveda, detección Tarjan de ciclos |
| `check-docType-leaks` | Fugas AST de `docType` (`===`, `switch`, arrays hardcodeados) |
| `check-forbidden-doctypes` | Bloquea cualquier reaparición de `portfolio` / `certificate` |
| `verify:registry-coverage` | Cobertura completa de `DOCUMENT_TYPE_REGISTRY` |
| `verify:app-mounted` | Montaje real de 7/7 apps en `APP_REGISTRY`, Dock y `<StudioRoute>` |
| `verify:app-contract` | Paridad Contrato + Cápsula + Dock + Lidio + Local-First + baseline `0/0` |
| `verify:app-completeness` | Paridad superficie completa (Landing, Menú, Tabs, Storage, Studio) |
| `new-app:selftest` | Verifica el generador de cápsulas vertical y sus guardias de seguridad |
| `check-bundle-budget` | Verifica 0 dependencias pesadas en el HTML de arranque |
| `tests/contracts/appConformance.test.ts` | Suite paramétrica (`describe.each(ALL_DOCUMENT_TYPE_IDS)`) heredada automáticamente por toda app #8, #15, #30 |
