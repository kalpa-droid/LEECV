# 📘 Guía Viva de Arquitectura y Componentes - LEECV

Este documento sirve como registro vivo de la estructura de componentes, regla de aislamiento estricto (Strict Module Isolation) y dependencias de la plataforma **LEECV**.

---

## 🛡️ Regla de Oro: Strict Module Isolation

> **REGLA ESTRUCTURAL**:  
> **Un módulo NUNCA importa directamente de otro módulo.**  
> Los módulos (`cv-builder`, `agency`, `admin`, `auth`, `payments`, `pdf-designer`) solo pueden importar de `src/shared/core/` o de su propia carpeta interna.

---

## 🏛️ App Shell (`src/app/`) y Núcleo Compartido (`src/shared/core/`)

| Componente | Ubicación | Qué hace | Consume de | Lo usan | Última Modificación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `main.jsx` | `src/app/main.jsx` | Punto de entrada, ErrorBoundary y React.lazy de rutas | `React.lazy` | `index.html` | 2026-08-19 |
| `App.jsx` | `src/app/App.jsx` | Shell principal de la aplicación / Enrutador de modales | `CVContext` | `main.jsx` | 2026-08-19 |
| `CVContext.jsx` | `src/context/CVContext.jsx` | Proveedor centralizado de estado de CV con acciones puras | `cvStorageService` | `App.jsx`, `EditorPanel`, `CVPreview` | 2026-08-19 |
| `useEntitlements.js` | `src/shared/core/entitlements/useEntitlements.js` | Feature Flags desacopladas por plan (Free / Pro / Enterprise) | `supabaseClient` | `cv-builder`, `agency` | 2026-08-19 |
| `backupProvider.js` | `src/shared/core/storage/backupProvider.js` | Proveedor unificado de almacenamiento (Drive vs Cloud) | `googleDriveBackend`, `leecvCloudBackend` | `cvStorageService` | 2026-08-19 |
| `pdfExporter.js` | `src/shared/core/pdf-engine/pdfExporter.js` | Motor genérico e independiente de exportación A4 PDF | `html2canvas-pro`, `jspdf` | `App.jsx`, `pdf-designer` | 2026-08-19 |
| `supabaseClient.js` | `src/shared/core/lib/supabaseClient.js` | Cliente único inicializado de Supabase Auth/DB | `@supabase/supabase-js` | `authService`, `adminService`, `cvStorageService` | 2026-08-19 |

---

## 🏢 Módulo `src/modules/agency/` (Gestión de Candidatos)

| Componente | Ubicación | Qué hace | Consume de | Lo usan | Última Modificación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `AgencyCandidateDashboard.jsx` | `src/modules/agency/AgencyCandidateDashboard.jsx` | Panel Multi-Tenant para Agencias de reclutamiento | `useEntitlements` | `App.jsx` | 2026-08-19 |

---

## 📦 Módulo `src/modules/cv-builder/`

| Componente | Ubicación | Qué hace | Consume de | Lo usan | Última Modificación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `EditorPanel.jsx` | `src/modules/cv-builder/components/EditorPanel.jsx` | Panel lateral del formulario de edición del CV | `CVContext` | `App.jsx` | 2026-08-19 |
| `PersonalInfoSection.jsx` | `src/modules/cv-builder/components/editor/PersonalInfoSection.jsx` | Formulario de datos personales y foto de perfil | `CVContext` | `EditorPanel` | 2026-08-19 |
| `CVPreview.jsx` | `src/modules/cv-builder/components/CVPreview.jsx` | Vista previa en vivo en formato A4 nativo | `CVContext` | `App.jsx` | 2026-08-19 |
| `Navbar.jsx` | `src/modules/cv-builder/components/Navbar.jsx` | Barra superior principal de acciones y exportación | `CVContext` | `App.jsx` | 2026-08-19 |
| `PdfCheckoutModal.jsx` | `src/modules/cv-builder/components/modals/PdfCheckoutModal.jsx` | Modal de confirmación y cobro $1 USD PDF A4 | Local State | `App.jsx` | 2026-08-19 |
| `JsonDownloadModal.jsx` | `src/modules/cv-builder/components/modals/JsonDownloadModal.jsx` | Modal explicativo de descarga de respaldo .JSON | `jsonImporterExporter` | `App.jsx` | 2026-08-19 |
| `PdfProgressModal.jsx` | `src/modules/cv-builder/components/modals/PdfProgressModal.jsx` | Modal de barra de progreso de renderizado PDF | Props (`pdfProgress`) | `App.jsx` | 2026-08-19 |

---

## 💳 Módulo `src/modules/payments/`

| Componente | Ubicación | Qué hace | Consume de | Lo usan | Última Modificación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PricingModal.jsx` | `src/modules/payments/PricingModal.jsx` | Modal de 3 niveles de planes ($1 PDF, $19 Pro, $29 Enterprise) | `paymentService` | `App.jsx` | 2026-08-19 |
| `paymentService.js` | `src/modules/payments/paymentService.js` | Conector a gateways de pago Mercado Pago / Lemon Squeezy | Vercel API | `PricingModal` | 2026-08-19 |

---

## 🔐 Módulo `src/modules/admin/` y `src/modules/auth/`

| Componente | Ubicación | Qué hace | Consume de | Lo usan | Última Modificación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `AdminDashboard.jsx` | `src/modules/admin/AdminDashboard.jsx` | Panel de control de licencias y reclamos | `adminService` | `main.jsx` | 2026-08-19 |
| `AdminLogin.jsx` | `src/modules/admin/AdminLogin.jsx` | Formulario de autenticación para administradores | `authService` | `AdminDashboard` | 2026-08-19 |
| `authService.js` | `src/modules/auth/authService.js` | Servicio de Auth con purge de tokens | `supabaseClient` | `AdminDashboard` | 2026-08-19 |

---

> ℹ️ **Nota de Mantenimiento**: Cada vez que se agregue, modifique o mueva un componente, se debe actualizar su fila correspondiente en este documento.
