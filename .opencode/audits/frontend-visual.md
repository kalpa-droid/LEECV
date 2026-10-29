# Auditoría de @frontend-visual — interfaz, accesibilidad y coherencia visual

Seguí `_formato-informe.md`. Prefijo de IDs: `UI`. Solo lectura.
Tokens oficiales: `src/shared/core/uiDesignSystem.ts` y `docs/guia-sistema-diseno.md`. Temas: `day`, `night`, `teal_ocean`.
Si no podés abrir la app en un navegador, **pedile capturas a Kalpa** (móvil y escritorio, los 3 temas) y marcá lo demás como `NO VERIFICADO`.

## A. Tokens y colores
1. Colores escritos a mano (`#hex`, `rgb(`, clases `bg-[#...]`, `text-white` fijos) en `src/**/*.tsx`. Cada uno debería ser `var(--color-...)` o un token.
2. **Regla 2 de `AGENTS.md`**: clases de Tailwind armadas con variables (`bg-${color}-500`). No se compilan. Listalas.
3. Espaciados, radios y sombras repetidos a mano en lugar de tokens.
4. Los scripts `check-ui-tokens`, `check-token-usage` y `check-contrast`: ¿qué carpetas **no** cubren? Reportá los puntos ciegos.

## B. Contraste y accesibilidad
5. Contraste WCAG 2.1 AA (4,5:1 texto normal, 3:1 texto grande) en los 3 temas, empezando por modales, botones deshabilitados, textos secundarios y badges (`PricingModal`, `CreditsModal`, `PdfCheckoutModal`, `AtsCheckModal`).
6. Foco visible con teclado, orden de tabulación, `Esc` para cerrar modales, `aria-label` en botones de solo ícono, `alt` en imágenes, roles de diálogo.
7. Elementos que solo se distinguen por color (estados de error/éxito sin ícono ni texto).

## C. Móvil y desbordes
8. Desbordes horizontales, textos cortados, botones fuera de pantalla a 360 px y 390 px de ancho (dock, navbar, modales).
9. Áreas táctiles menores a 44 px.
10. Modales muy altos sin scroll interno; teclado virtual que tapa campos.

## D. Pantallas de dinero (máxima prioridad)
11. `PricingModal` y `PdfCheckoutModal`: ¿muestran **todos** los planes del catálogo (`PRICING_CATALOG`)? ¿Los precios salen del catálogo y no de texto fijo? ¿Aparecen todos los medios de pago que el backend soporta (Mercado Pago, PayPal, Lemon Squeezy)?
12. **Promesas falsas**: textos de planes, landing y legales que nombren funciones que no existen (candidatos, agencias, nube, "no vencen", "ilimitado" sin condición). Cruzá con `PLAN_FEATURES` y con `legalCopyEngine.ts`.
13. Estados de carga, error y éxito del checkout; qué ve la persona si el pago queda pendiente.
14. Indicador de créditos del navbar y `CreditsModal`: coherencia entre lo que muestran y el tipo de plan.

## E. Textos y coherencia
15. **Lenguaje sencillo**: textos visibles con jerga técnica (reglas en `src/shared/core/plainLanguage/plainLanguageRules.ts`).
16. Textos escritos a mano que deberían estar en los catálogos i18n (`src/shared/i18n/catalog/`).
17. Funciones visibles que llevan a un callejón sin salida: el QR "link público" de la tarjeta, botones sin acción, enlaces a rutas inexistentes, "Próximamente" mezclado con funciones reales.
18. Inconsistencias entre pantallas: mismo botón con distinto estilo o texto, mismo concepto con dos nombres (créditos/tokens/exportaciones).

## F. Blog y landing
19. Artículos con encabezados saltados, listas mal formadas, imágenes sin `alt`, enlaces rotos hacia el editor.
20. Landing: promesas verificables (por ejemplo, evitar "garantizada" sin respaldo), jerarquía visual y botón principal claro.

## Entregable
Informe `UI`. Para cada hallazgo indicá archivo, tema y tamaño de pantalla donde se ve, y qué token usar para arreglarlo. P0 solo si impide pagar o engaña sobre lo que se compra.
