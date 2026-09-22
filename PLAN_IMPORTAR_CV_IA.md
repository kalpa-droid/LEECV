# Plan — Importar CV desde foto o PDF con IA (extracción híbrida, escalable)

Verificado contra el código real de `origin/main`, no de memoria. Todo lo que este plan asume
sobre el repo (proveedores de IA, créditos, rate limiting, pdf.js) está confirmado leyendo:
`api/_lib/aiProviders/{gemini,groq,keyRotation,registry}.ts`, `api/_lib/rateLimiter.ts`,
`api/ai-generate.ts`, `src/shared/core/ai/aiClient.ts`, `supabase/migrations/2026091[5]*`,
`package.json` (pdfjs-dist 4.10.38) y los usos de pdf.js en `VectorDocViewer.tsx` /
`BookSourceTypeStep.tsx`.

---

## 0. Lo que ya existe y lo que hace falta

**Ya existe (se reutiliza, no se reinventa):**
- IA conectada: Gemini 2.5 Flash + Groq como respaldo, con rotación de llaves y créditos
  (`api/ai-generate.ts`). Pero **solo manda texto** (`systemPrompt`/`userPrompt`); no manda imágenes.
- `pdfjs-dist` ya es dependencia y ya se usa en el navegador para leer PDFs (contar páginas,
  leer texto con `getTextContent()`, dibujar en canvas). Rasterizar una página a imagen es
  agregar una llamada más de esa misma librería (`page.render({...})` a un `<canvas>`), no una
  librería nueva.
- Rate limiting distribuido y seguro entre todas las funciones serverless de Vercel: la RPC
  `check_rate_limit` en Postgres (`api/_lib/rateLimiter.ts`).
- Cobro por cantidad de páginas ya tiene precedente: `consume_pdf_credits_for_pages` (1 crédito
  cada 10 páginas), con verificación de dueño y atómico.

**Hallazgos que este plan corrige (bugs reales, no hipotéticos):**
- `keyRotation.ts` guarda el índice de la próxima llave en un `Map` **en memoria del proceso**
  (`providerKeyIndexMap`). Vercel puede atender dos pedidos al mismo tiempo en dos instancias
  distintas de la función — cada una arranca su propio `Map` vacío. Con tráfico concurrente,
  varias instancias eligen la llave 0 al mismo tiempo en vez de repartirse: es una rotación que
  parece distribuida y no lo es. Con una función que va a hacer *muchas* llamadas por persona
  (una por página) esto se nota mucho más que hoy. Arreglo: sección 4.4.
- No hay ninguna función de Vercel con `maxDuration` configurado en `vercel.json` → corre con el
  límite por defecto del plan de Vercel (puede ser tan bajo como 10 segundos). Un PDF de 8
  páginas, una llamada a Gemini por página, **no entra en una sola invocación HTTP**. Por eso el
  diseño es "un paso, una página, una respuesta" (sección 2), no "subís el PDF y esperás".

---

## 1. Lo que el usuario pidió, en criollo, y cómo se resuelve cada punto

| Pedido | Dónde se resuelve |
|---|---|
| Que no haya problemas de tráfico con mucha gente al mismo tiempo | Sección 4: cómputo pesado en el navegador de cada persona, no en un servidor compartido; cola distribuida en la base, no en memoria |
| Guiar a la IA para que trate el archivo "de la mejor forma" | Sección 3.2: instrucciones exactas que se le mandan a Gemini, con salida en formato fijo |
| PDF legible para la persona pero con texto interno incoherente → convertir a imagen primero | Sección 3.1: heurística de "¿este texto sirve?" antes de gastar en IA |
| PDF de varias páginas, a veces la IA no extrae todo | Sección 3.3 y 3.4: una página por llamada, nunca todo junto, y un paso final que junta y corrige los bordes entre páginas |
| Ir paso por paso, página por página, hasta el JSON final | Sección 2: máquina de estados persistida, no una función gigante |

---

## 2. Arquitectura general: una máquina de estados, no una función gigante

```
Persona sube archivo (foto o PDF)
        │
        ▼
[Frontend] Prepara el trabajo (sección 3.1):
   - Si es imagen (foto) → 1 sola "página" a procesar.
   - Si es PDF → pdf.js cuenta páginas y, para CADA una, decide:
        · "el texto de adentro sirve" → se manda ese texto (barato)
        · "el texto de adentro no sirve" (ver heurística) → se dibuja
          esa página a imagen (canvas, ya en el navegador) y se manda
          la imagen (más caro, solo las páginas que lo necesitan)
        │
        ▼
POST /api/cv-import/start
   Crea una fila en cv_import_jobs: user_id, total_pages, status='processing', created_at.
   Devuelve { jobId }.
        │
        ▼
Por cada página (en orden, una petición HTTP por página — así ninguna
petición se acerca al límite de tiempo de una función serverless):
        │
        ▼
POST /api/cv-import/process-page  { jobId, pageIndex, kind: 'text'|'image', content }
   - Verifica dueño del job y que pageIndex es el que sigue (nunca fuera de orden).
   - Llama a Gemini (sección 3.2) SOLO con el contenido de esa página +
     un resumen corto de lo ya extraído (para que sepa que "Experiencia en
     Globant" de la página 2 es continuación de la página 1, no algo nuevo).
   - Guarda el JSON parcial de esa página en cv_import_job_pages.
   - Devuelve { pageIndex, done: boolean, progress: "3/8" }.
        │
        ▼
Cuando progress llega a total_pages:
        │
        ▼
POST /api/cv-import/finalize  { jobId }
   - Junta los JSON de cada página (sección 3.4: fusión + segunda pasada
     de la IA para resolver duplicados/bordes entre páginas).
   - Cobra los créditos UNA sola vez, recién acá, y solo si salió bien.
   - Devuelve el CV final en el formato que ya usa el editor (CVData).
        │
        ▼
[Frontend] Pantalla de revisión (sección 5): la persona confirma o corrige
antes de que esto pise su CV actual.
```

**Por qué "una petición por página" y no un WebSocket o un worker en segundo plano:** este
proyecto no tiene infraestructura de colas (no hay Redis, no hay un worker separado, todo es
funciones de Vercel sin estado). Pedirle al navegador que llame una vez por página es la forma
más simple de lograr "avanzar paso por paso" sin agregar un servidor nuevo. También le da a la
persona una barra de progreso real ("Página 3 de 8") gratis, porque cada respuesta HTTP *es* un
paso completado.

---

## 3. El motor de extracción en detalle

### 3.1 Heurística "¿este texto sirve o hay que convertir a imagen?"

Esto corre **en el navegador**, con `pdfjs-dist`, antes de gastar ni un crédito. Es una función
pura, testeable, sin IA:

```ts
// src/shared/core/cv-import/textCoherenceHeuristic.ts
export function isTextLayerCoherent(rawText: string): boolean {
  const clean = rawText.replace(/\s+/g, ' ').trim();
  if (clean.length < 20) return false; // casi sin texto → mejor imagen

  const letters = clean.match(/\p{L}/gu) || [];
  const alphaRatio = letters.length / clean.length;
  if (alphaRatio < 0.55) return false; // demasiados símbolos raros

  // Fuentes con encoding roto typicamente producen texto sin espacios entre
  // palabras reales, o palabras rarísimamente largas (cid a cid mal mapeado).
  const words = clean.split(' ').filter(Boolean);
  const avgWordLen = words.reduce((a, w) => a + w.length, 0) / (words.length || 1);
  if (avgWordLen > 14) return false;

  // Al menos algunas palabras comunes en CVs, en varios idiomas, deben aparecer.
  const commonWords = /\b(de|la|el|en|con|para|experiencia|educacion|educación|and|the|with|for|experience|education|email|tel[ée]fono|phone)\b/i;
  if (!commonWords.test(clean)) return false;

  return true;
}
```

Con esto se decide, página por página:
- `getTextContent()` de pdf.js trae texto **y** parece coherente → se manda ese texto (extraer
  el texto de un PDF con capa de texto es gratis, no gasta tokens de imagen).
- No hay texto, o `isTextLayerCoherent` da `false` (el caso que describiste: el PDF se ve bien
  pero adentro es basura, típico de un PDF exportado con una fuente sin el mapa de caracteres
  correcto) → se renderiza esa página a un `<canvas>` con `page.render({...})`
  (`pdfjsWorkerSetup.ts` ya expone esto) y se manda esa imagen en su lugar.
- El archivo es una foto (jpg/png) → siempre va como imagen, directo.

Nunca se decide "todo el PDF es texto" o "todo el PDF es imagen" de una: la decisión es **por
página**, porque un PDF puede tener una portada escaneada y el resto con texto real.

### 3.2 Instrucciones para la IA (una página por vez)

Hoy `gemini.ts` solo acepta `systemPrompt` + `userPrompt` (texto). Para mandar una imagen hace
falta extender el tipo y el `fetch`:

```ts
// api/_lib/aiProviders/types.ts — se agrega, no se rompe nada existente
export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  images?: Array<{ mimeType: 'image/png' | 'image/jpeg'; base64: string }>; // nuevo, opcional
  /** Pide a Gemini que devuelva JSON validado contra este esquema (no texto libre a interpretar). */
  responseSchema?: object;
}
```

```ts
// api/_lib/aiProviders/gemini.ts — dentro de complete(), agregar las partes de imagen
const parts: any[] = [{ text: req.userPrompt }];
for (const img of req.images || []) {
  parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
}
// generationConfig agrega, cuando responseSchema está presente:
//   responseMimeType: 'application/json', responseSchema: req.responseSchema
```

`Groq` (Llama 3.3 70B) **no** tiene visión. El endpoint nuevo (`/api/cv-import/process-page`)
llama a Gemini directo, sin pasar por el orden de respaldo de `/api/ai-generate` — si Gemini
falla, no hay a quién más pedirle una imagen, así que el error se muestra claro ("no se pudo
leer esta página, intentá sacarle otra foto") en vez de reintentar contra un proveedor que igual
no puede.

El *system prompt* de cada página (fijo, no lo escribe el usuario):

> Sos un extractor de datos de currículums. Te doy una página (texto o imagen) y el resumen de
> lo que ya se extrajo de las páginas anteriores de este mismo CV. Devolvé SOLO un JSON con el
> fragmento de información nueva de ESTA página, seguí exactamente este esquema: `{
> personalInfo?: {...}, experience?: [...], education?: [...], skills?: [...], languages?: [...]
> }`. Si un dato de esta página es continuación de algo que ya venía (ej. la descripción de un
> puesto que empieza en la página anterior), marcalo con `continuesFromPrevious: true` en vez de
> repetirlo como una entrada nueva. Si la página no tiene datos de CV (ej. es una carátula
> decorativa), devolvé `{}`. Nunca inventes datos que no estén en la página.

Se usa `responseSchema` (Structured Output de Gemini) en vez de pedirle "por favor respondé solo
JSON" en el texto: esto hace que la API rechace o corrija la forma de la respuesta en el momento,
en vez de que el backend reciba un texto casi-JSON y se rompa al parsearlo.

### 3.3 Por qué una llamada por página soluciona "a veces la IA no extrae todo"

El problema típico no es que Gemini "se canse": es que un PDF de 6-8 páginas mandado entero hace
que el modelo le preste menos atención proporcional a cada página (más contenido en la misma
ventana de contexto, y los modelos tienden a resumir/saltear en documentos largos, un patrón
conocido de "lost in the middle"). Mandar una página por vez, con un pedido acotado ("qué hay de
nuevo en ESTA página"), hace que cada llamada sea simple y chica: es la misma razón por la que en
la sesión anterior conviene una página de agenda por vez y no las 65 juntas.

### 3.4 El paso final: fusionar sin duplicar ni perder los bordes

Cuando terminan todas las páginas, `finalize` tiene un array de fragmentos JSON (uno por
página). Fusionar esto **no** es un simple `.concat()`:
- Una experiencia laboral puede empezar en la página 1 y su descripción seguir en la página 2
  (por eso el `continuesFromPrevious` del punto 3.2: al fusionar, ese fragmento se concatena al
  último ítem de `experience` en vez de crear uno nuevo).
- Datos personales (nombre, teléfono) casi siempre están en la página 1 pero a veces el email
  reaparece en el pie de la página 3: no hay que duplicarlo, hay que preferir el valor no vacío
  y descartar repetidos exactos.

La fusión se hace en dos pasos:
1. **Determinístico** (`src/shared/core/cv-import/mergePageFragments.ts`, función pura,
   testeable sin IA): concatena arrays, aplica `continuesFromPrevious`, saca duplicados exactos.
2. **Una sola llamada extra a la IA** (no una por página) con el JSON ya fusionado, pidiéndole
   solamente: "revisá si hay dos entradas de experiencia que en realidad son la misma partida en
   dos páginas, y si hay fechas o nombres claramente cortados a la mitad, corregilos". Esta
   pasada final es barata (un JSON, no imágenes) y es la que resuelve el caso "la IA no extrajo
   todo el contenido completo" a nivel del documento entero, no de una página aislada.

---

## 4. Que aguante mucha gente al mismo tiempo, sin pisarse

### 4.1 El trabajo pesado lo hace el navegador de cada persona, no un servidor compartido

Rasterizar páginas de PDF a imagen (`page.render()` de pdf.js) pasa **en la compu de cada
usuario**, no en una función de Vercel. Esto es clave para escalar: si mil personas importan un
CV al mismo tiempo, son mil navegadores haciendo ese trabajo en paralelo, cada uno con su propia
CPU — el servidor nunca ve ese costo. Lo único que llega al servidor es texto (barato) o, cuando
hace falta, una imagen ya lista por página (una llamada HTTP por página, no un archivo entero).

### 4.2 Estado del trabajo en la base de datos, no en memoria del servidor

Cada función de Vercel es efímera y puede correr en una instancia distinta en cada pedido. Por
eso el progreso de la importación (qué páginas ya se procesaron, qué llevan extraído) se guarda
en una tabla, no en una variable del proceso:

```sql
-- supabase/migrations/2026XXXX_cv_import_jobs.sql
CREATE TABLE public.cv_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_pages INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing', -- processing | done | failed | expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE TABLE public.cv_import_job_pages (
  job_id UUID NOT NULL REFERENCES public.cv_import_jobs(id) ON DELETE CASCADE,
  page_index INT NOT NULL,
  fragment_json JSONB NOT NULL,
  PRIMARY KEY (job_id, page_index)
);

ALTER TABLE public.cv_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_import_job_pages ENABLE ROW LEVEL SECURITY;
-- políticas: el dueño del job solo ve/toca lo suyo (mismo patrón que user_credits)
```

Así, sin importar qué instancia de Vercel atienda el pedido de la página 5, puede leer en qué
quedó el trabajo (páginas 1 a 4 ya en `cv_import_job_pages`) y seguir. Esto es lo que hace
posible que "varias personas desde distintas PC" trabajen a la vez sin chocar: cada una tiene su
propio `job_id`, y dentro de un mismo `job_id`, `process-page` valida con una transacción simple
que `page_index` es exactamente el que sigue (evita que dos pestañas del mismo usuario dupliquen
una página).

`expires_at` + un cron de limpieza (el proyecto ya tiene `cron-downgrade.ts` como ejemplo de cron
diario; se agrega uno análogo) borra los trabajos abandonados a los 30 minutos: nada de esto se
guarda para siempre, coherente con "100% privado" — ni el archivo ni las páginas quedan
almacenadas más de lo necesario para terminar la importación.

### 4.3 Límite de gente en paralelo: rate limiting en dos niveles, reusando lo que ya existe

- **Por persona:** `requireRateLimit(req, res, `cv_import:${userId}`, { maxRequests: 20,
  windowSeconds: 60 })` en `process-page` — usa la misma RPC atómica en Postgres que ya protege
  otros endpoints, así que ya es segura entre instancias sin escribir nada nuevo.
- **Global (protege la cuota de la cuenta de Gemini ante un pico):** una segunda llamada a
  `check_rate_limit` con una clave fija (`cv_import:global`) y un techo más alto (por ejemplo 300
  páginas/minuto en total). Si se supera, el frontend espera un segundo y reintenta esa página
  (no pierde el progreso: el `job_id` sigue vivo).

### 4.4 Arreglo concreto a `keyRotation.ts`: de "contador compartido en memoria" a "elección al azar"

El contador (`providerKeyIndexMap`) que hoy reparte las llaves entre instancias no funciona bien
porque cada instancia de Vercel tiene su propio `Map` vacío. La forma más simple de arreglarlo
**sin agregar estado compartido nuevo** es dejar de intentar coordinar turnos y elegir una llave
al azar en cada pedido: estadísticamente, con muchos pedidos concurrentes repartidos entre varias
instancias, el resultado es un reparto pareja de todos modos, y no hace falta que las instancias
se pongan de acuerdo entre sí.

```ts
// api/_lib/aiProviders/keyRotation.ts
export function getNextAvailableKey(providerId: string): string | null {
  const keys = getEnvKeysForProvider(providerId).filter(k => !isPaused(providerId, k));
  if (keys.length === 0) return null;
  return keys[Math.floor(Math.random() * keys.length)]; // reemplaza el round-robin por índice compartido
}
```

Esto no es exclusivo de la importación de CV, mejora también las llamadas de texto existentes
(cartas, ATS). Vale la pena hacerlo aparte, como un commit chico, antes de construir encima.

### 4.5 Créditos: cobrar una sola vez, al final, y solo si salió bien

Igual que `consume_pdf_credits_for_pages` (1 crédito cada 10 páginas), se agrega
`consume_ai_import_credits(user_id, page_count)` con la misma forma (atómico, verifica dueño). Se
llama **una sola vez, en `finalize`**, nunca en cada página: si la persona cierra la pestaña a
mitad de la importación, no se le cobra nada — el trabajo simplemente expira a los 30 minutos.

---

## 5. Frontend: qué construir

- **Punto de entrada:** un botón "Completar con una foto o PDF de tu CV" en el editor (candidato
  natural: cerca de donde hoy está `CertExtractSection`/`CardExtractSection`, que ya hacen algo
  parecido con certificados — mirar esos componentes primero para reusar su patrón de subida de
  archivo antes de escribir uno nuevo).
- **Progreso:** "Leyendo tu CV… página 3 de 8" mientras el frontend recorre las páginas y llama a
  `process-page` en orden (secuencial, no en paralelo: así el resumen de "lo ya extraído" que se
  le manda a la IA en cada página está siempre completo y al día).
- **Pantalla de revisión, antes de tocar el CV actual:** los campos extraídos se muestran para
  confirmar o editar, no se aplican solos. Cada dato debería poder rastrearse a "de qué página
  salió" para que la persona sepa dónde mirar si algo se ve raro. Esto no es opcional: una IA
  leyendo una foto se puede equivocar en una fecha, un teléfono o un acento, y hay que dejar que
  la persona lo corrija antes de guardar.
- **Errores por página, no por archivo completo:** si una página falla (por ejemplo, viene
  borrosa), se le avisa a la persona por esa página puntual con la opción de "reintentar esta
  página" o "omitir esta página", sin perder lo que ya se extrajo de las demás.

---

## 6. Verificación (antes de dar por terminado)

1. **Tests del motor puro**, sin llamar a la IA real:
   - `isTextLayerCoherent`: casos con texto normal (true), texto con encoding roto tipo
     `\x03\x1a` mezclado con letras (false), texto casi vacío (false), texto en inglés y en
     español con las palabras comunes (true).
   - `mergePageFragments`: dos fragmentos con `continuesFromPrevious`, duplicados exactos de
     `personalInfo.email`, arrays vacíos.
2. **Prueba end-to-end con casos reales** (armar fixtures a propósito):
   - Un PDF con texto seleccionable normal (nunca debería rasterizarse a imagen).
   - Un PDF exportado con una fuente de mapeo roto (texto "legible a la vista, basura por
     dentro" — el caso exacto que describiste) → confirmar que cada página así se detecta y se
     manda como imagen, no como texto.
   - Un PDF de más de 5 páginas con datos que se pisan entre páginas (una experiencia laboral
     partida al medio) → confirmar que `finalize` la deja como una sola entrada, no dos.
   - Una foto sacada con el celular, con algo de inclinación y sombra.
3. **Prueba de concurrencia**: simular 20 llamadas a `process-page` en paralelo con distintos
   `job_id` (con un script, no a mano) y confirmar que el rate limit global frena antes de que
   Gemini devuelva 429 en cascada, y que ninguna respuesta se cruza entre `job_id` distintos.
4. **Costo real**: medir cuántos tokens de imagen consume una página típica en Gemini 2.5 Flash
   y ajustar cuántos créditos vale la importación (probablemente más caro que 1 crédito, dado que
   cada página con imagen cuesta bastante más que una llamada de texto corta).

---

## 7. Fuera de alcance de este plan (para después)

- Guardar un historial de "CVs importados" o permitir reabrir una importación vieja — hoy el
  trabajo expira a los 30 minutos a propósito, por privacidad.
- Detectar y extraer una foto de perfil dentro del PDF/imagen para usarla como foto del CV.
- Soporte para `.docx` como fuente (Word tiene texto siempre "coherente" por diseño; sería un
  camino aparte, sin necesidad de imagen ni de esta heurística).
