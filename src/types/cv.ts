export interface PersonalInfo {
  fullName?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  dni?: string;
  website?: string;
  photoUrl?: string;
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
  id: string;
  category?: string;
  skills: string[];
}

export interface ColumnAssignments {
  secundaria?: string[];
  primaria?: string[];
}

export interface CVLayout {
  layoutStyle?: string;
  paperSize?: 'a4' | 'letter';
  columnRatio?: string;
  primaryColor?: string;
  fontFamily?: string;
  fontSize?: string;
  spacing?: string;
  sectionOrder?: string[];
  columnAssignments?: ColumnAssignments;
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
  layoutStyle?: string;
  updatedAt?: string;
}
