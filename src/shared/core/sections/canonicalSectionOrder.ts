/**
 * ÚNICA fuente de verdad del orden "normal" de un CV. Todo lo demás
 * (dock, formato de fallback, preset visual, widget de reordenamiento)
 * lee de acá — nadie vuelve a declarar su propia lista de 19 ids.
 */
export const CANONICAL_SECTION_ORDER: string[] = [
  'contacto',
  'datos-personales',
  'frase',
  'resumen',
  'experiencia',
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
  'certificados',
  'firma'
];
