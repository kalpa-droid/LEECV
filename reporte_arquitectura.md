# Reporte de análisis de arquitectura

Proyecto: `/home/mappo/Kalpagrafica/CVPREMIUM`

## 1. Resumen general

- Archivos de código analizados: **89**
- Líneas de código totales (aprox.): **12556**
- Comentarios TODO/FIXME/HACK: **2**

### Distribución por extensión

- `.ts`: 41 archivos
- `.tsx`: 36 archivos
- `.js`: 12 archivos

## 2. Cobertura por dominio funcional

Cuántos archivos tocan cada dominio (heurística por palabras clave). Un dominio con muy pocos archivos puede indicar que aún no está desarrollado o que está disperso sin una capa clara.

### Pagos / Facturación — 25 archivos, 457 coincidencias
  - api/lemonsqueezy-webhook.js
  - api/create-mp-preference.js
  - api/mercadopago-webhook.js
  - api/approve-manual-claim.js
  - api/paypal-webhook.js
  - api/_lib/applyPayment.js
  - src/modules/payments/paymentService.ts
  - src/modules/payments/PricingModal.tsx
  - src/modules/admin/adminService.ts
  - src/modules/admin/AdminDashboard.tsx
  - src/modules/cv-builder/components/Navbar.tsx
  - src/modules/cv-builder/components/PrivacyModal.tsx
  - src/modules/cv-builder/components/SavedCVsModal.tsx
  - src/modules/cv-builder/components/modals/PdfCheckoutModal.tsx
  - src/modules/cv-builder/services/googleDriveQuotaService.ts
  - ...y 10 más

### Editor / Canvas / Diseño — 40 archivos, 409 coincidencias
  - src/modules/payments/PricingModal.tsx
  - src/modules/admin/AdminDashboard.tsx
  - src/modules/cv-builder/components/Navbar.tsx
  - src/modules/cv-builder/components/SecondaryNavbar.tsx
  - src/modules/cv-builder/components/CertCropperModal.tsx
  - src/modules/cv-builder/components/PhotoCropperModal.tsx
  - src/modules/cv-builder/components/EditorPanel.tsx
  - src/modules/cv-builder/components/CVPreview.tsx
  - src/modules/cv-builder/components/WizardModal.tsx
  - src/modules/cv-builder/components/CanvaIconDock.tsx
  - src/modules/cv-builder/components/SignatureModal.tsx
  - src/modules/cv-builder/components/preview/ExtraPage.tsx
  - src/modules/cv-builder/components/preview/ScannedCertificatesPages.tsx
  - src/modules/cv-builder/components/preview/CoverPageSection.tsx
  - src/modules/cv-builder/components/modals/PdfCheckoutModal.tsx
  - ...y 25 más

### Auth / Identidad — 42 archivos, 265 coincidencias
  - api/lemonsqueezy-webhook.js
  - api/create-mp-preference.js
  - api/mercadopago-webhook.js
  - api/approve-manual-claim.js
  - api/paypal-webhook.js
  - api/consume-pdf-credit.js
  - api/drive/connect.js
  - api/drive/get-access-token.js
  - api/drive/disconnect.js
  - src/modules/payments/paymentService.ts
  - src/modules/admin/adminService.ts
  - src/modules/admin/AdminLogin.tsx
  - src/modules/admin/AdminDashboard.tsx
  - src/modules/cv-builder/components/CertCropperModal.tsx
  - src/modules/cv-builder/components/PhotoCropperModal.tsx
  - ...y 27 más

### Notificaciones — 30 archivos, 257 coincidencias
  - api/lemonsqueezy-webhook.js
  - api/create-mp-preference.js
  - api/mercadopago-webhook.js
  - api/approve-manual-claim.js
  - api/paypal-webhook.js
  - api/_lib/applyPayment.js
  - src/modules/payments/paymentService.ts
  - src/modules/admin/adminService.ts
  - src/modules/admin/AdminLogin.tsx
  - src/modules/admin/AdminDashboard.tsx
  - src/modules/cv-builder/components/EditorPanel.tsx
  - src/modules/cv-builder/components/CVPreview.tsx
  - src/modules/cv-builder/components/preview/CoverPageSection.tsx
  - src/modules/cv-builder/components/modals/PdfCheckoutModal.tsx
  - src/modules/cv-builder/components/editor/PersonalInfoSection.tsx
  - ...y 15 más

### Multiusuario / Colaboración — 30 archivos, 188 coincidencias
  - api/_lib/applyPayment.js
  - src/modules/admin/adminService.ts
  - src/modules/admin/AdminDashboard.tsx
  - src/modules/cv-builder/components/Navbar.tsx
  - src/modules/cv-builder/components/SecondaryNavbar.tsx
  - src/modules/cv-builder/components/CertCropperModal.tsx
  - src/modules/cv-builder/components/PhotoCropperModal.tsx
  - src/modules/cv-builder/components/EditorPanel.tsx
  - src/modules/cv-builder/components/CloudStatusModal.tsx
  - src/modules/cv-builder/components/PrivacyModal.tsx
  - src/modules/cv-builder/components/SavedCVsModal.tsx
  - src/modules/cv-builder/components/CanvaIconDock.tsx
  - src/modules/cv-builder/components/SignatureModal.tsx
  - src/modules/cv-builder/components/preview/ScannedCertificatesPages.tsx
  - src/modules/cv-builder/components/modals/PdfProgressModal.tsx
  - ...y 15 más

### Almacenamiento / Assets — 30 archivos, 174 coincidencias
  - src/modules/admin/adminService.ts
  - src/modules/cv-builder/components/SecondaryNavbar.tsx
  - src/modules/cv-builder/components/PhotoCropperModal.tsx
  - src/modules/cv-builder/components/EditorPanel.tsx
  - src/modules/cv-builder/components/CloudStatusModal.tsx
  - src/modules/cv-builder/components/CVPreview.tsx
  - src/modules/cv-builder/components/PrivacyModal.tsx
  - src/modules/cv-builder/components/SavedCVsModal.tsx
  - src/modules/cv-builder/components/CanvaIconDock.tsx
  - src/modules/cv-builder/components/SignatureModal.tsx
  - src/modules/cv-builder/components/modals/JsonDownloadModal.tsx
  - src/modules/cv-builder/services/googleDriveQuotaService.ts
  - src/modules/cv-builder/services/storageIndexedDB.ts
  - src/modules/cv-builder/services/cvStorageService.ts
  - src/modules/auth/authService.ts
  - ...y 15 más

### Plantillas — 12 archivos, 96 coincidencias
  - src/modules/cv-builder/components/EditorPanel.tsx
  - src/modules/cv-builder/components/preview/CoverPageSection.tsx
  - src/modules/cv-builder/services/cvStorageService.ts
  - src/modules/pdf-designer/components/DesignerCanvas.tsx
  - src/shared/core/utils/cvDataSchema.ts
  - src/shared/core/capabilities/capabilityRegistry.ts
  - src/context/CVContext.tsx
  - src/types/cv.ts
  - src/types/document.ts
  - src/data/initialCVData.ts
  - src/data/themePresets.ts
  - src/data/panelPresets.ts

## 3. Archivos grandes (posibles "god files")

Umbral: más de 400 líneas.

- src/modules/cv-builder/components/EditorPanel.tsx — 1728 líneas
- src/modules/cv-builder/components/CVPreview.tsx — 1111 líneas
- src/modules/admin/AdminDashboard.tsx — 459 líneas
- src/app/App.tsx — 403 líneas

## 4. Deuda técnica visible (TODO/FIXME/HACK)

- src/modules/payments/PricingModal.tsx: 1
- src/modules/auth/authService.ts: 1

## 5. Alertas de seguridad (heurística, revisar manualmente)

⚠️ Estos son falsos positivos frecuentes — revisar cada caso, no asumir que es un secreto real.

_No se detectaron patrones sospechosos._

## 6. Dependencias declaradas

### package.json

```
{
  "name": "cvpremium",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "typecheck": "tsc --noEmit",
    "check-all": "npm run typecheck && npm run lint && node scripts/check-module-boundaries.js && npm run build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.112.3",
    "html2canvas-pro": "^2.3.9",
    "jspdf": "^4.2.1",
    "lucide-react": "^1.31.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.4",
    "oxlint": "^1.75.0",
    "tailwindcss": "^4.3.3",
    "typescript": "^5.7.3",
    "vite": "^8.2.0"
  }
}
```


## 7. Preguntas guía para el análisis profundo (respondelas manualmente)

- **Editor/Canvas**: ¿el modelo de documento (capas, objetos, transformaciones) está desacoplado del motor de renderizado?
- **Plantillas**: ¿una plantilla es simplemente un documento clonable, o tiene un modelo de datos propio?
- **Pagos**: ¿los límites de plan se validan en backend en cada acción, o solo se ocultan en el frontend?
- **Multiusuario**: si dos usuarios editan a la vez, ¿cómo se resuelven conflictos? ¿hay CRDT/OT o es "último que guarda gana"?
- **Seguridad**: ¿hay aislamiento real de datos entre organizaciones/tenants a nivel de queries, o depende solo de checks en el frontend?
- **Escalabilidad**: ¿qué pasa con el WebSocket/servidor de colaboración si hay 500 usuarios editando el mismo documento (caso extremo) o 100k documentos activos?
