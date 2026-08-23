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

export interface CertificateItem {
  id: string;
  title: string;
  issuer?: string;
  date?: string;
  url?: string;
  imagePreview?: string;
  rotationAngle?: number;
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
  certificates?: CertificateItem[];
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
  theme?: ThemeConfig;
  updatedAt?: string;
  [key: string]: any;
}
