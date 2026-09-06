# Plan: LEECV como Hub Multi-Producto (CV + Libros + Tarjetas) + Landing + Blog

Decisión de producto confirmada por el dueño: todo vive nativo en LEECV,
bajo un solo motor de créditos/planes. Libros usa el motor de imposición
de Kalpagrafica (transformación de PDF existente). Tarjetas usa el motor
propio de LEECV, que YA EXISTE (ver hallazgo abajo) — no se porta nada de
Kalpagrafica para tarjetas.

---

## 0. Hallazgo que cambia el alcance

`src/shared/core/pdf-engine/` ya tiene, en capas, un motor de tarjetas de
imprenta completo: `bleedSpec.ts` (sangrado 3mm + zona segura 5mm),
`resolveImposition.ts` (grilla N-up + marcas de corte), `cardSheetExporter.ts`
(PDF de 2 páginas frente+dorso alineadas), `presets/tarjeta-personal.ts`.
Vive enterrado dentro de `CardExportModal.tsx`, colgado del editor de CV.

**Consecuencia:** el trabajo de "Tarjetas" es sacar este motor a un producto
propio, no construirlo. El trabajo de "Libros" sí es nuevo: portar el
algoritmo de `kalpagrafica/src/sections/impresion/pdfToLibro.js`.

---

## 1. Código — Arquitectura

### 1.1 Rutas (extender el patrón ya existente en `src/app/main.tsx`, sin router nuevo)

| Ruta | Componente | Carga |
|---|---|---|
| `/` | `LandingPage` (nuevo) | Liviana, sin editor, sin `@react-pdf/renderer` |
| `/crear-cv` | `App` actual (el editor de CV) | Como hoy, pero ya no en `/` |
| `/crear-tarjetas` | `CardStudio` (nuevo) | Motor de tarjetas ya existente, desacoplado del CV |
| `/crear-libro` | `BookStudio` (nuevo) | Motor portado de Kalpagrafica |
| `/blog` y `/blog/:slug` | `BlogIndex` / `BlogPost` (nuevo) | Estático, sin editor |
| `/admin`, `/dashboard`, `/privacidad`, etc. | Igual que hoy | — |

`main.tsx` solo necesita sumar 4 `else if` más al patrón de pathname que
ya usa — cero librería nueva.

### 1.2 Tarjetas (`/crear-tarjetas`) — desenterrar el motor existente

- Nuevo módulo `src/modules/card-studio/` con su propio flujo de datos
  (nombre, cargo, teléfono, email, redes — el mismo shape que ya consume
  `cardDataAdapter.ts`), **sin depender de tener un CV creado antes**. Si
  el usuario ya tiene un CV guardado, se le ofrece "usar mis datos del CV"
  como atajo, pero no es obligatorio.
- La UI reutiliza `CardSheetExportSelector.tsx` (ya existe, ya sabe pedir
  preset/cantidad/hoja) y `cardSheetExporter.ts` sin tocar su lógica interna.
- Falta agregar (no existe hoy): más de un preset visual de tarjeta —
  hoy solo hay `tarjeta-personal.ts`. Al menos 2-3 estilos más, siguiendo
  el mismo `presetSchema.ts` ya definido — es sumar archivos al patrón
  existente, no inventar uno nuevo.
- Créditos: reutiliza el pool de créditos genérico de LEECV (ver 1.4), no
  un sistema aparte.

### 1.3 Libros/Folletos (`/crear-libro`) — portar el motor de Kalpagrafica

- Nuevo núcleo `src/shared/core/book-engine/impositionEngine.ts`: puerto a
  TypeScript de la lógica pura de `pdfToLibro.js` (orden de pliego,
  cálculo de página par/impar, tamaño de pliego según A4/A3) — función
  pura, sin UI, testeable con Vitest (conecta directo con el BLOQUE 8
  del plan de lanzamiento: es el primer candidato natural para un test
  de contrato, porque es matemática determinística).
- El **input** es un PDF que el usuario sube (su manuscrito/folleto ya
  armado) — no se genera contenido nuevo, se reimpone. Reusar `pdf-lib`
  y `pdf.js` (ya están en las dependencias de Kalpagrafica; hay que
  agregarlas a LEECV, chequeando que no exploten el bundle de la home —
  van solo en el chunk de `/crear-libro`, cargado bajo demanda).
- UI nueva en `src/modules/book-studio/`, con el mismo lenguaje visual
  que ya usa LEECV (`uiDesignSystem.ts`), no el de Kalpagrafica.
- Créditos: mismo pool genérico (ver 1.4). Un "libro" consume más crédito
  que un PDF de 1 hoja — a definir el múltiplo cuando se implemente
  (ej. 1 crédito cada 8 páginas de folleto, a decidir con datos reales
  de costo de procesamiento, no ahora a ciegas).

### 1.4 Un solo pool de créditos para los 3 productos

Hoy `pricingCatalog.ts` habla de "PDF" (`single_pdf`, `credits_pack_5`,
etc.) pensando solo en el CV. Recomiendo generalizar el lenguaje interno
a "exportación" sin tocar los IDs de plan que ya están en producción
(`single_pdf` sigue siendo el ID técnico, pero el label pasa a algo como
"1 Exportación (CV, Tarjeta o Libro)"). Pro/Enterprise ya son ilimitados
— siguen cubriendo los 3 productos sin cambios de lógica en
`useEntitlements.ts`. Esto es el motivo por el que armamos el catálogo
único hace unas conversaciones: agregar un producto nuevo no debería
tocar el motor de precios, solo el label.

### 1.5 Gobernanza — extender lo que ya existe, no inventar

- `check-pdf-engine-usage.ts` ya audita que `@react-pdf/renderer` solo se
  importe desde wrappers autorizados — el `BookStudio` usa `pdf-lib`
  directamente (no `@react-pdf/renderer`), así que este check no debería
  romperse, pero conviene correrlo apenas se agregue el import para
  confirmarlo, no asumirlo.
- `verify:pricing-sync` ya se rompe solo si alguien agrega un plan nuevo
  en un catálogo y no en el otro — cubre automáticamente cualquier precio
  nuevo que se sume para Libros/Tarjetas.

---

## 2. UI/UX de la Landing (`/`)

Estructura de la página, de arriba a abajo:

1. **Hero — dolor, no feature.** Título en `<h1>` real (cierra SEO-2 del
   audit anterior) del estilo: *"Documentos listos para imprimir, sin
   pelearte con Illustrator ni con la imprenta"*. Subtítulo que nombra
   los 3 dolores concretos: CV que no consigue entrevista, folleto que
   sale con las páginas desordenadas, tarjeta que la imprenta rechaza por
   no tener sangrado. Un solo CTA principal arriba de todo.
2. **3 tarjetas de producto** (CV / Tarjetas / Libros), cada una con el
   patrón *dolor → cómo lo resuelve LEECV → botón*. Ejemplo para tarjetas:
   *"¿La imprenta te rechazó el diseño por falta de sangrado? Acá el
   sangrado y las marcas de corte ya vienen puestos."*
3. **Cómo funcina, 3 pasos** (elegís tu documento → completás datos →
   descargás listo para imprimir/publicar) — genérico a los 3 productos,
   refuerza que es un solo lugar para varias cosas.
4. **Comparación implícita con Illustrator/Canva** (sin nombrarlos como
   marca de forma directa si eso te genera problema legal/de marca — se
   puede hablar de "programas de diseño complejos" en la landing, y
   reservar el nombre propio de la competencia para el blog, donde el
   formato de artículo de opinión lo tolera mejor).
5. **Teaser del blog** (2-3 posts destacados) → lleva a `/blog`.
6. **Precios** (reusa el mismo `PricingModal`/catálogo, no una landing
   de precios aparte).
7. Footer ya existente (legal, soporte).

**Regla de performance no negociable:** esta página no importa `App.tsx`,
`CVPreview.tsx` ni ningún wrapper de `@react-pdf/renderer` — ni siquiera
de forma indirecta a través de un import compartido. Es el punto SEO-1
del audit anterior, y es la razón de ser de este bloque.

---

## 3. Contenidos — Blog

Formato recomendado: posts en Markdown dentro del repo (`content/blog/*.md`),
compilados en build time — coherente con cómo ya manejan `docs/*.md`, sin
necesitar un CMS todavía. Cada post con frontmatter (título, slug, resumen,
producto relacionado) para poder listar/filtrar en `/blog` sin lógica nueva.

Primeros 5 posts (a partir de lo que vos mismo tirado en el mensaje):

1. **"Por qué Illustrator es demasiado para hacer un CV o una tarjeta"** —
   post de posicionamiento. Argumento: la curva de aprendizaje de un
   editor vectorial general no se justifica para un documento con
   estructura fija; herramientas especializadas hacen en minutos lo que
   Illustrator hace en horas de tutorial. CTA → `/crear-cv` y `/crear-tarjetas`.
2. **"Qué es el sangrado (bleed) y por qué tu imprenta te lo pide"** —
   post educativo, explica bleed/safe zone en criollo, con ejemplo visual
   del rectángulo de corte vs. el de sangrado. CTA → `/crear-tarjetas`
   ("ya viene puesto, no tenés que calcularlo vos").
3. **"Cómo evitar que tu folleto salga con las páginas desordenadas al
   imprimir"** — explica qué es la imposición (por qué la página 1 no va
   'primera' en el pliego físico), el error clásico de imprimir páginas
   en orden de lectura en vez de orden de pliego. CTA → `/crear-libro`.
4. **"Guía paso a paso: tu primer CV en PDF, de cero a exportado"** —
   tutorial práctico, screenshots del editor real. CTA → `/crear-cv`.
5. **"Tarjetas personales doble faz: la checklist antes de mandarlas a
   imprimir"** — checklist descargable (sangrado, resolución de imagen,
   modo de color, márgenes) — contenido de utilidad real, no solo venta.

Cada post debería tener **al menos un `<h2>` con la palabra clave objetivo**
del post (coincide con SEO-2 del audit anterior, aplicado ya no solo a la
home sino a cada artículo).

---

## Orden de implementación sugerido

1. Landing (`/`) + mover el editor de CV a `/crear-cv` — esto es lo que
   más impacta SEO y es el bloque que ya estaba pendiente (SEO-1).
2. Sacar el motor de Tarjetas del `CardExportModal` a `/crear-tarjetas`
   — es el 80% ya construido, el que menos código nuevo pide.
3. Portar el motor de Libros — es el que sí requiere escribir un
   algoritmo nuevo (aunque basado en uno que ya funciona en Kalpagrafica).
4. Blog — en paralelo con cualquiera de los anteriores, no depende de código.

No implementé nada de código todavía en esta pasada — es un plan para que
lo revises y me digas por dónde arrancamos primero.
