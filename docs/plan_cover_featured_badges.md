# Plan: Motor Único de "Registros Destacados en Portada"

Verificado contra el código real, no supuesto. Corrige el pedido:
"si no hay nada seleccionado en el panel, la portada no debería mostrar
nada — y todo lo que se muestre debe poder editarse o quitarse desde
ahí, en todos los presets".

---

## Diagnóstico completo (los 3 hallazgos, cada uno confirmado)

**1. Hay 4 caminos que llenan el badge de la portada, el panel solo mide 1.**
`TemplateRenderer.tsx` líneas 480-497 — orden de prioridad:
```
1. coverFeaturedEducationId → título de esa Formación
2. coverFeaturedProfessionId → título de esa Profesión
3. cvData.roles (esto es lo único que el panel de "Registros Destacados" cuenta y gestiona)
4. personalInfo.titlePrefix (el campo "Abreviaturas / Título Honorífico" de Datos Personales — otra sección, invisible desde acá)
```

**2. Los caminos 1 y 2 son código muerto — no tienen UI.**
Confirmado con `grep`: `coverFeaturedEducationId`/`coverFeaturedProfessionId`
se **leen** en `CVPreview.tsx` para pasarlos al renderer, pero
**ningún componente del editor los escribe jamás**. El PDF sabe pintar
"elegí una Formación específica para destacar" o "elegí una Profesión
específica", pero esa opción nunca llegó a construirse en el panel.

**3. Es el mismo renderer para todos los presets.**
`TemplateRenderer.tsx` es el único árbol de render de portada — los
presets solo le cambian color/tipografía/ornamento, no esta lógica. Un
solo arreglo acá cubre los 6+ presets, no hay que tocar cada uno.

---

## El motor único (Lote A — toca `shared/core`, requiere tu review)

`[NEW] src/shared/core/pdf-engine/layers/records/coverFeaturedEngine.ts`

```ts
export interface FeaturedBadgeItem {
  id: string;
  label: string;
  source: 'education' | 'profession' | 'role' | 'titlePrefix';
}

/**
 * NÚCLEO — única función que decide qué se muestra como badge en la
 * portada. La usan TANTO el renderer del PDF (TemplateRenderer.tsx)
 * COMO el panel del editor (EditorPanel.tsx) — así lo que el usuario ve
 * en el panel es, por construcción, exactamente lo que sale en el PDF.
 * Ningún componente vuelve a implementar esta cadena de prioridad por
 * su cuenta.
 */
export function resolveCoverFeaturedBadges(cvData: any): FeaturedBadgeItem[] {
  const badges: FeaturedBadgeItem[] = [];

  if (cvData.coverFeaturedEducationId) {
    const found = (cvData.education || []).find(
      (e: any, idx: number) => String(e.id || idx) === String(cvData.coverFeaturedEducationId)
    );
    if (found?.degree) badges.push({ id: `edu-${cvData.coverFeaturedEducationId}`, label: found.degree, source: 'education' });
  }

  if (cvData.coverFeaturedProfessionId) {
    const found = (cvData.professions || []).find(
      (p: any, idx: number) => String(p.id || idx) === String(cvData.coverFeaturedProfessionId)
    );
    if (found?.degree) badges.push({ id: `prof-${cvData.coverFeaturedProfessionId}`, label: found.degree, source: 'profession' });
  }

  if (badges.length === 0 && Array.isArray(cvData.roles)) {
    cvData.roles.forEach((r: string, idx: number) => {
      if (r) badges.push({ id: `role-${idx}`, label: r, source: 'role' });
    });
  }

  if (badges.length === 0 && cvData.personalInfo?.titlePrefix) {
    badges.push({ id: 'title-prefix', label: cvData.personalInfo.titlePrefix, source: 'titlePrefix' });
  }

  return badges;
}

/**
 * Deshace la selección de un badge, sin importar de qué camino vino —
 * el panel llama a esto al tocar el "x" de cualquier pill, y no necesita
 * saber los detalles de cada fuente.
 */
export function removeCoverFeaturedBadge(cvData: any, badge: FeaturedBadgeItem): any {
  switch (badge.source) {
    case 'education':
      return { ...cvData, coverFeaturedEducationId: undefined };
    case 'profession':
      return { ...cvData, coverFeaturedProfessionId: undefined };
    case 'role': {
      const idx = Number(badge.id.replace('role-', ''));
      return { ...cvData, roles: (cvData.roles || []).filter((_: any, i: number) => i !== idx) };
    }
    case 'titlePrefix':
      return { ...cvData, personalInfo: { ...cvData.personalInfo, titlePrefix: '' } };
  }
}
```

`[MODIFY] TemplateRenderer.tsx` — las líneas 479-497 (todo el cálculo
manual de `featuredBadges`) se reemplazan por:
```ts
const featuredBadges = resolveCoverFeaturedBadges(cvData).map(b => b.label);
```
Una sola línea, la lógica vive en un solo lugar.

---

## El panel — refleja la verdad completa, no solo 1 de 4 caminos (Lote B)

`[MODIFY] EditorPanel.tsx`, la sección "Registros Destacados en Portada":

1. El contador pasa de `cvData.roles?.length || 0` a
   `resolveCoverFeaturedBadges(cvData).length` — así el número que ves
   siempre coincide con lo que realmente se muestra en la portada, sin
   importar de cuál de los 4 caminos vino.
2. Cada badge se pinta como una pill con una "×" que llama a
   `removeCoverFeaturedBadge()` — quitar cualquiera de los 4 tipos
   funciona igual desde el mismo lugar, sin que el usuario tenga que
   saber que uno vive en "Datos Personales" y otro en "Formación".
3. **Agregar los 2 selectores que faltaban** (los caminos 1 y 2, hoy
   código muerto): dos `<select>` — "Destacar una Formación específica"
   (lista `cvData.education`) y "Destacar una Profesión específica"
   (lista `cvData.professions`) — que escriben
   `coverFeaturedEducationId`/`coverFeaturedProfessionId`. El dropdown
   que ya existe ("Seleccionar título para destacar", que hoy escribe a
   `roles`) queda como una tercera opción más, no la única.
4. El campo `personalInfo.titlePrefix` sigue editándose en Datos
   Personales (es correcto que viva ahí, es parte del nombre) — pero
   ahora, **si está afectando la portada** (badges.length === 0 en los
   otros 3 caminos y titlePrefix tiene valor), el panel de Portada
   muestra igual su pill, con una nota chica: "Viene de tu Título
   Honorífico en Datos Personales" — así nunca es invisible, aunque el
   campo en sí se edite en otro lado.

**Consecuencia directa de tu pedido ("si no hay nada seleccionado, no
debería mostrar nada"):** con el panel reflejando los 4 caminos reales,
"(0)" va a significar 0 de verdad — porque vas a poder ver y vaciar el
`titlePrefix` desde ahí mismo si no lo querés en la portada, en vez de
que quede escondido en otra sección.

---

## Autocomprobación real (Lote C — el que pediste explícitamente)

`[NEW] tests/coverFeaturedEngine.test.ts` — mismo patrón que
`templateApplicationEngine.test.ts` (ya en el repo, mismo estilo):

```ts
describe('resolveCoverFeaturedBadges — cadena de prioridad', () => {
  it('con educación destacada, ignora roles y titlePrefix aunque existan', () => {
    const cvData = {
      coverFeaturedEducationId: 'e1',
      education: [{ id: 'e1', degree: 'Ingeniero en Sistemas' }],
      roles: ['Debería ignorarse'],
      personalInfo: { titlePrefix: 'Debería ignorarse también' },
    };
    expect(resolveCoverFeaturedBadges(cvData)).toEqual([
      { id: 'edu-e1', label: 'Ingeniero en Sistemas', source: 'education' },
    ]);
  });

  it('sin educación/profesión destacada, usa roles', () => { /* ... */ });
  it('sin nada de lo anterior, cae a titlePrefix', () => { /* ... */ });
  it('con todo vacío, devuelve array vacío — portada sin badges', () => { /* ... */ });
  it('removeCoverFeaturedBadge deshace cada source correctamente', () => { /* ... */ });
});
```

**Y la autocomprobación más importante, la que conecta panel y PDF de
verdad:** un test que confirme que `TemplateRenderer.tsx` y
`EditorPanel.tsx` importan la **misma** función (no dos copias) —
`grep -c "resolveCoverFeaturedBadges" src/shared/core/pdf-engine/renderer/TemplateRenderer.tsx src/modules/cv-builder/components/EditorPanel.tsx`
debería dar ≥1 en cada archivo. Se puede agregar como un chequeo más
dentro de `scripts/check-module-boundaries.js` (mismo lugar donde ya
viven las auditorías de "un solo motor, no duplicado") para que quede
corriendo en cada `check-all`, no solo en este test puntual.

---

## Verificación manual (para vos, al implementarlo)

1. CV nuevo, sin nada cargado → portada sin ningún badge, panel dice "(0)".
2. Cargar `titlePrefix` en Datos Personales → la pill aparece sola en
   el panel de Portada con la nota "Viene de tu Título Honorífico", y
   en la portada real del PDF/preview.
3. Agregar un registro en "Formación" y destacarlo con el nuevo
   selector → ese título reemplaza al de `titlePrefix` (prioridad 1
   gana), y el panel lo refleja.
4. Repetir con 2 presets distintos (uno clásico, uno moderno/sidebar) →
   confirmar que el mismo badge sale en los dos, sin tener que
   configurar nada por separado.
