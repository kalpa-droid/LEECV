# Checklist de Verificación de Producción — LEECV Engine

Este documento contiene la guía paso a paso para la verificación end-to-end antes de desplegar o tras realizar cambios críticos en pasarelas de pago, autenticación OAuth o páginas legales.

---

## 1. Verificación de Pasarelas de Pago (E2E)

### A. Mercado Pago
- [ ] Configurar credenciales en Vercel Environment Variables: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`.
- [ ] Configurar URL de webhook en el panel de Mercado Pago: `https://leecv.app/api/webhooks?provider=mercadopago`.
- [ ] Probar compra con usuario de prueba (Sandbox):
  - [ ] Seleccionar Pack de Créditos o Suscripción Pro.
  - [ ] Verificar redirección o checkout de Mercado Pago.
  - [ ] Simular pago aprobado.
  - [ ] Confirmar recepción del webhook en Vercel Logs (`[CRITICAL WEBHOOK ERROR]` no debe aparecer).
  - [ ] Verificar acreditación automática de créditos / badge Pro en el dashboard del usuario.

### B. PayPal
- [ ] Configurar variables de entorno: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`.
- [ ] Configurar URL de webhook en PayPal Developer Console: `https://leecv.app/api/webhooks?provider=paypal`.
- [ ] Ejecutar prueba de pago en Sandbox:
  - [ ] Completar flujo de orden con cuenta comprador Sandbox.
  - [ ] Confirmar webhook `PAYMENT.CAPTURE.COMPLETED`.
  - [ ] Verificar registro en la tabla `processed_payments` de Supabase.

### C. Lemon Squeezy
- [ ] Configurar variables de entorno: `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_WEBHOOK_SECRET`.
- [ ] Configurar URL de webhook en Lemon Squeezy Dashboard: `https://leecv.app/api/webhooks?provider=lemonsqueezy`.
- [ ] Probar flujo con tarjeta de prueba en Test Mode:
  - [ ] Confirmar verificación de firma HMAC SHA-256 (rawBody).
  - [ ] Verificar que no haya errores de firma en `[CRITICAL WEBHOOK ALERT - lemonsqueezy]`.
  - [ ] Confirmar acreditación de credits / plan.

---

## 2. Verificación de Páginas Legales Públicas

- [ ] Verificar accesibilidad de URLs públicas sin requerir inicio de sesión:
  - `https://leecv.app/privacidad` (o `/privacy`)
  - `https://leecv.app/terminos` (o `/terms`)
  - `https://leecv.app/reembolsos` (o `/refunds`)
- [ ] Comprobar que `/privacidad` incluya menciones explícitas de:
  - Manejo de datos personales.
  - Almacenamiento seguro en **Supabase** y **LEECV Cloud (Enterprise)**.
  - Integración opcional con **Google Drive** mediante scope `drive.file`.
  - Instrucciones y derechos de eliminación / rectificación de datos.
- [ ] Comprobar que en el editor de CVs, el modal `PrivacyModal.tsx` renderice exactamente el mismo contenido que las páginas públicas.
- [ ] Verificar enlaces visibles en el footer principal de la aplicación.

---

## 3. Verificación de Google OAuth & Consent Screen

- [ ] Revisar la guía en `docs/google_oauth_setup.md`.
- [ ] Confirmar que en Google Cloud Console:
  - El estado de la pantalla de consentimiento esté configurado en **"In production"** (o "Public").
  - La URL de la Política de Privacidad apunte a `https://leecv.app/privacidad`.
  - El alcance configurado sea estrictamente `https://www.googleapis.com/auth/drive.file`.
- [ ] Probar conexión de Google Drive desde el dashboard de un usuario:
  - Confirmar que la pantalla de consentimiento muestre el logo, nombre y dominio autorizado `leecv.app`.
  - Verificar que tras conceder permiso, la sincronización guarde los archivos en la carpeta de la app.
  - Confirmar que el token de refresco no expire a los 7 días.

---

## 4. Verificación de Monitoreo & Errores (Sentry)

- [ ] Configurar `VITE_SENTRY_DSN` o `SENTRY_DSN` en Vercel (si se utiliza Sentry habilitado).
- [ ] Forzar una excepción de prueba en desarrollo o staging:
  - Verificar captura estructurada en consola: `[MONITORING ERROR]`.
  - Confirmar envío a Sentry dashboard con tags `context` y `provider`.
- [ ] Verificar que la pantalla de error global (`ErrorBoundary.tsx`) capture fallos de render sin colapsar la app.

---

## 5. Auditoría de Governance y Compilación

- [ ] Ejecutar la suite completa de verificación:
  ```bash
  npm run check-all
  ```
- [ ] Asegurar que los 65/65 checks pasen exitosamente sin advertencias de linters ni errores de TypeScript.
- [ ] Validar que la build de producción compila limpiamente:
  ```bash
  npm run build
  ```
