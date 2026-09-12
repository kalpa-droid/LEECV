# Plan: Cerrar los Huecos del Selector de Etiquetas + Diagnóstico de Idiomas

Extiende `docs/plan_cover_featured_badges.md`... no, este es independiente
— corrige el alcance real de "Selector de etiqueta por registro"
(el commit `31930bf`, ya en `main`). Verificado contra el código real
antes de escribir esto.

---

## Resumen de lo confirmado (para no repetir la investigación)

El núcleo (`fieldLabelOptions.ts`, `labelOptions` en `fieldCatalog.ts`,
la cadena de prioridad en `recordLayoutEngine.ts:170`, el selector en
`RecordFormSection.tsx`) **está bien construido**. El problema no es el
núcleo — es que **`EditorPanel.tsx` tiene dos formularios de registro
distintos conviviendo**, y solo uno de los dos quedó conectado al
núcleo nuevo.

| Sección | Formulario que usa | ¿Usa el núcleo? |
|---|---|---|
| Idiomas, Proyectos, Publicaciones, Referencias, Formación, Profesión, Experiencia, Cursos, Informática | `RecordFormSection` | ✅ Sí |
| **Redes**, Competencias, Habilidades | `RepeatableSection` | ❌ No |
| Secciones personalizadas (creadas por el usuario) | **Los dos, en conflicto** | ⚠️ Depende de cuál gana |

---

## Lote A — Migrar "Redes" al núcleo (el único gap real de los 3)

Confirmé que Competencias y Habilidades **no necesitan este cambio** —
son un solo campo de texto libre por registro (`"Competencia Clave #1"`,
`"Habilidad Técnica #1"`), no usan `fieldCatalog.ts`, nunca tuvieron el
problema de etiqueta combinada.

**Redes sí lo tiene, y es peor de lo que parecía:** su campo "URL
Completa / Enlace Web" (línea 397-402 de `EditorPanel.tsx`) está escrito
literal en el JSX — **ni siquiera es el mismo campo `url` del catálogo**,
es un segundo campo "url" paralelo e independiente. Confirmé que en el
PDF, Redes no muestra la etiqueta combinada (solo ícono + valor), así
que el bug de hoy es solo en el formulario del editor, no en el
documento final — igual hay que resolverlo, porque el usuario no puede
elegir qué representa esa URL (¿portfolio? ¿repositorio? ¿perfil?).

`[MODIFY] EditorPanel.tsx`, bloque `sectionKey="redes"` (línea 356-407):
- Cambiar de `<RepeatableSection>` con `renderItem` a mano a
  `<RecordFormSection kindKey="social" .../>` (o el `kindKey` que
  corresponda una vez que `redes` tenga una entrada real en
  `fieldCatalog.ts` — hoy sus campos `plataforma`/`usuario`/`url` no
  están catalogados, solo existen dentro del `renderItem` de
  `RepeatableSection`).
- El campo `plataforma` (el `<select>` de LinkedIn/GitHub/etc.) **no**
  necesita el selector de etiquetas — es una lista fija de opciones de
  plataforma, no una etiqueta combinada de un mismo campo. Se mantiene
  como está, solo migra de contenedor.
- El campo `url` sí pasa a usar `getFieldLabelOptions()` una vez
  catalogado — recién ahí "Enlace / Portfolio / Repositorio" (o las
  opciones que decidas para Redes específicamente, no necesariamente
  las mismas de Publicaciones) se vuelve elegible por registro.

---

## Lote B — Resolver el conflicto de secciones personalizadas (hallazgo nuevo)

Encontré **dos bloques de JSX que responden a la misma condición**
("existe una sección personalizada con este id"):
- Línea ~1029: usa `RepeatableSection` (el formulario viejo).
- Línea ~1360: usa `RecordFormSection` (el nuevo), con un comentario
  que dice *"Antes esto no existía... un solo bloque genérico"* — es
  decir, **alguien ya intentó migrar esto y dejó el bloque viejo sin
  borrar**.

Como React evalúa las condiciones en el orden en que aparecen en el
JSX, y el bloque de `RepeatableSection` aparece primero en el archivo,
**es el que gana siempre** — el bloque nuevo con `RecordFormSection`
es código muerto. Toda sección que el usuario crea a mano hoy pasa por
el formulario viejo, sin selector de etiquetas.

`[MODIFY] EditorPanel.tsx`:
1. Borrar el bloque de la línea ~1029 (`RepeatableSection` para
   `customSections`) — es el duplicado viejo.
2. Confirmar que el bloque de la línea ~1360 (`RecordFormSection`)
   cubre exactamente los mismos casos que el que se borra (mismo
   `fieldName`/acceso a `customSections`, mismo comportamiento de
   agregar/eliminar sección) — si le falta algo que el viejo sí tenía
   (ej. `onDeleteSection`), portarlo antes de borrar el otro, no
   después.

---

## Lote C — El chequeo de gobernanza que evita que esto vuelva a pasar

Sin esto, el día que alguien agregue una sección nueva puede repetir el
mismo error (usar `RepeatableSection` a mano en vez del núcleo) sin que
nada lo avise — exactamente lo que ya pasó con Redes.

`[NEW]` agregar a `scripts/check-module-boundaries.js` (o un script
chico aparte, mismo patrón que los demás):
```js
// Toda sección de EditorPanel.tsx que use un campo de fieldCatalog.ts
// con "/" en su label DEBE pasar por RecordFormSection, nunca por
// RepeatableSection con renderItem a mano.
```
Concretamente: extraer todos los `sectionKey="..."` dentro de bloques
`<RepeatableSection>` y cruzarlos contra la lista de secciones que
`fieldCatalog.ts` sabe describir (`defaultFields` de cada `RecordKind`)
— si una sección usa `RepeatableSection` Y sus campos están en el
catálogo, marcarlo como violación. Esto es lo que hubiera atrapado el
caso de Redes al instante, en vez de que lo encontráramos leyendo el
código a mano.

---

## Diagnóstico de Idiomas — verificación en vivo, no una causa asumida

**No encontré una causa confirmada en el código estático** — encontré
un candidato real que hay que descartar o confirmar mirándolo andar,
no leyendo el archivo:

`fieldPlacementEngine.ts` línea 54:
```ts
} else if (hint?.position === 'inline-right' && inlineRightBadges.length === 0) {
```
Esto acepta **solo el primer** campo marcado como `position: 'inline-right'`
en su `designHint`. Si el registro de Idiomas tiene más de un campo con
ese mismo hint (ej. `nivel` y algún otro), el segundo no desaparece —
cae a la lista `inlineBadges` general — pero puede terminar
posicionado distinto a como se ve hoy, lo cual calzaría con "no se ve
completo" si lo que notás es que un campo (no un carácter cortado)
falta en el lugar donde esperás verlo.

**Pasos de verificación, en orden:**
1. Abrí un CV real con un registro de Idiomas que tenga `nivel` cargado
   (ej. "Avanzado (C1)") y confirmá con tus ojos: ¿el texto está
   cortado a la mitad (un problema de ancho/`numberOfLines`), o falta
   un campo entero (un problema de `fieldPlacementEngine.ts`)?
2. Si es texto cortado: revisar el componente que pinta el `badge` de
   Idiomas específicamente en `cvRecordRenderers.tsx` — buscar si tiene
   algún `numberOfLines` fijo o un contenedor de ancho fijo sin `wrap`.
3. Si es un campo entero faltante: revisar cuántos campos de
   `idioma`/`nivel`/`institucion` tienen `designHint.position: 'inline-right'`
   en el catálogo — si hay 2+, ahí está la causa, y el fix es simple
   (permitir 2 en `inlineRightBadges` en vez de 1, o decidir cuál de
   los 2 tiene prioridad real).
4. Recién con la causa confirmada en pantalla, volver acá y anotar el
   fix concreto — no adivinar desde el código sin haberlo visto correr.

---

## Verificación de cierre (todo el bloque)

```bash
npx tsc --noEmit
npx vitest run
npm run check-all
```
Manual:
1. Redes: crear un registro, elegir "Portfolio" en vez de "Enlace" en
   el nuevo selector, confirmar que un segundo registro sin tocar
   sigue en "Enlace" (mismo criterio que ya probamos para Publicaciones).
2. Crear una sección personalizada nueva desde cero → confirmar que
   usa el formulario con selector (Lote B), no el viejo.
3. Idiomas → seguir los 4 pasos de diagnóstico de arriba con un CV real.
