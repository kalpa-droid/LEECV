export const modalsCatalog = {
  cardExport: {
    title: 'Impresión de Tarjetas de Presentación',
    loadingPreview: 'Generando preview de imposición y QR...',
  },
  pdfProgress: {
    generatingTitle: 'Generando Documento PDF A4...',
    generatingSub: 'Procesando páginas, imágenes y anexos. La descarga iniciará en unos instantes.',
    successTitle: '¡PDF Generado Exitosamente!',
    successSub: 'El archivo PDF A4 y la copia de respaldo .JSON se han descargado correctamente.',
  },
  saveAsVersion: {
    title: 'Guardar una copia para...',
    badge: '📋 Crea una versión independiente etiquetada',
    description: 'Esta función duplica tu currículum actual asignándole un ID nuevo y una etiqueta de puesto. Tu borrador original permanece intacto.',
    categoryLabel: 'Categoría de Puesto:',
    suggestedLabel: 'Puesto sugerido:',
    customLabel: 'O escribe un puesto / etiqueta personalizada:',
    resultingTagLabel: 'Etiqueta de versión a asignar:',
  },
  saveModal: {
    title: 'Guardar Documento',
    cloudStatusBadge: '⚙️ Estado de Nube & Drive',
    saveActiveTitle: 'Guardar Cambios (Sobrescribir Activo)',
    saveActiveSub: 'Actualiza el documento activo en tu Navegador, Supabase y Google Drive simultáneamente.',
    saveCopyTitle: 'Guardar una copia para...',
    saveCopyBadge: 'Copia Independiente',
    saveCopySub: 'Crea una nueva copia con ID único etiquetada para un puesto específico (ej. "Docencia", "Gerente").',
    categoryLabel: 'Categoría de Puesto:',
    suggestedLabel: 'Puesto sugerido:',
    customLabel: 'O escribe un puesto / etiqueta personalizada:',
    resultingTagLabel: 'Etiqueta resultante:',
    saveCopyBtnPrefix: 'Guardar como copia para "',
    downloadPortableTitle: 'Descargar Copia Portátil (.JSON / .ZIP)',
    downloadPortableBadge: 'Llevar a otra PC',
    downloadPortableSub: 'Elige descargar un archivo .JSON liviano o un paquete .ZIP completo para llevar tu CV en pendrive o enviar por email a otra computadora.',
    publishWebTitle: 'Publicar en la Web (Link Público)',
    publishWebBadge: '🌐 Link Público',
    publishWebSub: 'Genera un enlace web público único para compartir tu currículum online.',
  },
};

export type ModalsCatalog = typeof modalsCatalog;
