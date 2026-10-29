# Auditoría de @desarrollo-rapido — DAL, duplicados, valores a mano y código muerto

Seguí `_formato-informe.md`. Prefijo de IDs: `DEV`. Solo lectura.
Antes de proponer algo nuevo, leé la **Regla 1** y la **Regla 4** de `AGENTS.md`: casi siempre ya existe un motor o núcleo que sirve.

## A. Capa de datos (DAL)
1. Buscá `supabase.from(` y `.rpc(` dentro de `src/**/*.tsx` y de componentes: no debería haber ninguno fuera de `src/shared/core/storage/dataAccessLayer.ts`. Listalos.
2. En `dataAccessLayer.ts` y `api/_lib/serverDal.ts`: métodos sin ningún llamador. Para cada uno, buscá el nombre en todo el repo antes de reportarlo.
3. Métodos que consultan columnas o tablas que ya no existen (cruzalo con las migraciones, pero **sin** juzgar el diseño de la base: eso es de `@arquitecto`).
4. `adminService.ts`: funciones que llaman a endpoints que no existen. Cruzá cada ruta con `vercel.json` y con `api/`.

## B. Código duplicado (proponé un núcleo único para cada caso)
5. Cliente de PayPal (URL base, token OAuth): ¿cuántas copias hay?
6. Ciclo de respaldo entre proveedores de IA + telemetría (`ai-generate.ts`, `cv-import-api.ts`).
7. Obtención de la IP del cliente en cada endpoint de `api/`.
8. Lista de planes válidos en cada proveedor de pago: debería salir de `PRICING_CATALOG`.
9. Nombres de planes / títulos de checkout / etiquetas de recibo escritos a mano en varios archivos.
10. Navegación: `history.pushState` / `window.location` directo, cuando existe `navigation` (`src/shared/core/utils/navigation`).
11. Manejo de errores: bloques `try/catch` manuales que deberían usar `withErrorHandling()`.
12. Validaciones con regex sueltas que deberían estar en `validationEngine.ts`.

## C. Valores escritos a mano
13. Límites de uso (por hora, por día, por minuto), períodos de gracia, descuentos, topes de tokens de IA, duración de Pro: ¿están en un solo archivo de configuración o repartidos por los endpoints?
14. Valores que manda el cliente y el servidor no limita (por ejemplo `maxTokens`).
15. `api/_lib/supabaseAdmin.ts` y similares: ¿usan un valor falso (placeholder) cuando faltan variables en lugar de cortar con un error claro? Revisá también `src/shared/core/config/env.ts`: en producción hoy cae a "modo degradado" y solo avisa por consola.
16. Textos o nombres de marca inconsistentes ("LEECV Inc." vs "LEECV Studio"). Debe haber una constante.
17. `doc_type` u otros tipos fijos que no cambian según el documento que se exporta.

## D. Código muerto y orden del repo
18. Archivos de la raíz que sobran o no se usan: `fix-privacy.ts`, `migrate-blog.mjs`, `tsconfig.tsbuildinfo`, zips, scripts de prueba sueltos.
19. Claves de i18n que ya nadie usa (`src/shared/i18n/catalog/*`): listá las huérfanas.
20. Carpetas vacías, componentes sin importadores, scripts de `scripts/` que no están en ningún `package.json` ni en `check-all`.
21. `src/modules/legal/` y `src/shared/legal/`: ¿hay textos duplicados o contradictorios? ¿Salen todos del motor de copy (`legalCopyEngine.ts`)?

## E. Motores y núcleos
22. Revisá la **Regla 3** de `AGENTS.md` (motores con baja adopción). Para cada motor de la lista, contá cuántos archivos lo usan y cuántos hacen lo mismo "a mano".

## Entregable
Informe `DEV`. Para cada duplicado, indicá **cuál es el núcleo que ya existe o dónde crearlo**, y cuántos archivos hay que migrar. Prioridad P0 solo si hay riesgo de plata o de datos; casi todo acá es P2/P3.
