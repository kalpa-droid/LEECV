# Tareas de Implementación — Páginas Legales, Google OAuth, Sentry y Verificación de Producción

- `[x]` **Fase 1: Extracción de Contenido Legal y Páginas Públicas**
  - `[x]` Crear `src/shared/legal/PrivacyPolicyContent.tsx` con texto legal de Privacidad + mención explícita a LEECV Cloud
  - `[x]` Crear `src/shared/legal/TermsOfServiceContent.tsx` con texto legal de Términos y Reembolsos
  - `[x]` Modificar `src/modules/cv-builder/components/PrivacyModal.tsx` para usar los componentes compartidos
  - `[x]` Crear `src/modules/legal/PrivacyPolicyPage.tsx` (`/privacidad`)
  - `[x]` Crear `src/modules/legal/TermsOfServicePage.tsx` (`/terminos`)
  - `[x]` Crear `src/modules/legal/RefundPolicyPage.tsx` (`/reembolsos`)
  - `[x]` Modificar `src/app/main.tsx` para agregar ruteo público de `/privacidad`, `/terminos` y `/reembolsos`
  - `[x]` Agregar enlaces en el footer de `src/app/App.tsx`

- `[x]` **Fase 2: Guía de Verificación en Google Cloud Console**
  - `[x]` Crear `docs/google_oauth_setup.md` con instrucciones paso a paso para pasar la app de Testing a Production y verificar `drive.file`

- `[x]` **Fase 3: Módulo de Monitoreo de Errores con Sentry**
  - `[x]` Crear `src/shared/core/utils/monitoring.ts`
  - `[x]` Modificar `src/shared/core/ui/ErrorBoundary.tsx` para notificar excepciones a Sentry
  - `[x]` Modificar `src/shared/core/utils/errorHandler.ts` para capturar errores de cliente
  - `[x]` Instrumentar `api/_lib/webhookHandler.ts` para captura de errores en webhooks de pago (Mercado Pago, PayPal, Lemon Squeezy)
  - `[x]` Instrumentar `api/admin-api.ts` para captura de errores en operaciones administrativas y transferencias

- `[x]` **Fase 4: Checklist de Verificación de Producción y Pruebas End-to-End**
  - `[x]` Crear `docs/production_verification_checklist.md`
  - `[x]` Ejecutar `npm run check-all` y verificar 65/65 checks exitosos + Vite build limpio
