# Reporte de detección de errores

Proyecto: `/home/mappo/Kalpagrafica/CVPREMIUM`

## 1. Resumen por severidad

- **CRÍTICA**: 1 hallazgos
- **ALTA**: 0 hallazgos
- **MEDIA**: 1 hallazgos
- **BAJA**: 12 hallazgos

## Severidad CRÍTICA (1)

- `/home/mappo/Kalpagrafica/CVPREMIUM/tsconfig.json` — JSON inválido: Expecting property name enclosed in double quotes (línea 9)

## Severidad MEDIA (1)

- `src/app/App.tsx` — Promesa con .then() sin .catch() visible (posible unhandled rejection) (línea 38, 2 ocurrencia(s))

## Severidad BAJA (12)

- `scripts/check-module-boundaries.js` — console.log/debug dejado en el código (línea 55, 2 ocurrencia(s))
- `api/lemonsqueezy-webhook.js` — Variable de entorno usada sin fallback (puede ser undefined en runtime) (línea 7, 3 ocurrencia(s))
- `api/create-mp-preference.js` — Uso de 'var' (preferible let/const, evita bugs de scope) (línea 2, 1 ocurrencia(s))
- `api/create-mp-preference.js` — Variable de entorno usada sin fallback (puede ser undefined en runtime) (línea 12, 8 ocurrencia(s))
- `api/mercadopago-webhook.js` — Variable de entorno usada sin fallback (puede ser undefined en runtime) (línea 6, 3 ocurrencia(s))
- `api/approve-manual-claim.js` — Variable de entorno usada sin fallback (puede ser undefined en runtime) (línea 12, 2 ocurrencia(s))
- `api/paypal-webhook.js` — Variable de entorno usada sin fallback (puede ser undefined en runtime) (línea 10, 6 ocurrencia(s))
- `api/consume-pdf-credit.js` — Variable de entorno usada sin fallback (puede ser undefined en runtime) (línea 4, 3 ocurrencia(s))
- `api/drive/connect.js` — Variable de entorno usada sin fallback (puede ser undefined en runtime) (línea 11, 2 ocurrencia(s))
- `api/drive/get-access-token.js` — Variable de entorno usada sin fallback (puede ser undefined en runtime) (línea 12, 4 ocurrencia(s))
- `api/drive/disconnect.js` — Variable de entorno usada sin fallback (puede ser undefined en runtime) (línea 10, 2 ocurrencia(s))
- `api/_lib/applyPayment.js` — console.log/debug dejado en el código (línea 37, 1 ocurrencia(s))

## 2. Linters externos

### ESLint

```
npm notice run cvpremium@0.0.0 npx
npm notice run 'eslint' . --no-eslintrc --no-error-on-unmatched-pattern
Invalid option '--eslintrc' - perhaps you meant '--ext'?
```

## 3. Notas importantes

- Este script detecta **patrones sospechosos**, no garantiza que todo lo marcado sea un bug real: revisá cada hallazgo con contexto.
- Para un análisis completo de tipos, agregá `tsc --noEmit` (TypeScript) o `mypy` (Python) a tu pipeline de CI.
- Para errores en tiempo de ejecución que este análisis estático no puede ver (condiciones de carrera, fugas de memoria, errores de integración con la pasarela de pagos), lo mejor es: tests de integración, monitoreo (Sentry/Datadog) y logs estructurados en producción.
