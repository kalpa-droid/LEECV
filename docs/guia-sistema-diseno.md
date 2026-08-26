# Guía — aplicar el sistema de diseño al resto del panel

Esta guía es para vos: el sistema ya está armado y probado (`uiDesignSystem.ts` +
`PanelSection.tsx`), lo que falta es aplicarlo pestaña por pestaña. Acá tenés
el paso a paso exacto, con un ejemplo real de tu propio código.

## Los 2 archivos que ya existen

- `src/shared/core/uiDesignSystem.ts` — todos los colores, tamaños de texto,
  y estilos de botón/input/badge. Nunca escribas un hex o un `text-[Npx]`
  suelto: importá de acá.
- `src/modules/cv-builder/components/editor/PanelSection.tsx` — el único
  bloque de "sección con título" que se usa en cualquier pestaña.

## El patrón de migración, en 4 pasos

### 1. Ubicá el bloque viejo

Ejemplo real, tal cual está hoy en `EditorPanel.tsx` (pestaña Paneles):

```tsx
<h3 className="text-xs font-extrabold uppercase text-[#FF2E63] border-b pb-2 border-[#EFE2C9] flex items-center gap-1.5">
  <Columns3 className="w-4 h-4 text-[#00A8A0]" /> Gestión Dinámica de Paneles & Columnas
</h3>
```

Problemas que tiene: hex sueltos (`#FF2E63`, `#00A8A0`, `#EFE2C9`), texto
largo y técnico, todo en mayúsculas.

### 2. Elegí el título corto

Regla: 1-3 palabras, sustantivo, sin explicar mecánica interna.

"Gestión Dinámica de Paneles & Columnas" → **"Columnas"**

### 3. Reemplazá por `PanelSection`

```tsx
import { PanelSection } from './editor/PanelSection';

<PanelSection icon={<Columns3 className="w-4 h-4" />} title="Columnas">
  {/* acá va lo que ya tenías adentro: los presets, los selectores */}
</PanelSection>
```

Fijate que ya no hace falta escribir ningún color a mano — `PanelSection`
ya trae el ícono en `secondary` y el título en `neutral.textPrimary` desde
adentro.

### 4. Si esa pestaña tenía "ajuste manual"/"sintonía fina", pasalo al slot dedicado

```tsx
<PanelSection
  icon={<Columns3 className="w-4 h-4" />}
  title="Columnas"
  manualAdjustment={
    <div className="space-y-2">
      {/* el ordenamiento fila por fila, las flechas subir/bajar, etc. */}
    </div>
  }
>
  {/* los presets de 1 clic — SIEMPRE visibles, esto es lo que va acá */}
</PanelSection>
```

Con esto, "Ajuste manual" queda colapsado por defecto automáticamente — no
tenés que armar el `useState`/`ChevronDown` cada vez, ya está adentro de
`PanelSection`.

## Cuándo usar cada estilo de botón

| Si el botón... | Usá |
|---|---|
| Es la única acción principal de esa pantalla (ej. "Guardar", "Exportar") | `button.primary` |
| Es una alternativa de mismo peso que otra (ej. dos presets uno al lado del otro) | `button.secondary` |
| Es "Cancelar", "Cerrar", o el propio "Ajuste manual" | `button.ghost` |
| Elimina algo sin vuelta atrás | `button.danger` |

```tsx
import { button } from '../../../shared/core/uiDesignSystem';

<button className={`${button.base} ${button.primary}`}>Guardar</button>
```

## Cuándo usar cada variante de badge

| Si el badge dice... | Usá |
|---|---|
| Algo relacionado a un preset/plan/característica de marca | `badge.accent` |
| Que algo se guardó / está activo / OK | `badge.success` |
| Que algo necesita atención pero no es grave | `badge.warning` |
| Que algo falló / se va a eliminar | `badge.danger` |
| Un dato neutro (contador, fecha) | `badge.neutral` |

## Checklist antes de dar por terminada una pestaña

- [ ] ¿Quedó algún hex escrito a mano (`#FF2E63`, `#00A8A0`, etc.)? Si sí, reemplazar por `colorSystem`.
- [ ] ¿El título de sección tiene 3 palabras o menos, sin mayúsculas sostenidas?
- [ ] ¿Hay subtítulo debajo del título? Si sí, sacarlo (o el título está mal elegido, o esa info va como texto de ayuda dentro del contenido, no como subtítulo del header).
- [ ] ¿El preset/decisión principal está SIEMPRE visible, y el ajuste fino queda colapsado en `manualAdjustment`?
- [ ] ¿El texto de los botones es corto, verbo primero, sin "por favor" ni signos de exclamación?
- [ ] ¿Se usó la misma palabra que en el resto de la web para "Sección"/"Registro"/"Preset"?

## Orden sugerido para ir migrando

1. Diseño (la más grande, conviene hacerla primero para afinar el patrón)
2. Paneles (ya tiene el ejemplo de este documento)
3. Portada (cuando se cree)
4. Personales, Formación, Experiencia, Cursos, Informática, Ecología (todas siguen el mismo molde una vez que la primera esté bien)
5. Firma

Cualquier duda sobre un caso puntual que no entre limpio en el patrón, mejor
preguntar antes de improvisar un 5to estilo de botón o un color nuevo — la
fuerza de este sistema es que no crece más allá de lo que ya está definido.

---

## Migrar sombra/radio de Tailwind con nombre → `elevationSystem`/`radius`

Esto es aparte del sistema de secciones de arriba — es la limpieza de
`shadow-lg`, `rounded-xl`, etc. escritos con el nombre de Tailwind en vez
del núcleo. `npm run check-all` te dice, archivo por archivo, cuántos te
quedan (sección "⚠️ AUDITORÍA" al final del log de gobernanza).

### Paso 1 — Ver exactamente qué hay en un archivo

```bash
grep -nE "shadow-(sm|md|lg|xl|2xl|inner)\b|rounded-(lg|xl|2xl|3xl)\b" src/ruta/AlArchivo.tsx
```

Esto te da el número de línea exacto de cada uno — no hace falta adivinar.

### Paso 2 — La tabla de equivalencia (siempre la misma, no inventar)

| Tenías (Tailwind con nombre) | Ponés (núcleo) |
|---|---|
| `shadow-sm` | `${elevationSystem.raised}` |
| `shadow-md` | `${elevationSystem.raised}` |
| `shadow-lg` | `${elevationSystem.floating}` |
| `shadow-xl` | `${elevationSystem.overlay}` |
| `shadow-2xl` | `${elevationSystem.overlay}` |
| `shadow-inner` | `${elevationSystem.raised}` (no hay token de sombra interior todavía — avisar si hace falta uno de verdad) |
| `rounded-lg` | `rounded-[${radius.control}]` |
| `rounded-xl` | `rounded-[${radius.card}]` |
| `rounded-2xl` | `rounded-[${radius.modal}]` |
| `rounded-3xl` | `rounded-[${radius.modal}]` |
| `rounded-full` | **se deja igual** — es semántico (círculo perfecto: avatar, badge, pill), no forma parte de esta migración |

### Paso 3 — Importar los tokens (si el archivo no los tiene ya)

```tsx
import { elevationSystem, radius } from '<ruta relativa>/shared/core/uiDesignSystem';
```

La ruta relativa depende de dónde esté el archivo — contá los `../` que
necesitás para llegar a `src/shared/core/uiDesignSystem.ts`.

### Paso 4 — Reemplazar, con el detalle que rompe si te lo saltás

`radius.control`/`radius.card`/`radius.modal` son **valores en px** (`'10px'`, `'12px'`, `'16px'`), no clases — por eso siempre van envueltos en `` rounded-[${...}] ``, nunca sueltos. Si tu `className` no es un template literal (comillas invertidas) todavía, tenés que convertirlo a uno para poder interpolar `${radius.card}` adentro.

**Antes:**
```tsx
className="p-3 rounded-xl shadow-lg"
```

**Después:**
```tsx
className={`p-3 rounded-[${radius.card}] ${elevationSystem.floating}`}
```

Si el `className` ya era condicional (un ternario `isActive ? 'a' : 'b'`), la interpolación de tokens va **adentro de cada rama**, no rodeando todo el ternario:

```tsx
className={`... ${isActive ? `bg-x ${elevationSystem.floating}` : `bg-y ${elevationSystem.raised}`}`}
```

### Paso 5 — Verificar ese archivo puntual (rápido, sin correr todo)

```bash
grep -nE "shadow-(sm|md|lg|xl|2xl|inner)\b|rounded-(lg|xl|2xl|3xl)\b" src/ruta/AlArchivo.tsx
```

Tiene que devolver **0 líneas**. Si devuelve algo, todavía queda alguno.

### Paso 6 — Verificación completa antes de subir

```bash
npm run check-all
```

Confirmá 3 cosas en la salida: el archivo que migraste **ya no aparece** en
la lista de auditoría, `0 violations` de gobernanza, y `build` termina sin
error.

### Orden recomendado (por volumen, de más a menos instancias)

1. `EditorPanel.tsx` (77) — el más grande, pero son todas del mismo tipo de
   patrón repetido, se hace rápido una vez agarrás la mano.
2. `AdminDashboard.tsx` (52)
3. `TemplateManagementTab.tsx` (38)
4. `CanvaIconDock.tsx` (30)
5. El resto, uno por uno, sin apuro — cada uno es un commit separado.

### Cuándo activar el candado

Cuando `npm run check-all` ya no muestre ningún archivo en la sección
"⚠️ AUDITORÍA" (todos en 0), avisá — ahí se sube esa detección de
`shadow`/`radius` con nombre al mismo lugar donde ya está el bloqueo de
hex, y de ahí en más ningún commit nuevo puede reintroducir el problema.
