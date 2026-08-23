/**
 * NÚCLEO — PLANTILLA EN BLANCO Y DATOS INICIALES (initialCVData.ts)
 *
 * Proporciona el estado inicial limpio para el nuevo currículum,
 * 100% integrado con el Catálogo Universal de Campos (FIELD_CATALOG).
 */

export const blankCVTemplate = {
  id: "cv_nuevo",
  activePresetId: "cv-clasico",
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
  informatics: [],
  ecology: {
    rural: [],
    environmental: []
  },
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
    fontFamily: "Arial, sans-serif"
  }
};

export const initialCVData = blankCVTemplate;
