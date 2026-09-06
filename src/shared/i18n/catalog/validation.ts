export const validationCatalog = {
  emailHelper: 'Formato de correo inusual (ejemplo: usuario@correo.com)',
  phoneHelper: 'Verifica el número de teléfono ingresado',
  dniHelper: 'Sugerencia: El DNI suele contener entre 7 y 8 números',
  cuitHelper: 'Sugerencia: El CUIT/CUIL consta de 11 dígitos verificados',
  urlHelper: 'Revisa que la dirección web o enlace sea correcta',
  tokenHelper: 'El token no tiene el formato esperado (16-64 caracteres alfanuméricos)',
  nameHelper: 'Elegí un nombre un poco más descriptivo (al menos 2 caracteres)',
};

export type ValidationCatalog = typeof validationCatalog;
