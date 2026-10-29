# Auditoría de @testing-qa — pruebas, CI y orden de trabajo

Seguí `_formato-informe.md`. Prefijo de IDs: `QA`. Solo lectura: **no corras comandos que cambien el repo** (nada de `git commit`, `git push`, `git reset`, `npm install` ni migraciones). Sí podés correr `npm run test` y `npm run typecheck` si Kalpa lo autoriza.

## A. Cobertura de lo que mueve plata
1. Para cada caso, buscá un test que lo cubra de verdad (no que solo "no tire error") y reportá los que faltan:
   - Pro: se acredita con vencimiento, se suma si ya era Pro, el cron lo baja al vencer.
   - Pack: acredita la cantidad del catálogo (no un número escrito a mano).
   - Pago con usuario inexistente → queda en `pending_grants`.
   - Monto o moneda distintos del catálogo → no acredita.
   - Mismo pago dos veces, **en paralelo** (`Promise.all`) → una sola acreditación.
   - Referencia de pago rota o sin plan → no acredita nada (nunca "pro").
   - `useExportEntitlement`: Pro, tokens de cuenta, token de invitado, sin crédito, token vencido.
   - Consumo concurrente del mismo token → solo uno gana.
2. Tests que **se saltan en silencio** cuando faltan variables (por ejemplo `SUPABASE_SERVICE_ROLE_KEY`): ¿qué pasa en GitHub Actions? ¿Pasan en verde sin probar nada? Proponé que fallen o que queden marcados como "skipped" visible.
3. Tests con aserciones débiles: `expect(x).toBeDefined()`, `toBeTruthy()` sobre objetos, snapshots enormes que nadie revisa, mocks que devuelven siempre lo que el test espera.

## B. `check-all` y los scripts `verify:*`
4. Recorré `check-all` en `package.json`: ¿hay scripts que solo buscan texto (grep) y dan falsa seguridad? Indicá cuáles y qué comprobarían de verdad.
5. **Falta `scripts/verify-api-routes.ts`**: cada `destination` de `vercel.json` debe existir en `api/`, y cada llamada `apiClient.get/post('/api/...')` debe tener archivo o rewrite. Describí cómo implementarlo y dónde sumarlo a `check-all`.
6. Scripts de `scripts/` que ya no están referenciados por nadie (candidatos a borrar; la limpieza la hace `@desarrollo-rapido`).
7. Tiempo total de `check-all`, pasos repetidos (por ejemplo `tsc` corriendo varias veces) y orden: lo rápido primero.
8. Pruebas que dependen del horario, del orden de ejecución o de datos compartidos (inestables).

## C. CI y ramas
9. Archivos de `.github/workflows/`: ¿corre `check-all` en cada PR? ¿Con las variables necesarias? ¿Hay un paso que pueda pasar en verde sin ejecutar nada?
10. Protección de `main` (ruleset): solo podés **leer** lo que haya en el repo; lo que no se vea, marcalo `NO VERIFICADO`.
11. Ramas remotas ya mergeadas que sobran (`git branch -r --merged origin/main`).

## D. Higiene y registro
12. `SESSION_LOG.md`: ¿tiene entrada de cada PR importante desde el #27? ¿Falta alguna sesión?
13. Archivos generados que no deberían estar versionados (`tsconfig.tsbuildinfo`, zips, salidas de build).
14. Documentos de plan en la raíz o `docs/` que contradicen el estado real del código (anotá cuáles y qué dicen mal).

## E. Matriz de verificación manual (sandbox)
15. Armá una tabla **proveedor × plan** (Mercado Pago, PayPal, Lemon Squeezy × single_pdf, pack 5, pack 10, Pro) con: qué se acredita, qué recibo llega, qué ve el admin y qué pasa al exportar. Marcá cada celda como `cubierta por test`, `solo manual` o `sin cubrir`.

## Entregable
Informe `QA`. P0 para cualquier flujo de pago sin test real; P1 para tests silenciosos y CI que puede dar falso verde.
