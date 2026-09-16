# Plan de Recta Final — corregido contra el código real

Auditoría de las 3 reglas propuestas, hecha contra el repo, no en
abstracto. Resultado: **1 regla es correcta y urgente, 1 ya está
cumplida (no hay nada que hacer), y 1 es correcta a medias con un
matiz que cambia cómo implementarla.**

---

## Regla B — YA ESTÁ CUMPLIDA. No implementar.

La propuesta dice: "Ningún componente `.tsx` puede hacer un `.select()`
de Supabase".

**Verificado:** `grep -rln "supabase\.from(" src/ --include="*.tsx"` →
**0 resultados**. Los únicos 2 usos directos de `supabase` en toda la
capa de UI son:
- `UserDashboard.tsx:54` → `supabase.auth.getUser()`
- `App.tsx:167` → `supabase.auth.getSession()`

Ambos leen la **sesión del usuario**, no consultan datos de negocio.
Eso es un uso legítimo del cliente de auth y no rompe la separación de
capas — el DAL ya gobierna el 100% del acceso a datos.

**Acción: ninguna.** Implementar esta regla sería trabajo sin retorno.
Lo que sí vale la pena es **blindar lo que ya funciona** para que no se
degrade — ver Lote 3.

---

## Regla A — CORRECTA Y URGENTE. `EditorPanel.tsx` = 2.540 líneas.

Es, por lejos, el archivo más grande del proyecto (el segundo tiene
1.157). Medido:

| Archivo | Líneas |
|---|---:|
| **EditorPanel.tsx** | **2.540** |
| TemplateRenderer.tsx | 1.157 |
| App.tsx | 1.042 |

**La buena noticia (y esto cambia el riesgo del refactor):** el archivo
**ya está internamente dividido** en 29 bloques mutuamente excluyentes
del tipo `{activeTab === 'experiencia' && (...)}`. No hay que
"desenredar" lógica entrelazada — hay que **mover bloques que ya están
separados** a archivos propios. Es un refactor mecánico, no un rediseño.

### Lote 1 — Dividir EditorPanel en 29 secciones (por tandas, no de una)

`[NEW] src/modules/cv-builder/components/editor/sections/` — un archivo
por bloque. Cada uno recibe las mismas props que hoy usa el bloque
dentro del `EditorPanel` (`cvData`, `setCvData`, y lo que necesite).

Orden sugerido, de menor a mayor riesgo (4 tandas, 1 PR cada una):

1. **Tarjeta** (6 bloques, los más aislados): `card_front`, `card_back`,
   `card_logo`, `card_qr`, `card_size`, `card_extract`.
2. **Secciones de registros** (11): `experiencia`, `formacion`,
   `profesion`, `cursos`, `proyectos`, `publicaciones`, `referencias`,
   `idiomas`, `informatica`, `certificados`, `logros`. Estas ya usan
   `RecordFormSection` — el bloque es casi puro JSX de configuración.
3. **Secciones de texto/listas** (6): `resumen`, `objetivo`,
   `competencias`, `habilidades`, `redes`, `portafolio`.
4. **Las complejas, al final** (6): `personales`, `diseno`, `portada`,
   `firma`, `guardados`, `nueva_seccion` — son las que tienen más
   estado local propio.

`EditorPanel.tsx` queda como orquestador: los 12 `useState` que hoy
tiene se evalúan uno por uno — los que solo usa **un** bloque bajan con
ese bloque a su archivo; los que comparten varios se quedan arriba y se
pasan como props.

**Criterio de éxito objetivo, no estético:** `wc -l EditorPanel.tsx`
debe bajar de 2.540 a menos de 400 al terminar las 4 tandas, y ningún
archivo nuevo debe superar las 250 líneas.

**Verificación por tanda:** `npx tsc --noEmit` + `npm run check-all` +
abrir cada pestaña migrada en la app y confirmar que funciona igual que
antes. Sin cambios de comportamiento — si algo se ve o funciona
distinto, es un bug introducido por el refactor, no una mejora.

---

## Regla C — CORRECTA A MEDIAS. El Error Boundary ya existe; la validación de entorno necesita un ajuste importante.

### C.1 — Error Boundary global: YA ESTÁ. No implementar.

`src/shared/core/ui/ErrorBoundary.tsx` existe y **ya envuelve la app en
la raíz** (`src/app/main.tsx:38`). Verificado. Acción: ninguna.

### C.2 — Validación de entorno: SÍ, pero NO como dice la propuesta

La propuesta dice: "Si falta una, la app explota inmediatamente con un
error claro". **Aplicar eso literal te rompería producción.**

Listé las 11 variables `VITE_*` que la app consume:
```
VITE_SENTRY_DSN, VITE_POSTHOG_KEY, VITE_POSTHOG_HOST,
VITE_GA_MEASUREMENT_ID, VITE_LEMONSQUEEZY_CHECKOUT_URL,
VITE_LEMONSQUEEZY_URL_{PRO,ENTERPRISE,PDF1,PACK5,PACK10,SINGLE_PDF}
```
**Las 11 son opcionales por diseño.** Si falta `VITE_SENTRY_DSN`, la app
debe seguir andando sin monitoreo. Si falta una URL de Lemon Squeezy,
el checkout ya cae a su fallback. Hacer que la app "explote" por una
variable de analítica sería un autogol.

**El diseño correcto para tu caso — validar y avisar, no morir:**

`[NEW] src/shared/core/config/env.ts`
```ts
/**
 * NÚCLEO DE ENTORNO — punto único donde se leen las variables VITE_*.
 * Ningún otro archivo vuelve a leer import.meta.env directamente.
 *
 * Política deliberada: NINGUNA variable es bloqueante. Todas las
 * integraciones de esta app (Sentry, PostHog, Analytics, las URLs de
 * checkout de Lemon Squeezy) son opcionales y degradan con gracia. Una
 * variable faltante se REPORTA en consola en desarrollo, nunca tira la
 * app abajo — eso sería peor que el problema que intenta prevenir.
 */
export const env = {
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  posthogKey: import.meta.env.VITE_POSTHOG_KEY ?? '',
  // ...las 11
} as const;

/** Se llama una vez al arrancar. Solo informa; nunca lanza. */
export function reportMissingOptionalEnv(): void {
  if (!import.meta.env.DEV) return;
  const missing = Object.entries(env).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) console.warn('[env] Integraciones sin configurar:', missing.join(', '));
}
```

**Zod no hace falta acá** — con 11 strings opcionales, agregar una
dependencia y un esquema es más peso del que resuelve. Zod valdría la
pena si tuvieras variables con formato estricto que deban cumplirse
(números, URLs validadas, enums). Si más adelante aparece una variable
verdaderamente obligatoria (una que si falta, la app no puede funcionar
de ninguna forma), ahí sí: se agrega a una lista `REQUIRED` en este
mismo archivo, y esa sí lanza al arrancar.

---

## Lote 3 — Lo que la propuesta no incluye y es lo que de verdad evita la regresión

Las 3 reglas describen **qué** hacer, pero no **cómo evitar que se
deshaga**. En este proyecto ya está probado que un chequeo automático
sostiene una regla mejor que la disciplina (pasó con los tokens de UI,
con `verify:pricing-sync`, con los límites de módulos).

`[NEW] scripts/check-file-size.js` — falla si un archivo de `src/`
supera N líneas. Arranca en **modo auditoría** con el umbral en 600
(hoy lo superan 3 archivos), y baja a 400 cuando el Lote 1 termine.
Mismo patrón exacto que ya usa `check-module-boundaries.js`.

`[MODIFY] scripts/check-module-boundaries.js` — agregar la regla B como
chequeo, ya que **hoy se cumple**: fallar si algún `.tsx` importa
`supabase.from(`. Así queda blindado un invariante que ya lograste, en
vez de confiar en que nadie lo rompa.

---

## Orden de ejecución

```
1. Lote 3 (los 2 chequeos) — primero, para medir el progreso del resto
        ▼
2. Lote 1, tandas 1→4 (dividir EditorPanel) — una PR por tanda
        ▼
3. C.2 (env.ts) — independiente, en cualquier momento
```

**No implementar:** Regla B (ya cumplida), Regla C.1 (ya existe).
