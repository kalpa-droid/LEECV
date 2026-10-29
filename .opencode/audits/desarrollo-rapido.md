# Auditoría de @desarrollo-rapido — núcleos y motores (anti-parche), DAL, duplicados y código muerto

Seguí `_formato-informe.md`. Prefijo de IDs: `DEV`. Solo lectura.
**Mandato Principal:** Sos el fiscalizador de la **Regla 1** y la **Regla 4** de `AGENTS.md`. Tu deber es asegurar que **todo en la webapp use los núcleos y motores oficiales** y que no exista código parcheado, duplicado ni reinventado a mano.

---

## A. Capa de Datos (DAL) vs Consultas Sueltas
1. **Detección de parches en componentes**: Buscá llamadas directas a `supabase.from(` o `.rpc(` dentro de `src/**/*.tsx`, `src/**/*.ts` y hooks. No debe haber NINGUNA fuera de `src/shared/core/storage/dataAccessLayer.ts`. Cada caso encontrado es un hallazgo DEV.
2. En `dataAccessLayer.ts` y `api/_lib/serverDal.ts`: métodos huérfanos sin llamadores reales.
3. Métodos que consultan columnas o tablas obsoletas (cruzalo con las migraciones, sin juzgar el diseño de BD: eso es de `@arquitecto`).
4. `adminService.ts`: funciones que llaman a endpoints que no existen. Cruzá cada ruta con `vercel.json` y con `api/`.

---

## B. Fiscalización Anti-Parche: Adopción de Motores Oficiales (Regla 1 de AGENTS.md)
Cruzá el código contra la tabla oficial de motores. Reportá cualquier lugar donde se haya escrito un parche en vez de usar el motor:

| Si el código hace… | Motor Oficial Obligatorio | Qué se considera "Parche / Deuda Técnica" |
|---|---|---|
| Acceso a base de datos | `dal.*` (`dataAccessLayer.ts`) | Cualquier query `supabase.from()` o `.rpc()` suelta |
| Llamadas HTTP a `/api/*` | `apiClient.*` o `apiFetch()` (`apiClient.ts`) | Usar `fetch('/api/...')` nativo directo |
| Navegación o lectura de URL | `navigation.*` (`navigation.ts`) | Usar `window.location.*`, `history.pushState` o `window.open` |
| Operaciones asíncronas con fallo | `withErrorHandling()` (`errorHandler.ts`) | Bloques `try/catch` manuales con `console.error` repetitivo |
| Validación de formularios | `validationEngine.ts` | Regex sueltas de email, teléfono, DNI o CUIT escritas a mano |
| Vocabulario de la aplicación | `UI_GLOSSARY` (`uiTextGlossary.ts`) | Palabras de UI inventadas fuera del glosario auditado |
| Features según plan de usuario | `useEntitlements()` | Chequeos manuales `plan === 'pro'` en componentes |
| Generación de documentos PDF | Capas de `pdf-engine/layers/` + `presetRegistry` | Renderers o plantillas creadas desde cero sin Preset |
| Formato y estructura de CV | `cvFormatRegistry.ts` | Manipulación manual de layouts de formato sin el registry |

---

## C. Erradicación de Código Duplicado
5. **Cliente de PayPal (OAuth y base URL)**: ¿cuántas implementaciones existen? Debe haber una única clase o helper centralizado.
6. **Ciclo de respaldo de proveedores de IA y telemetría**: lógica repetida entre `ai-generate.ts` y `cv-import-api.ts`.
7. **Resolución de IP del cliente**: repetición de cabeceras (`x-forwarded-for`, `x-real-ip`) en múltiples endpoints de `api/`.
8. **Planes válidos y precios**: los dos `pricingCatalog.ts` (frontend y backend) deben sincronizarse al 100%. Reportá si un endpoint tiene listas hardcodeadas de planes.
9. **Textos legales duplicados**: cruzar `src/modules/legal/` con `src/shared/legal/` para asegurar que ambos consumen `legalCopyEngine.ts`.

---

## D. Valores Fijos Escritos a Mano (Hardcoded)
10. Límites de uso (rate limiting), topes de tokens de IA, período de gracia y duración de Pro: ¿están en constantes de configuración o dispersos por el código?
11. Parámetros enviados por el cliente que el servidor acepta sin validar ni limitar (ej. `maxTokens`).
12. Fallbacks silenciosos que ocultan errores: `api/_lib/supabaseAdmin.ts` o `env.ts` funcionando en "modo degradado" cuando faltan variables críticas de entorno.

---

## E. Limpieza de Repositorio y Código Muerto
13. Archivos residuales en la raíz: `fix-privacy.ts`, `migrate-blog.mjs`, scripts temporales o archivos de lock/build versionados por error.
14. Claves de i18n huérfanas en `src/shared/i18n/catalog/` que ya no se usan en ningún componente.
15. Componentes o hooks en `src/` que no tienen importadores en toda la aplicación.

---

## Entregable
Informe `DEV` con el formato común. Para cada parche o duplicado, indicá **cuál es el motor oficial que corresponde usar**, qué archivos están afectados y la propuesta de refactorización concreta.
