# Plan de Arquitectura e Implementación V2.8.4
## Reclasificación Dinámica de Registros a 20+ Secciones y Borrador Persistente Anti-Pérdidas

**Fecha:** 2026-11-12  
**Módulo:** `cv-import` / `cv-builder` / `sections`  
**Destinatario:** OpenCode / Agente Ejecutor / Antigravity  

---

## 1. Contexto y Objetivos

### El Problema Detectado en Producción
1. **Pérdida de registros en PDFs largos:** En CVs de 16+ páginas (típicos con diplomas, congresos y certificados), el OCR extraía pocos registros porque el esquema del backend sólo pedía 4 campos (`experience`, `education`, `skills`, `languages`), omitiendo cursos, proyectos y certificaciones. Además, la etapa ATS podaba los resultados asumiendo que un CV debe tener sólo 3 empleos.
2. **Pérdida total al cerrar por accidente:** Si el usuario cierra la ventana de revisión o recarga la página, los datos extraídos en memoria RAM (`useState`) se pierden para siempre.
3. **Rigidez de clasificación:** La IA clasifica a su criterio (por ejemplo, pone una capacitación como "Educación" o "Experiencia"). El usuario no tiene control para reubicar ese registro a la sección correcta antes de importarlo al CV.

### El Objetivo de esta Solución
1. **Reclasificación manual con dropdown:** Cada registro extraído tendrá un menú desplegable con las más de 20 secciones canónicas de LEECV (`coursesAndCertificates`, `experience`, `education`, `achievements`, `projects`, `publications`, `references`, `hardSkills`, `skills`, `languages`, `informatics`, `portfolio`, `redes`, etc.).
2. **Campos adaptables dinámicamente:** Al cambiar la sección en el menú desplegable, los campos editables del registro se adaptan a esa sección (ej: Título/Institución/Año para Cursos vs. Cargo/Empresa/Descripción para Experiencia).
3. **Activación automática:** Al confirmar la importación, cada sección con registros asignados se activa automáticamente en el CV (`activateSection`).
4. **Borrador seguro anti-accidentes:** Guardar la extracción en `localStorage` (`leecv_last_imported_draft`). Si el usuario cierra la ventana, un banner permanente en "Importar datos" permite reabrir la revisión en cualquier momento sin perder nada.

---

## 2. Mapa de Archivos a Intervenir

| Archivo | Responsabilidad |
|---|---|
| `docs/plan_reclasificacion_secciones_y_draft_v284.md` | Este plan arquitectónico. |
| `src/modules/cv-builder/components/modals/ImportReviewDiffModal.tsx` | UI de revisión: dropdown de sección por registro, mapeo dinámico de campos, transferencia entre listas. |
| `src/modules/cv-builder/utils/cvImportReview.ts` | Tipos, mapeos de campos entre secciones, utilidades de reclasificación. |
| `src/modules/cv-builder/components/editor/sections/ImportDataSection.tsx` | Persistencia en `localStorage`, banner de borrador pendiente, activación de secciones. |
| `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx` | Reset de estado en cada apertura (`status: 'idle'`), respaldo inmediato a `localStorage`. |
| `api/cv-import-api.ts` | Prompt exhaustivo que extrae cursos, certificados y prohíbe podar registros. |
| `src/shared/core/cv-import/mergeFragments.ts` | Fusión determinística que incluye cursos, proyectos y publicaciones. |
| `src/shared/core/version.ts` | Bump a V2.8.4. |

---

## 3. Especificación Técnica Detallada

### Paso 1: Catálogo de Secciones y Mapeo de Campos (`cvImportReview.ts`)

En `cvImportReview.ts`, definir las opciones del selector y el diccionario de campos convertibles:

```typescript
export const SECTION_OPTIONS: Array<{ fieldKey: ImportableListField; label: string; sectionId: string }> = [
  { fieldKey: 'experience', label: 'Experiencia laboral', sectionId: 'experiencia' },
  { fieldKey: 'education', label: 'Formación académica', sectionId: 'formacion' },
  { fieldKey: 'coursesAndCertificates', label: 'Cursos y capacitaciones', sectionId: 'cursos' },
  { fieldKey: 'achievements', label: 'Logros y premios', sectionId: 'logros' },
  { fieldKey: 'projects', label: 'Proyectos destacados', sectionId: 'proyectos' },
  { fieldKey: 'publications', label: 'Publicaciones', sectionId: 'publicaciones' },
  { fieldKey: 'references', label: 'Referencias laborales', sectionId: 'referencias' },
  { fieldKey: 'hardSkills', label: 'Habilidades técnicas', sectionId: 'habilidades' },
  { fieldKey: 'skills', label: 'Competencias / Habilidades blandas', sectionId: 'competencias' },
  { fieldKey: 'informatics', label: 'Informática y software', sectionId: 'informatica' },
  { fieldKey: 'languages', label: 'Idiomas', sectionId: 'idiomas' },
  { fieldKey: 'portfolio', label: 'Portafolio y enlaces', sectionId: 'portafolio' },
  { fieldKey: 'profession', label: 'Títulos profesionales', sectionId: 'profesion' },
  { fieldKey: 'redes', label: 'Redes profesionales', sectionId: 'redes' }
];

/** Función para transferir campos al cambiar de sección */
export function reclassifyRecord(fromField: ImportableListField, toField: ImportableListField, item: any): any {
  if (fromField === toField) return item;

  // Extraer valores genéricos
  const title = item.role || item.degree || item.title || item.name || item.course || '';
  const organization = item.company || item.institution || item.school || item.autor || '';
  const description = item.description || item.details || '';
  const dateOrYear = item.year || item.startDate || item.endDate || '';

  // Generar nuevo ítem adaptado a toField
  switch (toField) {
    case 'coursesAndCertificates':
      return { title, institution: organization, year: dateOrYear };
    case 'experience':
      return { role: title, company: organization, startDate: dateOrYear, endDate: '', description };
    case 'education':
      return { degree: title, institution: organization, startDate: dateOrYear, endDate: '', description };
    case 'projects':
      return { title, institution: organization, year: dateOrYear, details: description };
    case 'achievements':
      return { title, institution: organization, details: description };
    case 'publications':
      return { title, autor: organization, year: dateOrYear };
    case 'references':
      return { personaReferencia: title, cargo: organization, institution: '' };
    case 'informatics':
      return { title, course: title, institution: organization };
    case 'hardSkills':
    case 'skills':
      return { name: title, level: 'Intermedio' };
    case 'languages':
      return { language: title, proficiency: 'Intermedio' };
    default:
      return { title, institution: organization, details: description };
  }
}
```

---

### Paso 2: Dropdown de Sección en `ImportReviewDiffModal.tsx`

1. En cada tarjeta de registro, agregar un `<select>` nativo o estilizado con `uiDesignSystem`:
   ```tsx
   <div className="flex items-center gap-2 mb-2">
     <label className="text-xs font-semibold text-[var(--ui-text-secondary)]">
       Sección de destino:
     </label>
     <select
       value={field}
       onChange={(e) => handleReclassify(field, index, e.target.value as ImportableListField)}
       className="text-xs rounded border border-[var(--ui-border)] bg-[var(--ui-bg-input)] px-2 py-1 text-[var(--ui-text-primary)]"
     >
       {SECTION_OPTIONS.map((opt) => (
         <option key={opt.fieldKey} value={opt.fieldKey}>
           {opt.label}
         </option>
       ))}
     </select>
   </div>
   ```
2. La función `handleReclassify`:
   - Mueve el ítem de `edited[fromField]` a `edited[toField]` usando `reclassifyRecord()`.
   - Inmediatamente los campos visibles del formulario se redibujan con `editableRecordFields[toField]`.
   - El usuario puede editar los datos directamente en los campos propios de esa sección.

---

### Paso 3: Persistencia en `localStorage` (Anti-Pérdidas)

1. **Al terminar la extracción (`ImportCvAiModal.tsx`):**
   ```typescript
   localStorage.setItem('leecv_last_imported_draft', JSON.stringify({
     timestamp: Date.now(),
     data: finalCv
   }));
   ```
2. **En `ImportDataSection.tsx`:**
   - Detectar si hay un borrador guardado:
     ```typescript
     const [savedDraft, setSavedDraft] = useState<any>(() => {
       try {
         const raw = localStorage.getItem('leecv_last_imported_draft');
         return raw ? JSON.parse(raw) : null;
       } catch { return null; }
     });
     ```
   - Si `savedDraft` existe y `reviewData === null`:
     Mostrar banner prominente:
     ```tsx
     <div className="rounded-[var(--ui-radius-card)] border border-[var(--color-primary-base)] bg-[var(--ui-bg-panel)] p-4 flex items-center justify-between">
       <div>
         <h4 className="font-semibold text-sm">Extracción reciente guardada</h4>
         <p className="text-xs text-[var(--ui-text-secondary)]">
           Tenés registros extraídos disponibles para revisar y clasificar en tu CV.
         </p>
       </div>
       <div className="flex gap-2">
         <button className={button.secondary} onClick={() => {
           localStorage.removeItem('leecv_last_imported_draft');
           setSavedDraft(null);
         }}>
           Descartar
         </button>
         <button className={button.primary} onClick={() => openReview(savedDraft.data)}>
           Revisar y clasificar
         </button>
       </div>
     </div>
     ```

---

### Paso 4: Prompt Exhaustivo de Extracción (`cv-import-api.ts`)

En `api/cv-import-api.ts`:
1. **En `extract-page`:**
   - Agregar `coursesAndCertificates` (título, institución, año/horas), `projects`, `publications`, `achievements` al esquema JSON y prompt.
2. **En `consolidate-ats`:**
   - Añadir explícitamente:
     > `CRÍTICO: CONSERVA EL 100% DE LOS REGISTROS. PROHIBIDO PODAR O RESUMIR A UN TOP 3. Si hay 20 cursos o 12 capacitaciones, incluye los 20 cursos y las 12 capacitaciones.`

---

### Paso 5: Fusión Completa en `mergeFragments.ts`

Actualizar `mergeFragments.ts` para que `arrayFields` incluya todas las listas:
```typescript
const arrayFields = [
  'experience',
  'education',
  'coursesAndCertificates',
  'achievements',
  'projects',
  'publications',
  'references',
  'hardSkills',
  'skills',
  'languages',
  'informatics',
  'portfolio',
  'profession',
  'redes'
];
```

---

## 4. Criterios de Aceptación (Definición de Terminado)

1. **Subir PDF de 16 páginas:** Debe extraer tanto experiencias como formaciones y la totalidad de los cursos/certificados.
2. **Cambiar sección:** Un ítem clasificado como educación se puede pasar con 1 clic a "Cursos y capacitaciones" o "Proyectos", adaptando sus campos en tiempo real.
3. **Cierre accidental:** Si el usuario cierra el navegador o la ventana de edición, al volver a `/crear-cv` ve el botón *"Revisar y clasificar"* con todos los datos intactos.
4. **Activación:** Al confirmar, las secciones elegidas se activan en el editor y el documento muestra los datos en sus pestañas correspondientes.
5. **Calidad:** `npm run check-all` = 0 errores.
