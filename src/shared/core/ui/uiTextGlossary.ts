/**
 * NÚCLEO — MOTOR DE GLOSARIO DE TEXTOS Y CONSEJOS DE UI (uiTextGlossary.ts)
 * 
 * Centraliza la prosa explicativa y los consejos contextuales (hints)
 * de toda la interfaz para evitar duplicación de texto y mantener una
 * densidad de información limpia y concisa.
 */

export interface UiHintItem {
  id: string;
  title?: string;
  text: string;
}

export const UI_GLOSSARY = {
  hints: {
    draftDot: {
      id: 'draftDot',
      title: 'Borrador sin guardar',
      text: 'Indica cambios pendientes de guardar en este currículum.'
    },
    atsScore: {
      id: 'atsScore',
      title: 'Compatibilidad ATS',
      text: 'Evalúa la compatibilidad del currículum con motores de selección corporativos.'
    },
    exportPdf: {
      id: 'exportPdf',
      title: 'Descarga PDF Nativo',
      text: 'Genera el PDF con tipografías vectoriales integradas y enlaces activos.'
    },
    jsonBackup: {
      id: 'jsonBackup',
      title: 'Copia de Respaldos JSON',
      text: 'Permite exportar e importar tu currículum completo en formato JSON.'
    },
    redes: {
      id: 'redes',
      title: 'Redes Sociales & Enlaces',
      text: 'Enlace tus perfiles profesionales (LinkedIn, GitHub, Portafolio) con formato reconocido por ATS.'
    },
    resumen: {
      id: 'resumen',
      title: 'Resumen Profesional (Elevator Pitch)',
      text: 'Presentación concisa destacada debajo de la cabecera sin título de sección en el PDF.'
    },
    manualAdjustment: {
      id: 'manualAdjustment',
      title: 'Ajuste Manual de Sección',
      text: 'Controla la columna, el orden vertical, los bordes de contenedor y los saltos de página del PDF.'
    },
    containerStyle: {
      id: 'containerStyle',
      title: 'Estilos de Contenedor y Bordes',
      text: 'Aplica estilos visuales (Acento, Primario, Neutro, Limpio) a los bloques de contenido.'
    }
  } as Record<string, UiHintItem>
};

export function getUiHint(hintId: string): UiHintItem {
  return UI_GLOSSARY.hints[hintId] || { id: hintId, text: '' };
}
