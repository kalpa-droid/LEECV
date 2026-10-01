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

### Fase F — Billetera de IA sin login + infraestructura

**Decisión:** cobrar la IA **sin cuentas y sin Supabase Auth**, con una *billetera con token* (mismo patrón que el `exportToken`, que ya cobra sin login). El servidor usa `supabaseAdmin` solo como base de datos; `auth.uid()` no interviene en nada.

#### Estado verificado en el código (2026-10-01)
- La firma de los webhooks **ya se verifica** en los tres proveedores (`webhookHandler.ts` → `verifyWebhook`; Lemon Squeezy con HMAC SHA-256 y `timingSafeEqual`). **No agregar** límite por IP al webhook: da falsos positivos con los pools de IPs de los proveedores.
- La idempotencia existe (`processed_payments`, clave única proveedor + id externo), pero **hay un bug**: `applyPayment` registra el pago *antes* de activar el servicio. Si el paso 2 falla, el proveedor reintenta, el reintento choca con la clave única y responde `already_processed`: **el cliente pagó y nunca recibe el servicio**.
- `applyPayment` paso 2.5 ("bono de IA") busca un `profiles` por correo para sumar créditos. Sin cuentas ese perfil no existe, así que **ese bono hoy nunca se otorga**.
- `user_credits`, `consume_ai_credit` y `grant_ai_credits` (migración `20260915`) dependen de `auth.users`: quedan sin uso.
- `applyPayment` siempre intenta marcar un `pdf_export_tokens` con el `exportToken`; una compra de solo IA no trae ese token.
- `credits_pack_5` y `credits_pack_10` en `pricingCatalog.ts` son créditos de **PDF**, no de IA. Para no mezclar, los de IA llevan ids nuevos (`ai_pack_*`).
- No hay servicio de envío de correo en el proyecto.
- `consume-pdf-credit.ts`: ningún llamador en `src/`, `api/`, `tests/`, `scripts/` ni `vercel.json`. Se puede borrar.

#### F1. Datos (migración nueva)
- `ai_wallets(token_hash, credits, email, restore_hash, created_at, updated_at)`. Se guarda el **hash SHA-256** del token, no el token: si se filtra la base, no se puede gastar nada.
- RLS activada **sin políticas** para `anon`/`authenticated`: solo accede el servidor.
- RPC atómica `consume_ai_wallet_credit(p_token_hash, p_amount)`: `UPDATE … SET credits = credits - p_amount WHERE token_hash = $1 AND credits >= p_amount RETURNING credits`; sin filas → 402.
- RPC `apply_ai_wallet_payment(provider, external_id, token_hash, credits, email)` que **en una sola transacción** registra `processed_payments` y suma al saldo (corrige el bug de pago perdido).
- Cupo gratis: contador por día y por dispositivo (con un tope más alto por IP). CGNAT en redes móviles hace que muchos usuarios compartan IP, así que **la IP sola no alcanza**.

#### F2. Cliente
- `aiWalletStore`: el token se genera con `crypto.randomUUID()` la primera vez que hace falta y se guarda en `localStorage`; también un ID de dispositivo para el cupo gratis.
- Se envía en el encabezado **`x-ai-token`** (y `x-device-id`). **No** usar `Authorization`: `apiClient.ts` ya lo completa con la sesión de Supabase cuando existe y se pisarían.
- **No** incluir el token en el JSON ni en el ZIP exportados: son archivos que la gente manda por correo y es una credencial. (Corrección de lo propuesto antes.)
- `useEntitlements` deja de devolver `hasAiCredits: true` fijo: muestra los créditos reales y "X usos gratis hoy".

#### F3. Servidor (`ai-generate.ts` y `cv-import-api.ts`)
- Un helper compartido `requireAiAllowance(req, res)`, en este orden: (1) si hay token con saldo, descuenta; (2) si no, usa el cupo gratis; (3) si no queda nada, responde `402` con `{ code: 'ai_quota_exhausted' }`.
- Respuesta con `remainingCredits` real y `freeRemaining` (reemplaza el `3` fijo).
- `requireRateLimit` pasa a **fail-closed** para los endpoints de IA (hoy deja pasar si falla la RPC).
- **Importar CV con IA: 1 crédito por documento, no por página.** Una llamada `start-import` consume el crédito y devuelve un token firmado de corta vida (HMAC, unos 30 min, máximo de páginas); `extract-page` lo exige. Así no se cobra 4 veces un CV de 4 páginas ni se evade mandando siempre "página 1".

#### F4. Pagos
- Variable `custom_data.wallet_token` (o `external_reference` / `custom_id`, igual que ya viaja `exportToken` en Mercado Pago y PayPal), generada por el cliente antes del pago.
- `applyPayment` se ramifica por plan:
  - `single_pdf`: activa el `exportToken` **y** suma `AI_CREDITS_PER_EXPORT` a la billetera (reemplaza el paso 2.5 muerto);
  - `ai_pack_*`: solo billetera.
- Todo en una transacción (F1). Solo el webhook con firma válida crea o recarga billeteras; el cliente nunca.
- **Sin micropagos:** nada de packs de US$ 1. Comisión fija por transacción (según recuerdo Lemon Squeezy cobra 5 % + US$ 0,50 y Stripe suele rondar 2,9 % + US$ 0,30; verificar en tus cuentas): en US$ 1 se va entre un tercio y la mitad. Pack mínimo de IA a partir de US$ 5, y el grueso de la IA va **incluido en el export pagado** (venta cruzada).

#### F5. Recuperación del saldo (sin contraseña)
1. **Pantalla de agradecimiento:** muestra un código de recuperación para copiar y guarda el token en `localStorage`.
2. **Enlace de restauración por correo:** el webhook guarda el correo del pago y envía un mail **propio** con `…/?restore=<secreto>` (los recibos de los proveedores no pueden llevar nuestro token). Requiere elegir un servicio de envío (Resend, Brevo u otro). Hasta que exista, queda solo el código del punto 1.
3. El secreto de restauración es **distinto** del token de gasto, se guarda hasheado y se canjea en `POST /api/ai-wallet?action=restore` con límite de intentos. Quien tenga el correo puede restaurar: es tan sensible como el saldo.

#### F6. Interfaz
- Muro de pago al recibir `402`, con dos salidas: comprar el export (incluye créditos de IA) o un pack de IA. Mostrar siempre "X usos gratis hoy · Y créditos".
- Pantalla "Mi saldo" con el código de recuperación y el botón "Restaurar".

#### F7. Limpieza
1. Borrar `api/consume-pdf-credit.ts`.
2. Quitar el `requireAuth` huérfano de `paypal-order.ts` (y revisar `create-paypal-order`).
3. Marcar como sin uso `user_credits` y las funciones de `20260915` (no borrar migraciones ya aplicadas); quitar `serverDal.aiCredits` cuando nada lo llame.
4. Probar contra la base real las políticas de `pdf_export_tokens` (migración `20261006`) y limitar los intentos sobre `consume_export_token`.
5. Párrafo en `PrivacyPolicyPage.tsx`: qué texto sale a la IA, qué se tacha, y que el correo del pago se guarda solo para restaurar créditos.

#### F8. Pruebas
- Descuento atómico bajo concurrencia (dos llamadas simultáneas con saldo 1: una pasa, una recibe 402).
- Webhook duplicado no suma dos veces; un fallo a mitad de camino **sí** se puede reintentar.
- El token no se guarda en claro; el restore tiene límite de intentos.
- Cupo gratis por dispositivo y tope por IP; `402` con el código esperado; `remainingCredits` real.

#### Pendiente de decidir
- Cuántos créditos de IA incluir por export pagado (`AI_CREDITS_PER_EXPORT`). Se fija con la telemetría de costo por llamada del panel de admin: costo medio × N debe ser una fracción chica del precio del export.
- Servicio de correo para el enlace de restauración.
- Tamaño y precio del pack de IA (mínimo US$ 5).

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
