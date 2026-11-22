# APP_BLUEPRINT.md — Blueprint de Cápsulas Verticales para Apps en LEECV

Este documento define el estándar oficial (Fases 0–10) para crear e integrar una nueva aplicación como **cápsula vertical aislada** sin modificar código común del tronco (`src/shared/`).

---

## 1. Arquitectura de Cápsula Vertical

```mermaid
flowchart TD
    Contracts["src/shared/contracts/ (Tipos puros, Puertos)"]
    Core["src/shared/core/ (StudioHost, Storage, PDF Engine, Entitlements)"]
    Kits["src/shared/kits/ (print-imposition, etc.)"]
    Capsule["src/modules/<app>-studio/ ({manifest.ts, domain/, pdf/, ui/, <App>StudioContent.tsx})"]
    AppRoot["src/app/appRegistry.ts + StudioRoute.tsx"]
    Lidio["api/_lib/aiTasks/appKnowledge/<app>.ts"]

    Capsule --> Contracts
    Capsule --> Core
    Capsule --> Kits
    Kits --> Core
    Kits --> Contracts
    Core --> Contracts
    AppRoot --> Capsule
    AppRoot --> Core
```

### Reglas estructurales (auditadas por AST en CI)
- **`src/shared/contracts/**`**: 0 dependencias externas o internas.
- **`src/shared/core/**`**: no importa `modules/`, `kits/`, `app/` ni `context/`/`data/`.
- **`src/modules/<app>/domain/**`**: JavaScript/TypeScript puro (`[domain-purity]`: prohibido `react`, `react-dom`, `@react-pdf/renderer`, `./ui/`).
- **`src/modules/<app>/manifest.ts`**: metadatos puros de cápsula (`[manifest-purity]`: solo importa `src/shared/contracts`).
- **0 cross-module imports**: ninguna app importa desde otra app. Para compartir datos entre apps (como CV → Tarjeta Personal), usar puertos tipados vía `portBroker.ts`.

---

## 2. Paso 1 — Generar el esqueleto con `npm run new-app`

```bash
npm run new-app -- \
  --id=diploma \
  --capsule=diploma-studio \
  --route=/crear-diploma \
  --title="Diplomas y Certificaciones" \
  --storage=local-only \
  --privacy=full-summary
```

Esto genera:
- `src/modules/<capsule>/manifest.ts`
- `src/modules/<capsule>/domain/<id>Types.ts`
- `src/modules/<capsule>/domain/<id>StepSequence.ts`
- `src/modules/<capsule>/<Pascal>StudioContent.tsx`
- Carpetas `pdf/` y `ui/`

Para previsualizar sin escribir archivos: agregar `--dry-run`.

---

## 3. Paso 2 — Declarar el Contrato en Registros (`C`)

1. **`src/shared/core/capabilities/capabilityRegistry.ts`** (`DOCUMENT_TYPE_REGISTRY`):
   - `id`, `capsuleId`, `name`, `description`, `iconName`, `route`, `defaultTitle`, `titlePrefix`, `draftIdPrefix`.
   - `storage`:
     - `{ kind: 'local' }` (solo en este dispositivo)
     - `{ kind: 'local', cloudBackup: { projection: 'structured-text', maxBytes: 16384 } }` (respaldo opt-in sin imágenes)
     - `{ kind: 'local-encrypted', encryptedDriver: 'vault-aes-gcm' }` (bóveda cifrada 100% local, nunca nube)
   - `assistant`: `{ knowledgeId, privacy: 'full-summary' | 'metadata-only' }`
   - `creationStrategy`, `capabilities`, `exportFormats`, `stepSequenceId`, `defaultPaperSize`, `defaultActivePresetId`.
2. **`src/shared/core/capabilities/appSurfaceManifest.ts`** (`APP_SURFACE_MANIFEST`):
   - `route`, `primaryStudioFile`, `menuAction`, `tabsBarAction`, `features`, `requiredFiles`.
3. **`src/app/appRegistry.ts`** (`APP_REGISTRY` + `registerAllDockProviders()`):
   - Registrar el proveedor del Dock (`registerDockStepProvider` + `registerStepIds`).
   - Montar el componente `lazy(...)` con `usesSharedCvWorkspace: false`.

---

## 4. Paso 3 — Render y Exportación PDF sin tocar `pdfExporter.ts`

1. Colocar los componentes `@react-pdf/renderer`, presets y adaptadores dentro de `src/modules/<capsule>/pdf/`.
2. Registrar el exportador de categoría desde el propio documento PDF:
   ```ts
   import { registerPdfCategoryExporter } from '../../../shared/core/pdf-engine/pdfCategoryRegistry';
   ```
3. Toda descarga pagada o con créditos usa `useExportEntitlement()` (`consumeCreditIfNeeded()`) junto a `<PdfCheckoutModal />` importado desde `src/shared/core/studio-host/PdfCheckoutModal`.
4. Previsualizar en vivo dentro de `<VectorDocViewer />` importando el componente `@react-pdf/renderer` directamente (nunca con `React.lazy`, para preservar su reconciler propio).

---

## 5. Paso 4 — Persistencia Local-First, Imágenes y Bóveda

- Toda persistencia pasa por `documentStorageService` (`localDocumentStore` + `wrapDocumentEnvelope`).
- Los archivos binarios/imágenes se externalizan automáticamente a IndexedDB (`localAssetStore`, URI `asset://<sha256>`).
- Registrar sanitizador y migrador propios vía `registerDocumentSchemaHandler(docType, handler)` sin depender de `migrateCvData`.
- Cualquier operación async de usuario usa `withErrorHandling()` (`errorHandler.ts`).

---

## 6. Paso 5 — Lidio Modular y Privacidad

1. Crear `api/_lib/aiTasks/appKnowledge/<id>.ts` e incluirlo en `api/_lib/aiTasks/appKnowledge/index.ts`.
2. Agregar tips locales por paso y generales en `src/shared/core/assistant/assistantTips.ts`.
3. Para apps sensibles (`metadata-only`, como FacturLee), entregar a `<FloatingAssistant metadataOnlyContext={...} />` únicamente metadatos de completitud sin valores escritos por el usuario.

---

## 7. Checklist Final antes de abrir PR

- `npm run check-all` en **0 errores**:
  - `verify:registry-coverage`, `verify:app-mounted`, `verify:app-contract`, `new-app:selftest`
  - `check-import-graph` (**0** violaciones AST, **0** ciclos runtime)
  - `check-docType-leaks` (**0** fugas nuevas)
  - `check-forbidden-doctypes` (sin tipos purgados)
  - `check-ui-tokens`, `check-contrast`, `check-plain-language`, `check-bundle-budget`, `verify:seo`
- Actualización de versión en `src/shared/core/version.ts` (`check-version-bump`).
