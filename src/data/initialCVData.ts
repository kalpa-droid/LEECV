import { generateDocumentId, deriveDocumentTitle } from '../shared/core/documents/documentEngine/titleEngine';
import { inferDocumentTypeId } from '../shared/core/capabilities/capabilityRegistry';

export const blankCVBase = {
  activePresetId: "cv-clasico",
  uiTheme: "day",
  showCoverPage: true,
  layout: {
    paperSize: "a4",
    showCoverPage: true,
    columnAssignments: {
      contacto: "secundaria",
      personales: "secundaria",
      formacion: "primaria",
      profesion: "primaria",
      experiencia: "primaria",
      cursos: "primaria",
      informatica: "secundaria",
      competencias: "secundaria",
      ecologia: "primaria"
    },
    sectionOrders: {
      secundaria: ["contacto", "personales", "informatica", "competencias"],
      primaria: ["formacion", "profesion", "experiencia", "cursos", "ecologia"]
    }
  },
  customSections: [],
  sectionVisibility: {
    personales: true,
    formacion: true,
    profesion: true,
    experiencia: true,
    cursos: true,
    informatica: true,
    ecologia: true,
    certificados: true,
    firma: true
  },
  personalInfo: {
    fullName: "",
    surname: "",
    givenNames: "",
    dni: "",
    cuit: "",
    birthDate: "",
    address: "",
    cityProvince: "",
    phone: "",
    email: "",
    facebook: "",
    profilePhoto: "",
    quote: "",
    year: new Date().getFullYear().toString()
  },
  roles: [],
  education: [],
  profession: [],
  experience: [],
  coursesAndCertificates: [],
  ecology: [],
  certificatesScanned: [],
  signature: {
    type: "drawn",
    dataUrl: "",
    signerName: "",
    signerRole: "",
    dni: "",
    date: ""
  },
  theme: {
    presetId: "linda-feria",
    primaryColor: "var(--color-accent-base)",
    secondaryColor: "var(--color-neutral-text-primary)",
    accentColor: "#FFC93C",
    textColor: "var(--color-neutral-text-primary)",
    bgColor: "var(--color-accent-base)",
    bgCorridor: "var(--color-accent-base)",
    fontFamily: "Helvetica"
  }
};


export function createBlankCVTemplate(overrides?: Record<string, any>) {
  const merged = { ...blankCVBase, ...overrides };
  const docType = inferDocumentTypeId(merged);
  const prefix = docType === 'business_card' ? 'card' : docType === 'book' ? 'book' : docType === 'cover_letter' ? 'cover_letter' : 'cv';
  const id = overrides?.id || generateDocumentId(prefix as any);

  return {
    ...blankCVBase,
    id,
    title: overrides?.title || deriveDocumentTitle(docType, { id }),
    doc_type_id: docType,
    docType: docType,
    ...overrides,
  };
}

export const blankCVTemplate = createBlankCVTemplate();
export const initialCVData = blankCVTemplate;

