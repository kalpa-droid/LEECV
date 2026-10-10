# Registro de Intervenciones de Agentes (SESSION_LOG)

Este archivo documenta los cambios realizados en el repositorio por agentes de IA, para mantener un rastro histórico de qué se hizo, por qué y en qué momento.

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
