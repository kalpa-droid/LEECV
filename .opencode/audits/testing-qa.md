# Auditoría de @testing-qa — pruebas de verdad por navegador, auditoría no cosmética, CI y SEO técnico

Seguí `_formato-informe.md`. Prefijo de IDs: `QA`. Solo lectura: **no corras comandos que cambien el repo** (nada de `git commit`, `git push`, `git reset`, `npm install` ni migraciones). Podés correr `npm run test` y `npm run typecheck` si Kalpa lo autoriza.

**Mandato Principal:** Sos el responsable de la **Auditoría No Cosmética (QA Profundo)** y de las **Pruebas de Verdad por Navegador**. Tu trabajo es asegurar que el software funcione en la realidad, no solo en tests con mocks ficticios.

---

## A. Auditoría No Cosmética: Cobertura Real de Flujos Críticos
Una auditoría no cosmética no se conforma con que una prueba "no tire error". Busca validar la lógica de negocio y las consecuencias reales de cada acción:
1. **Flujos de dinero y créditos:**
   - Pack de créditos: ¿se acredita la cantidad exacta del catálogo (5 o 10) sin hardcoding en el handler?
   - Pago de usuario no autenticado o email disconforme: ¿queda registrado en `pending_grants` para resolución admin?
   - Monto o moneda no coincidentes con el catálogo: ¿el webhook rechaza la acreditación?
   - Webhooks concurrentes idénticos (`Promise.all`): ¿la tabla `processed_payments` frena el segundo intento de forma idempotente?
   - Consumo de tokens (`useExportEntitlement`): verificar que un token vencido o sin saldo impida la descarga y que dos descargas paralelas del mismo token no resten dos créditos.
2. **Detección de "Falsos Verdes" y aserciones débiles**:
   - Tests con `expect(x).toBeDefined()` o `toBeTruthy()` sobre objetos que podrían estar vacíos.
   - Tests que se saltan en silencio cuando faltan variables (ej. `SUPABASE_SERVICE_ROLE_KEY`): en CI deben fallar o quedar explícitamente marcados como advertencia.
   - Snapshots desactualizados o masivos que nadie revisa.

---

## B. Pruebas de Verdad por Navegador (E2E & DOM Real)
3. **Pruebas en DOM Real (`tests/viewportDom.test.tsx`, `verify-manual-adjustment-dom-render.js`)**:
   - Comprobar que el hook `useDocumentViewport` responda a cambios reales de tamaño (`390px` móvil a `844px` horizontal).
   - Verificar que los contenedores con `overflow-y-auto` permitan el scroll y el zoom manual sin romper el layout.
4. **Flujos completos de usuario en Navegador (Playwright / MCP Browser)**:
   - **Flujo CV:** Iniciar CV en blanco o con plantilla, editar nombre/experiencia, verificar que el auto-guardado local persista al refrescar la página.
   - **Flujo Cartas:** Entrar a `/crear-carta`, comprobar que abra la postulación vinculada y no se confunda con un CV; probar importación revisable y redacción.
   - **Flujo Modal de Pago:** Abrir `PricingModal`, cambiar de moneda ARS/USD, seleccionar Mercado Pago y PayPal, y comprobar que se inicialice la orden correcta.
   - **Renderizado de PDF:** Ejecutar `npm run verify-pdf-smoke` y auditar que los 4 presets oficiales generen las páginas sin desbordes de texto.

---

## C. Infraestructura de SEO Técnico y Google Search Console
5. **Auditoría técnica de rastreo (`npm run verify:seo`)**:
   - Ejecutar la verificación de SEO y comprobar que las 24 rutas prerenderizadas generen archivos `.html` completos en `dist/`.
   - Validar sintaxis y frescura de `public/sitemap.xml` (debe apuntar al dominio canónico `https://www.leecv.app`).
   - Validar `public/robots.txt`: debe permitir el rastreo de páginas públicas y bloquear `/api/` y `/admin/`.
6. **Enlaces rotos y redirecciones canónicas**:
   - Comprobar que los enlaces internos de la landing, el footer y el blog apunten a URLs canónicas válidas sin generar 404 ni bucles de redirección.
   - Confirmar que la redirección canónica `https://leecv.app` → `https://www.leecv.app` esté configurada sin errores de SSL.

---

## D. Suite `check-all` y Scripts `verify:*`
7. Recorrer los 40+ scripts de `check-all` en `package.json`:
   - Identificar scripts que solo hagan grep de texto básico y proponer validaciones estructurales reales.
   - **Implementación pendiente de `scripts/verify-api-routes.ts`**: auditar que cada `destination` de `vercel.json` tenga su handler correspondiente en `api/`, y que cada llamada de `apiClient` apunte a una ruta viva.
   - Scripts obsoletos o huérfanos en `scripts/` candidatos a remoción.

---

## E. CI, Ramas y Registro
8. `.github/workflows/check-all.yml`: comprobar que el workflow corra en cada PR, que ejecute la suite completa y no oculte fallos.
9. Detección y reporte de ramas remotas mergeadas que sobran (`git branch -r --merged origin/main`).
10. `SESSION_LOG.md`: auditar que cada PR relevante cuente con su entrada correspondiente de intervención técnica.

---

## Entregable
Informe `QA` con el formato común. P0 para flujos de pago sin cobertura real, riesgos de pérdida de datos o enlaces rotos en producción. P1 para tests silenciosos y fallos de indexación SEO.
