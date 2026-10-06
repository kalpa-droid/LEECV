# Plan v5 (mejorado) — Activación del Motor Decorativo del PDF

Verifiqué cada afirmación del plan contra el código real (no contra el
documento). El diagnóstico central es correcto — los 3 motores existen,
calculan bien, y sus salidas se tiran sin usar. Pero encontré 1 dato
incorrecto, 1 pieza que ya existe y no hay que crear de cero, y 2 huecos
que el plan no cubre.

---

## ✅ Confirmado exactamente como dice el plan

- `resolveAccentTarget()` (`accentApplicationEngine.ts`) existe, calcula
  `titleColor`/`badgeColor`/`leftRuleColor`/`iconColor` — pero
  `CardObjectRenderer.tsx` **solo usa `leftRuleColor`**. `titleColor` y
  `badgeColor` se calculan y se descartan, confirmado línea por línea.
- `resolveDecorativeStyles()` (`decorativeLayerEngine.ts`) devuelve
  `dividerStyle`, `backgroundShapeEnabled`, `watermark` — los 3 completos
  y correctos. `SectionBannerCard.tsx` sigue con `borderBottomWidth: 1` /
  `1.5` hardcodeado, sin leer `dividerStyle` para nada.
- `check-pdf-engine-usage.js` y `check-pdf-contrast.js` existen de verdad
  y ya corren dentro de `check-all` — extenderlos es el patrón correcto
  (son chequeos de texto tipo `content.includes('función(')`, mecánicos,
  fáciles de sumar 2 casos más).

## 🔧 Corrección — el "Cambio de Comportamiento" que avisa el plan no aplica hoy

El plan advierte que activar `dividerStyle.enabled` podría **ocultar**
divisores en `minimal-editorial`/`creative-sustentable` porque supuestamente
tienen `sectionDividers: false`. Verificado en los presets reales:
- `creative-sustentable.ts` tiene `sectionDividers: true`.
- `minimal-editorial.ts` **no define el campo** → usa el default del motor
  (`true`).

Ningún preset hoy desactiva los divisores. El cambio real es más simple y
de menor riesgo de lo que el plan hace parecer: los divisores que ya se
ven van a seguir viéndose, solo que con el color/grosor calibrado del
motor en vez del hardcode — no hay ningún caso hoy donde algo visible
vaya a desaparecer. (Si en el futuro un preset SÍ pone `sectionDividers:
false` a propósito, ahí sí se ocultará — pero es la primera vez que se
usaría esa opción, no una regresión de algo que ya se ve.)

## ➕ Lo que el plan no menciona — ya existe algo parecido, aclarar para no confundir

`TemplateRenderer.tsx` ya usa un `OrnamentRenderer.tsx` (esquina superior
derecha de cada tarjeta, opacidad 0.7–0.9, SVGs fijos tipo hoja/badge/línea)
consumiendo `decStyles.cornerOrnament` — **un campo que el plan tampoco
menciona**, del mismo motor `decorativeLayerEngine.ts`.

`DecorativeBackgroundRenderer` que propone el plan es **otra cosa**: nivel
de página completa (no de tarjeta), opacidad mucho más baja (0.04–0.08),
para fondo/marca de agua — no hay que fusionarlo con `OrnamentRenderer`
ni es una duplicación. Pero como van a convivir en la misma carpeta
`layers/decorations/`, hay que dejar clara la diferencia en el docblock
de cada uno para que nadie los confunda a futuro (ya pasó antes en este
proyecto con dos motores de capacidades con el mismo nombre).

## ➕ Huecos reales que faltaban en el plan

1. **`cornerOrnament` queda sin cubrir en la verificación.** El plan
   extiende `check-pdf-engine-usage.js` para `dividerStyle`,
   `backgroundShapeEnabled` y `watermark`, pero no para `cornerOrnament`
   — que YA se usa (bien) pero nunca quedó con un chequeo de gobernanza
   que lo proteja de una futura regresión. Sumarlo ahora que se está
   tocando el mismo script es gratis.

2. **Rendimiento del PDF con marcas de agua.** `@react-pdf/renderer`
   recalcula SVGs en cada página — un watermark tipo `'ecologia'`
   (motivo botánico) repetido en documentos de muchas páginas puede
   pesar el PDF final notablemente. El plan no dice si el watermark se
   dibuja una vez por documento o una vez por página; hay que decidirlo
   antes de programar (recomendado: una vez por página está bien si el
   SVG es simple/pocos puntos, pero conviene medir el tamaño del PDF de
   antes/después con un CV de 3+ páginas antes de dar esto por cerrado).

3. **Contraste del título con accent no está garantizado por diseño.**
   El plan pide que `check-pdf-contrast.js` verifique que el título con
   `accentTarget: 'title'` cumpla 4.5:1 — correcto — pero si el preset
   tiene un `rolesColor.accent` que no pasa contra el fondo de la
   tarjeta, hoy no hay ningún fallback automático (a diferencia de
   `getContrastTextColor()` que sí existe en `colorSystem.ts` para
   otros casos). Agregar: si `resolveAccentTarget` detecta que
   `accentHex` no pasa AA contra el fondo de la tarjeta, debe caer al
   color de texto normal en vez de forzar un acento ilegible — mejor
   prevenirlo en el motor que solo detectarlo después con el auditor.

---

## Plan de implementación (con las correcciones ya incorporadas)

### Componente 1 — Divisores y acento de tarjeta
- `SectionBannerCard.tsx`: reemplazar `borderBottomWidth`/color hardcodeado
  por `decStyles.dividerStyle.enabled ? {heightPt, color} : {width: 0}`.
- `CardObjectRenderer.tsx`: aplicar `resolvedAccent.titleColor` al estilo
  del título cuando `accentTarget === 'title'`, `resolvedAccent.badgeColor`
  a los badges cuando `accentTarget === 'meta-badge'`.
- `accentApplicationEngine.ts`: agregar el fallback de contraste (punto 3
  de arriba) antes de devolver `titleColor`/`badgeColor`.

### Componente 2 — Fondo decorativo y marca de agua
- `DecorativeBackgroundRenderer.tsx` (nuevo, en `layers/decorations/`,
  docblock explícito distinguiéndolo de `OrnamentRenderer.tsx`): formas
  geométricas de esquina + watermark `'subtle-brand'`/`'ecologia'`,
  opacidad 0.04–0.08, `position: absolute`.
- Decidir y documentar la estrategia de watermark por página antes de
  programar (punto 2 de arriba), medir tamaño de PDF resultante.
- `TemplateRenderer.tsx`: integrar `<DecorativeBackgroundRenderer>` pasando
  `decStyles.backgroundShapeEnabled`, `decStyles.watermark`,
  `rolesColor.accent`.

### Verificación (extendida con el hueco #1)
- `check-pdf-engine-usage.js`: sumar los 3 chequeos que pide el plan
  (`dividerStyle`, `backgroundShapeEnabled`, `watermark`) **más un 4to**
  para `cornerOrnament` (ya en uso, sin protección hoy).
- `check-pdf-contrast.js`: correr contra títulos con `accentTarget: 'title'`
  — debe pasar tanto con el fallback de contraste nuevo como sin él, para
  confirmar que el fallback realmente dispara cuando corresponde.
- `npm run check-all` completo.

### Verificación manual
- Comparar visualmente un CV con `minimal-editorial` antes/después — no
  debería cambiar nada visible salvo el color/grosor exacto del divisor
  (confirmado arriba: no hay caso hoy donde algo desaparezca).
- Un CV de 3+ páginas con watermark `'ecologia'` activado — medir el
  tamaño del PDF exportado antes/después.
