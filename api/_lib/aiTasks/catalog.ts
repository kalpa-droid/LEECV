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
  }
};
