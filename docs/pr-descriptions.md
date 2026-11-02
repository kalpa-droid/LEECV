# Documentación de Pull Requests (Regla 6 — paso 3)

> Preparado para que `@kalpa-droid` (CODEOWNER) abra las PRs manualmente en GitHub o vía `gh pr create`. No se hace push automático (Regla 6 paso 6 requiere confirmación humana).

## PR 1 — feat/hotfix-login-validaciones-v250 → main (`ade7449`)

**Título sugerido:** `fix(auth): corregir regex email, patrón OTP 6 dígitos y shouldCreateUser (Fase A/B)`

**Cuerpo (descripción para copiar en GitHub):**
```
Closes: Fase A (hotfix) + Fase B (pestañas) del PLAN_CUENTA_CREDITOS_IMPORTACION.md

Problemas resueltos (causas en código confirmadas):
- [x] Email con letra "s" rechazado: regex `[^s@]` → `[^


### PR 1 — feat/hotfix-login-validaciones-v250
- **Base:** `main` (`71c4f91` V2.5.0)
- **Rama:** `feat/hotfix-login-validaciones-v250`
- **Hash:** `ade7449`
- **Estado:** listo para PR (código estable, `check-all` 0 errores)
- **Aprobación requerida:** `CODEOWNERS` exige aprobación del dueño (`@kalpa-droid`) porque toca `src/shared/core/auth/authService.ts` (núcleo compartido: autenticación).

### PR 2 — feat/panel-cuenta-creditos-fase-d
- **Base:** `main` (`71c4f91` V2.5.0) — nota: `main` local ya tiene los commits aplicados (`23c6702`); la rama se creó sobre la misma base para registro formal.
- **Rama:** `feat/panel-cuenta-creditos-fase-d`
- **Hash:** `23c6702`
- **Estado:** listo para PR (`check-all` 0 errores, contraste OK, gobernanza OK)
- **Aprobación requerida:** No requiere `CODEOWNERS` (toca solo `src/modules/payments/components/CreditsModal.tsx` y `src/shared/core/auth/AuthContext.tsx` — no es núcleo de datos/entitlements).

---

## Verificación antes de merge (Regla 6 paso 4 — checklist)

- [ ] `npm run check-all` pasa en local (confirmado: 0 errores, 284 tests passed)
- [ ] `npm run typecheck` pasa (confirmado)
- [ ] `npm run build` pasa (confirmado)
- [ ] `verify:seo` pasa (confirmado: 40/40)
- [ ] No hay fugas de colores (`check-ui-tokens`: 0 fugas; `check-contrast`: 0 nuevas violaciones — solo baseline de 20 casos previos)
- [ ] No hay tokens huérfanos nuevos (`check-token-usage`: 3 tokens conocidos `gradientSystem`, `motionSystem`, `UI_THEME_CYCLE` — no nuevos)
- [ ] Lenguaje sencillo OK (`check-plain-language`: 435 archivos, 0 palabras técnicas de imprenta)
- [ ] Gobernanza de módulos OK (`check-module-boundaries`: 0 violations; `LoginModal.tsx` aún usa 2 sombras no migradas — advertencia conocida pero no bloquea)
- [ ] `SESSION_LOG.md` actualizado con hash y descripción
- [ ] `.opencode/CONTEXT.md` actualizado con registro de traspaso (Regla 0, paso 7)

---

## Próximas acciones recomendadas (después de merge)

1. **Fase C (SMTP):** configurar panel Supabase (`Email Template` con `{{ .Token }}`) + dominio `leecv.com` como remitente. Requiere acceso al proyecto Supabase en producción.
2. **Fase E (PDF/IA):** 5 minutos en pestaña Red del navegador para `extract-page`; confirmar `GEMINI_API_KEYS` y `GROQ_API_KEYS` cargadas en Vercel Production; redeployar; agregar mensajes `ai_not_configured` / `ai_rate_limited` / `ai_provider_error` en `cv-import-api.ts`.
3. **Fase F (pruebas):** validar con `sofia@gmail.com` y `123456`; probar `signInWithOtp` con correo inexistente (debe fallar sin crear cuenta); probar logout (CV local debe persistir en IndexedDB); probar botón de landing (debe abrir `CreditsModal`, no `/crear-cv`).
