export interface ContrastTestCase {
  id: string;
  bgHex: string;
  textHex: string;
  expectedMinRatio: number;
  shouldPass: boolean;
  description: string;
}

export const contrastTestCases: ContrastTestCase[] = [
  {
    id: 'purple_text_on_light_purple_valid',
    bgHex: '#E9DBFF',
    textHex: '#5B18C8',
    expectedMinRatio: 4.5,
    shouldPass: true,
    description: 'Morado oscuro sobre morado claro (Fix PrivacyModal) debe pasar WCAG AA (ratio ~6.66:1)'
  },
  {
    id: 'purple_base_on_light_purple_invalid',
    bgHex: '#E9DBFF',
    textHex: '#8E44FF',
    expectedMinRatio: 4.5,
    shouldPass: false,
    description: 'Morado acento base sobre morado claro (Bug original PrivacyModal) debe fallar (ratio ~3.63:1)'
  },
  {
    id: 'dark_text_on_white_valid',
    bgHex: '#FFFFFF',
    textHex: '#2B1B2E',
    expectedMinRatio: 4.5,
    shouldPass: true,
    description: 'Texto primario oscuro sobre fondo blanco debe pasar (ratio ~14.8:1)'
  },
  {
    id: 'amber_text_on_white_invalid',
    bgHex: '#FFFFFF',
    textHex: '#FFC93C',
    expectedMinRatio: 4.5,
    shouldPass: false,
    description: 'Texto amarillo ambar sobre fondo blanco debe fallar (ratio ~1.5:1)'
  }
];
