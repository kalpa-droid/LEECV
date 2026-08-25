# AGENTS.md — Reglas del repo, para humanos y agentes de IA por igual

Este archivo es la fuente de verdad de qué núcleo/motor usar para cada tipo de
cambio. Si estás por escribir código que "se parece" a algo que ya existe en
otro lado del repo, casi seguro ya hay un motor para eso — usalo, no lo
reescribas a mano. Esta tabla se generó grepeando el código real, no de memoria.

## Regla 0 — Antes de terminar cualquier tarea

```bash
npm run check-all
```

Tiene que dar 0 errores. Esto **ya está forzado** por:
- `.husky/pre-commit` (rápido: tokens, contraste, léxico, fronteras de módulo)
- `.husky/pre-push` (completo: typecheck + lint + gobernanza + build)
- `.github/workflows/check-all.yml` (corre en GitHub, no se puede saltear ni con `--no-verify` local)

Si estás evaluando saltear un chequeo, no lo hagas — arreglá el caso real o
agregalo a la lista de excepciones explícita del script correspondiente (están
todas documentadas con motivo en `scripts/*.js`), nunca lo ignores en silencio.

## Regla 1 — Tabla: "voy a hacer X → tengo que usar Y"

| Si vas a... | NO hagas esto | Usá este motor |
|---|---|---|
| Consultar/escribir en Supabase | `supabase.from('tabla')` directo en un componente/servicio | `dal.*` — `src/shared/core/storage/dataAccessLayer.ts`. Si la tabla que necesitás no tiene método ahí, agregalo ahí, no hagas la query suelta. |
| Llamar a un endpoint `/api/*` | `fetch('/api/...')` directo | `apiClient.*` / `apiFetch()` — `src/shared/core/utils/apiClient.ts` |
| Leer/cambiar la URL, query params, o navegar | `window.location.*`, `window.open(...)` | `navigation.*` — `src/shared/core/utils/navigation.ts` (incluye `getSearchParams()` para leer varios params juntos) |
| Envolver una operación async que puede fallar | `try { ... } catch (e) { console.error(e) }` a mano | `withErrorHandling()` — `src/shared/core/utils/errorHandler.ts` |
| Validar email / teléfono / DNI / CUIT / URL / un campo de formulario | Un regex nuevo a mano | `isValidEmail`, `isValidPhone`, `isValidDni`, `isValidCuit`, `isValidUrl`, `validateFieldValue` — `src/shared/core/utils/validationEngine.ts` |
| Poner un color (fondo, texto, borde) en un componente de UI (no PDF) | Un hex suelto, `bg-[#xxxxxx]`, o `` `bg-[${colorSystem.x.y}]` `` (¡esto último NO genera CSS real, ver nota abajo) | `colorSystem.*` de `uiDesignSystem.ts` combinado con las variables reales de `src/index.css` (`var(--color-x-y)`) |
| Definir tipografía, radios, sombras, spacing, elevación, z-index de UI | Valores sueltos (`text-[13px]`, `shadow-[0_2px...]`) | `typeScale`, `radius`, `shadow`, `spacing`, `elevationSystem`, `zIndex` de `uiDesignSystem.ts` |
| Mostrar un modal | Reinventar el overlay/backdrop a mano | `Modal.tsx` — `src/shared/core/ui/Modal.tsx` |
| Mostrar una notificación efímera | Un `<div>` de aviso a mano | `Toast.tsx` / `useToast()` — `src/shared/core/ui/Toast.tsx` |
| Pedir confirmación antes de una acción destructiva | `window.confirm(...)` nativo | `ConfirmDialog.tsx` / `useConfirm()` — `src/shared/core/ui/ConfirmDialog.tsx` |
| Un input de texto en un panel/formulario | `<input className="...">` a mano | `Field.tsx` — `src/shared/core/ui/Field.tsx` |
| Una lista editable (agregar/duplicar/eliminar ítems: experiencia, cursos, etc.) | Un `.map()` con botones de editar a mano por sección | `RepeatableSection.tsx` + `RecordFormSection.tsx` — `src/shared/core/ui/` |
| Cualquier cosa relacionada a generar un PDF (CV, tarjeta) | Un renderer nuevo desde cero | Las capas de `src/shared/core/pdf-engine/layers/` (page, márgenes, sectores, objetos fijos, registros, presets, bleed, imposición, colorSystem) + `presetRegistry.ts`. Un documento nuevo = un `Preset` nuevo, nunca un renderer nuevo. |
| Decidir qué features tiene un usuario según su plan | Chequear `plan === 'pro'` a mano en el componente | `useEntitlements()` — `src/shared/core/entitlements/` |
| Texto de UI: nombre de la entidad principal, verbo de exportar/eliminar/guardar | Palabras sueltas a criterio propio | `UI_GLOSSARY` — `src/shared/core/uiTextGlossary.ts` (lo audita `check-module-boundaries.js` automáticamente) |

## Regla 2 — La trampa de los colores dinámicos en clases de Tailwind

**Nunca** escribas `className={`bg-[${algunaVariableJS}]`}` ni `className="bg-[${algo}]"`.
Tailwind genera CSS escaneando el TEXTO FUENTE en build-time — si el valor
depende de JS en runtime, Tailwind nunca genera la regla y el elemento queda
sin estilo, en silencio, sin ningún error. Esto ya pasó una vez en este repo
(220+ casos) y el bug era invisible hasta grepear el CSS compilado.

Si necesitás un color que varía dinámicamente: usá `var(--color-x-y)` (texto
literal, Tailwind lo puede compilar) o pasalo por `style={{ backgroundColor: ... }}`
inline (los estilos inline de React sí evalúan JS en runtime sin problema).

## Regla 3 — Motores con baja adopción todavía (revisar antes de escribir código nuevo en su dominio)

`errorHandler.ts` y `validationEngine.ts` tienen pocos consumidores todavía —
no es que estén mal, es que la migración del código viejo no terminó. Si
tocás un archivo que tiene un `try/catch` o una validación de email/teléfono
a mano, aprovechá y migralo de paso.

## Regla 4 — Antes de crear un motor/núcleo nuevo

Buscá primero si ya existe algo con un nombre parecido (`grep -rn "nombreConcepto" src/shared/core`).
Este repo ya tuvo el problema de tener DOS sistemas para el mismo concepto
(`documentEngine/` vs `capabilities/capabilityRegistry.ts`, `coverPreset`/`layoutStyle`/`layout.layoutStyle`/`activePresetId`
todos significando "qué plantilla está elegida") — uno de los dos siempre
termina muerto y confunde a quien lo encuentra después. Si dudás si ya existe,
preguntá antes de crear uno nuevo.
