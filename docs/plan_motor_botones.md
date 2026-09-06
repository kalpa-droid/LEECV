# Plan: Motor de Botones (gradientes, sombras y jerarquía semántica)

Este documento es para que vos lo implementes (o se lo pases a otra
sesión). No hay código nuevo en este commit — es el diagnóstico y el
plan, con evidencia real del repo, no una opinión estética.

---

## 0. Diagnóstico — por qué se ve así hoy

No hay un problema, hay **tres sistemas de botones compitiendo entre sí**
en el mismo proyecto:

### Sistema 1 — `button.*` en `uiDesignSystem.ts` (el "oficial", subutilizado)
```ts
export const button = {
  primary: `bg-[image:var(--gradient-brand)] ... shadow-md`,  // único con degradado
  secondary: `bg-[var(--ui-btn-outline-bg)] border ...`,      // plano
  ghost: `bg-transparent ...`,                                 // plano
  danger: `bg-[var(--color-status-danger-muted)] ...`,        // plano
} as const;
```
Solo 4 variantes. Solo `primary` tiene degradado — las otras tres son
planas **a propósito** (es un patrón profesional legítimo: el degradado
se reserva para la acción de mayor jerarquía). El problema no es que
existan botones planos, es que no hay variantes para todo lo que la app
necesita en la práctica (ver Sistema 3).

### Sistema 2 — `<Button>` en `src/shared/core/ui/Button.tsx` (muerto)
Un componente reusable completo, con 7 variantes (`primary/secondary/
accent/dark/danger/outline/ghost`), **ninguna con degradado**, y con esta
colisión textual en el código:
```ts
primary:   'bg-[var(--color-accent-base)] text-white hover:bg-[var(--color-accent-hover)] ...',
secondary: 'bg-[var(--color-accent-base)] text-white hover:bg-[var(--color-accent-brand-hover)] ...',
```
`primary` y `secondary` usan el **mismo color de fondo** — es la colisión
exacta que describís, ya escrita en el código. La buena noticia:
confirmé que **cero archivos importan este componente** (`grep -rl "<Button "` da 0 resultados). Nunca se rompe nada en pantalla porque nadie lo usa — pero es la prueba de que alguien ya intentó centralizar esto una vez y no se adoptó.

### Sistema 3 — Ad-hoc, en 44 de los 61 archivos con `<button>`
La gran mayoría de los botones de la app arman su propio `className` a
mano, combinando tokens de color válidos (por eso `check-ui-tokens` da
"0 fugas" — cada color individual existe en la paleta) pero sin ninguna
regla de qué combinación usar para qué. Confirmé, greppeando los 4
tokens más repetidos, que aparecen en botones de **11 a 25 archivos
distintos cada uno**, sin relación semántica entre sí:

| Token | Aparece en botones de (archivos) | Usado hoy para... |
|---|---:|---|
| `--color-status-warning-base` | 11 | Mercado Pago, exportar PDF, certificado, ATS, guardar... |
| `--color-secondary-base` | 22 | PayPal, compartir, firma, foto, tema, guardar como... |
| `--color-accent-purple` | 24 | Lemon Squeezy, plantillas, ajuste manual, wizard, candidatos... |
| `--color-status-success-base` | 18 | Activar Enterprise, reembolsos, ATS, guardar, candidatos... |

Esto es exactamente el síntoma que describís: el mismo color aparece con
significados completamente distintos según en qué pantalla estés, así
que dos botones sin relación terminan iguales.

**Conclusión del diagnóstico:** no falta un sistema de botones — sobran
dos que no se usan, y falta que el que sí tiene buen diseño (Sistema 1)
cubra todos los casos reales para que dejar de improvisar sea más fácil
que seguir improvisando.

---

## 1. La jerarquía semántica completa (Lote A — toca `shared/core`, pide tu review)

Reemplazar los 3 sistemas por **uno solo**, con una variante por cada rol
real que ya relevé en el código (no inventado, sacado de los 44 archivos):

```ts
/**
 * MOTOR DE BOTONES — jerarquía semántica única. Regla de degradado:
 * SOLO las variantes de mayor compromiso visual (primary, success,
 * providerBrand) llevan degradado — es intencional, no inconsistencia.
 * El resto queda plano a propósito, para que el degradado siga
 * significando "esto es lo más importante de la pantalla".
 */
export const button = {
  base: 'rounded-[10px] font-medium text-[13px] px-4 py-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',

  // CTA principal de la pantalla. Uno solo por vista, idealmente.
  primary: `bg-[image:var(--gradient-brand)] text-[var(--color-accent-on-base)] hover:opacity-95 active:scale-[0.98] ${elevationSystem.raised}`,

  // Acción secundaria, mismo peso que primary pero no la elegida por defecto.
  secondary: `bg-[var(--ui-btn-outline-bg)] border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] hover:border-[var(--color-neutral-border-strong)] active:scale-[0.98]`,

  // Bajo compromiso: cancelar, cerrar, "ajuste manual".
  ghost: `bg-transparent text-[var(--color-neutral-text-secondary)] hover:text-[var(--color-neutral-text-primary)]`,

  // Solo eliminar / acciones irreversibles.
  danger: `bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/30 text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-base)] hover:text-white`,

  // NUEVO — confirmar/activar algo positivo (activar plan, aprobar). Degradado suave.
  success: `bg-[image:var(--gradient-success)] text-white hover:opacity-95 active:scale-[0.98] ${elevationSystem.raised}`,

  // NUEVO — precaución no destructiva (re-comprobar, revisar antes de continuar). Plano.
  warning: `bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/40 text-[var(--color-status-warning-text)] hover:bg-[var(--color-status-warning-base)]/20`,

  // NUEVO — checkout de un proveedor de pago externo. Ver tabla de dominio abajo:
  // cada proveedor tiene SU color fijo, no comparte con success/warning genéricos.
  providerBrand: (provider: 'mercadopago' | 'paypal' | 'lemonsqueezy') => ({
    mercadopago: `bg-[image:var(--gradient-gold)] text-black hover:opacity-95 ${elevationSystem.raised}`,
    paypal: `bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 text-[var(--color-secondary-text)] hover:opacity-90`,
    lemonsqueezy: `bg-[var(--color-accent-purple-light)] border border-[var(--color-accent-purple)]/30 text-[var(--color-accent-purple-text)] hover:opacity-90`,
  }[provider]),
} as const;
```

**Falta un token nuevo:** `--gradient-success` no existe todavía en
`gradientSystem` (solo están `brand`, `surface`, `gold`, `teal`) — se
agrega ahí mismo, verde suave, mismo patrón que los otros 4.

`src/shared/core/ui/Button.tsx` **se borra** (0 usos, cero riesgo) o se
reescribe como wrapper delgado de este `button.*` — no mantener dos
fuentes de verdad.

---

## 2. Tabla de asignación de color por dominio (Lote A, mismo archivo)

Esto es lo que evita que el problema vuelva en 2 meses: documentar, como
comentario en el motor, qué color le corresponde a cada tipo de acción,
para que nadie tenga que decidirlo de nuevo cada vez:

| Dominio de la acción | Variante a usar | Nunca usar para... |
|---|---|---|
| CTA principal de la pantalla (1 por vista) | `primary` | Otras acciones que compitan por atención |
| Mercado Pago | `providerBrand('mercadopago')` | Cualquier cosa que no sea checkout de MP |
| PayPal | `providerBrand('paypal')` | Cualquier cosa que no sea checkout de PayPal |
| Lemon Squeezy | `providerBrand('lemonsqueezy')` | Cualquier cosa que no sea checkout de LS |
| Activar/confirmar plan, aprobar | `success` | Botones puramente informativos |
| Precaución, re-verificar, revisar antes de seguir | `warning` | Errores reales (eso es `danger`) |
| Eliminar, cancelar suscripción, acción irreversible | `danger` | Nada más — es el más restringido |
| Cancelar, cerrar, bajo compromiso | `ghost` | — |
| Todo lo demás con peso medio | `secondary` | — |

---

## 3. Migración — los 44 archivos relevados, en 4 tandas

No hay que migrar los 44 de una — se hace por tandas, cada una es una
PR chica y verificable. Orden sugerido (de más visible a menos):

**Tanda 1 — lo que el usuario ve primero:**
`Navbar.tsx`, `LandingPage.tsx`, `PricingModal.tsx`, `PdfCheckoutModal.tsx`

**Tanda 2 — flujo de guardado/exportación (el más repetido):**
`SaveModal.tsx`, `SaveAsVersionModal.tsx`, `SavedCVsModal.tsx`, `EmailSaveModal.tsx`, `ShareAppModal.tsx`, `JsonDownloadModal.tsx`, `PdfProgressModal.tsx`

**Tanda 3 — editor y herramientas del CV:**
`EditorPanel.tsx`, `CanvaIconDock.tsx`, `PhotoCropperModal.tsx`, `SignatureModal.tsx`, `CertCropperModal.tsx`, `AtsCheckModal.tsx`, `WizardModal.tsx`, `CloudStatusModal.tsx`, `PrivacyModal.tsx`, `CardSheetExportSelector.tsx`, `editor/PersonalInfoSection.tsx`, `editor/SectionManualAdjustment.tsx`, `TemplateMenu.tsx`

**Tanda 4 — admin, agencia, productos nuevos, resto:**
`AdminDashboard.tsx`, `AdminLogin.tsx`, `ProcessedPaymentsTab.tsx`, `SentryReportsTab.tsx`, `StorageDriveTab.tsx`, `TemplateManagementTab.tsx`, `agency/AgencyCandidateDashboard.tsx`, `agency/components/CandidateList.tsx`, `agency/components/EnterpriseOrgModal.tsx`, `BlogModule.tsx`, `BookStudio.tsx`, `PublicCVView.tsx`, `RefundPolicyPage.tsx`, `RetentionOfferModal.tsx`, `PwaInstallBanner.tsx`, `RepeatableSection.tsx`, `UndoRedoControls.tsx`, `ZoomControls.tsx`, `App.tsx`

**Criterio de éxito por archivo:** cero `bg-[var(--color-` o
`bg-[image:var(--gradient` dentro de un `<button` — todo sale de
`button.*` de la tabla del punto 2.

---

## 4. El check de gobernanza que falta (Lote B — esto es lo que evita que vuelva a pasar)

`check-ui-tokens` audita "¿es un color válido de la paleta?" — nunca
audita "¿se usó el componente semántico correcto?". Por eso 44 archivos
con colores 100% válidos igual generaron el problema. Hace falta un
chequeo nuevo, mismo patrón que `scripts/audit-ui-tokens.js`:

`[NEW] scripts/check-button-semantics.js`:
1. Encuentra cada `<button` en el proyecto (regex o AST, igual que el
   auditor de tokens ya hace).
2. Si arma el fondo con `bg-[var(--color-` o `bg-[image:var(--gradient`
   en vez de spread/referencia a `button.*`, lo reporta como violación.
3. **Arrancar en modo solo-reporte** (no rompe `check-all` todavía) para
   poder medir el avance real de la migración del punto 3 sin frenar
   otro trabajo mientras tanto.
4. Recién cuando la Tanda 4 esté migrada, pasarlo a modo bloqueante
   dentro de `check-all` — ahí es cuando el problema queda cerrado de
   verdad, no solo prolijo por ahora.

---

## Orden de ejecución sugerido

1. **Lote A** (motor + tabla de dominio) — rama → PR → tu review (toca `shared/core`).
2. **Lote B en modo reporte** — para tener el número real de archivos pendientes en todo momento.
3. **Lote C** (migración), Tanda 1 a 4, una PR por tanda.
4. **Lote B en modo bloqueante** — recién al final.

Verificación en cada PR: `npm run check-ui-tokens` (no debe romperse),
`npm run check-contrast` (los nuevos degradados success/providerBrand
necesitan pasar WCAG 2.1 AA igual que los que ya existen), `npm run
check-all` completo.
