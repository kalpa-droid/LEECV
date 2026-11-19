# Directiva OpenCode — Fix Panel Admin LEECV (Fases A + B + C)

## Contexto

Auditoría completa del Panel Admin V2.24.0 identificó 8 bugs reales.
Ninguno es crítico para el negocio, pero afectan la experiencia del admin
y violan reglas de AGENTS.md (Regla 1 y Regla 2).

**Rama:** `feat/fix-admin-panel-v2.24`
**Version bump:** PATCH → actualizar `src/shared/core/version.ts`
**Validación final:** `npm run check-all` = 0 errores

---

## FASE A — Correcciones rápidas

### A1. Quitar debug text "(listCustomers)" del header

**Archivo:** `src/modules/admin/components/UsersTab.tsx`
**Línea 63:**

```tsx
// ANTES:
<h2 className="...">Gestión de Clientes (listCustomers)</h2>

// DESPUÉS:
<h2 className="...">Gestión de Clientes</h2>
```

### A2. Corregir mensaje WhatsApp (texto invertido)

**Archivo:** `src/modules/admin/components/UsersTab.tsx`
**Línea 194:**

```tsx
// ANTES:
href={`https://wa.me/5493878342772?text=${encodeURIComponent(
  `Hola, necesito ayuda con la cuenta de ${user.email}`
)}`}

// DESPUÉS:
href={`https://wa.me/5493878342772?text=${encodeURIComponent(
  `Hola, te escribimos desde LEECV sobre tu cuenta (${user.email}).`
)}`}
```

### A3. Migrar try/catch manual a withErrorHandling en AuditAndErrorsTab

**Archivo:** `src/modules/admin/components/AuditAndErrorsTab.tsx`

**Función `loadLogs` (líneas 38-51):** Reemplazar el try/catch manual con
`withErrorHandling()` siguiendo el mismo patrón que ya usan los demás tabs:

```tsx
async function loadLogs() {
  setLoading(true);
  await withErrorHandling(
    async () => {
      const rows = await dal.adminErrorLogs.list({
        level: levelFilter === 'all' ? undefined : levelFilter,
        source: sourceFilter === 'all' ? undefined : sourceFilter,
      });
      setLogs(rows);
    },
    {
      context: 'Carga de Auditoría y Errores',
      errorMessage: 'No se pudo cargar la auditoría de errores.',
      notify: (msg) => showError(msg),
    }
  );
  setLoading(false);
}
```

**Función `loadAuditLogs` (líneas 53-63):** Mismo cambio:

```tsx
async function loadAuditLogs() {
  setAuditLoading(true);
  await withErrorHandling(
    async () => {
      const rows = await listAuditLogs();
      setAuditLogs(rows || []);
    },
    {
      context: 'Carga de Acciones de Administradores',
      errorMessage: 'No se pudieron cargar las acciones de administradores.',
      notify: (msg) => showError(msg),
    }
  );
  setAuditLoading(false);
}
```

---

## FASE B — Regla 2 de Tailwind: radios interpolados

Tailwind NO genera CSS para `rounded-[${variable}]` interpolado en
template strings — el valor depende de JS en runtime y Tailwind escanea
texto fuente en build-time (ver AGENTS.md Regla 2).

**Patrón a buscar:** `rounded-[${radius.` en todos los archivos de
`src/modules/admin/`.

**Fix universal:** Reemplazar `rounded-[${radius.XXX}]` en `className`
con `style={{ borderRadius: radius.XXX }}` en el elemento.

**Ejemplo:**
```tsx
// ANTES:
<div className={`bg-[var(--ui-bg-card)] rounded-[${radius.modal}] p-5 ...`}>

// DESPUÉS:
<div className="bg-[var(--ui-bg-card)] p-5 ..." style={{ borderRadius: radius.modal }}>
```

**IMPORTANTE:** Al mover `rounded-[${...}]` fuera de className, el
template string puede quedar sin interpolaciones — en ese caso convertirlo
a string literal normal `className="..."` para mayor limpieza.

### Archivos afectados (buscar con `grep -rn 'rounded-\[${' src/modules/admin/`):

1. **ProcessedPaymentsTab.tsx** — líneas 47, 60, 84, 90, 182, 190
2. **SentryReportsTab.tsx** — líneas 43, 45, 58, 69, 83, 91, 100
3. **StorageDriveTab.tsx** — líneas 102, 118, 128, 145, 173, 185
4. **TemplateManagementTab.tsx** — líneas 173, 189, 198, 219, 251, 263,
   285, 316, 325, 336, 356, 362, 448, 451, 466, 476, 486, 496, 509,
   514, 526, 540, 555, 565 (muchas — este archivo tiene ~25 ocurrencias)
5. **AiTelemetryTab.tsx** — líneas 102, 104, 115, 123, 124, 133, 134,
   145, 168, 182, 212, 219, 227, 237, 243
6. **AdminDashboard.tsx** — líneas 297, 318, 328, 338 (tarjetas de
   métricas rápidas)

**NO tocar** los archivos que ya usan `style={{ borderRadius }}`:
- `UnclaimedCreditsTab.tsx` ✅ ya usa `style={{ borderRadius: radius.modal }}`
- `PublishedCvsTab.tsx` ✅ ya usa `style={{ borderRadius: radius.modal }}`
- `AuditAndErrorsTab.tsx` ✅ ya usa `style={{ borderRadius: radius.modal }}`

---

## FASE C — Mejoras de UX

### C1. Telemetría IA: auto-recarga al cambiar filtros

**Archivo:** `src/modules/admin/components/AiTelemetryTab.tsx`
**Líneas 95-98:**

```tsx
// ANTES:
useEffect(() => {
  loadData();
  loadCooldowns();
}, []);

// DESPUÉS:
useEffect(() => {
  loadData();
}, [dateFrom, endpointFilter]);

useEffect(() => {
  loadCooldowns();
}, []);
```

Esto hace que la tabla de telemetría se recargue automáticamente al
cambiar la fecha o el endpoint, sin necesidad de presionar "Filtrar"
manualmente.

### C2. StorageDriveTab: aclarar que mide el browser local del admin

**Archivo:** `src/modules/admin/components/StorageDriveTab.tsx`
**Línea 147:** Cambiar el label de la tarjeta de IndexedDB:

```tsx
// ANTES:
<span className="...">IndexedDB Navegador</span>

// DESPUÉS:
<span className="...">IndexedDB (tu navegador)</span>
```

**Línea 158:** Cambiar la descripción:

```tsx
// ANTES:
<p className="...">Caché ilimitada persistente en cliente</p>

// DESPUÉS:
<p className="...">Caché local de tu navegador (no del servidor)</p>
```

### C3. TemplateManagementTab: optional chaining defensivo

**Archivo:** `src/modules/admin/components/TemplateManagementTab.tsx`
**Línea 28:**

```tsx
// ANTES:
selectedPreset.palette.primary || 'var(--color-secondary-base)'

// DESPUÉS:
selectedPreset?.palette?.primary || 'var(--color-secondary-base)'
```

### C4. ProcessedPaymentsTab: agregar searchQuery a deps del useEffect

**Archivo:** `src/modules/admin/components/ProcessedPaymentsTab.tsx`
**Líneas 41-43:**

```tsx
// ANTES:
useEffect(() => {
  fetchPayments();
}, [page, providerFilter]);

// DESPUÉS:
useEffect(() => {
  fetchPayments();
}, [page, providerFilter, searchQuery]);
```

**Nota:** Con este cambio, la búsqueda se ejecuta en cada keystroke
(sin debounce). Si se prefiere debounce, aplicar el mismo patrón de
`AdminDashboard.tsx` (useState + setTimeout 350ms → debouncedSearchQuery).
Recomiendo aplicar debounce para consistencia.

---

## Checklist final

- [ ] Crear rama `feat/fix-admin-panel-v2.24`
- [ ] Aplicar todos los cambios de Fase A (3 fixes)
- [ ] Aplicar todos los cambios de Fase B (Regla 2 — ~50 ocurrencias)
- [ ] Aplicar todos los cambios de Fase C (4 mejoras)
- [ ] Bump PATCH en `src/shared/core/version.ts`
- [ ] `npm run check-all` = 0 errores
- [ ] `git push origin feat/fix-admin-panel-v2.24`
- [ ] Abrir PR contra `main`
- [ ] Esperar CI verde
- [ ] Kalpa aprueba como CODEOWNER y mergea

## Notas para el agente

- **Regla 1:** Usar `withErrorHandling()` del motor canónico, no try/catch
  manual.
- **Regla 2:** NUNCA usar `className={`...-[${variableJS}]`}` — usar
  `style={{ propiedad: valor }}` para valores dinámicos de JS.
- **Regla 7:** Plan ya aprobado por Kalpa.
- El archivo `admin-api.ts` NO necesita cambios — todos los bugs son
  del frontend admin.
- Los componentes `PendingGrantsTab.tsx`, `PaymentsAdminTab.tsx`,
  `UnclaimedCreditsTab.tsx` y `PublishedCvsTab.tsx` están OK y no
  necesitan cambios.
