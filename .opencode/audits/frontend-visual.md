# Auditoría de @frontend-visual — interfaz, accesibilidad, coherencia visual y SEO semántico

Seguí `_formato-informe.md`. Prefijo de IDs: `UI`. Solo lectura.
Tokens oficiales: `src/shared/core/uiDesignSystem.ts` y `docs/guia-sistema-diseno.md`. Temas: `day`, `night`, `teal_ocean`.
Si no podés abrir la app en un navegador, **pedile capturas a Kalpa** (móvil y escritorio, los 3 temas) y marcá lo demás como `NO VERIFICADO`.

---

## A. Tokens, colores y componentes núcleo de LEECV
1. Colores escritos a mano (`#hex`, `rgb(`, clases `bg-[#...]`, `text-white` fijos) en `src/**/*.tsx`. Cada uno debe ser `var(--color-...)` o un token de `uiDesignSystem.ts`.
2. **Regla 2 de `AGENTS.md`**: clases de Tailwind armadas con variables JS dinámicas (`className={`bg-${color}-500`}`). No se compilan en build-time. Listalas.
3. **Uso de componentes oficiales (Regla 1 de `AGENTS.md`)**:
   - Modales: deben usar `Modal.tsx` (`src/shared/core/ui/Modal.tsx`), nunca overlays hechos a mano.
   - Notificaciones efímeras: deben usar `Toast.tsx` / `useToast()`.
   - Confirmaciones destructivas: deben usar `ConfirmDialog.tsx` / `useConfirm()`, nunca `window.confirm()`.
   - Campos de formulario: deben usar `Field.tsx`.
   - Listas editables: deben usar `RepeatableSection.tsx` + `RecordFormSection.tsx`.
4. Espaciados, radios, sombras y elevación repetidos a mano en lugar de los tokens (`typeScale`, `radius`, `shadow`, `spacing`, `elevationSystem`, `zIndex`).
5. Scripts `check-ui-tokens`, `check-token-usage` y `check-contrast`: reportá si hay archivos nuevos excluidos o puntos ciegos.

---

## B. Contraste profundo y accesibilidad (WCAG 2.1 AA)
6. **Contraste en los 3 temas (`day`, `night`, `teal_ocean`)**: verificar que la relación de contraste sea al menos **4.5:1** en texto normal y **3:1** en texto grande en modales, botones deshabilitados, badges y textos secundarios (`PricingModal`, `CreditsModal`, `PdfCheckoutModal`, `AtsCheckModal`).
7. **Punto ciego de gradientes (Regla 5 de `AGENTS.md`)**: `scripts/check-contrast.js` no resuelve fondos con gradientes (`bg-[image:var(--gradient-X)]`). Verificá manualmente que el texto sobre fondos como `--gradient-gold` o `--gradient-surface` cumpla el mínimo de 4.5:1.
8. **Navegación por teclado y accesibilidad**: foco visible, orden de tabulación lógico, cierre de modales con `Esc`, `aria-label` en botones con solo ícono, atributos `alt` en imágenes, y roles semánticos (`dialog`, `alert`).
9. Estados de error/éxito que solo se distinguen por color sin ícono ni texto explicativo.

---

## C. Móvil, viewport y desbordes
10. Desbordes horizontales, textos cortados y botones fuera de pantalla en anchos móviles estándar (360 px, 390 px y 412 px): revisar dock, navbar y modales.
11. Áreas táctiles menores al tamaño mínimo de accesibilidad (44 × 44 px).
12. Modales altos sin scroll interno (`overflow-y-auto`) y campos tapados por el teclado virtual del móvil.

---

## D. Pantallas de dinero y checkout (máxima prioridad)
13. `PricingModal` y `PdfCheckoutModal`: ¿muestran **todos** los planes del catálogo (`PRICING_CATALOG`)? ¿Los precios salen del catálogo y no de texto fijo? ¿Aparecen los medios de pago soportados (Mercado Pago y PayPal)?
14. **Promesas falsas**: textos de planes, landing y legales que nombren funciones que no existen (agencias, candidatos, nube ilimitada sin condiciones). Cruzar con `PLAN_FEATURES` y con `legalCopyEngine.ts`.
15. Estados de carga, error y éxito del checkout; qué ve el usuario si el pago queda en estado pendiente.
16. Indicador de créditos en el navbar y `CreditsModal`: coherencia entre lo que muestran y el estado real de la cuenta.

---

## E. Textos, glosario e i18n
17. **Lenguaje sencillo**: textos visibles con jerga técnica o de imprenta (según `plainLanguageRules.ts`).
18. **Glosario de UI**: cumplimiento estricto de `UI_GLOSSARY` (`src/shared/core/uiTextGlossary.ts`) para nombres de entidades principales y verbos de acción.
19. Textos fijos escritos a mano en componentes que deberían residir en los catálogos i18n (`src/shared/i18n/catalog/`).
20. Funciones visibles que llevan a un callejón sin salida (botones sin acción, enlaces a rutas inexistentes, QR de link público sin vista destino).

---

## F. SEO Semántico y Google Search Console
21. **Metadatos y títulos únicos**: cada vista pública (Landing, Blog, Legal, Editor) debe tener `<title>` descriptivo y `<meta name="description">` persuasiva y sin duplicación.
22. **Jerarquía de encabezados**: 1 único `<h1>` por página; estructura lógica de `<h2>` y `<h3>` sin saltos de nivel para rastreadores de Google.
23. **Etiquetas sociales y canonicals**: etiquetas OpenGraph (`og:title`, `og:description`, `og:image`, `og:url`), Twitter Cards y `<link rel="canonical" href="https://www.leecv.app/...">`.
24. **Indexabilidad controlada**: verificar que las páginas privadas o administrativas incluyan `<meta name="robots" content="noindex, nofollow">`.
25. **Datos estructurados (JSON-LD / Schema.org)**: verificar la presencia de schemas para `WebApplication`, `FAQPage` y `Article` que enriquecen los resultados en Google Search Console.

---

## Entregable
Informe `UI` con el formato común. Para cada hallazgo indicá archivo, tema y tamaño de pantalla donde se ve, y qué token o componente usar para solucionarlo. P0 solo si impide pagar o engaña sobre lo que se compra.
