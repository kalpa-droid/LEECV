export interface PersonalInfo {
  fullName?: string;
  surname?: string;
  givenNames?: string;
  title?: string;
  titlePrefix?: string;
  email?: string;
  phone?: string;
  location?: string;
  dni?: string;
  cuit?: string;
  birthDate?: string;
  address?: string;
  cityProvince?: string;
  facebook?: string;
  year?: string;
  quote?: string;
  website?: string;
  nacionalidad?: string;
  estadoCivil?: string;
  disponibilidad?: string;
  licenciaConducir?: string;
  photoUrl?: string;
  profilePhoto?: string;
  signatureUrl?: string;
  summary?: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  bulletPoints?: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

/**
 * @deprecated No se usa en ningún lugar del código real (confirmado por grep en todo `src/`).
 * El campo que sí se usa para certificados es `ScannedCertificate` / `CVData.certificatesScanned`,
 * más abajo. Se deja declarado por compatibilidad con documentos muy antiguos que puedan traer
 * esta forma, pero no crear certificados nuevos con esta interfaz.
 */
export interface CertificateItem {
  id: string;
  title: string;
  issuer?: string;
  date?: string;
  url?: string;
  imagePreview?: string;
  rotationAngle?: number;
}

/**
 * Certificado escaneado/adjunto — la forma real que usa el editor (`EditorPanel.tsx`), el
 * renderer del PDF (`TemplateRenderer.tsx`) y el empaquetador de assets para Drive
 * (`driveDocumentPackager.ts`). `dataUrl` es el campo canónico (base64 o `ref://`/`asset://`
 * una vez guardado); `imageUrl` se mantiene en paralelo solo por compatibilidad con la vista
 * previa del panel lateral.
 */
export interface ScannedCertificate {
  id: string;
  title: string;
  institution?: string;
  year?: string;
  dataUrl?: string;
  /** @deprecated usar `dataUrl`. Se mantiene sincronizado por compatibilidad, no escribir solo este campo. */
  imageUrl?: string;
  rotation?: number;
}

/** Firma digital del titular del CV — `EditorPanel.tsx`, pestaña "Firma Digital". */
export interface SignatureData {
  dataUrl?: string;
  signerRole?: string;
  date?: string;
  signerCity?: string;
}

export interface LanguageItem {
  id: string;
  language: string;
  proficiency?: string;
}

export interface SkillGroup {
  id?: string;
  category?: string;
  skills: string[];
}

export interface ColumnAssignments {
  secundaria?: string[];
  primaria?: string[];
  [key: string]: any;
}

export interface CVLayout {
  paperSize?: 'a4' | 'letter';
  columnRatio?: string;
  /** @deprecated No se usa en el renderizador. El color primario se gestiona via theme.primaryColor o colorPresetId. */
  primaryColor?: string;
  fontFamily?: string;
  fontSize?: string;
  spacing?: string;
  sectionOrder?: string[];
  columnAssignments?: ColumnAssignments;
  [key: string]: any;
}

export interface ThemeConfig {
  presetId?: string;
  /**
   * Color primario personalizado en formato Hex (#RRGGBB o #RGB).
   * Si se define con un Hex válido y NO hay un `colorPresetId` del catálogo cerrado,
   * `resolveActivePreset()` lo usa como seedHex para generar una paleta armónica
   * completa en OKLCH con contraste WCAG 2.1 AA.
   * Valores como `'var(...)'` o strings no-hex se ignoran silenciosamente.
   */
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  textColor?: string;
  /** Color de fondo principal (canónico) */
  bgColor?: string;
  /** Alias heredado para compatibilidad con documentos antiguos */
  bgCorridor?: string;
  fontFamily?: string;
  [key: string]: any;
}

export interface CVData {
  id?: string;
  title?: string;
  personalInfo?: PersonalInfo;
  experiences?: ExperienceItem[];
  education?: EducationItem[];
  /** @deprecated ver nota en `CertificateItem`. Usar `certificatesScanned`. */
  certificates?: CertificateItem[];
  certificatesScanned?: ScannedCertificate[];
  signature?: SignatureData;
  languages?: LanguageItem[];
  skillGroups?: SkillGroup[];
  roles?: string[];
  layout?: CVLayout;
  /**
   * Único campo real que decide qué Preset visual se usa para renderizar el
   * documento (ver src/shared/core/pdf-engine/layers/presets/presetRegistry.ts).
   * Antes existían 3 nombres para este mismo concepto (coverPreset, layoutStyle
   * acá y layout.layoutStyle) y ninguno se conectaba de verdad al render.
   */
  activePresetId?: string;
  colorPresetId?: string;
  typographyPresetId?: string;
  columnLayoutPresetId?: string;
  manualOverrides?: Record<string, { highlightColorOverride?: string }>;
  theme?: ThemeConfig;
  updatedAt?: string;
  [key: string]: any;
}
