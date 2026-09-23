export const ROUTES = [
  '/privacidad',
  '/terminos',
  '/reembolsos',
  '/blog/filtros-ats-curriculum-vitae',
  '/blog/guia-imposicion-libros-caballete',
  '/blog/tarjetas-personales-qr-networking',
  '/blog/como-escribir-carta-presentacion-entrevistas',
  '/blog/carta-vs-cv-cuando-usar-cada-una',
  '/blog/errores-que-matan-tu-carta-de-presentacion',
  '/blog/como-estructurar-cv-superar-filtros-ats',
  '/blog/redactar-carta-de-presentacion-con-ia',
  '/blog/manual-diseno-impresion-tarjetas-personales',
  '/blog/como-maquetar-doblar-libro-caballete'
];

export const getRouteMetadata = (route) => {
  const metaMap = {
    '/privacidad': {
      title: 'Política de Privacidad | LEECV',
      description: 'Política de privacidad y protección de datos de LEECV.',
      content: ['<h1>Política de Privacidad</h1>', '<p>En LEECV respetamos tu privacidad y nos tomamos en serio la protección de tus datos personales.</p>'],
      type: 'WebPage'
    },
    '/terminos': {
      title: 'Términos y Condiciones | LEECV',
      description: 'Términos y condiciones de uso de los servicios de LEECV.',
      content: ['<h1>Términos y Condiciones</h1>', '<p>Al utilizar LEECV aceptas los siguientes términos de servicio.</p>'],
      type: 'WebPage'
    },
    '/reembolsos': {
      title: 'Política de Reembolsos | LEECV',
      description: 'Política de devoluciones y reembolsos de LEECV.',
      content: ['<h1>Política de Reembolsos</h1>', '<p>Conoce nuestra política de reembolsos para cuentas premium y servicios adicionales.</p>'],
      type: 'WebPage'
    },
    '/blog/filtros-ats-curriculum-vitae': {
      title: 'Cómo optimizar tu CV para superar los sistemas ATS',
      description: 'Los Applicant Tracking Systems (ATS) analizan tu currículum antes de que lo vea un reclutador. Descubre cómo estructurar tus secciones para maximizar tu puntaje.',
      content: [
        'Un sistema ATS (Applicant Tracking System) es un software automatizado que escanea y clasifica las postulaciones de empleo según palabras clave y formato de documento.',
        '1. Usa una estructura de 1 columna limpia: Las tablas complejas y los gráficos flotantes dificultan la extracción automática de texto. Con el motor ATS de LEECV, tu CV exporta etiquetas legibles estándar.',
        '2. Incluye nombres de cargos y habilidades explícitas: Si te postulas a "Desarrollador Frontend", asegúrate de incluir palabras clave como React, TypeScript, HTML y CSS en tus experiencias.',
        '3. Guarda tu currículum como PDF con texto: Evita exportarlo como una imagen JPG o PNG. Un PDF normal permite seleccionar el texto, y eso es justo lo que necesita leer el escáner.',
        'Con el chequeador ATS incorporado en LEECV, puedes auditar tu currículum en tiempo real antes de enviarlo a cualquier oferta laboral.'
      ],
      type: 'Article'
    },
    '/blog/guia-imposicion-libros-caballete': {
      title: 'Cómo preparar tu libro para imprimirlo y doblarlo al medio',
      description: 'Para que un libro doblado al medio quede en orden, las páginas no se imprimen una tras otra: hay que reacomodarlas. Te explicamos cómo, y lo hacemos por ti.',
      content: [
        'Cuando imprimes un libro o folleto abrochado al centro (saddle-stitch / caballete), no puedes imprimir la página 1 al lado de la página 2 en la misma hoja de papel.',
        'En un libro de 8 páginas impreso en 2 hojas dobladas al medio:',
        '• Frente de la Hoja 1: Página 8 (izquierda) y Página 1 (derecha).',
        '• Dorso de la Hoja 1: Página 2 (izquierda) y Página 7 (derecha).',
        '• Frente de la Hoja 2: Página 6 (izquierda) y Página 3 (derecha).',
        '• Dorso de la Hoja 2: Página 4 (izquierda) y Página 5 (derecha).',
        'Studio Libros de LEECV reacomoda las páginas por ti automáticamente, ajusta el total al múltiplo de 4 que hace falta y te da el archivo listo para imprimir en tu casa o llevar a la imprenta.'
      ],
      type: 'Article'
    },
    '/blog/tarjetas-personales-qr-networking': {
      title: 'Diseño de Tarjetas Personales con Código QR',
      description: 'Aprende a combinar un diseño tipográfico impecable con enlaces QR interactivos para proyectar una imagen profesional inolvidable en cada reunión.',
      content: [
        'Una tarjeta personal física sigue siendo el elemento de contacto más ágil en conferencias, eventos de negocios y reuniones presenciales.',
        'Para maximizar su utilidad:',
        '1. Incluye un código QR dinámico: Conecta la tarjeta física a tu portafolio en línea, perfil de LinkedIn o tarjeta digital interactiva.',
        '2. Deja un margen de seguridad: Mantén el texto y el logo un poco alejados del borde, para que no se corten al recortar la tarjeta.',
        '3. Contraste y legibilidad: Utiliza tipografías nítidas y colores de alto contraste entre el texto y el fondo.',
        'En LEECV Tarjetas, puedes subir tu logo con recorte libre, extraer los colores principales y armar una hoja con 9 tarjetas para imprimir en cartulina.'
      ],
      type: 'Article'
    },
    '/blog/como-escribir-carta-presentacion-entrevistas': {
      title: 'Cómo escribir una carta de presentación que consiga entrevistas',
      description: 'La carta de presentación es tu oportunidad de contar la historia detrás de tu CV. Aprende la estructura de 4 párrafos que capta la atención de los reclutadores.',
      content: [
        'Mientras que tu CV enumera tus logros pasados, la carta de presentación explica por qué esos logros te convierten en el candidato ideal para el puesto específico al que te postulas.',
        '1. Saludo personalizado y gancho inicial: Evita frases genéricas. Menciona el puesto exacto y un logro relevante que demuestre tu entusiasmo.',
        '2. Evidencia concreta: Demuestra con métricas cómo resolviste problemas similares a los que enfrenta la empresa.',
        '3. Cierre proactivo: Expresa tu deseo de profundizar en una entrevista y agradece el tiempo del selector.',
        'Con la asistencia de IA en LEECV Cartas, puedes conectar tu CV y la oferta laboral para redactar una propuesta adaptada en segundos.'
      ],
      type: 'Article'
    },
    '/blog/carta-vs-cv-cuando-usar-cada-una': {
      title: 'Carta de Presentación vs CV: cuándo usar cada una',
      description: 'Comprende las diferencias fundamentales entre ambos documentos y cómo usarlos en conjunto para destacar en postulaciones competitivas.',
      content: [
        'Existe una confusión frecuente sobre si enviar solo el CV o adjuntar también una carta. La regla general es: siempre que la postulación lo permita, adjunta ambas.',
        '• El CV es cuantitativo y estructurado: resume tu trayectoria en listas limpias y escaneables.',
        '• La Carta de Presentación es narrativa y enfocada: conecta tu motivación personal con los valores y necesidades de la empresa.',
        'Al sincronizar ambos documentos en LEECV, mantienes la misma paleta cromática y tipografía para presentar un legajo visualmente armónico.'
      ],
      type: 'Article'
    },
    '/blog/errores-que-matan-tu-carta-de-presentacion': {
      title: '5 Errores que matan tu carta de presentación',
      description: 'Descubre las fallas más comunes al redactar cartas de presentación y cómo evitarlas para asegurar que tu postulación pase los primeros filtros.',
      content: [
        'Incluso profesionales con excelente trayectoria son descartados por errores evitables en su carta de presentación:',
        '1. Repetir el CV palabra por palabra: La carta debe aportar contexto y motivación, no resumir el currículum.',
        '2. Cartas genéricas sin personalizar: Enviar la misma carta a 20 empresas distintas destruye tu tasa de respuesta.',
        '3. Errores tipográficos en el nombre de la empresa o recruiter: Revisa siempre los datos antes de exportar.',
        '4. Longitud excesiva: Mantén la carta en una sola hoja, limpia, con 3 a 4 párrafos concisos.',
        'Utiliza LEECV para ver cómo queda la carta impresa y comprobar que combine con tu CV.'
      ],
      type: 'Article'
    },
    '/blog/como-estructurar-cv-superar-filtros-ats': {
      title: 'Cómo estructurar tu CV para superar los filtros ATS',
      description: 'Aprende a maquetar tu currículum con una plantilla de 1 columna, ordenar las secciones correctamente y usar el chequeo ATS para asegurar que los robots lean tu perfil.',
      content: [
        'Paso 1: Elige una plantilla de 1 columna. Las plantillas de dos columnas suelen romper la jerarquía de lectura de los sistemas ATS, haciendo que mezclen tu experiencia con tus habilidades.',
        'Paso 2: Ordena tus secciones. Datos personales arriba, luego un breve resumen, seguido de tu experiencia laboral (la sección más importante), educación y finalmente habilidades.',
        'Paso 3: Usa el chequeo ATS en tiempo real de LEECV. Nuestra herramienta te avisará si falta alguna sección clave o si hay problemas en la extracción del texto de tu PDF.'
      ],
      type: 'Article'
    },
    '/blog/redactar-carta-de-presentacion-con-ia': {
      title: 'Paso a paso: redactar una carta de presentación con IA',
      description: 'Crea una carta de presentación perfectamente adaptada a los requerimientos del puesto en segundos, manteniendo un tono profesional y vinculada a tu CV.',
      content: [
        'Paso 1: Define los requerimientos del puesto. Antes de generar la carta, asegúrate de tener a mano la descripción de la vacante para dársela a la IA.',
        'Paso 2: Sincroniza tu CV. La IA leerá tus experiencias pasadas para justificar por qué eres el candidato ideal para esa vacante específica.',
        'Paso 3: Ajusta el tono y personaliza. Revisa el borrador generado, ajusta el nivel de formalidad y asegúrate de que refleje tu voz.'
      ],
      type: 'Article'
    },
    '/blog/manual-diseno-impresion-tarjetas-personales': {
      title: 'Manual de diseño e impresión de tarjetas personales',
      description: 'Todo lo que necesitas saber para imprimir tus tarjetas en casa o en una imprenta: cómo dejar márgenes seguros, sumar un código QR y armar una hoja con 9 tarjetas.',
      content: [
        'Paso 1: Deja margen para el corte. Extiende el color o el fondo de tu diseño un poquito más allá del borde. Así, si el corte sale apenas corrido, no quedan bordes blancos.',
        'Paso 2: El Código QR. Incluye un código QR que apunte a tu CV online o perfil de LinkedIn. Asegúrate de que el contraste sea alto para facilitar el escaneo.',
        'Paso 3: Una hoja con varias tarjetas. Para imprimir en casa o en una imprenta, LEECV arma automáticamente una hoja con 9 tarjetas ordenadas y listas para recortar.'
      ],
      type: 'Article'
    },
    '/blog/como-maquetar-doblar-libro-caballete': {
      title: 'Cómo maquetar y doblar tu primer libro en caballete',
      description: 'Aprende la regla de los múltiplos de 4 y el orden correcto de las hojas para lograr un libro perfecto abrochado al medio.',
      content: [
        'Paso 1: La regla del múltiplo de 4. Todo libro abrochado al medio (caballete) debe tener un número de páginas que sea múltiplo de 4 (8, 12, 16, 20, etc.).',
        'Paso 2: Carga tu PDF original de páginas simples. No intentes ordenarlas tú mismo. Sube tu archivo con las páginas del 1 al final en orden correlativo.',
        'Paso 3: Orden automático. Studio Libros tomará tus páginas simples y las acomodará en hojas dobles (por ejemplo, la página 8 junto a la 1), listas para imprimir de ambos lados y doblar.'
      ],
      type: 'Article'
    }
  };

  return metaMap[route] || null;
};
