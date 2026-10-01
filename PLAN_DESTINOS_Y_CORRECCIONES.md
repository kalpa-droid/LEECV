# Plan: Destino del CV + datos personales configurables + correcciones pendientes

> Fecha: 2026-10-01. Verificado leyendo el código del commit `509a20a`. Reemplaza lo que dice `PLAN_CV_RECLUTADOR_IA.md` sobre datos personales (secciones 3, 4 y Fase 1: "ocultar por defecto", "avisar al escribir DNI"). El resto de ese plan sigue vigente y se integra acá.

## 0. Principio rector

**LEECV no decide por el usuario qué datos personales van en su CV.** Hay empresas, organismos e instituciones que todavía piden DNI, CUIT, fecha de nacimiento, estado civil o nacionalidad. La app informa, recomienda según el **destino** del documento, y deja elegir. Nunca borra ni oculta en silencio, y nunca trata esos datos como un error que baja el puntaje.

El "destino" ya existe en el código como **formato** (`src/shared/core/formats/cvFormatRegistry.ts`: `estandar-completo`, `ats-one-column`, `us-resume`, `europass`, `tech-portfolio`, `latam-clasico`). No se crea un motor nuevo: se **extiende ese núcleo** para que gobierne datos personales, columnas, modo ATS, reglas e IA con una sola fuente de verdad.

---

## 1. Lo que encontré (con archivo y línea)

| # | Hallazgo | Dónde | Gravedad |
|---|---|---|---|
| 1 | Los 5 datos (`dni, cuit, birthDate, nacionalidad, estadoCivil`) **se ocultan del PDF siempre**: si `cvData.hiddenFields` no existe se usa una lista fija. No hay ninguna pantalla que permita mostrarlos, y `hiddenFields` solo se agrega, nunca se quita. Hoy un usuario **no puede** poner su DNI en el PDF | `cvDataAdapter.ts:39-40`, `TemplateRenderer.tsx` (`renderCoverPageContent`), `AppModals.tsx:286` | **Crítica** (rompe el requisito) |
| 2 | La misma lista fija está **duplicada** en dos archivos | idem | Alta |
| 3 | El formato "LATAM Ejecutivo" dice "datos completos", pero igual se ocultan por el punto 1 | `cvFormatRegistry.ts` | Alta |
| 4 | La portada ignora la política del formato: en `us-resume` la portada podría mostrar DNI porque solo mira `hiddenFields` | `TemplateRenderer.tsx` | Media |
| 5 | La regla `sensitive_data` es severidad `high` (-25 puntos) y su arreglo es ocultar. Con DNI cargado el puntaje nunca llega a 100 | `rulesCatalog.ts`, `atsPreflightCheck.ts` | Alta |
| 6 | Al exportar, si `score < 100` se abre un modal que frena la descarga normal. Para quien debe incluir DNI, eso pasa **en cada export** | `App.tsx` `handleExportPDFClick` | Alta |
| 7 | El texto del editor promete "LEECV los ocultará del PDF por defecto" | `PersonalInfoSection.tsx:59` | Media |
| 8 | La regla `multicol_layout` mira `cvData.layout.sectionOrder`, pero el layout real usa `sectionOrders` (plural): probablemente **nunca dispara**. Falta confirmarlo con un test | `rulesCatalog.ts:371` | Media |
| 9 | La importación con IA no extrae DNI, CUIT, nacimiento, estado civil ni nacionalidad (el esquema solo trae nombre, email, teléfono, rol, ubicación, resumen): al importar un CV viejo **se pierden** | `api/cv-import-api.ts` | Alta |
| 10 | El PDF "versión ATS" consume un crédito aparte (`handleExportAtsPdf` llama a `consumeCredits(1)`): para tener 2 columnas + versión ATS se paga dos veces | `App.tsx` | Decisión tuya |
| 11 | El artículo del blog "Los datos que jamás debés poner" dice "nunca" y contradice el requisito | `blog/data/articles/datos-que-jamas-debes-poner.ts` | Media |

Los pendientes del plan anterior (IA, créditos, privacidad, JSON, LinkedIn, blog) están en las fases E a H.

---

## 2. Diseño: una sola política de datos personales

### 2.1 Modelo (en `cvFormatRegistry.ts`)

Cada formato declara, por campo personal, un modo:

- `user` — decide la persona (lo normal). Si el campo está cargado, **se muestra** salvo que ella lo apague.
- `hide` — el formato lo excluye siempre (hoy solo `us-resume`, por convención de ese estándar).
- `show` — reservado por si algún formato lo exige.

| Formato | DNI / CUIT | Nacimiento | Estado civil | Nacionalidad | Foto | Columnas |
|---|---|---|---|---|---|---|
| `latam-clasico` | user | user | user | user | user | 2 |
| `estandar-completo` | user | user | user | user | user | 2 |
| `ats-one-column` | user | user | user | user | user | 1 |
| `europass` | user | user | user | user | user | 2 |
| `tech-portfolio` | user | user | user | user | user | 2 |
| `us-resume` | hide | hide | hide | hide | hide | 1 |

Lo que cambia entre formatos es la **recomendación** que muestra la app (ver fase C), no lo que se permite.

### 2.2 Datos del documento

- `cvData.hiddenFields` (lista que solo crece) pasa a ser legado. Nuevo campo: `cvData.personalFieldOverrides?: Record<campo, 'show' | 'hide'>`.
- **Orden de resolución, en una única función** `resolvePersonalFieldVisibility(cvData)`:
  1. el formato dice `hide` → oculto y no editable (se explica por qué);
  2. si no, la elección explícita de la persona;
  3. si no, el default: **se muestra si está cargado**.
- Esa función reemplaza las dos listas fijas, el chequeo de `rulesCatalog`, el arreglo de `AppModals` y lo que lee la portada. Preview, PDF, versión ATS y JSON usan la misma.

### 2.3 Documentos ya guardados (decidido: mostrar todo)

La migración (`schemaVersion` +1) **no** escribe overrides: en los documentos viejos se muestra todo lo que esté cargado. Aviso de una sola vez al abrir: *"Ahora se muestran los datos personales que cargaste. Podés apagar cualquiera con su interruptor."* (el editor viejo prometía ocultarlos, por eso el aviso sigue siendo necesario).

---

## 3. Fases (en orden)

### Fase A — Núcleo (base de todo lo demás)
1. Agregar `personalFieldPolicy` a `CvFormatDefinition` y completar los 6 formatos según la tabla.
2. Crear `resolvePersonalFieldVisibility()` y borrar las dos listas fijas (`cvDataAdapter.ts`, `TemplateRenderer.tsx`).
3. Portada: usar la misma función (arregla el hallazgo 4).
4. Migración de esquema y sanitizador (`cvDataSchema.ts`, `cvMigrationEngine.ts`).
5. Tests: política por formato; orden de resolución; migración; un CV con DNI **aparece** en el PDF en `latam-clasico`, `ats-one-column` y `europass`, y **no aparece** en `us-resume`.

**Listo cuando:** cargar DNI, nacimiento y estado civil y verlos en la vista previa y en el PDF en 2 columnas y en 1 columna.

### Fase B — Interfaz
1. En `PersonalInfoFields.tsx`: interruptor "Mostrar en el PDF" junto a cada dato sensible (bloqueado con explicación si el formato lo excluye).
2. Reescribir el aviso de `PersonalInfoSection.tsx` en tono informativo: *"Algunas empresas e instituciones piden estos datos y otras no. Mirá el aviso: si no los piden, podés no mostrarlos."* Sin "nunca" ni "evitá".
3. Selector **"¿Para quién es este CV?"** al comenzar o en Diseño, con los formatos como destinos en lenguaje simple: *Portal de empleo online (ATS)*, *Empresa o institución tradicional (datos completos)*, *Internacional (EE.UU./Canadá)*, *Europass*, *Tecnología*. Reutiliza `DisenoSection` y `presetHierarchyEngine`; no duplica nada.
4. Modal de export (`AtsCheckModal` + `handleExportPDFClick`): deja de frenar. Si hay avisos graves reales, muestra el modal con **"Descargar igual"** visible; los avisos informativos no bloquean. Recordar la elección por destino.

### Fase C — Reglas que dependen del destino
1. `RecruiterRule` gana `severityByFormat` / `appliesTo` y `evaluate(cvData, jobText, ctx)` con `ctx = { formatId, policy }`.
2. `sensitive_data`: severidad **info**, sin restar puntaje, se muestra solo cuando el destino es un portal ATS o internacional, con el texto "Estos datos no suelen hacer falta en portales online. Si el aviso los pide, dejalos." Acción: "Ocultar" (opcional) y "Dejar".
3. `multicol_layout`: corregir para leer la maquetación real (`columnLayoutPresetId` o el preset resuelto) y mostrarse como info solo en destino ATS, con el botón "Descargar versión ATS de 1 columna".
4. Cerrar las reglas que faltan: extensión en páginas, requisito duro de la vacante, aviso de CV desactualizado (60–90 días).
5. Tests por formato: mismo CV, distinto destino → distinto resultado.

### Fase D — Matriz plantillas × formatos × modo ATS
1. Test `formatPresetMatrix`: para cada formato × cada preset de CV (`cv-clasico`, `modern-corporate`, `minimal-editorial`, `creative-sustentable`) verificar que arma el documento, respeta la política de datos, el orden canónico de secciones y la cantidad de columnas del formato.
2. Verificar `recommendedPresetIds` de cada formato y qué pasa al cambiar de formato con un preset incompatible (`presetHierarchyEngine`).
3. Modo ATS (`flattenPresetForATS`): 1 columna, texto seleccionable, sin barras ni íconos; respeta la misma política de datos. Opción en el modal de export: "Omitir datos personales sensibles en esta versión" (apagada por defecto, recordada).
4. **Decisión pendiente tuya:** ¿la versión ATS se incluye en el mismo crédito que el PDF principal (dos archivos por un export) o sigue cobrando aparte? Mi sugerencia: incluida; es el mismo documento y evita que quien necesita ambos pague doble.

### Fase E — IA coherente con la política
1. **Importar CV (`cv-import-api`)**: ampliar el esquema para extraer DNI, CUIT, nacimiento, estado civil y nacionalidad cuando existan; revisar `mergeFragments`. Ya quedó sin `requireAuth` (commit `509a20a`).
2. **`buildCandidateContext`**: se mantiene tachando esos datos **antes de enviar a la IA**. Es una protección de lo que sale del navegador y no afecta lo que se muestra en el PDF. Aclararlo en el código y en la política de privacidad.
3. Tachar también emails y teléfonos escritos dentro de textos libres (resumen, descripciones).
4. Los prompts reciben el **destino** (formato) como contexto y no repiten reglas a mano: leer del catálogo de reglas. No adoptar del documento de prompts la "omisión absoluta" de datos personales ni "100% de éxito en el parsing" ni "nunca varias columnas".
5. `ai-generate`: pasar `responseSchema` por tarea, un reintento si el JSON viene mal, y delimitar con marcas el texto de terceros (vacante, CV pegado, actividades) pidiendo tratarlo como datos y no como instrucciones (prompt injection).
6. Niveles estandarizados en la salida (Básico/Intermedio/Avanzado; A1–C2). `improve_bullet` recibe la vacante; nueva tarea "adaptar a esta vacante" con diff aceptable de a uno.
7. Tests de prompts: sin PII en el contexto, con delimitadores, esquema válido.

### Fase F — Infraestructura pendiente
1. **Créditos de IA honestos:** `useEntitlements` (`hasAiCredits: true` fijo) y `remainingCredits: 3` fijo. Mostrar "X usos por día" real y manejar el 429.
2. `consume-pdf-credit.ts` y `paypal-order.ts` siguen con `requireAuth` y sin llamadores en `src/`: confirmar y borrar, o migrar.
3. `requireRateLimit` deja pasar todo si falla la RPC: para endpoints de IA, cerrar el acceso (fail-closed).
4. Probar contra la base real las políticas de `pdf_export_tokens` (migración `20261006`) y limitar intentos de `consume_export_token`.
5. Párrafo en `PrivacyPolicyPage.tsx` (hoy cero menciones de IA, Gemini o Groq): qué texto sale, qué se tacha.

### Fase G — Portabilidad
1. Probar a mano el round-trip del `.json` con foto, firma y certificado (abrir y verificar `data:image/`; importar en ventana de incógnito). Si anda, tachar la sección 7 del plan anterior.
2. Sumar `cardOverrides.logoDataUrl` al empaquetador (`driveDocumentPackager.ts`, `dedupAssetsForLocalStorage`, `reconstructCvDataFromParts`).
3. LinkedIn: conectar el importador de ZIP que ya existe (`linkedinArchiveImporter.ts`) al CV base, y ofrecer el PDF del perfil como alternativa vía `ImportCvAiModal` + `cv-import-api`.
4. El JSON exportado conserva `personalFieldOverrides`.

### Fase H — Contenido
1. Reescribir "Los datos que jamás debés poner" → **"Qué datos personales poner según a quién le mandás tu CV"**, con una tabla por destino. Sin afirmar qué organismo pide qué: "revisá el aviso".
2. Marcar como opinión de campo (no hecho legal) lo que digan las reclutoras sobre edad.
3. Ola 2 pendiente: Tu CV y LinkedIn, Foto en el CV, CV para mayores de 40 y 50, Pretensión salarial, Tutorial de la IA de LEECV.
4. Landing: la promesa pasa a "elegí el formato según a quién le mandás tu CV".

### Fase I — Cierre
`npm run check-all` completo, `npm run build`, prerender de todas las rutas del blog, y recorrido manual en navegador real (nunca se hizo): checklist en la sección 5.

---

## 4. Orden y dependencias

`A → B → C → D` se hacen seguidos (A es base de B, C y D). `E`, `F`, `G` y `H` son independientes entre sí y pueden ir en paralelo después de A. Lo más urgente es **A** (hoy no se pueden mostrar esos datos), después **B.4** (el modal que frena) y **E.1** (importar pierde datos).

## 5. Checklist de prueba manual (después de A–D)

- [ ] CV con DNI, CUIT, nacimiento, estado civil y nacionalidad → los 5 aparecen en vista previa y PDF (2 columnas).
- [ ] Mismo CV en 1 columna → aparecen igual.
- [ ] Apagar un interruptor → ese dato desaparece del PDF y del JSON visible, y el resto se queda.
- [ ] Cambiar a EE.UU. → los datos y la foto desaparecen y los interruptores muestran el motivo.
- [ ] Descargar con avisos solo informativos → no aparece el modal que frena.
- [ ] Descargar versión ATS → 1 columna, texto seleccionable, misma política.
- [ ] Abrir un CV guardado antes de la migración → nada cambia visualmente; aparece el aviso una sola vez.
- [ ] Importar un CV viejo con DNI por IA → el DNI queda cargado.

## 6. Decisiones tomadas (2026-10-01)

1. **Versión ATS incluida en el mismo crédito** que el PDF principal: un export = dos archivos. Hoy `handleExportAtsPdf` (`App.tsx`) llama a `consumeCredits(1)` aparte; se unifica en un único consumo.
2. **Documentos ya guardados: mostrar todo** (sección 2.3).
3. **Ningún formato fuerza `show`.** En su lugar: varias plantillas por necesidad y un flujo en tres pasos (sección 7).

---

## 7. Flujo de trabajo de la web

```
A. DATOS (CV base, uno solo y completo)
   manual · PDF · imagen · JSON · ZIP de LEECV · ZIP de LinkedIn
        │
        ▼
   B. DISEÑO del CV base: destino → formato → plantilla → secciones → datos personales
        │
        ▼
   C. PUESTOS / IA: una versión por puesto (copia del base, la IA solo toca esta copia)
        │
        ▼
   D. SALIDA: CV (PDF + versión ATS, 1 crédito) · Carta de presentación de esa versión
```

### A. Datos
- **Importadores que ya existen:** manual; PDF e imagen (`ImportCvAiModal`, acepta pdf/png/jpeg); JSON; ZIP de LEECV (`importCVFromZipFile`).
- **ZIP de LinkedIn:** el importador **ya existe** (`importers/linkedinArchiveImporter.ts`: Profile, Positions, Education, Skills, Languages, Certifications) pero hoy solo está conectado a la tarjeta personal y a la carta. Hay que conectarlo al CV base. Se mantiene también el PDF del perfil de LinkedIn como alternativa (el ZIP de LinkedIn tarda en generarse).
- Toda importación **mezcla sin borrar** lo ya cargado y deja los datos personales con su interruptor.
- Un indicador de completitud del CV base (qué secciones faltan) antes de pasar al paso B.

### B. Diseño del CV base
1. **¿Para quién es?** (destino) → elige formato (`cvFormatRegistry`).
2. **Plantilla por necesidad.** Hoy hay 4 plantillas de CV (`cv-clasico`, `modern-corporate`, `minimal-editorial`, `creative-sustentable`) × 6 formatos. El plan las empaqueta como "plantillas por necesidad" = formato + plantilla + secciones visibles + política de datos: portal online (1 columna ATS), empresa o institución tradicional (2 columnas, datos completos, foto, firma), ejecutivo, primer empleo, tecnología, internacional, Europass. La matriz de la Fase D mostrará si falta alguna combinación para sumar plantillas.
3. **Mostrar u ocultar secciones** (ya existe) y **datos personales** con interruptor.

### C. Puestos con IA
- **Catálogo de áreas y puestos como datos** (nuevo, `src/shared/core/recruiter-rules/jobAreas.ts`), con tus cinco áreas: Administración/Finanzas/Gestión; Comercial/Ventas/Marketing; Tecnología/Datos/Producto; RRHH/Selección; Atención al cliente/Logística. Cada área: puestos a los que apunta, sustantivos de acción clave y viñetas modelo.
- **Crear versión para un puesto:** elegir área y puesto (o pegar el aviso) → se duplica el CV base (ya existe duplicar con `version_label`, "Puesto: …") y se guarda `jobTarget`. **El CV base nunca se modifica.**
- **Qué hace la IA solo en la versión:** reescribe viñetas con la fórmula *[sustantivo de acción] + [contexto o herramienta] + [métrica]*, ajusta el resumen, propone palabras clave del aviso como chips "agregar si es verdad". **Pregunta las métricas, no las inventa**, y los modelos del catálogo son ejemplos de formato, nunca datos del candidato. Cada cambio se muestra como diff y se acepta de a uno (revisión forzada).
- El mismo catálogo alimenta: las sugerencias del editor de viñetas, el chequeo local de palabras clave (sin IA), los prompts, y el blog.
- **No toca datos personales.** El contexto que sale a la IA sigue tachando DNI, CUIT, teléfono, email y dirección.

### D. Salida
- **CV:** el PDF principal y su versión ATS de 1 columna salen juntos con **un solo crédito**.
- **Carta de presentación:** se arma desde la versión del puesto + `jobTarget` (estructura de 3 párrafos, revisión obligatoria antes de descargar).

### Orden de implementación ajustado
A, B, C, D (fases del punto 3) → **E: importadores al CV base** → **F: catálogo de áreas + versiones por puesto + IA** → **G: carta desde la versión** → infraestructura, portabilidad, contenido y cierre (fases F–I del punto 3, renumeradas).
