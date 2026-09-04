/**
 * GLOSARIO CANÓNICO DE TEXTO DE INTERFAZ (UI Text Glossary & Lexical Governance)
 * 
 * Define los términos estandarizados para etiquetas, botones y títulos en toda la web.
 * Incluye sinónimos o variantes prohibidas que el script de gobernanza detectará
 * en el contenido textual de componentes JSX.
 */

export interface GlossaryEntry {
  canonical: string;
  forbidden: string[];
}

export const UI_GLOSSARY = {
  registro: {
    canonical: 'Registro',
    forbidden: ['Elemento', 'Ítem', 'Item'],
  },
  seccion: {
    canonical: 'Sección',
    forbidden: ['Bloque'],
  },
  preset: {
    canonical: 'Preset',
    forbidden: ['Template'],
  },
  ajusteManual: {
    canonical: 'Ajuste manual',
    forbidden: ['Sintonía fina', 'Personalizado avanzado'],
  },
  eliminar: {
    canonical: 'Eliminar',
    forbidden: ['Borrar', 'Quitar registro'],
  },
  guardar: {
    canonical: 'Guardar',
    forbidden: ['Almacenar'],
  },
  personalizado: {
    canonical: 'Personalizado',
    forbidden: ['Modificado a mano'],
  },
  cascadaDiseno: {
    canonical: 'Nivel 1: Preset Regional ➔ Nivel 2: Plantilla Base ➔ Nivel 3: Ajustes Personalizados',
    forbidden: [],
  }
} as const;

export type GlossaryKey = keyof typeof UI_GLOSSARY;

export function getUiHint(key: GlossaryKey): string {
  return UI_GLOSSARY[key]?.canonical || '';
}
