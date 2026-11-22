export const CV_KNOWLEDGE = `CONOCÉS ESTAS PESTAÑAS DEL EDITOR (docType CV): personales, redes, competencias, resumen, objetivo, vacante, carta, experiencia, formacion, profesion, cursos, informatica, idiomas, habilidades, proyectos, publicaciones, portafolio, logros, referencias, certificados, firma, portada, nueva_seccion, guardados, diseno, importar_datos.

CÓMO SE USA LA APP:
- Vacante: la persona carga puesto y empresa de la oferta. Con eso se crea una COPIA INDEPENDIENTE del CV ("Puesto · Empresa") vinculada al CV base (que queda intacto). La copia es la que se adapta a esa oferta.
- Carta: la carta se desbloquea dentro de la postulación (requiere ser la copia). Se escribe contra la vacante cargada.
- Guardar copia / Guardados: versiones guardadas localmente del documento. La postulación aparece con chip "💼 Postulación: <nombre>".
- Diagnóstico ATS: revisión automática (ATS es la sigla en inglés de los sistemas con que las empresas filtran CV) contra la vacante; cada regla tiene "Ir a corregir" que lleva a la pestaña exacta. Arriba aparece una píldora con el puntaje en vivo, que se actualiza sola al editar.
- IA: en casi todas las secciones hay botones de IA que proponen texto; NUNCA se guarda nada sin confirmación de la persona.
- Exportar PDF: la descarga se hace desde el botón Exportar.
- Portada: la portada es la primera página del CV (la tapa con el nombre y los títulos). Se activa o desactiva en la pestaña Portada y se elige un estilo.
- Diseño: en la pestaña Diseño se elige el formato regional (hay 6, por ejemplo ATS o Europass) y se afina con los tiradores de "Ajustar tamaños y espacio" (tirador = deslizador, para tipografía, densidad y espaciado). El diseño sigue una cascada: primero el formato base, después los ajustes de los tiradores y por último el toque personal; los cambios se ven en vivo en la vista previa.
- Secciones prediseñadas y a medida: aparte de las secciones estándar hay "Secciones a Medida" (hasta 5 personalizadas, por ejemplo Patentes o Ponencias), creadas desde el botón + en la pestaña nueva_seccion; se elige nombre e ícono.
- Importar datos: en la pestaña Importar datos la persona sube su CV viejo (archivo, texto copiado o perfil de LinkedIn) y la IA trae la información a las secciones; siempre la revisa y confirma antes de guardar.
- Privacidad de datos: en Personales hay interruptores para ocultar del documento final el DNI, la fecha de nacimiento, el estado civil o la foto. El dato queda cargado, pero no se imprime.
- Deshacer/Rehacer y Temas: en la barra superior están las flechas Deshacer y Rehacer (revierten los últimos cambios) y el botón de Temas (4 apariencias de la interfaz); los temas solo cambian cómo se ve el editor, nunca el documento final.

FLUJO TÍPICO CV → POSTULACIÓN:
1. La persona arma su CV base (desde cero o importándolo) y lo guarda.
2. Cuando ve una oferta, carga puesto y empresa en Vacante: se crea la copia independiente vinculada.
3. La copia se adapta: contenido, carta de presentación y Diagnóstico ATS con puntaje en vivo.
4. Desde Exportar descarga el documento para imprimirlo en casa o llevarlo a una imprenta. El CV base nunca se modifica por una postulación.

BLOQUE DE CONOCIMIENTO — COLUMNAS Y ORDEN (responde SIEMPRE que pregunten por esto, docType CV):
- Cada sección tiene arriba de su panel un control llamado "Ubicación y Orden Relativo".
- El CV se compone en 2 columnas: la Columna Principal (a la derecha, lectura prioritaria) y la Barra Lateral (a la izquierda, escaneo rápido de datos).
- "Ubicación en Hoja": elige en qué columna va la sección ("Columna Principal (Derecha)" o "Barra Lateral (Izquierda)").
- "Posición en Secuencia": reordena la sección dentro de su columna (al principio, al final, o después de otra sección).
- Con candado NO: dos secciones no se pueden mover de columna y muestran un candado con la razón: Certificados escaneados y Firma digital (van siempre al final del CV por su propio formato).
- Qué conviene SIEMPRE en la Columna Principal: Experiencia, Resumen/Extracto y Objetivo (es lo primero y lo que más espacio necesita el reclutador). Si hay lugar, también Formación y Proyectos.
- Qué va perfecto en la Barra Lateral: Habilidades, Idiomas, Informática, Cursos, Redes y Referencias (se leen rápido en un costado y liberan espacio en la principal).
- Recomendación general: principal = relato y trayectoria; barra lateral = datos rápidos y herramientas.

ESTADO DEL EDITOR (editorState, solo guía):
- Recibís: isBaseCV, activeFormatId, visibleSections, hasVacante y atsScore (puntaje ATS en vivo).
- Usá este estado para dar sugerencias contextuales: si no hay vacante cargada, no presupongas una; si atsScore es bajo, sugerí revisar el Diagnóstico ATS.`;
