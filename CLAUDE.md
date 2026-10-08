# CLAUDE.md — Guía de Desarrollo para el Proyecto LEECV

Este archivo instruye a Claude Code para trabajar en el proyecto **LEECV** con los mismos estándares, reglas y motores canónicos que Antigravity y VS Code.

---

## 📌 Contexto del Proyecto
**LEECV** es una aplicación web y estudio de diseño para currículums e impresiones de alta calidad orientada a usuarios comunes.
- **Stack:** React 18, TypeScript, Vite, Tailwind CSS, Supabase, Vitest, Playwright.
- **Directorio raíz:** `C:\Users\Kalpa\Proyectos\LEECV`

---

## 🚨 REGLAS OBLIGATORIAS (Fuente de verdad: `AGENTS.md`)

### Regla 0 — Antes de terminar cualquier tarea
```bash
npm run check-all
```
**Debe dar 0 errores.** Este chequeo está forzado por pre-commit, pre-push y GitHub Actions. Nunca saltees ni ignores un chequeo.

---

### Regla 1 — Tabla de Núcleos Canónicos ("Voy a hacer X → Uso Y")
| Si vas a... | NO hagas esto | Usá este motor |
|---|---|---|
| Consultar/escribir en Supabase | `supabase.from('tabla')` directo | `dal.*` — `src/shared/core/storage/dataAccessLayer.ts` |
| Llamar a un endpoint `/api/*` | `fetch('/api/...')` directo | `apiClient.*` / `apiFetch()` — `src/shared/core/utils/apiClient.ts` |
| Leer/cambiar URL, params o navegar | `window.location.*`, `window.open` | `navigation.*` — `src/shared/core/utils/navigation.ts` |
| Operación async que puede fallar | `try { ... } catch (e) { ... }` a mano | `withErrorHandling()` — `src/shared/core/utils/errorHandler.ts` |
| Validar email/teléfono/DNI/CUIT/URL/campos | Regex nuevo a mano | `isValidEmail`, `isValidPhone`, `isValidDni`, `isValidCuit`, `isValidUrl`, `validateFieldValue` — `src/shared/core/utils/validationEngine.ts` |
| Colores de UI (fondo, texto, borde) | Hex suelto, `bg-[#xxxxxx]` o ``bg-[${var}]`` | `colorSystem.*` de `uiDesignSystem.ts` con variables CSS `var(--color-x-y)` |
| Tipografía, radios, sombras, spacing | Valores sueltos (`text-[13px]`) | `typeScale`, `radius`, `shadow`, `spacing`, `zIndex` de `uiDesignSystem.ts` |
| Mostrar un modal | Crear overlay a mano | `Modal.tsx` — `src/shared/core/ui/Modal.tsx` |
| Notificación efímera | Div de aviso a mano | `Toast.tsx` / `useToast()` — `src/shared/core/ui/Toast.tsx` |
| Confirmación destructiva | `window.confirm()` nativo | `ConfirmDialog.tsx` / `useConfirm()` |
| Input de formulario | `<input>` a mano | `Field.tsx` — `src/shared/core/ui/Field.tsx` |
| Lista editable de ítems | `.map()` con botones de editar | `RepeatableSection.tsx` + `RecordFormSection.tsx` |
| Generación de PDF / CV / Tarjetas | Renderer nuevo desde cero | Capas de `src/shared/core/pdf-engine/layers/` + `presetRegistry.ts` |
| Features según plan de usuario | `plan === 'pro'` a mano | `useEntitlements()` — `src/shared/core/entitlements/` |
| Textos de UI (verbos, entidades) | Palabras a criterio propio | `UI_GLOSSARY` — `src/shared/core/uiTextGlossary.ts` |

---

### Regla 2 — Prohibición de colores dinámicos en clases Tailwind
**NUNCA** concatenes variables JS en clases: ``className={`bg-[${variable}]`}`` ni `className="bg-[${algo}]"`. Tailwind compila en build-time escaneando texto literal.
- Si varía dinámicamente: usá `var(--color-x-y)` o `style={{ backgroundColor: ... }}`.

---

### Regla 6 — Protocolo Obligatorio de Git y Fin de Sesión
`main` está protegido por un GitHub Ruleset. **Prohibido el push directo a `main`.**
1. Crear una rama descriptiva: `git checkout -b feat/lo-que-sea`.
2. `git push origin <rama>`.
3. Abrir Pull Request contra `main`.
4. Esperar que el check `check-all` en GitHub Actions quede en verde.
5. Si toca `src/shared/core/` o `api/_lib/`, requiere aprobación de Kalpa.
6. Mergear una vez aprobado y con checks en verde.
7. Tras mergear: `git fetch origin && git log origin/main -1 --format="%H %s"`, verificar hash y documentar en `SESSION_LOG.md`.

---

### Regla 7 — Planificación previa obligatoria antes de modificar código
1. **NO modificar código de inmediato ("no mandarse de una")**.
2. **Presentar un plan conciso**:
   - Qué se va a hacer y objetivo.
   - Archivos y componentes a intervenir.
   - Núcleos existentes a reutilizar.
   - Validaciones a tener en cuenta.
3. **Esperar el visto bueno de Kalpa** antes de hacer cambios.

---

### Regla de Lenguaje Sencillo (Dos Zonas)
- **Zona pública** (landing, blog, SEO, cookies): **CERO jerga técnica**. Usar "imprimilo en tu casa" / "llevalo a una imprenta". Prohibido hablar de A4, sangrado, marcas de corte, imposición, DPI, vectorial.
- **Zona app** (editor, Book Studio): El término técnico va **entre paréntesis y después de la explicación sencilla**, ej: `📄 Hoja común (A4)`.

---

### Regla 8 — Identidad Canónica
`sectionId` y `pdfRole` son la identidad canónica. No inferir tipos a partir de strings o títulos ingresados por el usuario. Las heurísticas léxicas son sólo fallback con normalización NFD y coincidencia estricta.

---

### Regla 9 — División de Roles y Flujo de Trabajo
- **Kalpa:** Dueño del producto y CODEOWNER. Define requisitos, aprueba planes y autoriza PRs/merge a `main`.
- **Antigravity:** Agente ejecutor principal. Crea ramas (`feat/...`), escribe código/tests, ejecuta `npm run check-all` y abre PRs.
- **Claude:** Auditor de seguridad y segunda opinión para arquitecturas críticas, RLS de PostgreSQL y webhooks.
- **VS Code:** Entorno visual para revisión de diffs y asistencia en tiempo real.

---

## 🛠️ Comandos Frecuentes
- `npm run dev`: Inicia el servidor de desarrollo Vite (`http://localhost:5173`).
- `npm run check-all`: Ejecuta todos los chequeos de gobernanza, tokens, contraste, tipos y build.
- `npm test`: Ejecuta los tests unitarios con Vitest.
- `npm run check-plain-language`: Chequeo de vocabulario y lenguaje sencillo.

---

## 🌐 Habilidades de Desarrollo Web Activas
- Depuración con Playwright MCP: inspección visual y análisis de consola.
- Documentación con Context7 MCP: consulta de APIs de React y Shadcn.
- Creación y modificación de componentes siguiendo Shadcn UI y Tailwind CSS.
