# Plan Integral LEECV — Reglas de Reclutadoras + IA + Web Clásica

> **Aviso 2026-10-01:** las partes de este plan que mandan a ocultar o avisar contra DNI, CUIT, nacimiento, estado civil y nacionalidad (secciones 3 y 4, y la Fase 1) quedan **reemplazadas** por `PLAN_DESTINOS_Y_CORRECCIONES.md`: esos datos se mantienen y se eligen por destino del CV.

> Versión unificada. Combina el análisis verificado contra el código (commit `d823e29`) con la propuesta arquitectónica de componentes. Pensado para ir marcando fases a medida que las implementás.

**Estado (verificado contra el código el 2026-10-01):** ✅ Fase 0 (con excepciones, ver sección 11) · ✅ Fase 1 · ✅ Fase 2 · ✅ Fase 3 (con huecos, ver sección 11) · ✅ Fase 4 (Ola 1 completa; Ola 2 parcial) · 🔲 Fase 5 · 🔲 Fase 6

---

## 0. Resumen ejecutivo

La vuelta a "web clásica" (sin cuentas, pago único por PDF) rompió la IA para todos los usuarios comunes, porque los endpoints de IA siguen exigiendo `requireAuth` y el único login que queda es `AdminLogin`. Eso va **primero**, antes de sumar cualquier funcionalidad nueva de reclutadoras.

Después de resolver eso, el trabajo se divide en tres bloques que se retroalimentan:
1. **Un catálogo único de reglas de reclutador** (dato, no texto suelto) que alimenta el chequeo del editor, los prompts de IA, el blog y la carta de presentación, para que nunca se contradigan entre sí.
2. **Portabilidad real de los datos** (JSON con imágenes embebidas, IndexedDB) para que nadie pierda su CV por limpiar el navegador.
3. **Contenido del blog** reestructurado como motor de artículos con secciones, no como bloques de texto sueltos.

---

## 1. Hallazgos verificados en el código (bloqueadores, no opcional)

| Hallazgo | Consecuencia |
|---|---|
| `ai-generate`, `cv-import-api`, `consume-pdf-credit` y `drive-api` siguen con `requireAuth`, y el único login vivo es `AdminLogin` | Todo llamado de IA de un usuario común da 401 (carta, análisis ATS, importar, logros) |
| `useEntitlements` devuelve fijo `aiCredits: 3, hasAiCredits: true` | La interfaz promete IA que el servidor rechaza |
| Migración `pdf_export_tokens`: `INSERT WITH CHECK (true)` y `SELECT USING (true)` para `anon`, y `consume_export_token` ejecutable por `anon` | Según el SQL, cualquiera podría insertar un token con `paid = true` o listar tokens pagos sin consumirlos. No probado contra la base real — revisar hoy, es el más urgente de los tres bloqueadores de seguridad |
| Se borraron `SeoMetaManager` y `seoIndexingEngine` | El blog no cambia título/descripción por artículo |
| Blog: 10 artículos de 3–5 párrafos cortos, sin subtítulos; dos duplican el tema ATS; cuatro son de libros/tarjetas mezclados con contenido de empleo | Poco valor SEO y de conversión, y contenido de temas distintos compitiendo entre sí |
| Chequeo ATS: solo 4 reglas (multicolumna, email, teléfono, títulos no estándar) | No cubre casi nada de lo que las reclutoras corrigen en vivo |
| `PersonalInfo` admite `dni`, `cuit`, `birthDate`, `estadoCivil`, `nacionalidad`, `address` sin ningún aviso | Se pueden publicar justo los datos que ambas reclutoras dicen que nunca hay que poner |
| Portadas imprimen `DNI: ---` y `Salta, Argentina` como texto fijo | Aparece en el PDF aunque el usuario no cargó nada |
| H5 de la auditoría anterior sigue igual: `experience: importedData.experience \|\| prev.experience`, y `[]` es verdadero en JS | Una importación puede borrar silenciosamente lo que ya tenías cargado |

De la auditoría previa, esta ronda solo re-verificó H4 (parcial) y H5 contra el código actual. H2, H3, H6 a H12 se mantienen del análisis anterior pero **no están re-chequeados contra este commit** — no asumas que siguen igual sin volver a mirarlos.

---

## 2. Decisión de identidad para la IA

> **RESUELTO:** se implementó la **Opción C** (límite por IP, `requireRateLimit`). `ai-generate` usa 3 usos/día por IP y `cv-import-api` 20/hora por IP; ninguno exige login. No hay `signInAnonymously` en el código. Las Opciones A y B quedan solo como referencia histórica. Una consecuencia pendiente: la interfaz todavía muestra "créditos" que no existen (ver sección 11).

(Texto original de la decisión:)

Sin cuentas, hay que decidir cómo limitar y cobrar el uso de IA. Tres opciones:

- **A — Sesión anónima de Supabase (recomendada).** Invisible para el usuario, con captcha invisible. Reutiliza `requireAuth`, los créditos atómicos, el rate limit por usuario y la telemetría de costos que ya existen. Los créditos se pierden si el usuario borra los datos del navegador — igual que hoy pasa con el `exportToken`.
- **B — La IA acepta el `exportToken`.** Más simple, pero solo sirve a quien ya pagó; no hay IA gratuita de ningún tipo.
- **C — Rate limit por IP sin identidad.** El más barato de armar, pero el más fácil de abusar con costo real de Gemini/Groq.

**Recomendación:** A, más un bono de créditos de IA incluido en cada export pagado (vía token), para no perder el caso de uso de B.

### Contingencia por tu experiencia previa con Supabase Auth

Como ya tuviste problemas de login con Supabase antes, tratá el anon auth como un *spike* de medio día, no como algo que se asume que va a andar:

1. **Verificar primero, en aislamiento:** antes de tocar `requireAuth` o los endpoints, probá `supabase.auth.signInAnonymously()` en un archivo o ruta de prueba suelta, sin el resto de la app en el medio. Confirmá en el dashboard de Supabase (Authentication → Settings) que "Allow anonymous sign-ins" está habilitado — es la causa más común de que esto falle en silencio.
2. **Puntos típicos de fricción con anon auth en Supabase** (para no perder tiempo si aparecen): políticas RLS que asumen `auth.uid()` no nulo y rechazan sesiones anónimas; el cliente de Supabase reusando una sesión vieja cacheada del `AdminLogin`; y el rate limit de creación de usuarios anónimos por IP en el plan gratuito, que puede tirarte 429 en pruebas repetidas desde tu misma conexión.
3. **Umbral de decisión:** si después de ese medio día seguís sin poder loguear una sesión anónima de forma confiable, no sigas insistiendo — pasá a la **Opción C temporal** (rate limit por IP, con un límite bajo, tipo 3 usos por IP por día) para destrabar la Fase 0 y no bloquear el resto del plan. Podés migrar a A más adelante sin tocar el resto de la arquitectura, porque `requireAuth` y los créditos ya quedan armados para aceptar cualquier identidad, anónima o no.

---

## 3. El catálogo único de reglas de reclutador

Lo más valioso de las transcripciones es que el mismo consejo sirve en cuatro lugares a la vez. Se propone un archivo de datos, `src/shared/core/recruiter-rules/`, con cada regla (id, severidad, texto corto, ejemplo bueno y malo, artículo del blog asociado, cómo se detecta) que alimenta:

1. el **chequeo del editor** (gratis, local, sin IA),
2. los **prompts de IA** (las reglas se inyectan como contexto del sistema),
3. los **artículos del blog** (enlazados o generados desde la misma regla),
4. la **carta de presentación**.

Así el blog, el editor y la IA nunca se contradicen entre sí.

### Reglas extraídas de las dos transcripciones

| Tema | Regla | Cómo se detecta |
|---|---|---|
| Datos personales | Solo nombre, teléfono, email y localidad. Sin edad, fecha de nacimiento, DNI, estado civil, hijos ni nacionalidad. Sin dirección exacta ni teléfonos de referencias | Campos cargados → botón "ocultar en el PDF" |
| Título del documento | El título del archivo/documento es siempre Nombre y Apellido, nunca "CV" ni "Currículum" | Nombre de archivo al exportar |
| Foto | Opcional en Latinoamérica, más útil en atención al público y ventas. Fondo claro, encuadre formal, sin selfies, globos ni logos | Guía; el editor no puede evaluarla automáticamente |
| Extensión | 1 página al empezar, hasta 2 con 10–15 años de experiencia | Conteo de páginas |
| Orden | Perfil → experiencia (más reciente primero) → formación → cursos → herramientas/idiomas/competencias al final. Nunca formación antes que experiencia si hay experiencia | Fechas y orden de secciones |
| Perfil | 4–5 renglones: quién sos, qué buscás, años de experiencia. No repetir el CV | Largo del texto |
| Experiencia | Cargo, empresa, año. Viñetas específicas con logros y **sustantivos de acción terminados en -ción** ("Administración de facturación", "Negociación de compras", "Construcción de tableros de control") en vez de tareas pasivas ("hacía tareas administrativas", "manejaba Excel") | Viñetas vacías/cortas, palabras vagas, verbos en gerundio/pasivos |
| Fechas | Los ATS filtran por antigüedad y por mes. Trabajos cortos: aclarar "temporario" o "proyecto" | Duración menor a 6 meses sin aclaración |
| Formación | Primero la carrera, después la institución. "En curso" en vez de "abandonado". "Título en trámite" cuenta como recibido. Sin primaria, sin promedio | Texto del estado del campo |
| Cursos | Sección aparte, de los últimos 5–6 años y relevantes a la vacante, con una línea de qué se aprendió | Año del curso, cantidad |
| Herramientas | Siempre con nivel de texto claro (Básico/Intermedio/Avanzado o A1–C2), **nunca barras de progreso ni círculos** — el ATS no los lee y confunden al ojo humano. Para IA, nombrar cuál (ChatGPT, Claude, Copilot, Gemini), nunca "IA avanzado" a secas | Herramienta sin nivel declarado, o campo tipo barra/slider |
| Idiomas | Igual que herramientas: texto, no barras ni puntos, sin "nivel técnico" como etiqueta | Formato del campo |
| Competencias | Una palabra (liderazgo, negociación). Si se desarrolla en una frase larga, es en realidad una tarea. Evitar "responsable", "puntual", "buena actitud" | Frases largas o genéricas |
| Formato | Íconos, barras de progreso y logos no los leen los ATS. Nombre del archivo: `Nombre-Apellido.pdf`. Colores sobrios. 1 o 2 columnas sirven según cuánta información tenga la persona — no hay una regla única | Modo ATS activo y nombre del archivo |
| Personalizar por vacante | Copiar las palabras reales del requisito (cargo, carrera, herramientas, años, ubicación), sin mentir en carrera ni idiomas (~80% del CV se mantiene igual entre vacantes). Leer lo que devuelve la IA antes de mandarlo | Coincidencia de palabras clave contra el texto de la vacante |
| Sin experiencia formal | Prácticas, pasantías, voluntariado, docencia, investigación, proyectos académicos, negocio familiar profesionalizado (con nombre propio y fechas). No inventar nada | Guía + flujo de IA dedicado |
| Requisito duro | Si piden 3 años y no los tenés, no aplicar "por las dudas" | Aviso quirúrgico en la comparación contra la vacante |
| Mantenimiento | Actualizar el CV cada 2–3 meses y cada vez que pase algo nuevo | Aviso al abrir la app si pasaron 60–90 días |

**Contradicciones entre las dos reclutoras** (van al catálogo como rango con el motivo, no como regla fija):
- 3 viñetas por puesto vs. 6–7 por puesto.
- 1 página siempre vs. hasta 2 páginas.
- Lo que dicen sobre filtros por edad es su opinión/experiencia de campo, no un hecho legal — marcarlo como tal en cualquier artículo que lo mencione.

**Cuidado con las fuentes:**
- Reescribir todo con palabras propias — son streams de terceros; si se las nombra como fuente, conviene pedir permiso antes de publicar.
- Los CVs mostrados en vivo durante los streams son de terceros: no usarlos como ejemplos.
- Varias recomendaciones son locales (foto en el CV, bruto vs. neto, el sitio de empleo de Mercado Libre) — marcarlas explícitamente como "Argentina y Latinoamérica", no como estándar global.
- Contrastar cada consejo con 1–2 fuentes adicionales antes de publicarlo como artículo.
- Corregir el artículo actual que afirma "una columna siempre": ambas reclutoras coinciden en que sirven los dos formatos, y el modo ATS ya resuelve el problema real (que el texto sea seleccionable y lineal).

---

## 4. Cambios en la app de CV (editor)

- **Chequeo de reclutador:** pasar de 4 reglas a ~20 (las de la tabla anterior que dicen "se detecta"). Cada aviso tiene un botón **"Arreglar"** (por ejemplo, ocultar el campo con el mecanismo `hiddenFields` que ya existe) y un enlace directo al artículo del blog correspondiente.
  - Archivo a tocar: `src/modules/cv-builder/components/AtsCheckModal.tsx` — sumar detección de palabras clave ausentes contra el texto de la vacante y detección de datos personales sensibles innecesarios.
- **Datos sensibles:** avisar en tiempo real al escribir DNI, CUIT, fecha de nacimiento, estado civil o nacionalidad; ocultarlos del PDF por defecto (no opt-in); sacar el texto fijo `DNI: ---` / `Salta, Argentina` de las portadas.
  - Archivo: `src/modules/cv-builder/components/editor/PersonalInfoSection.tsx` — mensaje tipo "No incluyas tu DNI, edad o estado civil: evitan sesgos en la selección inicial y protegen tus datos personales", más aclaración de que la localidad/zona alcanza, sin dirección de calle.
- **Vacante objetivo** (`jobTarget`, compartido con la carta de presentación): el usuario pega el aviso completo y el editor extrae **localmente** (sin IA, gratis) cargo, herramientas, años, carrera y palabras clave, normalizando acentos. Muestra qué palabras tenés, cuáles faltan, y en qué sección conviene agregarlas, con chips de "agregar si es verdad" para no inventar nada.
- **Campos más estructurados:**
  - Herramientas con nivel de texto claro y una ayuda para elegir (el ejemplo de "Excel" funciona bien como modelo).
  - Selector de nivel Básico/Intermedio/Avanzado o A1–C2, eliminando por completo barras y gráficos decorativos.
  - Competencias de una sola palabra.
  - Formación con estado explícito (completo / en curso / título intermedio).
  - Fechas solo con año, como opción.
  - Cursos con año y una línea de "qué se aprendió".
- **Sugerencia de sustantivos de acción** al redactar tareas de experiencia, con botón de IA "Mejorar con sustantivos de acción y logros" que invoca `/api/ai-generate`.
- **Guía por sección:** un cuadro corto "Qué mira un reclutador acá", con un ejemplo antes/después, en lenguaje simple, sin jerga técnica.
- **Exportación:** nombre de archivo `Nombre-Apellido.pdf` (nunca "CV.pdf" ni "Currículum.pdf"); modo ATS con el contacto en texto plano ("Teléfono: …"), sin íconos ni barras; test que extrae el texto del PDF generado y verifica orden de secciones y títulos estándar.
- **Plantillas:** recomendar 1 o 2 columnas según cuánto contenido cargó la persona (no una regla fija), y no ofrecer barras de progreso en modo ATS bajo ninguna plantilla.
- **Versiones por vacante:** botón "Duplicar y adaptar" conectado con `jobTarget`.
- **Aviso de actualización** al abrir la app si pasaron más de 60–90 días desde la última edición (sin cuentas no hay notificaciones push, solo un aviso local basado en `localStorage`/IndexedDB).

---

## 5. Rediseño de la IA

**Estructura del backend:**
- El servidor deja de aceptar prompts libres (cierra H7 de la auditoría anterior). Cada acción de IA es una tarea con su prompt en un catálogo propio, con las reglas del catálogo de reclutador inyectadas como contexto de sistema, salida en JSON validado contra un schema, y un reintento sin costo si el JSON viene mal formado.
- Una sola función `buildCandidateContext(cvData)` reutilizada para carta, análisis ATS y redacción de viñetas — evita que cada flujo arme su propio contexto distinto y se desincronicen.
- **Capa de tachado de datos sensibles:** antes de mandar cualquier texto a Gemini o Groq, tachar DNI, teléfono, email y dirección. El texto sale del navegador ya limpio.
- **Regla fija en todos los prompts:** no inventar experiencia ni cifras; si falta un dato para completar algo, preguntar en vez de inventar.

**Flujos guiados:**

| Flujo | Qué hace |
|---|---|
| Mejorar una viñeta | Convierte una tarea vaga en una específica con sustantivo de acción, y **pregunta** los números reales (clientes, ventas, plazos) en vez de inventarlos |
| Resumen de 4–5 renglones | Se arma desde el CV completo y el `jobTarget` |
| Adaptar a esta vacante | Muestra los cambios como sugerencias que se aceptan de a una, con diferencia visible (diff). Importante: una de las reclutoras contó en vivo que hay candidatos que mandan lo que sale de la IA sin leerlo — el flujo tiene que forzar la revisión, no solo permitirla |
| Primer empleo | Entrevista guiada que convierte prácticas, voluntariado o negocio familiar en entradas profesionales, con nombre y fechas reales |
| Clasificar un dato | "¿Esto es competencia, herramienta o tarea?" — fue una de las preguntas más repetidas en los streams |
| Explicar el aviso | Traduce cada hallazgo del chequeo de reclutador en una acción concreta a hacer |

---

## 6. Carta de presentación

- Arreglar H4: que la carta lea `experience`, `education`, `skills` e idiomas reales del CV cargado, y unificar las dos formas distintas en que hoy existe `roles` (texto vs. objeto).
- **Estructura fija de 3 párrafos** (fórmula de las reclutoras): Gancho/entusiasmo por el puesto → Evidencia de 1-2 logros cuantificados conectados con los requisitos de la vacante → Cierre profesional con llamada a la acción para entrevista.
- Usa `jobTarget` (la vacante pegada) para extraer palabras clave e inyectarlas en el prompt, y cita solo hechos que existen efectivamente en el CV.
- Permitir pegar la descripción completa del puesto (de LinkedIn, SITS, etc.) directamente en el panel de la carta, no solo desde `jobTarget`.
- Detector de frases de relleno + aviso obligatorio "Leé y personalizá antes de enviar" antes de habilitar la descarga.
- Salida extra: un mensaje corto para email o LinkedIn (a las reclutoras les llegan cartas que "parecen todas iguales" — este mensaje corto ayuda a diferenciar el primer contacto).
- La pretensión salarial **no va en la carta**; se resuelve en un artículo del blog aparte (siempre en bruto, con un rango investigado, aclarando que es flexible).
- Archivo: `src/modules/cover-letter/components/CoverLetterEditorPanel.tsx`.

---

## 7. Portabilidad del JSON y almacenamiento local

(Este bloque no estaba en el análisis original verificado contra el código, pero es un problema real de UX sin cuentas: hoy, si alguien limpia el navegador o cambia de PC, pierde el CV.)

- `src/shared/core/utils/jsonImporterExporter.ts`: modificar `exportCVToJson()` para que invoque `reconstructCvDataFromParts()`, de modo que el `.json` exportado contenga las imágenes (foto, firma, certificados) ya rehidratadas en base64 dentro del propio archivo — 100% portable, se puede llevar en un pendrive o mandar por correo y abrir en otra computadora sin perder nada.
- `importCVFromJsonFile()` debe decodificar esos binarios embebidos y re-indexarlos en el IndexedDB local de la máquina nueva al importar.
- Cuidado de tamaño: si el JSON con imágenes crece demasiado, considerar comprimir la foto antes de embeberla (esto es una decisión técnica a resolver en la implementación, no un requisito duro del plan).

---

## 8. Blog: motor de contenido y artículos

**Motor:**
- Cada artículo pasa de `string[]` suelto a secciones estructuradas: subtítulos, listas, ejemplos antes/después, un botón "Hacelo en LEECV" que abre el editor directo en la sección correspondiente, y 3 preguntas frecuentes al final.
- Los datos de cada artículo pasan a archivos independientes, no viven dentro de `BlogModule.tsx`.
- Título, descripción y datos estructurados tipo `Article` (schema.org) por artículo — hoy no existen.
- Prerender de esas páginas (`scripts/prerenderMeta.mjs`) para SEO estático.
- Los artículos de libros y tarjetas pasan a una categoría separada de "Impresión", para no mezclarlos con el contenido de empleo.

**Artículos (lista unificada, primera ola marcada):**

| # | Artículo | Lleva a (deep link) | Ola |
|---|---|---|---|
| 1 | Guía completa: cómo hacer un CV que consiga entrevistas (artículo central) | Editor | 1 |
| 2 | Qué es un ATS y cómo lo leen los reclutadores (unifica los dos artículos actuales duplicados; mitos y realidad, Harvard vs. 2 columnas) | Chequeo de reclutador | 1 |
| 3 | Los datos que jamás debés poner en tu CV (DNI, edad, estado civil, dirección exacta, foto informal) | Ocultar campos sensibles | 1 |
| 4 | Cómo usar la IA de LEECV sin perder tu voz (tutorial con capturas, qué sí y qué no) | Flujos de IA | 1 |
| 5 | Cómo adaptar tu CV a cada vacante | Vacante objetivo | 1 |
| 6 | CV sin experiencia: qué poner y cómo (prácticas, voluntariado, negocio familiar) | Flujo de primer empleo | 1 |
| 7 | Sustantivos de acción: la clave para redactar tus tareas y multiplicar entrevistas (antes/después) | Mejorar viñeta | 2 |
| 8 | Formación y cursos: qué poner, en qué orden y qué sacar | Formación | 2 |
| 9 | Herramientas, idiomas y competencias: el mito de las barras de progreso | Herramientas | 2 |
| 10 | Foto en el CV: cuándo sí y cómo elegirla | Foto | 2 |
| 11 | Diseño: 1 o 2 columnas, colores y lo que los ATS no leen | Plantillas | 2 |
| 12 | Tu CV y LinkedIn | Importar ZIP de LinkedIn | 2 |
| 13 | CV para mayores de 40 y 50 | Datos sensibles | 2 |
| 14 | Carta de presentación con IA: ejemplos y errores (actualiza el artículo actual) | Carta | 2 |
| 15 | Huecos, trabajos cortos y freelance: cómo contarlos | Fechas | 2 |
| 16 | Pretensión salarial: cómo responder | Artículo solo, sin deep link | 2 |

---

## 9. Landing y promesas

- Cambiar "Lectura ATS garantizada" (promesa no verificable) por algo concreto y comprobable: "una columna, texto seleccionable y títulos estándar".
- Mostrar el chequeo de reclutador ampliado como argumento principal de la landing.
- Aclarar en la política de privacidad, en lenguaje simple, qué texto se envía efectivamente a la IA (y que los datos sensibles se tachan antes de salir del navegador).

---

## 10. Orden de ejecución

- **Fase 0 — Bloqueadores (nada más avanza sin esto):**
  1. Decidir y validar la identidad de la IA (sección 2 — spike de Supabase anon auth, con umbral de decisión a las 4 horas).
  2. Cerrar las políticas RLS de `pdf_export_tokens` (el más urgente de seguridad).
  3. Hacer que `useEntitlements` diga la verdad sobre créditos disponibles.
  4. Pasar `ImportCvAiModal` a `apiClient` (autenticado).
  5. Corregir H5 (`importedData.experience || prev.experience`).
  6. Confirmar que Google Drive funciona sin sesión de usuario.

- **Fase 1 — Reglas:** catálogo de reglas de reclutador + su test; chequeo ampliado a ~20 reglas; datos sensibles ocultos por defecto; portadas sin texto fijo; nombre de archivo `Nombre-Apellido.pdf`.

- **Fase 2 — Vacante objetivo:** extracción y coincidencia local de palabras clave; campos estructurados (herramientas con nivel, competencias de una palabra, formación con estado, fechas solo-año, cursos).

- **Fase 3 — IA:** catálogo de tareas en el servidor, `buildCandidateContext`, capa de tachado de datos sensibles, los seis flujos guiados, y la carta de presentación con la estructura de 3 párrafos.

- **Fase 4 — Blog:** motor de secciones, metadatos `Article`, prerender, artículos de la Ola 1 (1–6); después la Ola 2 (7–16).

- **Fase 5 — Portabilidad, LinkedIn y hardening de IA** (reordenada tras verificar el código), en este orden:
  1. **Verificar el round-trip del JSON antes de escribir código:** `exportCVToJson()` exporta `cvData` tal cual y `documentStorageService.loadDocumentById()` ya hidrata las imágenes con `reconstructCvDataFromParts()`, así que el `.json` probablemente ya es portable. Probar a mano: CV con foto, firma y certificado → exportar `.json` → confirmar que empieza con `data:image/` (no `ref://` ni `asset://`) → importar en ventana de incógnito. Ya existen además `exportAllCVsToZip` / `importCVFromZipFile` (la sección 7 no los mencionaba). Si funciona, tachar la sección 7.
  2. **Generalizar el empaquetador** (`driveDocumentPackager.ts`, `dedupAssetsForLocalStorage`, `reconstructCvDataFromParts`) a `cardOverrides.logoDataUrl` y a las imágenes de libros (confirmar nombres de campo en `PortadaSection.tsx` antes de tocar). No rompe el export; es deduplicación.
  3. **Hardening de IA** (surge de contrastar con el documento de prompts): delimitar texto de terceros en los prompts y pedir tratarlo como datos, nunca como instrucciones; pasar `responseSchema` en `ai-generate` y sumar un reintento si el JSON falla; tachar emails/teléfonos dentro de textos libres en `buildCandidateContext`; inyectar el catálogo de reglas en los prompts en lugar de duplicarlo a mano.
  4. **LinkedIn por PDF, no por ZIP:** reemplaza el "Importar ZIP de LinkedIn" del artículo 12. LinkedIn permite "Más → Guardar en PDF"; se reutiliza `ImportCvAiModal` + `cv-import-api` (ya sin login tras el arreglo) con un prompt adaptado a los títulos de LinkedIn (Experience, Education, Licenses & Certifications, Skills).
  5. **Higiene de privacidad:** párrafo en `PrivacyPolicyPage.tsx` (hoy 0 menciones de IA, Gemini o Groq) que cuente qué texto sale a la IA y que los datos sensibles se tachan antes.
  6. **Créditos honestos en la interfaz** (sección 11, punto 1).
  7. ~~Bono de IA por export pagado~~ — **descartado**: la IA se limita por IP y no hay identidad a la que sumar créditos.

- **Fase 6 — Cierre:** `npm run check-all` completo (TypeScript, Vitest, Oxlint, auditoría de tokens de diseño, lenguaje simple sin jergas), `npm run build`, verificación de prerenderizado de todas las rutas del blog.

Cada fase termina con tests. Las reglas se prueban con CVs de ejemplo que reproducen los errores vistos en las transcripciones: DNI cargado, orden invertido, íconos, "abandonado" sin corregir, barras de progreso en herramientas.

**Métricas de éxito** (para saber si funciona en producción): cuántos avisos del chequeo la gente efectivamente arregla, tiempo hasta el primer PDF exportado, porcentaje de sugerencias de IA aceptadas vs. descartadas, costo de IA por usuario, y cuántos visitantes del blog terminan entrando al editor.

---

## 11. Estado verificado contra el código (2026-10-01) y huecos reales

Se revisó el repo, corrieron `vitest` (29 archivos, 223 tests) y `tsc --noEmit`, todo en verde. **No** se corrieron `check-all` completo, `build` ni prerender.

### Corregido en esta pasada
- `api/cv-import-api.ts` exigía `requireAuth` pero ya no existe ningún login de usuario: **importar CV con IA devolvía 401 a todos**. Se quitó el gate; queda el límite por IP y la telemetría anónima.
- `api/ai-generate.ts`: `Number(temperature) ?? 0.7` daba `NaN` cuando el cliente no mandaba temperatura (la mayoría de los flujos), porque `??` no atrapa `NaN`. Ahora el servidor valida y acota la temperatura (por defecto 0.3, máximo 0.5).

### Contrastado con el documento "Arquitectura de Prompts y Optimización ATS"
| Punto del documento | Estado en la app |
|---|---|
| System prompt separado del user prompt, por tarea | ✅ `api/_lib/aiTasks/catalog.ts` |
| Contexto del candidato con datos sensibles tachados | ✅ parcial: `candidateContext.ts` tacha DNI, CUIT, teléfono, email, dirección, ubicación, nacimiento, estado civil, nacionalidad y quita imágenes. **No** tacha teléfonos/emails escritos dentro de textos libres (resumen, descripciones) |
| Sustantivos de acción | ✅ solo en `improve_bullet`; no hay validación posterior de que la salida cumpla |
| No inventar datos / preguntar métricas | ✅ en `improve_bullet`, `generate_summary`, `cover_letter` |
| Carta en estructura fija | ✅ 3 párrafos (el documento propone 4; se mantiene 3, que es lo que dicen las reclutoras) |
| Salida JSON estructurada | ⚠️ solo pedida en el texto del prompt. `ai-generate` **no** pasa `responseSchema` (sí lo hace `cv-import-api`), el cliente limpia ```` ```json ```` a mano y **no hay reintento** si el JSON viene mal |
| Temperatura baja (0.1–0.3) | ✅ ahora, tras el arreglo. Top-P no se configura (prioridad baja) |
| Defensa contra prompt injection | ❌ no existe. El texto de la vacante, el CV pegado y las actividades informales entran sin delimitar |
| Escalas de nivel estandarizadas (Básico/Intermedio/Avanzado, A1–C2) en la salida de IA | ❌ no están en ningún prompt; el catálogo solo detecta barras visuales |
| Inyección literal de palabras clave de la vacante | ⚠️ solo en `generate_summary` y `cover_letter`; `improve_bullet` no recibe la vacante y no hay tarea "adaptar a esta vacante" |
| Catálogo de reglas inyectado en los prompts (sección 5 de este plan) | ❌ `rulesCatalog` solo lo usa `atsPreflightCheck`; los prompts tienen sus reglas escritas a mano, duplicadas |

**Del documento NO conviene copiar:** la promesa de "100% de tasa de éxito en el parsing" (contradice la sección 9: nada de promesas no verificables); la prohibición absoluta de varias columnas (las reclutoras dicen que sirven 1 o 2, y el modo ATS ya resuelve el problema real); y varias cifras sueltas (98% de Fortune 500, 112% de mejora semántica, 6–7 segundos) que no tienen fuente confiable en su lista de citas. Esa lista además incluye referencias sin relación (ANMAT, un hospital, un comité de ética).

### Otros huecos que siguen abiertos
1. **Créditos de IA que no existen:** `useEntitlements` devuelve `hasAiCredits: true` fijo, `ai-generate` responde `remainingCredits: 3` fijo y las pantallas muestran "Créditos disponibles: 3". La IA real se limita por IP. Decidir el mensaje ("X usos por día") y reflejar el 429.
2. **`consume-pdf-credit.ts` y `paypal-order.ts` siguen con `requireAuth`**, y no hay llamadores de `consume-pdf-credit` en `src/`. Confirmar si son código muerto del modelo con cuentas y borrarlos, o migrarlos.
3. **RLS de `pdf_export_tokens`:** el INSERT quedó restringido a `paid=false, consumed=false` y se cerró el SELECT (migración `20261006`). Pendiente de probar contra la base real; `consume_export_token` sigue ejecutable por `anon` (es lo esperado, pero conviene limitar intentos por token).
4. **Reglas del catálogo:** hay unas 17; faltan extensión en páginas, requisito duro de la vacante y aviso de CV desactualizado (60–90 días).
5. **Blog Ola 2:** faltan "Tu CV y LinkedIn", "Foto en el CV", "CV para mayores de 40 y 50", "Pretensión salarial" y el tutorial de la IA de LEECV.
6. **Rate limit fail-open:** si falla la RPC `check_rate_limit`, `requireRateLimit` deja pasar todo. Con IA sin login, eso deja el gasto sin tope si Supabase tiene un problema. Considerar fail-closed para los endpoints de IA.

### Lo que sigue sin verificarse
- Nada se probó en un navegador real; el análisis es por lectura de código y tests.
- No se revisaron las políticas reales de la base, Drive ni los webhooks de pago.

---

## 11b. (histórico) Lo que todavía no estaba verificado

- Nada de esto se probó en un navegador real todavía — todo el análisis de código es por lectura estática.
- No se revisaron las políticas reales de la base de datos en producción, ni Drive, ni los webhooks de pago.
- La compatibilidad del anon auth de Supabase depende de cómo esté configurado tu proyecto específico — de ahí el spike con umbral de decisión en la sección 2.

---

## 12. Próximo paso inmediato

Fase 5, punto 1: probar a mano el round-trip del JSON con imágenes. Después, el hardening de IA (punto 3) y la política de privacidad (punto 5), que son lo más barato y de más impacto.
