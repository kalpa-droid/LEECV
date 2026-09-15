/**
 * ÚNICA fuente de verdad del orden "normal" de un CV. Todo lo demás
 * (dock, formato de fallback, preset visual, widget de reordenamiento)
 * lee de acá — nadie vuelve a declarar su propia lista de 19 ids.
 */
export const MAX_CUSTOM_SLOTS = 5;

export const CANONICAL_SECTION_ORDER: string[] = [
  'contacto',
  'datos-personales',
  'frase',
  'objetivo',
  'resumen',
  'experiencia',
  'logros',
  'portafolio',
  'formacion',
  'profesion',
  'cursos',
  'informatica',
  'proyectos',
  'publicaciones',
  'referencias',
  'habilidades',
  'competencias',
  'idiomas',
  'redes',
  'personalizada-1',
  'personalizada-2',
  'personalizada-3',
  'personalizada-4',
  'personalizada-5',
  'certificados',
  'firma'
];
