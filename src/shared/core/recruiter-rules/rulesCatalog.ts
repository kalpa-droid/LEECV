import { CVData } from '../../../types/cv';

export interface RecruiterRule {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  goodExample?: string;
  badExample?: string;
  articleSlug?: string;
  fixAction?: 'hide_field' | 'edit_section'; 
  /**
   * evaluate retorna:
   * - 'pass': La regla se cumple (no hay problema).
   * - 'fail': La regla no se cumple (hay que mostrar advertencia).
   * - 'not_applicable': La regla no aplica a este CV.
   */
  evaluate: (cvData: CVData, jobTargetText?: string) => 'pass' | 'fail' | 'not_applicable';
}

export const RULES_CATALOG: RecruiterRule[] = [
  // 1. Datos Personales
  {
    id: 'sensitive_data',
    severity: 'high',
    title: 'Datos personales sensibles innecesarios',
    description: 'Evitá incluir DNI, CUIT, fecha de nacimiento, estado civil, nacionalidad o dirección exacta. Estos datos pueden generar sesgos, ocupan espacio valioso, y no son necesarios hasta la etapa de contratación.',
    goodExample: 'Ciudad Autónoma de Buenos Aires',
    badExample: 'DNI: 35.xxx.xxx, Calle Falsa 123',
    articleSlug: 'datos-que-jamas-debes-poner',
    fixAction: 'hide_field',
    evaluate: (cvData) => {
      const pi = cvData.personalInfo;
      if (!pi) return 'not_applicable';
      
      const hidden = new Set(cvData.hiddenFields || []);
      
      const hasSensitive = 
        (pi.dni && !hidden.has('dni')) || 
        (pi.cuit && !hidden.has('cuit')) || 
        (pi.birthDate && !hidden.has('birthDate')) || 
        (pi.estadoCivil && !hidden.has('estadoCivil')) || 
        (pi.nacionalidad && !hidden.has('nacionalidad'));
        
      return hasSensitive ? 'fail' : 'pass';
    }
  },
  {
    id: 'missing_contact',
    severity: 'high',
    title: 'Datos de contacto esenciales ausentes',
    description: 'Los sistemas ATS descartan postulaciones que carecen de un correo electrónico o teléfono.',
    articleSlug: 'guia-completa-cv',
    fixAction: 'edit_section',
    evaluate: (cvData) => {
      const pi = cvData.personalInfo;
      if (!pi) return 'fail';
      if (!pi.email || !pi.phone) return 'fail';
      return 'pass';
    }
  },

  // 2. Título del Documento
  {
    id: 'document_title',
    severity: 'medium',
    title: 'Nombre genérico en el documento',
    description: 'El título del currículum nunca debe ser "CV" ni "Currículum". Usá tu Nombre y Apellido.',
    goodExample: 'Juan-Perez.pdf',
    badExample: 'CV_Final_2024.pdf',
    articleSlug: 'guia-completa-cv',
    evaluate: (cvData) => {
      const title = cvData.title?.toLowerCase() || '';
      if (!title) return 'not_applicable';
      if (title.includes('cv') || title.includes('curriculum') || title.includes('currículum')) {
        return 'fail';
      }
      return 'pass';
    }
  },

  // 3. Perfil / Summary
  {
    id: 'summary_length',
    severity: 'medium',
    title: 'Perfil profesional muy largo',
    description: 'El perfil debe ser un resumen ejecutivo de 4 a 5 renglones. Enfocate en quién sos, qué buscás y tus años de experiencia.',
    goodExample: 'Especialista en Marketing con 5 años de experiencia...',
    badExample: 'Un texto enorme de 15 renglones repitiendo toda la experiencia laboral...',
    articleSlug: 'guia-completa-cv',
    fixAction: 'edit_section',
    evaluate: (cvData) => {
      const summary = cvData.summary || cvData.personalInfo?.summary || '';
      if (!summary) return 'not_applicable';
      // Aproximadamente 400 caracteres son 4-5 líneas.
      return summary.length > 400 ? 'fail' : 'pass';
    }
  },

  // 4. Experiencia y Tareas
  {
    id: 'experience_action_verbs',
    severity: 'medium',
    title: 'Tareas descritas de forma pasiva',
    description: 'Reemplazá tareas pasivas ("hacía", "manejaba") por sustantivos de acción o verbos fuertes terminados en -ción ("Administración de...", "Implementación de...").',
    goodExample: 'Implementación de tableros de control en PowerBI.',
    badExample: 'Manejaba el Excel de ventas y hacía reportes.',
    articleSlug: 'sustantivos-accion-clave',
    fixAction: 'edit_section',
    evaluate: (cvData) => {
      if (!cvData.experience || cvData.experience.length === 0) return 'not_applicable';
      
      const passiveWords = ['hacía', 'manejaba', 'ayudaba', 'tareas de', 'encargado de hacer', 'me ocupaba de'];
      
      for (const exp of cvData.experience) {
        const textToCheck = (exp.description || '') + ' ' + (exp.bulletPoints?.join(' ') || '');
        const lowerText = textToCheck.toLowerCase();
        if (passiveWords.some(w => lowerText.includes(w))) {
          return 'fail';
        }
      }
      return 'pass';
    }
  },
  {
    id: 'short_jobs_unexplained',
    severity: 'low',
    title: 'Trabajos muy cortos sin explicar',
    description: 'Los ATS filtran por antigüedad. Si tenés trabajos de menos de 6 meses, aclará si fue "temporario" o "por proyecto".',
    goodExample: 'Desarrollador Frontend (Proyecto de 3 meses)',
    badExample: 'Desarrollador Frontend (Enero 2023 - Marzo 2023)',
    articleSlug: 'huecos-trabajos-cortos-freelance',
    fixAction: 'edit_section',
    evaluate: (cvData) => {
      if (!cvData.experience || cvData.experience.length === 0) return 'not_applicable';
      // Esta regla es compleja de evaluar con precisión absoluta sin procesar fechas, 
      // pero podemos buscar descripciones cortas que contengan indicadores de temporalidad si las fechas son cercanas.
      // Retornamos 'pass' por defecto a menos que detectemos una falla evidente (simplificado para el catálogo puro).
      return 'pass'; 
    }
  },
  {
    id: 'no_experience_tips',
    severity: 'info' as any,
    title: 'Currículum sin experiencia formal',
    description: 'Si no tenés experiencia formal, recordá que podés incluir prácticas, pasantías, voluntariado, docencia, investigación, proyectos académicos, o negocios familiares profesionalizados (con nombre propio y fechas).',
    articleSlug: 'cv-sin-experiencia',
    fixAction: 'edit_section',
    evaluate: (cvData) => {
      if (!cvData.experience || cvData.experience.length === 0) {
        return 'fail'; // Falla (muestra el aviso) si NO hay experiencia
      }
      return 'pass';
    }
  },
  {
    id: 'filler_words',
    severity: 'medium',
    title: 'Uso de frases de relleno sin valor',
    description: 'Evitá adjetivos genéricos (e.g. "altamente motivado", "excelente comunicador") o frases hechas que no se pueden probar. Cambialos por ejemplos medibles.',
    goodExample: 'Resolución del 90% de tickets críticos en < 2h',
    badExample: 'Altamente enfocado en la resolución rápida de problemas',
    articleSlug: 'frases-relleno',
    fixAction: 'edit_section',
    evaluate: (cvData) => {
      const summary = (cvData.summary || cvData.personalInfo?.summary || '').toLowerCase();
      let hasFiller = false;
      const fillerWords = [
        'altamente motivado', 'excelente comunicador', 'trabajo bien en equipo',
        'orientado a resultados', 'proactivo', 'detallista', 'perfeccionista',
        'acostumbrado a trabajar bajo presión', 'amplia experiencia',
        'buscando nuevos retos'
      ];
      
      if (fillerWords.some(fw => summary.includes(fw))) {
        hasFiller = true;
      }
      
      if (!hasFiller && cvData.experience) {
        for (const exp of cvData.experience) {
          const textToCheck = ((exp.description || '') + ' ' + (exp.bulletPoints?.join(' ') || '')).toLowerCase();
          if (fillerWords.some(fw => textToCheck.includes(fw))) {
            hasFiller = true;
            break;
          }
        }
      }
      
      return hasFiller ? 'fail' : 'pass';
    }
  },
  // 5. Formación y Cursos
  {
    id: 'education_abandoned',
    severity: 'low',
    title: 'Formación "abandonada"',
    description: 'En lugar de poner "Abandonado" o "Incompleto", poné "En curso" o simplemente indicá los años cursados. Si el título está en trámite, cuenta como recibido.',
    goodExample: 'Licenciatura en Sistemas (2018 - 2021)',
    badExample: 'Licenciatura en Sistemas (Abandonado)',
    articleSlug: 'formacion-y-cursos',
    fixAction: 'edit_section',
    evaluate: (cvData) => {
      if (!cvData.education || cvData.education.length === 0) return 'not_applicable';
      const abandonedWords = ['abandonado', 'abandonó', 'incompleto'];
      for (const edu of cvData.education) {
        const lowerDesc = (edu.description || '').toLowerCase();
        if (abandonedWords.some(w => lowerDesc.includes(w))) {
          return 'fail';
        }
      }
      return 'pass';
    }
  },
  {
    id: 'education_primary',
    severity: 'low',
    title: 'Educación primaria o secundaria innecesaria',
    description: 'Si tenés estudios universitarios o terciarios, no es necesario incluir la escuela secundaria ni la primaria.',
    articleSlug: 'formacion-y-cursos',
    fixAction: 'edit_section',
    evaluate: (cvData) => {
      if (!cvData.education || cvData.education.length < 2) return 'not_applicable';
      const hasUniversity = cvData.education.some(e => 
        e.degree?.toLowerCase().includes('licenciatura') || 
        e.degree?.toLowerCase().includes('ingeniería') || 
        e.degree?.toLowerCase().includes('tecnicatura') ||
        e.degree?.toLowerCase().includes('grado')
      );
      const hasBasic = cvData.education.some(e => 
        e.degree?.toLowerCase().includes('primaria') || 
        e.degree?.toLowerCase().includes('secundaria') || 
        e.degree?.toLowerCase().includes('bachiller')
      );
      return (hasUniversity && hasBasic) ? 'fail' : 'pass';
    }
  },
  {
    id: 'courses_relevance',
    severity: 'low',
    title: 'Cursos sin descripción o muy antiguos',
    description: 'Los cursos deben ser de los últimos 5-6 años y relevantes a la vacante. Asegurate de incluir una breve línea de qué se aprendió.',
    articleSlug: 'formacion-y-cursos',
    fixAction: 'edit_section',
    evaluate: (cvData) => {
      const courses = cvData.coursesAndCertificates || [];
      if (courses.length === 0) return 'not_applicable';
      // Buscamos si hay cursos con el campo description vacío
      for (const course of courses) {
        if (!course.description || course.description.trim().length === 0) {
          return 'fail';
        }
      }
      return 'pass';
    }
  },

  // 6. Herramientas, Idiomas, Competencias
  {
    id: 'tool_levels_visual',
    severity: 'medium',
    title: 'Herramientas o idiomas sin nivel de texto claro',
    description: 'Evitá usar barras de progreso, círculos o estrellas. Los ATS no pueden leer gráficos. Usá niveles claros en texto: Básico, Intermedio, Avanzado, o A1-C2.',
    goodExample: 'Excel (Avanzado)',
    badExample: 'Excel [████░░]',
    articleSlug: 'herramientas-idiomas-barras',
    fixAction: 'edit_section',
    evaluate: (cvData) => {
      const allSkills = [
        ...(cvData.hardSkills || []),
        ...(cvData.skills || []),
        ...(cvData.languages?.map(l => `${l.language} ${l.proficiency || ''}`) || [])
      ];
      if (allSkills.length === 0) return 'not_applicable';
      
      const progressSymbols = /[█▓▒░★☆●○]/;
      for (const skill of allSkills) {
        const text = typeof skill === 'string' ? skill : (skill.name || '');
        if (progressSymbols.test(text)) {
          return 'fail';
        }
      }
      return 'pass';
    }
  },
  {
    id: 'ai_tool_unspecific',
    severity: 'low',
    title: 'IA mencionada de forma genérica',
    description: 'Para los ATS, debés nombrar la herramienta específica de IA (ChatGPT, Claude, Copilot, Midjourney), nunca pongas "IA avanzado" a secas.',
    goodExample: 'ChatGPT (Avanzado)',
    badExample: 'Inteligencia Artificial (Avanzado)',
    articleSlug: 'herramientas-idiomas-barras',
    fixAction: 'edit_section',
    evaluate: (cvData) => {
      const allSkills = [
        ...(cvData.hardSkills || []),
        ...(cvData.skills || [])
      ];
      if (allSkills.length === 0) return 'not_applicable';
      
      for (const skill of allSkills) {
        const text = typeof skill === 'string' ? skill.toLowerCase() : (skill.name || '').toLowerCase();
        if (text === 'ia' || text.includes('inteligencia artificial')) {
          // Si menciona IA genérico sin especificar la herramienta
          if (!text.includes('chatgpt') && !text.includes('claude') && !text.includes('copilot') && !text.includes('midjourney') && !text.includes('gemini')) {
            return 'fail';
          }
        }
      }
      return 'pass';
    }
  },
  {
    id: 'competencies_format',
    severity: 'low',
    title: 'Competencias largas o genéricas',
    description: 'Las competencias (blandas) deben ser de una sola palabra (ej. Liderazgo, Negociación). Si se desarrolla en una frase larga, es en realidad una tarea. Evitá clichés como "responsable", "puntual" o "buena actitud".',
    goodExample: 'Negociación',
    badExample: 'Soy una persona muy responsable y puntual que aprende rápido',
    articleSlug: 'herramientas-idiomas-barras',
    fixAction: 'edit_section',
    evaluate: (cvData) => {
      const softSkills = cvData.skills || [];
      if (softSkills.length === 0) return 'not_applicable';
      
      const cliches = ['responsable', 'puntual', 'buena actitud', 'aprendo rápido', 'proactivo'];
      
      for (const skill of softSkills) {
        const text = typeof skill === 'string' ? skill : (skill.name || '');
        const wordCount = text.split(/\s+/).length;
        if (wordCount > 3) return 'fail'; // Frase larga
        if (cliches.some(c => text.toLowerCase().includes(c))) return 'fail';
      }
      return 'pass';
    }
  },

  // 7. Orden y Diseño Global
  {
    id: 'section_order',
    severity: 'medium',
    title: 'Orden incorrecto: Formación antes que Experiencia',
    description: 'Si tenés experiencia laboral, la sección de Experiencia debe ir SIEMPRE antes que la Formación académica. Los ATS y reclutadores buscan primero tu último empleo.',
    articleSlug: 'formacion-y-cursos',
    fixAction: 'edit_section',
    evaluate: (cvData) => {
      if (!cvData.experience?.length || !cvData.education?.length) return 'not_applicable';
      
      const order = cvData.layout?.sectionOrder || [];
      if (order.length > 0) {
        const expIndex = order.indexOf('experiencia');
        const eduIndex = order.indexOf('formacion');
        if (expIndex !== -1 && eduIndex !== -1 && eduIndex < expIndex) {
          return 'fail';
        }
      }
      return 'pass';
    }
  },
  {
    id: 'multicol_layout',
    severity: 'warning' as any,
    title: 'Diseño multicolumna detectado',
    description: 'Algunos parsers ATS antiguos pueden leer el sidebar y la columna principal como líneas continuas mezcladas. (Podés generar una versión especial ATS en la app sin cambiar tu diseño principal).',
    articleSlug: 'diseno-y-plantillas',
    evaluate: (cvData) => {
      // Simplificado: asumimos layout basado en sectionOrder
      const hasSidebar = cvData.layout?.sectionOrder?.includes('sidebar') || false;
      return hasSidebar ? 'fail' : 'pass';
    }
  },

  // 8. Personalización a la Vacante (Requiere `jobTargetText`)
  {
    id: 'keyword_match',
    severity: 'high',
    title: 'Faltan palabras clave de la vacante',
    description: 'Es vital copiar las palabras reales del requisito de la vacante (cargo, herramientas, años, carrera).',
    articleSlug: 'como-adaptar-tu-cv',
    evaluate: (cvData, jobTargetText) => {
      if (!jobTargetText) return 'not_applicable';
      // Esta evaluación se hace mucho mejor usando IA en el backend (atsAiAnalysis).
      // Localmente podemos hacer una búsqueda rudimentaria o simplemente retornar pass para no dar falsos positivos.
      return 'pass'; 
    }
  }
];
