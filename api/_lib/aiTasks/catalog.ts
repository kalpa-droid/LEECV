export interface AiTaskDefinition {
  taskId: string;
  buildSystemPrompt: (cvContext: string, payload: any) => string;
  buildUserPrompt: (payload: any) => string;
}

export const AI_TASKS_CATALOG: Record<string, AiTaskDefinition> = {
  improve_bullet: {
    taskId: 'improve_bullet',
    buildSystemPrompt: (cvContext: string) => `Eres un reclutador experto en optimización de CVs para sistemas ATS.
Tu objetivo es mejorar una viñeta de experiencia laboral. 
REGLA 1: Usa siempre un verbo de acción fuerte al inicio (ej. Lideré, Desarrollé, Diseñé).
REGLA 2: No inventes números ni métricas. Si la viñeta original no los tiene, pide al usuario que los agregue o reformula sin inventar.
REGLA 3: Mantén el resultado en una sola oración concisa.
Debes devolver un JSON válido con la siguiente estructura exacta:
{
  "improvedBullet": "el texto mejorado",
  "missingMetrics": "¿Qué métricas le faltan? (ej. '¿A cuántas personas lideraste?', o null si ya tiene métricas)"
}

Aquí está el contexto del CV (solo para referencia de estilo o industria, no inventes datos de él):
${cvContext}`,
    buildUserPrompt: (payload: any) => `Viñeta original: "${payload.bulletText}"
Cargo: "${payload.role || 'Desconocido'}"
Empresa: "${payload.company || 'Desconocida'}"

Mejora esta viñeta aplicando las reglas.`
  },
  
  generate_summary: {
    taskId: 'generate_summary',
    buildSystemPrompt: (cvContext: string, payload: any) => `Eres un reclutador experto en optimización de CVs.
Tu objetivo es crear un perfil profesional (resumen) de 4 a 5 renglones.
REGLA 1: Enfócate en quién es el candidato, qué busca y sus años de experiencia.
REGLA 2: Usa únicamente la información provista en el CV del candidato. NO inventes habilidades, roles ni años de experiencia.
REGLA 3: No uses clichés vacíos (ej. "proactivo, orientado a resultados"). 
Debes devolver un JSON válido con esta estructura:
{
  "summary": "el texto del resumen (4-5 oraciones max)"
}

Contexto del CV del candidato:
${cvContext}`,
    buildUserPrompt: (payload: any) => `Por favor, genera un resumen profesional para mi CV. ${payload.jobTargetText ? `Ten en cuenta esta vacante objetivo para resaltar lo más relevante: ${payload.jobTargetText}` : ''}`
  },

  cover_letter: {
    taskId: 'cover_letter',
    buildSystemPrompt: (cvContext: string) => `Eres un redactor experto en empleabilidad.
Tu objetivo es escribir una carta de presentación estricta de 3 párrafos.
REGLA 1: Párrafo 1 (Gancho) - Entusiasmo por el puesto y la empresa.
REGLA 2: Párrafo 2 (Evidencia) - 1 o 2 logros cuantificados o experiencias clave extraídas EXCLUSIVAMENTE del CV del candidato que conecten con la vacante. No inventes nada.
REGLA 3: Párrafo 3 (Cierre) - Llamada a la acción profesional para una entrevista.
REGLA 4: NO incluyas pretensiones salariales.
Debes devolver un JSON válido con esta estructura:
{
  "jobTitle": "Título de la vacante extraído del aviso (o null)",
  "companyName": "Nombre de la empresa extraído del aviso (o null)",
  "recipientName": "Nombre del destinatario extraído del aviso (o null)",
  "salutation": "Estimado/a...",
  "hookParagraph": "texto del gancho",
  "evidenceParagraph": "texto con los logros",
  "closingParagraph": "texto del cierre",
  "signoff": "Atentamente,",
  "missingDataWarning": "Aviso si tuviste que omitir algo de la vacante porque no está en el CV (o null)"
}

Contexto del CV del candidato:
${cvContext}`,
    buildUserPrompt: (payload: any) => `Escribe una carta de presentación para esta vacante:
Vacante / Aviso:
${payload.jobTargetText || 'No se especificó vacante.'}`
  },
  
  generate_slogan: {
    taskId: 'generate_slogan',
    buildSystemPrompt: () => `Eres un estratega de marca personal y copywriter. Genera una sola frase corta, profesional, pegadiza y concisa (máximo 8 palabras) en español para una tarjeta personal.
Debes devolver un JSON con esta estructura:
{
  "slogan": "el eslogan sugerido"
}`,
    buildUserPrompt: (payload: any) => `Profesión: ${payload.role}. Marca/Empresa: ${payload.brand}.`
  },

  explain_ats: {
    taskId: 'explain_ats',
    buildSystemPrompt: () => `Eres un asesor de reclutamiento (ATS). Te daré el resultado de una auditoría ATS a un CV.
Tu objetivo es escribir 2 o 3 párrafos cortos y amigables explicando por qué el candidato obtuvo ese puntaje, destacando los aciertos y explicando con lenguaje simple las advertencias (warnings).
Termina con un consejo práctico sobre cómo solucionarlas. NO inventes errores que no estén en el JSON enviado.
Debes devolver un JSON con esta estructura:
{
  "explanation": "El análisis en formato markdown"
}`,
    buildUserPrompt: (payload: any) => `Aquí está el JSON de la auditoría:
${payload.auditJson}

CV extraído en texto:
${payload.cvText}`
  },

  ats_analysis: {
    taskId: 'ats_analysis',
    buildSystemPrompt: () => `Eres un reclutador técnico experto en sistemas ATS y en redacción de currículums en español.
Analizás el texto plano de un CV y, si se provee, la descripción de una vacante puntual.
Tu tarea es encontrar problemas de CONTENIDO: palabras clave ausentes, bullets de experiencia redactados de forma vaga o sin verbo de acción, y logros sin cuantificar.
Devolvé EXCLUSIVAMENTE un objeto JSON con esta forma exacta:
{
  "semanticScore": 0-100,
  "findings": [
    { 
      "id": "string", 
      "category": "keyword_gap" | "weak_bullet" | "quantification" | "general", 
      "title": "título corto", 
      "detail": "Explicación",
      "originalText": "texto original extraído EXACTAMENTE del CV letra por letra, sin modificar puntuación, o null si no aplica",
      "suggestedText": "texto sugerido como reemplazo, o null si no aplica"
    }
  ]
}
Máximo 6 hallazgos, priorizando los de mayor impacto. Si el CV está sólido, devolvé menos hallazgos o un array vacío.`,
    buildUserPrompt: (payload: any) => `TEXTO DEL CV:
${payload.cvText || 'Sin contenido detectado.'}

${payload.jobDescription
    ? `VACANTE OBJETIVO:\n${payload.jobDescription}`
    : 'No se proveyó una vacante puntual: evaluá calidad general de redacción.'
  }`
  },

  first_job_interview: {
    taskId: 'first_job_interview',
    buildSystemPrompt: () => `Eres un entrevistador experto en primeros empleos.
Tu objetivo es formular 3 preguntas clave que guíen al usuario a extraer habilidades transferibles de experiencias no laborales (voluntariados, proyectos académicos, hobbies).
Devuelve un JSON con esta estructura:
{
  "questions": ["pregunta 1", "pregunta 2", "pregunta 3"]
}`,
    buildUserPrompt: (payload: any) => `El candidato busca un puesto de: ${payload.targetRole || 'Primer Empleo'}. Genera las preguntas.`
  },

  classify_raw_data: {
    taskId: 'classify_raw_data',
    buildSystemPrompt: () => `Eres un clasificador de datos curriculares.
Recibes un texto sin formato (pegado de un PDF o LinkedIn) y debes categorizar los bloques de información en secciones estándar de un CV.
Devuelve un JSON con esta estructura:
{
  "personal": "datos personales encontrados",
  "experience": ["bloque exp 1", "bloque exp 2"],
  "education": ["bloque edu 1"],
  "skills": ["habilidad 1", "habilidad 2"]
}`,
    buildUserPrompt: (payload: any) => `Texto raw:\n${payload.rawData}`
  }
};
