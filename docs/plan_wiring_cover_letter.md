# Plan: Wiring Completo de Cartas de Presentación al Shell

Mismo patrón que ya usamos para que Book Studio dejara de ser una isla
(`docs/plan_shell_unico.md`, ya implementado en producción) — esta vez
aplicado a Cartas. Verificado contra el código real antes de escribir
esto, no contra el reporte anterior.

---

## Hallazgo nuevo que cambia el plan: `CoverLetterDock.tsx` repite el error de Book Studio v1

No es solo "falta conectar 7 archivos" — `CoverLetterDock.tsx` (88
líneas) **construye su propio `<nav>` con sus propios botones**, exactamente
el mismo error que `BookStudio.tsx` tenía antes de que lo absorbiéramos
en `CanvaIconDock`. No reusa el dock compartido. Y de paso, tiene un bug
propio: usa `bg-[var(--color-primary-base)]` para resaltar la pestaña
activa — confirmé que **ese token no existe** en `index.css`. Hoy, la
pestaña activa del dock de Carta no se resalta con ningún color (la
clase no genera nada).

**Consecuencia para el plan:** no hay que "conectar" `CoverLetterDock.tsx`
al shell — hay que **retirarlo** y mover sus 5 pestañas a
`CanvaIconDock.tsx`, igual que hicimos con los 7 pasos de Libro.

---

## Lote 0 — Nada que arreglar aparte (el bug del token se resuelve solo en el Lote A, al migrar las pestañas al dock compartido, que ya usa tokens reales)

---

## Lote A — Las 5 pestañas de Carta en el dock compartido

`[MODIFY] src/modules/cv-builder/components/CanvaIconDock.tsx`

Mismo patrón que `bookTabs` (ya en producción):
```ts
const coverLetterTabs = [
  { id: 'source_data', stepNumber: 1, label: '1. Origen de Datos', icon: Database },
  { id: 'vacancy', stepNumber: 2, label: '2. Vacante', icon: Briefcase },
  { id: 'ai_generate', stepNumber: 3, label: '3. Generar con IA', icon: Sparkles },
  { id: 'content', stepNumber: 4, label: '4. Contenido', icon: FileText },
  { id: 'styling', stepNumber: 5, label: '5. Diseño', icon: Palette },
];
```
Y el bloque de render (mismo lugar donde hoy vive
`{docType === 'book' && bookTabs.map(...)}`, en los 2 puntos del
archivo — desktop y mobile):
```tsx
{docType === 'cover_letter' && coverLetterTabs.map((tab) => { /* mismo JSX que bookTabs */ })}
```
El badge de créditos de IA (`${aiCredits} cr.`, ya lo tenía
`CoverLetterDock.tsx`) se mantiene, mismo lugar que el badge de paso
numérico — no se pierde nada al migrar.

`[DELETE]` (al final del lote, no al principio — mismo criterio que ya
usamos con `BookStudio.tsx`) `CoverLetterDock.tsx`, una vez confirmado
que `CanvaIconDock` cubre sus 5 pestañas + el badge de créditos.

---

## Lote B — El orquestador que falta (no existe todavía, hay que crearlo)

`CoverLetterEditorPanel.tsx` ya está construido pero es un componente
**controlado** — espera `data`, `onChangeData`, `presetId` como props,
no maneja su propio estado. Nadie se los da hoy. Hace falta el
equivalente exacto de `BookStudioContent.tsx`:

`[NEW] src/modules/cover-letter/CoverLetterContent.tsx`
```tsx
export function CoverLetterContent({ activeTabId, onBackToHome }: { activeTabId: string; onBackToHome: () => void }) {
  const [activeTab, setActiveTab] = useState<CoverLetterTab>('source_data');
  const [data, setData] = useState<CoverLetterData>(/* estado inicial vacío */);
  const [presetId, setPresetId] = useState('carta-clasica');
  const [letterId, setLetterId] = useState<string | null>(
    activeTabId?.startsWith('letter-') ? activeTabId : null
  );
  const [aiCredits, setAiCredits] = useState<number>(3);

  // Guardado — mismo patrón que saveBook/loadBookById (Lote 0 del plan
  // de Libros, ya implementado): agregar saveCoverLetter/loadCoverLetterById
  // a documentStorageService.ts, y 'cover_letter' ya vive en
  // DOCUMENT_TYPE_REGISTRY (confirmado, ya está desde el commit de IA).

  return (
    <AppShell
      docType="cover_letter"
      navbarProps={{ ...docType: 'cover_letter' ... }}
      dockProps={{ activeTab, onSelectTab: setActiveTab, aiCredits }}
      panelSlot={
        <CoverLetterEditorPanel
          activeTab={activeTab}
          data={data}
          onChangeData={setData}
          presetId={presetId}
          onSelectPreset={setPresetId}
          aiCredits={aiCredits}
        />
      }
      mainSlot={<CoverLetterPreviewArea data={data} presetId={presetId} />}
      tabsBarProps={{ ... }}
    />
  );
}
```

`[NEW] src/modules/cover-letter/CoverLetterPreviewArea.tsx` — el
`mainSlot`, mismo rol que `BookPreviewArea.tsx`: renderiza en vivo
`CoverLetterPdfDocument.tsx` (ya existe, confirmado) con los datos
actuales — así el usuario ve la carta actualizarse mientras la genera
con IA o la edita a mano, sin tener que ir a un paso de "exportar" para
verla.

---

## Lote C — Persistencia (mismo patrón que Libros, Lote 0 de ese plan)

`[MODIFY] src/shared/core/storage/documentStorageService.ts` —
```ts
export const saveCoverLetter = (data: any) => saveDocument(data, 'cover_letter');
export const loadCoverLetterById = (id: string) => loadDocumentById(id, 'cover_letter');
export const getSavedCoverLettersList = () => getSavedDocumentsList('cover_letter');
export const deleteCoverLetterById = (id: string) => deleteDocumentById(id, 'cover_letter');
```
`'cover_letter'` ya está en `DOCUMENT_TYPE_REGISTRY` (confirmado, ya
existe) — esto es puro cableado, cero lógica nueva, igual que fue para
Libros.

`addOpenTab(id, title, undefined, 'cover_letter')` se llama al guardar
por primera vez — **ya es seguro llamarlo**, `documentTabEngine.ts` y
`pendingDocumentHandoff.ts` ya soportan `'cover_letter'` (arreglado en
el commit anterior `39dbb54`).

---

## Lote D — Ruta y Navbar

`[MODIFY] src/app/App.tsx`:
- Nueva rama de ruta `/crear-carta` → monta `CoverLetterContent`
  (Lote B), mismo patrón que `/crear-libro` → `BookStudioContent`.
- `<SeoMetaManager title="Mi Carta de Presentación — LEECV" noIndex />`
  (mismo patrón que las otras 3 pantallas de herramienta).
- `activeDocType` ya no depende solo de `activePresetId === 'tarjeta-personal'`
  — para esta ruta es simplemente `'cover_letter'` fijo, igual que
  Libro es fijo dentro de su propia ruta.

`[MODIFY] src/modules/cv-builder/components/Navbar.tsx`:
- Mismo tratamiento que Tarjeta/Libro: Guardar/Copiar/JSON quedan
  **visibles pero deshabilitadas** con `buttonUnavailable` (el token
  que ya existe desde el fix anterior) — una carta se exporta, no se
  autoguarda como versión — y "Publicar en la Web" igual, deshabilitado
  con tooltip ("Publicar en la Web es para CVs — las cartas se
  descargan listas para enviar").

---

## Lote E — El bug de créditos de IA (separado, no bloquea el wiring de arriba)

Esto no tiene que ver con el shell, pero sigue roto y es más urgente en
términos de plata:

`[NEW]` migración de Supabase — el RPC `grant_ai_credits` que
`serverDal.ts` ya llama pero no existe en ningún lado:
```sql
create or replace function grant_ai_credits(p_user_id uuid, p_amount int)
returns void as $$
begin
  update profiles set ai_credits = coalesce(ai_credits, 0) + p_amount
  where id = p_user_id;
end;
$$ language plpgsql security definer;
```
(Ajustar nombre de tabla/columna real una vez confirmado dónde vive
`ai_credits` — si la columna tampoco existe todavía, agregarla en la
misma migración con `alter table profiles add column if not exists
ai_credits int default 0;`, mismo patrón que ya se usó para
`pdf_export_credits`.)

**Por qué separado del resto:** el wiring del shell (Lotes A-D) es
seguro de implementar y probar sin que la IA funcione — se puede
escribir una carta a mano, ver la preview, guardarla. El RPC de
créditos es necesario recién cuando alguien toca "Generar con IA" de
verdad — no bloquea poder navegar y usar el resto del feature.

---

## Orden de ejecución

```
1. Lote A (dock compartido) — retira CoverLetterDock.tsx al final, no antes
        ▼
2. Lote B (CoverLetterContent.tsx + CoverLetterPreviewArea.tsx)
        ▼
3. Lote C (persistencia) — depende de B (necesita el estado para guardar)
        ▼
4. Lote D (ruta + Navbar) — depende de B y C, es lo que hace el feature alcanzable de verdad
        ▼
5. Lote E (RPC de créditos) — en paralelo con cualquiera de los anteriores, no depende de nada de esto
```

## Verificación

```bash
npx tsc --noEmit
npx vitest run
npm run check-all
```
Manual: entrar a `/crear-carta` desde cero → confirmar que el dock
compartido muestra las 5 pestañas con número + ícono → escribir una
carta a mano (sin IA) → guardarla → confirmar que aparece en la barra
de pestañas como "Mi Carta de Presentación" (o el título real, no "Mi
Currículum Vitae") → cerrar y reabrir desde la pestaña → confirmar que
el contenido persiste.

## Lo que este plan evita, explícitamente

No se construye un segundo dock, un segundo shell, ni una segunda forma
de guardar documentos. Cartas se vuelve, igual que Libro y Tarjeta ya
lo son, contenido dentro del mismo `AppShell` — no una pantalla aparte
con sus propios componentes de navegación reinventados.
