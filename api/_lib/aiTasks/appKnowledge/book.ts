export const BOOK_KNOWLEDGE = `CONOCÉS ESTOS PASOS DEL ESTUDIO DE LIBROS (docType book): book_source_type (1. Origen), book_organize (2. Organización de Páginas), book_cover (3. Tapa), book_back_cover (4. Contratapa), book_foliado (5. Encuentro un número), book_imposition (6. Armado y Guías), book_preview_export (7. Exportar PDF Final).

FLUJO TÍPICO BOOK STUDIO (docType book):
1. Origen: la persona carga su PDF (puede ser estándar de 1 página por hoja, o fotocopia/escaneado de 2 páginas por hoja) y elige si lo imprime en su casa (hoja A4) o lo lleva a una imprenta (hoja A3).
2. Organización de Páginas: revisa el orden visual, rota páginas desalineadas o inserta hojas en blanco. En modo "hoja común" este paso se saltea.
3. Tapa: puede usar un diseño preset, subir su propia imagen, o dejar la tapa sin diseño especial. Opcionalmente agrega un retiro de tapa (hoja en blanco detrás de la tapa).
4. Contratapa: igual que la tapa, pero para el cierre posterior del libro. Opcionalmente agrega un retiro de contratapa.
5. Encuentro un número: para calibrar la numeración real, la persona hace clic en una miniatura, escribe el número impreso que ve y presiona "Encontrado". Solo necesita un número.
6. Armado y Guías: define el destino de la cubierta (A = dentro del mismo archivo, B = en un archivo aparte, C = continua con lomo), el grosor del papel para el lomo, si aplica compensación de creep, el modo de exportación (máxima calidad o rasterizado), si mostrar guías de armado en la vista previa, si generar un ZIP por cuadernillo, y la dirección de lectura.
7. Exportar PDF Final: revisa el resumen (páginas totales, hojas necesarias, tipo de armado) y descarga el archivo listo para imprimir.

BLOQUE DE CONOCIMIENTO — IMPRIMIR EN CASA VS LLEVAR A LA IMPRENTA (responde SIEMPRE que pregunten por esto, docType book):
- Impresora de casa: casi ninguna impresora doméstica llega a imprimir hasta el borde; siempre deja un borde blanco (~5 mm) que no se usa. Por eso conviene el destino A (la cubierta dentro del mismo archivo) y el grosor "Sin grosor" si el libro se anilla o se corta con guillotina (la cuchilla de corte recta). Papel común de 80 g, hoja común (A4). Imprimir UNA hoja de prueba primero y revisar centrado y doble cara antes de imprimir todo.
- En casa el acabado típico es: imprimir de los dos lados (frente y dorso), doblar las hojas a la mitad y anillar, o cortar con guillotina. El resultado queda con un borde blanco parejo, sin riesgo de que el corte toque el diseño.
- Imprenta: usan papel grueso (más de 180 g) para la cubierta y papel común para el interior. El grosor del lomo depende de la cantidad de hojas: en el paso 6 se ve en vivo el lomo estimado al elegir el grosor del papel interior. El destino habitual es C (una sola hoja que envuelve todo: contratapa, lomo y tapa) o B (la cubierta en un archivo aparte).
- Imprenta y corte: si el diseño llega hasta el borde, hace falta un margen extra para que el corte no se lleve parte del dibujo (sangrado) y las indicaciones por dónde cortar (marcas de corte, el interruptor "Mostrar guías de armado" del paso 6). Si no hay ese margen extra, puede quedar un filete blanco fino en el borde cortado.
- Libros largos: no se dobla todo de una sola vez; se arma por grupos de hojas dobladas (cuadernillos). El interruptor de ZIP por cuadernillo separa el archivo un cuadernillo por archivo, que es la forma en que suele trabajar la imprenta.
- Compensación de creep: al doblar muchas hojas, las del centro quedan corridas unos puntos respecto del borde; el interruptor del paso 6 lo compensa solo. Solo hace falta en libros con muchas páginas y papel grueso.
- Regla simple para recomendar: si lo imprime la persona en su casa → destino A, grosor "Sin grosor" y margen de borde respetado. Si lo lleva a la imprenta → destino C, grosor del papel interior, "Mostrar guías de armado" activado y doble cara cuidada.
- Consejo final honesto: cada imprenta tiene sus propios requisitos (cómo quiere el archivo, si acepta el lomo estimado, si pide sangrado). Antes de mandar a imprimir conviene consultarle a la imprenta cómo quiere recibirlo.

ESTADO DEL EDITOR (editorState, solo guía):
- Si el documento es un libro (docType "book"), editorState trae: activeStepId, mode ("normal" o "fotocopia"), hasCustomCover, hasCustomBackCover, hasRefCalibration, destination ("A", "B" o "C"), exportMode ("vector" o "raster"), applyCreep, zipByBooklet, showGuides, readingDirection ("ltr" o "rtl") y pdfPageCount.`;
