import {
  composeAssistantSystemPrompt,
  sanitizeMetadataOnlyEditorState,
} from './appKnowledge/index.js';

export interface AiTaskDefinition {
  taskId: string;
  buildSystemPrompt: (cvContext: string, payload: any, formatContext?: string) => string;
  buildUserPrompt: (payload: any) => string;
  responseSchema?: any;
}

export const AI_TASKS_CATALOG: Record<string, AiTaskDefinition> = {
  improve_bullet: {
    taskId: 'improve_bullet',
    buildSystemPrompt: (cvContext: string, payload: any, formatContext?: string) => `Eres un reclutador experto en optimización de CVs.
Tu objetivo es mejorar una viñeta de experiencia laboral. 
REGLA 1: Usa siempre un sustantivo de acción al inicio (ej. 'Administración de...', 'Liderazgo de...'), NO un verbo conjugado (ej. no uses 'Lideré', 'Desarrollé').
REGLA 2: No inventes números ni métricas. Si la viñeta original no los tiene, pide al usuario que los agregue o reformula sin inventar.
REGLA 3: Mantén el resultado en una sola oración concisa.
Debes devolver un JSON válido.
${formatContext ? `\nADAPTACIÓN AL FORMATO OBJETIVO:\n${formatContext}\nAjusta el tono para encajar con el estilo de este formato.` : ''}

Aquí está el contexto del CV (solo para referencia de estilo o industria, no inventes datos de él):
<candidate_context>
${cvContext}
</candidate_context>`,
    buildUserPrompt: (payload: any) => `Viñeta original a mejorar:
<target_text>
"${payload.bulletText}"
</target_text>
Cargo: "${payload.role || 'Desconocido'}"
Empresa: "${payload.company || 'Desconocida'}"

Mejora esta viñeta aplicando las reglas.`,
    responseSchema: {
      type: "object",
      properties: {
        improvedBullet: { type: "string" },
        missingMetrics: { type: "string", nullable: true }
      },
      required: ["improvedBullet"]
    }
  },
  
  generate_summary: {
    taskId: 'generate_summary',
    buildSystemPrompt: (cvContext: string, payload: any, formatContext?: string) => `Eres un reclutador experto en optimización de CVs.
Tu objetivo es crear un extracto profesional de 4 a 5 renglones centrado en trayectoria, especialidad, credenciales y logros documentados.
REGLA 1: Enfócate en la experiencia real del candidato, no en sus metas o aspiraciones, que pertenecen al objetivo profesional.
REGLA 2: Usa únicamente la información provista en el CV del candidato. NO inventes habilidades, roles ni años de experiencia.
REGLA 3: No uses clichés vacíos (ej. "proactivo, orientado a resultados"). 
Debes devolver un JSON válido.
${formatContext ? `\nADAPTACIÓN AL FORMATO OBJETIVO:\n${formatContext}\nAjusta el tono para encajar con el estilo de este formato.` : ''}

Contexto del CV del candidato:
<candidate_context>
${cvContext}
</candidate_context>`,
    buildUserPrompt: (payload: any) => `Por favor, genera un resumen profesional para mi CV. ${payload.jobTargetText ? `\nVacante objetivo (solo para resaltar lo relevante):\n<target_text>\n${payload.jobTargetText}\n</target_text>` : ''}`,
    responseSchema: {
      type: "object",
      properties: {
        summary: { type: "string" }
      },
      required: ["summary"]
    }
  },

  generate_objective: {
    taskId: 'generate_objective',
    buildSystemPrompt: (cvContext: string, _payload: any, formatContext?: string) => `Eres un orientador laboral experto en objetivos profesionales.
Redacta un objetivo profesional breve, de hasta 4 líneas, alineado con el puesto indicado.
REGLA 1: Expresa el tipo de contribución y dirección profesional que busca la persona; no repitas su trayectoria como resumen.
REGLA 2: No inventes experiencia, habilidades, títulos, resultados ni años. Usa solo datos respaldados por el CV y la oferta.
REGLA 3: Evita clichés y promesas que no se desprendan de los datos.
REGLA 4: Si no hay datos suficientes para una afirmación concreta, usa una formulación prudente y general.
Devuelve exclusivamente JSON válido con la propiedad "objective".
${formatContext ? `\nADAPTACIÓN AL FORMATO OBJETIVO:\n${formatContext}\nMantén el objetivo claro y conciso.` : ''}

Contexto del CV:
<candidate_context>
${cvContext}
</candidate_context>`,
    buildUserPrompt: (payload: any) => `Objetivo actual:
<current_objective>
${payload.currentObjective || 'No hay un objetivo escrito.'}
</current_objective>

Vacante objetivo:
<target_job>
${payload.jobTargetText || 'No se especificó una vacante.'}
</target_job>

Propón un objetivo alineado sin afirmar habilidades o experiencia no documentadas.`,
    responseSchema: {
      type: 'object',
      properties: {
        objective: { type: 'string' }
      },
      required: ['objective']
    }
  },

  suggest_competencies: {
    taskId: 'suggest_competencies',
    buildSystemPrompt: (cvContext: string) => `Eres un orientador laboral que ayuda a adaptar competencias a una oferta.
Selecciona únicamente competencias que estén respaldadas explícitamente por datos del CV y que sean relevantes para la vacante.
No infieras competencias a partir del puesto deseado ni agregues habilidades que la persona no haya demostrado.
Devuelve exclusivamente JSON válido con la propiedad "suggestions", un array de objetos con "skill", "evidence" y "relevance".
Usa una evidencia concreta y breve del CV para cada competencia. Si no hay competencias respaldadas y relevantes, devuelve un array vacío.

Contexto del CV:
<candidate_context>
${cvContext}
</candidate_context>`,
    buildUserPrompt: (payload: any) => `Vacante:
<target_job>
${payload.jobTargetText || 'No se especificó una vacante.'}
</target_job>

Competencias que ya están en el CV:
<current_competencies>
${JSON.stringify(payload.currentSkills || [])}
</current_competencies>

Devuelve sólo competencias respaldadas por el CV, sin repetir las actuales.`,
    responseSchema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              skill: { type: 'string' },
              evidence: { type: 'string' },
              relevance: { type: 'string' }
            },
            required: ['skill', 'evidence', 'relevance']
          }
        }
      },
      required: ['suggestions']
    }
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
${payload.jobTargetText || 'No se especificó vacante.'}`,
    responseSchema: {
      type: "object",
      properties: {
        jobTitle: { type: "string", nullable: true },
        companyName: { type: "string", nullable: true },
        recipientName: { type: "string", nullable: true },
        salutation: { type: "string" },
        hookParagraph: { type: "string" },
        evidenceParagraph: { type: "string" },
        closingParagraph: { type: "string" },
        signoff: { type: "string" },
        missingDataWarning: { type: "string", nullable: true }
      },
      required: ["salutation", "hookParagraph", "evidenceParagraph", "closingParagraph", "signoff"]
    }
  },
  
  generate_slogan: {
    taskId: 'generate_slogan',
    buildSystemPrompt: () => `Eres un estratega de marca personal y copywriter. Genera una sola frase corta, profesional, pegadiza y concisa (máximo 8 palabras) en español para una tarjeta personal.
Debes devolver un JSON con esta estructura:
{
  "slogan": "el eslogan sugerido"
}`,
    buildUserPrompt: (payload: any) => `Profesión: ${payload.role}. Marca/Empresa: ${payload.brand}.`,
    responseSchema: {
      type: "object",
      properties: {
        slogan: { type: "string" }
      },
      required: ["slogan"]
    }
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
${payload.cvText}`,
    responseSchema: {
      type: "object",
      properties: {
        explanation: { type: "string" }
      },
      required: ["explanation"]
    }
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
Máximo 6 hallazgos, priorizando los de mayor impacto. Si el CV está sólido, devolvé menos hallazgos o un array vacío.
REGLA 1: "originalText" debe existir EXACTAMENTE en el texto del CV. Si no podés citar texto literal del CV, usá null — nunca inventes la cita.
REGLA 2: "suggestedText" debe ser una reformulación de "originalText" (misma información, mejor redacción). Nunca propongas números, métricas o logros que no estén en el CV.
REGLA 3: No repitas hallazgos del mismo tipo (ej. dos bullets vagos): agrupá con un hallazgo "general" o quedate con el de mayor impacto.`,
    buildUserPrompt: (payload: any) => `TEXTO DEL CV:
${payload.cvText || 'Sin contenido detectado.'}

${payload.jobDescription
    ? `VACANTE OBJETIVO:\n${payload.jobDescription}`
    : 'No se proveyó una vacante puntual: evaluá calidad general de redacción.'
  }`,
    responseSchema: {
      type: "object",
      properties: {
        semanticScore: { type: "number" },
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              category: { type: "string", enum: ["keyword_gap", "weak_bullet", "quantification", "general"] },
              title: { type: "string" },
              detail: { type: "string" },
              originalText: { type: "string", nullable: true },
              suggestedText: { type: "string", nullable: true }
            },
            required: ["id", "category", "title", "detail"]
          }
        }
      },
      required: ["semanticScore", "findings"]
    }
  },

  first_job_interview: {
    taskId: 'first_job_interview',
    buildSystemPrompt: () => `Eres un orientador laboral experto en ayudar a personas a buscar su primer empleo.
El usuario te explicará con sus propias palabras actividades informales, pasatiempos, voluntariados o tareas familiares que realiza (ej. "ayudo en la tienda de mi tío", "organizo torneos de fútbol").
Tu objetivo es traducir esa experiencia informal en un formato profesional para un CV, destacando habilidades transferibles (comunicación, liderazgo, organización, etc.).
Devuelve EXCLUSIVAMENTE un JSON con esta estructura:
{
  "professionalTitle": "Un título de puesto profesional sugerido (ej. Asistente de Ventas)",
  "description": "Una descripción redactada profesionalmente destacando las tareas y habilidades transferibles en 1 o 2 oraciones."
}`,
    buildUserPrompt: (payload: any) => `Actividad informal que realizo:\n"${payload.rawActivity}"`,
    responseSchema: {
      type: "object",
      properties: {
        professionalTitle: { type: "string" },
        description: { type: "string" }
      },
      required: ["professionalTitle", "description"]
    }
  },

  suggest_achievement_acr: {
    taskId: 'suggest_achievement_acr',
    buildSystemPrompt: (cvContext: string, payload: any, formatContext?: string) => `Eres un reclutador experto en redacción de CVs.
Tu objetivo es redactar UN solo logro profesional en formato ACR (Acción + Contexto + Resultado) para la experiencia laboral de una persona.
REGLA 1: Empezá con un sustantivo de acción o participio ("Administración de...", "Liderazgo de...", "Rediseño de..."), NO con un verbo conjugado.
REGLA 2: Usá ÚNICAMENTE el rol, la empresa y los datos que aparecen en el CV de la persona. NO inventes métricas, números ni porcentajes. Si no hay datos para cuantificar, el resultado va en términos cualitativos (ej. "reduciendo reprocesos") y debés avisar en "missingMetrics" qué dato convendría agregar.
REGLA 3: Una sola oración, máximo 22 palabras. Sin adjetivos vacíos.
Debes devolver un JSON válido.
${formatContext ? `\nADAPTACIÓN AL FORMATO OBJETIVO:\n${formatContext}\nAjustá el tono para encajar con el estilo de este formato.` : ''}

Aquí está el contexto del CV (solo para referencia, no inventes datos de él):
<candidate_context>
${cvContext}
</candidate_context>`,
    buildUserPrompt: (payload: any) => `Cargo: "${payload.role || 'Desconocido'}"
Empresa: "${payload.company || 'Desconocida'}"
Descripción actual (puede estar vacía):
<current_description>
${payload.currentDescription || ''}
</current_description>

Redactá UN logro en formato ACR coherente con esos datos.`,
    responseSchema: {
      type: "object",
      properties: {
        acrBullet: { type: "string" },
        missingMetrics: { type: "string", nullable: true }
      },
      required: ["acrBullet"]
    }
  },

  suggest_records: {
    taskId: 'suggest_records',
    buildSystemPrompt: (cvContext: string, payload: any, formatContext?: string) => {
      const kind = payload?.sectionKind || 'record';
      const kindLabels: Record<string, string> = {
        course: 'un curso o capacitación (título, institución)',
        education: 'un título o formación académica (título, institución)',
        profession: 'un título profesional con matrícula (título, institución)',
        languages: 'un idioma con nivel (idioma, nivel)',
        projects: 'un proyecto (título, institución o enlace)',
        publications: 'una publicación (título, autor, institución)',
        references: 'una referencia profesional (persona, cargo, institución)',
        informatics: 'una herramienta informática con nivel (herramienta, nivel)',
        redes: 'un enlace profesional (plataforma, usuario, url)',
        achievements: 'un logro cuantificable (título, descripción)',
        portfolio: 'un trabajo destacado de portafolio (título, institución o enlace)',
        skills: 'una habilidad técnica con nivel (name, level)',
        custom: 'un registro de sección personalizada (usa los campos indicados)'
      };
      const label = kindLabels[kind] || 'un registro';
      return `Eres un asistente que completa el CV de una persona con sugerencias coherentes.
Tu objetivo es proponer hasta 2 ${label} que tengan sentido con la trayectoria real de la persona.
REGLA 1: Usá ÚNICAMENTE lo que aparece en el CV (industria, roles, estudios, herramientas). NO inventes títulos, instituciones, fechas, niveles ni nombres.
REGLA 2: Si no alcanza para proponer algo concreto, devolvé un array vacío en "records" y explicá en "missingInfo" qué dato haría falta.
REGLA 3: Cada objeto del array solo puede tener campos de texto simples (string). Si no sabés un campo, usá string vacía.
Debes devolver un JSON válido.
${formatContext ? `\nADAPTACIÓN AL FORMATO OBJETIVO:\n${formatContext}\nAjustá el tono para encajar con el estilo de este formato.` : ''}

Aquí está el contexto del CV (solo para referencia, no inventes datos de él):
<candidate_context>
${cvContext}
</candidate_context>`;
    },
    buildUserPrompt: (payload: any) => `Sección a sugerir: ${payload?.sectionKind || 'registro'}
Ya existen estos registros (no los repitas):
<existing_records>
${JSON.stringify(payload?.existingRecords || [])}
</existing_records>

Proponé hasta 2 registros nuevos coherentes.`,
    responseSchema: {
      type: "object",
      properties: {
        records: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tituloOGrado: { type: "string" },
              cargo: { type: "string" },
              herramienta: { type: "string" },
              institucion: { type: "string" },
              periodo: { type: "string" },
              nivel: { type: "string" },
              nivelDominio: { type: "string" },
              autor: { type: "string" },
              url: { type: "string" },
              idioma: { type: "string" },
              personaReferencia: { type: "string" },
              contactoReferencia: { type: "string" },
              plataforma: { type: "string" },
              usuario: { type: "string" },
              name: { type: "string" },
              level: { type: "string" },
              descripcion: { type: "string" },
              estado: { type: "string" },
              promedio: { type: "string" },
              cargaHoraria: { type: "string" },
              modalidad: { type: "string" },
              matricula: { type: "string" },
              tomoFolio: { type: "string" },
              resolucion: { type: "string" },
              logros: { type: "string" }
            }
          }
        },
        missingInfo: { type: "string", nullable: true }
      },
      required: ["records"]
    }
  },

  rewrite_record: {
    taskId: 'rewrite_record',
    buildSystemPrompt: (cvContext: string, payload: any, formatContext?: string) => {
      const focus = ['claridad', 'ats', 'breve'].includes(payload?.focus) ? payload.focus : 'claridad';
      const focusGuide: Record<string, string> = {
        claridad: 'claridad y redacción profesional (mejorar la forma de decirlo sin cambiar los hechos)',
        ats: 'mayor impacto para filtros automáticos: verbo de acción al inicio, palabras clave relevantes y orden lógico',
        breve: 'brevedad máxima: acortá el texto a la mitad si se puede sin perder ningún hecho'
      };
      const sectionLabel = payload?.sectionTitle ? `"${payload.sectionTitle}"` : 'un registro';
      return `Eres un editor profesional de currículums en español.
Tu objetivo es reescribir ${sectionLabel} para que quede más fuerte, coherente y adaptado a la vacante.
REGLA 1: NO inventes empresas, fechas, cargos, títulos, métricas ni logros que no estén en el registro ni en el CV.
REGLA 2: Si haría falta un dato que no está (resultado, número, fecha), mantené el texto honesto y anotalo en "missingDataNote".
REGLA 3: Respetá los hechos del registro original (mismas empresas, mismas fechas, mismos cargos); reescribís la FORMA, no el contenido.
REGLA 4: "improvedFields" lleva SOLO las claves que reescribiste, con exactamente los mismos nombres de campo que recibiste. No agregues claves nuevas ni id propio.
REGLA 5: El foco pedido es: ${focusGuide[focus]}.
Debes devolver un JSON válido.
${formatContext ? `\nADAPTACIÓN AL FORMATO OBJETIVO:\n${formatContext}\nAjustá el tono para encajar con el estilo de este formato.` : ''}

Contexto del CV (solo para referencia, no inventes datos de él):
<candidate_context>
${cvContext}
</candidate_context>`;
    },
    buildUserPrompt: (payload: any) => `Sección: "${payload?.sectionTitle || 'Registro'}" (tipo: ${payload?.sectionKind || 'custom'})
Vacante objetivo: ${payload?.jobTarget || 'Sin vacante indicada'}
Foco: ${payload?.focus || 'claridad'}

Registro actual (JSON):
<current_record>
${JSON.stringify(payload?.currentRecord || {}, null, 2)}
</current_record>

Reescribí el registro. En "improvedFields" devolvé SOLO las claves que mejoraste, usando los mismos nombres de campo de entrada.`,
    responseSchema: {
      type: "object",
      properties: {
        improvedFields: {
          type: "object",
          properties: {
            tituloOGrado: { type: "string" },
            cargo: { type: "string" },
            herramienta: { type: "string" },
            institucion: { type: "string" },
            periodo: { type: "string" },
            nivel: { type: "string" },
            nivelDominio: { type: "string" },
            autor: { type: "string" },
            url: { type: "string" },
            idioma: { type: "string" },
            personaReferencia: { type: "string" },
            contactoReferencia: { type: "string" },
            plataforma: { type: "string" },
            usuario: { type: "string" },
            name: { type: "string" },
            level: { type: "string" },
            descripcion: { type: "string" },
            estado: { type: "string" },
            promedio: { type: "string" },
            cargaHoraria: { type: "string" },
            modalidad: { type: "string" },
            matricula: { type: "string" },
            tomoFolio: { type: "string" },
            resolucion: { type: "string" },
            logros: { type: "string" }
          }
        },
        missingDataNote: { type: "string", nullable: true }
      },
      required: ["improvedFields"]
    }
  },

  app_guide_assistant: {
    taskId: 'app_guide_assistant',
    buildSystemPrompt: (_cvContext: string, payload: any) => composeAssistantSystemPrompt(payload?.docType),
    buildUserPrompt: (payload: any) => {
      const safeEditorState = sanitizeMetadataOnlyEditorState(payload?.docType, payload?.editorState);
      return `Pregunta de la persona:
<question>
${payload?.question || ''}
</question>

Contexto de pantalla: está mirando la pestaña "${payload?.activeTab || 'desconocida'}" del editor${payload?.docType ? ` (documento: ${payload.docType})` : ''}.

Estado del editor (solo guía, sin datos personales):
<editorState>
${JSON.stringify(safeEditorState)}
</editorState>

Últimos intercambios (de más viejo a más nuevo, máximo 4):
<history>
${JSON.stringify(Array.isArray(payload?.history) ? payload.history.slice(-4).map((m: any) => ({ role: m?.role, text: m?.text })) : [])}
</history>

Respondé en JSON válido según el formato indicado.`;
    },
    responseSchema: {
      type: 'object',
      properties: {
        answer: { type: 'string' },
        suggestedActions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              targetTab: { type: 'string', nullable: true }
            },
            required: ['label']
          }
        }
      },
      required: ['answer']
    }
  },

  classify_raw_data: {
    taskId: 'classify_raw_data',
    buildSystemPrompt: () => `Eres un asistente inteligente para la extracción de datos de currículums.
El usuario te enviará un fragmento de texto suelto (por ejemplo, copiado y pegado de un CV viejo o de LinkedIn).
Tu objetivo es clasificar a qué sección del CV pertenece este fragmento y extraer sus campos de forma estructurada.
Las categorías posibles (type) son: "experience" (Experiencia), "education" (Educación), "skill" (Habilidades o Conocimientos), "language" (Idiomas), "project" (Proyectos), o "unknown" (no se puede determinar).
REGLA PARA IDIOMAS: Si el texto extraído es un idioma, debes mapear el nivel a uno de los siguientes niveles estandarizados: Básico, Intermedio, Avanzado, Nativo, o A1, A2, B1, B2, C1, C2.
Debes devolver EXCLUSIVAMENTE un objeto JSON válido.
No inventes datos. Extrae solo lo que está en el texto.`,
    buildUserPrompt: (payload: any) => `Por favor, clasifica y extrae los datos de este fragmento de texto:\n\n<target_text>\n"${payload.rawData}"\n</target_text>`,
    responseSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["experience", "education", "skill", "language", "project", "unknown"] },
        confidence: { type: "number" },
        extractedFields: {
          type: "object",
          properties: {
            title: { type: "string", nullable: true },
            subtitle: { type: "string", nullable: true },
            dateRange: { type: "string", nullable: true },
            description: { type: "string", nullable: true }
          }
        }
      },
      required: ["type", "confidence", "extractedFields"]
    }
  },
  editorial_structure: {
    taskId: 'editorial_structure',
    buildSystemPrompt: (_cvContext: string, payload: any) => `Sos un arquitecto editorial experto en libros, novelas, trabajos escolares, monografías, tesis universitarias (APA 7) e informes científicos (IMRyD / Vancouver).
Recibirás un fragmento o manuscrito completo — incluso texto plano SIN títulos con negrita ni metadatos tipográficos. Tu tarea es detectar y organizar cada bloque lógico en secciones y registros fieles al texto original (NUNCA inventes ni resumas omitiendo contenido).

REGLAS ESTRICTAS:
1. Detectá fronteras reales aunque no haya formato: cambios narrativos ("Capítulo", "Parte", números sueltos o transición de escena), preliminares (Prólogo, Dedicatoria, Resumen/Abstract, Introducción), cuerpo (Marco Teórico, Metodología, Resultados, Discusión, Desarrollo, Capítulos, Unidades), y cierre (Conclusiones, Epílogo, Bibliografía/Referencias, Glosario, Anexos).
2. Asigná en cada sección su clave canónica \`sectionKey\`: 'prologo' | 'dedicatoria' | 'agradecimientos' | 'resumen' | 'introduccion' | 'capitulo' | 'unidad' | 'desarrollo' | 'marco_teorico' | 'metodologia' | 'resultados' | 'discusion' | 'conclusiones' | 'epilogo' | 'bibliografia' | 'glosario' | 'anexo'.
3. Si estás procesando la continuación de un bloque previo (${payload?.previousSectionTitle ? `última sección anterior: "${payload.previousSectionTitle}"` : 'inicio del documento'}) y el comienzo de este fragmento continúa exactamente esa misma sección sin título nuevo, marcá \`continuesPreviousSection: true\` en esa primera sección.
4. Devolvé EXCLUSIVAMENTE JSON válido según el schema.`,
    buildUserPrompt: (payload: any) => {
      const partInfo =
        payload?.totalChunks && payload.totalChunks > 1
          ? `Fragmento ${(Number(payload.chunkIndex) || 0) + 1} de ${payload.totalChunks}${payload.previousSectionTitle ? ` (sección previa activa: "${payload.previousSectionTitle}")` : ''}.\n`
          : '';
      const presetHint = payload?.presetId ? `Tipo de obra objetivo: ${payload.presetId}.\n` : '';
      return `${partInfo}${presetHint}Estructurá fielmente este manuscrito editorial:\n\n<manuscript>\n${payload?.manuscriptText || ''}\n</manuscript>`;
    },
    responseSchema: {
      type: "object",
      properties: {
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              sectionKey: { type: "string" },
              continuesPreviousSection: { type: "boolean", nullable: true },
              records: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    content: { type: "string" },
                    quoteAttribution: { type: "string", nullable: true }
                  },
                  required: ["type", "content"]
                }
              }
            },
            required: ["title", "records"]
          }
        },
        metadata: {
          type: "object",
          properties: {
            title: { type: "string" },
            subtitle: { type: "string", nullable: true },
            author: { type: "string" }
          }
        }
      },
      required: ["sections"]
    }
  },
  editorial_ocr_page: {
    taskId: 'editorial_ocr_page',
    buildSystemPrompt: () => `Sos un transcriptor OCR editorial de alta precisión. Leés páginas escaneadas o fotos de libros, apuntes o informes impresos.
Extraé todo el texto legible EN EL ORDEN NATURAL DE LECTURA sin inventar palabras ni resumir.
Conservá títulos de capítulo o subtítulos en líneas propias con formato claro, listas con viñetas o números, y citas bibliográficas si aparecen.
Respondé EXCLUSIVAMENTE en JSON con {"extractedText": "...", "detectedHeading": string|null}.`,
    buildUserPrompt: (payload: any) =>
      `Transcribí literalmente esta página editorial${payload?.pageNumber ? ` (página ${payload.pageNumber})` : ''}. Devolvé solo JSON válido.`,
    responseSchema: {
      type: "object",
      properties: {
        extractedText: { type: "string" },
        detectedHeading: { type: "string", nullable: true }
      },
      required: ["extractedText"]
    }
  },
  editorial_format_citation: {
    taskId: 'editorial_format_citation',
    buildSystemPrompt: (_cvContext: string, payload: any) => `Sos un bibliotecario académico experto en Normas APA 7.ª edición, Vancouver (ICMJE) y Chicago.
Tu tarea es tomar texto libre con referencias bibliográficas o enlaces desordenados y normalizarlos en campos estructurados listos para citar según el estilo ${payload?.style || 'apa7'}.
Respondé EXCLUSIVAMENTE en JSON con lista \`citations\`, sin inventar años o DOIs si no figuran en el original.`,
    buildUserPrompt: (payload: any) =>
      `Extraé y estructurá estas referencias para norma "${payload?.style || 'apa7'}":\n\n<references>\n${payload?.rawText || ''}\n</references>`,
    responseSchema: {
      type: "object",
      properties: {
        citations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sourceType: { type: "string" },
              author: { type: "string" },
              year: { type: "string" },
              title: { type: "string" },
              editorial: { type: "string" },
              journal: { type: "string" },
              volume: { type: "string" },
              issue: { type: "string" },
              pages: { type: "string" },
              doiOrUrl: { type: "string" }
            },
            required: ["title"]
          }
        }
      },
      required: ["citations"]
    }
  },
  editorial_rewrite: {
    taskId: 'editorial_rewrite',
    buildSystemPrompt: () => `Sos un corrector de estilo y redactor editorial. Mejorá la fluidez y precisión del texto manteniendo el sentido original. Respondé en JSON con {"rewrittenText": "..."}.`,
    buildUserPrompt: (payload: any) => `Reescribí este texto:\n\n${payload?.text || ''}`,
    responseSchema: {
      type: "object",
      properties: {
        rewrittenText: { type: "string" }
      },
      required: ["rewrittenText"]
    }
  },
  editorial_refine: {
    taskId: 'editorial_refine',
    buildSystemPrompt: () => `Sos un asistente editorial para corrección ortotipográfica. Corregí errores gramaticales y de puntuación. Respondé en JSON con {"refinedText": "..."}.`,
    buildUserPrompt: (payload: any) => `Pulí este texto:\n\n${payload?.text || ''}`,
    responseSchema: {
      type: "object",
      properties: {
        refinedText: { type: "string" }
      },
      required: ["refinedText"]
    }
  },

  editorial_detect_preset: {
    taskId: 'editorial_detect_preset',
    buildSystemPrompt: () => `Sos un clasificador editorial experto. Analizás el inicio y el cierre de un manuscrito o documento recién subido a EditorLee para detectar qué tipo de publicación es realmente, qué norma visual de estructura le corresponde y qué estilo de referencias bibliográficas utiliza.

CATÁLOGO DE PRESETS (recommendedPresetId):
- "libro-ensayo-novela": Novela, cuento, poesía, ensayo literario, biografía o libro narrativo (prólogo, capítulos literarios, diálogos, epílogo).
- "informe-proyecto": Informe técnico, ejecutivo, profesional o de proyecto (resumen ejecutivo, objetivos, indicadores/KPI, diagnóstico, cronograma, presupuesto, recomendaciones).
- "tesis-apa7": Tesis universitaria, tesina o trabajo final de grado con estructura académica extensa y citas estilo autor-año APA 7.
- "cientifico-vancouver": Artículo o informe científico/médico con estructura IMRyD (Introducción, Métodos, Resultados, Discusión) o citas numéricas [1], [2] estilo Vancouver/IEEE.
- "monografia-terciaria": Monografía o investigación de nivel terciario/profesorado con marco teórico, desarrollo y bibliografía APA 7.
- "tp-secundaria": Trabajo práctico escolar de secundaria (consignas, materia, colegio, introducción breve, desarrollo y conclusión).
- "manual-apunte-guia": Manual didáctico, apunte de cátedra, cuadernillo de estudio o guía paso a paso (unidades, módulos, ejercicios, glosario).
- "trabajo-practico-monografia-tesis": Trabajo práctico académico general si no encaja específicamente en los anteriores.

REGLAS:
1. "recommendedStructuralNormId": "apa7" para tesis, monografías o informes científicos; "chicago" o "mla" solo si el texto lo evidencia explícitamente; "libre" para novelas, informes ejecutivos, manuales y trabajos escolares.
2. "recommendedBibliographyStyle": "vancouver" si usa citas [1], [2] en ciencias/salud; "ieee" si usa [1] en ingeniería/informática; "apa7" si usa (Autor, Año) o tiene sección Referencias académica; "tradicional" para libros literarios, informes ejecutivos o escolares sin norma estricta.
3. "detectedLabel": Nombre corto y claro en español (ej. "Informe / Proyecto Ejecutivo", "Tesis Universitaria (APA 7)", "Libro / Novela").
4. "reason": 1 sola oración clara y amigable explicando qué viste en el texto (ej. "Detectamos resumen ejecutivo, objetivos de gestión e indicadores de proyecto.").
5. Respondé EXCLUSIVAMENTE en JSON válido.`,
    buildUserPrompt: (payload: any) => `Preset activo actualmente en el editor: "${payload?.currentPresetId || 'libro-ensayo-novela'}"
Nombre de archivo (si existe): "${payload?.fileName || 'texto pegado'}"

Muestra del inicio del documento:
<start_excerpt>
${String(payload?.startText || '').slice(0, 3800)}
</start_excerpt>

Muestra del final del documento:
<end_excerpt>
${String(payload?.endText || '').slice(0, 1400)}
</end_excerpt>

Clasificá el tipo de documento y devolvé JSON válido.`,
    responseSchema: {
      type: 'object',
      properties: {
        recommendedPresetId: {
          type: 'string',
          enum: [
            'libro-ensayo-novela',
            'tp-secundaria',
            'monografia-terciaria',
            'tesis-apa7',
            'cientifico-vancouver',
            'trabajo-practico-monografia-tesis',
            'manual-apunte-guia',
            'informe-proyecto',
            'documento-libre',
          ],
        },
        recommendedStructuralNormId: {
          type: 'string',
          enum: ['libre', 'apa7', 'chicago', 'mla'],
        },
        recommendedBibliographyStyle: {
          type: 'string',
          enum: ['apa7', 'vancouver', 'ieee', 'harvard', 'chicago', 'mla', 'tradicional'],
        },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        detectedLabel: { type: 'string' },
        reason: { type: 'string' },
      },
      required: [
        'recommendedPresetId',
        'recommendedStructuralNormId',
        'recommendedBibliographyStyle',
        'confidence',
        'detectedLabel',
        'reason',
      ],
    },
  },

  book_detect_orientation: {
    taskId: 'book_detect_orientation',
    buildSystemPrompt: () => `Sos un inspector visual experto en documentos escaneados y fotocopias de libros.
Recibirás entre 1 y 4 imágenes de páginas de un PDF escaneado (pueden ser páginas individuales o grillas 2x2 etiquetadas con "Pág. X" en cada celda).
Tu objetivo es determinar para cada página solicitada hacia qué borde de la imagen apunta la PARTE SUPERIOR de las letras del texto principal (la "cabeza" de las letras):
- "top": El texto está derecho y se lee normalmente de izquierda a derecha con la cabeza de las letras apuntando hacia arriba.
- "left": La página está acostada/girada de modo que la parte superior de las letras apunta hacia el borde IZQUIERDO de la imagen (para leerla habría que inclinar la cabeza hacia la izquierda, o girar la hoja 90° en sentido horario / hacia la derecha).
- "right": La página está acostada/girada de modo que la parte superior de las letras apunta hacia el borde DERECHO de la imagen (para leerla habría que girar la hoja 90° en sentido antihorario / hacia la izquierda).
- "bottom": La página está completamente patas para arriba (cabeza de las letras apuntando hacia el borde INFERIOR, requiere girar 180°).
- "unclear": La página está en blanco, solo contiene una foto/ilustración sin texto claro, o es ilegible.

REGLAS ESTRICTAS:
1. No adivines si no hay texto: usá "unclear" y confidence "low".
2. En "sampleWords" transcribí 2 o 3 palabras reales que hayas podido leer en esa página para comprobar la orientación.
3. Devolvé EXCLUSIVAMENTE JSON válido con la lista "pages".`,
    buildUserPrompt: (payload: any) => {
      const itemsDesc = Array.isArray(payload?.items)
        ? payload.items
            .map((it: any, idx: number) =>
              it.mode === 'grid2x2'
                ? `Imagen #${idx + 1}: Grilla 2x2 con páginas [${(it.pages || []).join(', ')}] (arriba-izq, arriba-der, abajo-izq, abajo-der).`
                : `Imagen #${idx + 1}: Página individual #${it.pages?.[0] ?? idx + 1}.`,
            )
            .join('\n')
        : 'Analizá cada imagen adjunta en orden.';
      return `Inspeccioná la orientación del texto de estas páginas escaneadas:\n${itemsDesc}\n\nRespondé solo JSON válido.`;
    },
    responseSchema: {
      type: 'object',
      properties: {
        pages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pdfPage: { type: 'number' },
              textTopEdge: { type: 'string', enum: ['top', 'right', 'bottom', 'left', 'unclear'] },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
              sampleWords: { type: 'string', nullable: true },
            },
            required: ['pdfPage', 'textTopEdge', 'confidence'],
          },
        },
      },
      required: ['pages'],
    },
  },

  book_detect_page_numbers: {
    taskId: 'book_detect_page_numbers',
    buildSystemPrompt: () => `Sos un asistente experto en maquetación y foliado de libros.
Recibirás imágenes de los encabezados y pies de página (franja ARRIBA y franja ABAJO) de ciertas páginas de un PDF para encontrar el NÚMERO DE PÁGINA IMPRESO (folio) en el libro original.

REGLAS ESTRICTAS:
1. Buscá únicamente el número de página impreso de la obra (suele estar en las esquinas superiores, centro superior, esquinas inferiores o centro inferior, a veces acompañado del título o autor o entre guiones "- 10 -").
2. NO confundas años (ej. 1995, 2024, 2026), números dentro de párrafos, notas al pie chiquitas pegadas a texto, códigos ISBN ni números de capítulo ("Capítulo 3") con el número de página.
3. Si el modo es "fotocopia" (2 páginas por hoja divididas por una línea vertical central en MITAD IZQUIERDA y MITAD DERECHA):
   - Reportá "leftPrintedNumber" (número arábigo entero en la mitad izquierda, o null si no tiene).
   - Reportá "rightPrintedNumber" (número arábigo entero en la mitad derecha, o null si no tiene).
4. Si el modo es "normal" (1 página por hoja):
   - Reportá "printedNumber" (número arábigo entero impreso en la página, o null si no tiene).
5. Si la página solo tiene numeración preliminar en números romanos (ej. "iii", "iv", "xii"), poné "printedNumber": null, "leftPrintedNumber": null, "rightPrintedNumber": null y guardá el romano en "romanNumeral".
6. Devolvé EXCLUSIVAMENTE JSON válido.`,
    buildUserPrompt: (payload: any) => {
      const mode = payload?.mode === 'fotocopia' ? 'fotocopia (2 páginas por hoja: izquierda y derecha)' : 'normal (1 página por hoja)';
      const pagesList = Array.isArray(payload?.pages) ? payload.pages.join(', ') : '';
      return `Modo del PDF: ${mode}.
Las imágenes adjuntas corresponden, en orden exacto, a las páginas del PDF: [${pagesList}].
Cada imagen muestra la franja superior (ARRIBA) y la franja inferior (ABAJO) de esa página del PDF.
Detectá los números de página impresos y devolvé JSON válido.`;
    },
    responseSchema: {
      type: 'object',
      properties: {
        detections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pdfPage: { type: 'number' },
              printedNumber: { type: 'number', nullable: true },
              leftPrintedNumber: { type: 'number', nullable: true },
              rightPrintedNumber: { type: 'number', nullable: true },
              romanNumeral: { type: 'string', nullable: true },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['pdfPage', 'confidence'],
          },
        },
      },
      required: ['detections'],
    },
  },

  suggest_job_profiles: {
    taskId: 'suggest_job_profiles',
    buildSystemPrompt: (cvContext: string) => `Eres un estratega de empleabilidad y analista de mercado laboral en Latinoamérica y trabajo remoto global.
Tu tarea es leer TODO el CV Base del candidato (formación, títulos, cursos, experiencia, habilidades, herramientas y ciudad/provincia si figura) y analizar en qué roles y organizaciones se perfila con mayor solidez.

REGLAS:
1. Generá entre 12 y 18 oportunidades concretas en formato tabla (puesto + empresa/institución real o tipo de institución acorde a su región, industria y modalidad remota). Podés agrupar 2 a 4 empresas afines bajo un mismo puesto o incluir variedad de perfiles compatibles.
2. Basate ESTRICTAMENTE en credenciales y trayectoria reales del CV. No inventes especialidades ausentes.
3. Si figura ciudad/provincia en el CV, incluí tanto organizaciones de esa zona o país como plataformas/empresas remotas internacionales pertinentes (ej. empresas EdTech, evaluadoras/entrenadoras de IA en español, fundaciones socioeducativas, industria/minería/RSE, instituciones educativas, etc., según el perfil real del CV).
4. Para cada oportunidad redactá:
   - matchReason: 1 oración clara explicando por qué su perfil encaja con ese rol/empresa.
   - suggestedDescription: un aviso/descripción de puesto realista de 3 a 5 oraciones (responsabilidades, requisitos clave y palabras clave típicas) que el candidato luego podrá revisar y editar antes de adaptar su CV.
5. Devolvé ÚNICAMENTE JSON válido sin texto adicional.

CV Base completo del candidato:
<candidate_context>
${cvContext}
</candidate_context>`,
    buildUserPrompt: (payload: any) =>
      payload?.focusHint
        ? `Analizá todo el CV Base y sugerí puestos y empresas donde me perfilo (enfoque opcional: ${payload.focusHint}).`
        : 'Analizá el CV Base completo e indicame en qué puestos y empresas/instituciones me perfilo mejor.',
    responseSchema: {
      type: 'object',
      properties: {
        profiles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              jobTitle: { type: 'string' },
              companyName: { type: 'string' },
              sector: { type: 'string' },
              matchReason: { type: 'string' },
              suggestedDescription: { type: 'string' }
            },
            required: ['jobTitle', 'companyName', 'matchReason', 'suggestedDescription']
          }
        }
      },
      required: ['profiles']
    }
  },

  tailor_cv_for_application: {
    taskId: 'tailor_cv_for_application',
    buildSystemPrompt: (cvContext: string, _payload: any, formatContext?: string) => `Eres un especialista senior en selección de talento y sistemas ATS (Applicant Tracking Systems).
Tu objetivo es adaptar el contenido completo de un CV Base para generar una postulación altamente alineada con un puesto, una empresa y una descripción objetivo.

REGLAS ESTRICTAS:
1. CERO INVENCIÓN DE CREDENCIALES: NO inventes empleos, empresas, títulos, certificados ni años ni porcentajes falsos que no figuren en el CV Base.
2. SÍ optimizá redacción, vocabulario y enfoque usando términos reales del aviso/empresa cuando correspondan con tareas o conocimientos reales del candidato.
3. Entregá:
   - summary: Resumen profesional de 4 a 5 líneas enfocado en lo que busca la empresa.
   - objective: Objetivo profesional breve (2 a 3 líneas) nombrando el aporte al puesto y empresa.
   - experienceUpdates: lista con las experiencias del CV Base (indicando el índice base 0 \`index\`) reescribiendo \`description\` con verbos de acción y terminología ATS pertinente al puesto objetivo (conservando todos los hechos reales).
   - prioritizedSkills: competencias clave del candidato ordenadas de mayor a menor afinidad con el puesto (incluyendo competencias transferibles respaldadas por sus registros).
   - prioritizedHardSkills: herramientas / habilidades técnicas del candidato ordenadas por pertinencia con la vacante.
   - atsKeywords: entre 12 y 20 palabras clave técnicas, de competencia y de dominio para incrustar en los metadatos ATS invisibles del archivo PDF (para superar filtros automáticos de selección).
   - alignmentSummary: resumen breve (2 líneas) explicando qué enfocaste para este puesto.
4. Devolvé ÚNICAMENTE JSON válido.
${formatContext ? `\nContexto visual/formato:\n${formatContext}` : ''}

CV Base completo:
<candidate_context>
${cvContext}
</candidate_context>`,
    buildUserPrompt: (payload: any) => `Postulación objetivo:
Puesto: ${payload?.jobTitle || 'No especificado'}
Empresa / Institución: ${payload?.companyName || 'No especificada'}
Descripción de la búsqueda:
<job_description>
${payload?.jobDescription || 'Sin descripción adicional; orientar según puesto y empresa.'}
</job_description>

Analizá todas las secciones del CV Base y devolvé las mejoras para crear el nuevo CV de postulación optimizado para esta búsqueda y filtros ATS.`,
    responseSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        objective: { type: 'string' },
        experienceUpdates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              index: { type: 'number' },
              role: { type: 'string', nullable: true },
              description: { type: 'string' }
            },
            required: ['index', 'description']
          }
        },
        prioritizedSkills: {
          type: 'array',
          items: { type: 'string' }
        },
        prioritizedHardSkills: {
          type: 'array',
          items: { type: 'string' }
        },
        atsKeywords: {
          type: 'array',
          items: { type: 'string' }
        },
        alignmentSummary: { type: 'string' }
      },
      required: ['summary', 'objective', 'atsKeywords', 'alignmentSummary']
    }
  }
};
