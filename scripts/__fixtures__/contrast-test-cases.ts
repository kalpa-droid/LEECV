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

export const multiLineSnippetTestCases = [
  {
    id: 'multiline_parent_bg_child_text_invalid',
    snippet: `
      <div className="bg-[var(--color-accent-purple-light)] p-4">
        <div className="flex items-center">
          <p className="text-[11px] text-[var(--color-accent-purple)]">
            Texto morado base sobre contenedor morado claro en otra linea
          </p>
        </div>
      </div>
    `,
    shouldFail: true,
    description: 'Fondo morado claro en padre y texto morado base 2 lineas despues debe fallar (3.63:1)'
  },
  {
    id: 'multiline_parent_bg_child_text_valid',
    snippet: `
      <div className="bg-[var(--color-accent-purple-light)] p-4">
        <div className="flex items-center">
          <p className="text-[11px] text-[var(--color-accent-purple-text)]">
            Texto morado alto contraste sobre contenedor morado claro en otra linea
          </p>
        </div>
      </div>
    `,
    shouldFail: false,
    description: 'Fondo morado claro en padre y texto morado text 2 lineas despues debe pasar (6.66:1)'
  },
  {
    id: 'text_white_on_light_modal_invalid',
    snippet: `
      <div className="bg-[var(--ui-bg-panel)] p-4">
        <span className="text-white/80">Texto blanco con opacidad sobre fondo claro de modal</span>
      </div>
    `,
    shouldFail: true,
    description: 'text-white/80 sobre fondo claro de modal debe fallar auditoría de contraste'
  }
];

export const multiThemeSnippetTestCases = [
  {
    id: 'theme_semantic_vars_valid',
    snippet: `
      <div className="bg-[var(--ui-bg-panel)] p-4">
        <p className="text-[var(--ui-text-primary)]">
          Texto primario de interfaz sobre fondo de panel
        </p>
      </div>
    `,
    expectedFailingThemes: []
  }
];
