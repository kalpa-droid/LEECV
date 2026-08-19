import { valeriaProfilePhoto, valeriaSignaturePhoto } from "./valeriaExampleAssets";
import { sampleCertImage1, sampleCertImage2, sampleCertImage3 } from "./exampleCertificates";

export const standardExampleCVData = {
  id: "cv_ejemplo_estandar",
  personalInfo: {
    fullName: "VALERIA SOLEDAD MEDINA",
    surname: "MEDINA",
    givenNames: "Valeria Soledad",
    dni: "34.591.208",
    cuit: "27-34591208-4",
    birthDate: "12 de Agosto de 1989",
    address: "Av. San Martín 840, 2° B",
    cityProvince: "SALTA, SALTA CP: 4400",
    phone: "387-154889922",
    email: "valeria.medina@educacion.gob.ar",
    facebook: "facebook.com/valeriasoledadmedina",
    profilePhoto: valeriaProfilePhoto,
    quote: "“Docente apasionada por la enseñanza pedagógica digital, la mediación lectora y la transformación educativa en entornos diversos”",
    initials: "V.S.M",
    year: "2025"
  },
  roles: [
    "Profesora de Educación Secundaria en Lengua y Literatura",
    "Formadora en Tecnologías Educativas Virtuales",
    "Coordinadora de Proyectos Institucionales"
  ],
  education: [
    { level: "NIVEL SECUNDARIO COMPLETO", institution: "Colegio Secundario N° 5095 \"Gral. Manuel Belgrano\"", year: "2007", degree: "Bachiller Humanístico Pedagógico" },
    { level: "ESTUDIO TERCIARIO SUPERIOR", institution: "Instituto de Educación Superior N° 6001", year: "2013", degree: "Profesorado de Educación Secundaria en Lengua" },
    { level: "POSTÍTULO UNIVERSITARIO", institution: "Universidad Nacional de Salta", year: "2019", degree: "Diplomatura en Educación Digital y TICs" }
  ],
  profession: [
    { institution: "Instituto de Educación Superior \"Jorge Luis Borges\"", year: "2016", degree: "Profesora de Educación Secundaria en Lengua y Literatura" },
    { institution: "Ministerio de Educación de la Provincia de Salta", year: "2021", degree: "Formadora Local en Comunidades de Aprendizaje" },
    { institution: "Secretaría de Innovación Pública de la Nación", year: "2023", degree: "Certificación en Alfabetización y Mediación Digital" }
  ],
  experience: [
    { institution: "Colegio Secundario N° 5095 Gral. Belgrano", role: "Profesora Titular de Lengua y Literatura", year: "2025", details: "Planificación curricular, conducción de grupos de nivel secundario y evaluación continua." },
    { institution: "Instituto de Educación Superior N° 6001", role: "Docente de Didáctica de la Lengua", year: "2024", details: "Dictado de cátedras terciarias, tutoría de prácticas profesionales y proyectos integrados." },
    { institution: "Ministerio de Educación de la Provincia", role: "Formadora Local y Capacitadora Pedagógica", year: "2023", details: "Formación docente continua, talleres de mediación lectora y articulación comunitaria." }
  ],
  coursesAndCertificates: [
    { year: "2025", institution: "Ministerio de Educación de Salta", title: "Curso de Actualización Didáctica y Mediación Lectora", hours: "60 hs", details: "Resolución Ministerial Aprobada con Distinción" },
    { year: "2024", institution: "Universidad Nacional de Salta", title: "Seminario de Educación Inclusiva y Diversidad en el Aula", hours: "45 hs", details: "Acreditación Universitaria Oficial" },
    { year: "2023", institution: "Plataforma de Aprendizaje Punto Digital", title: "Taller Avanzado de Herramientas Digitales y Gamificación", hours: "40 hs", details: "Certificación Nacional" }
  ],
  informatics: [
    { institution: "Plataforma Nacional Punto Digital", course: "Alfabetización Digital y Entornos Virtuales de Aprendizaje" },
    { institution: "Secretaría de Innovación Pública", course: "Herramientas Ofimáticas Avanzadas, Procesadores de Texto y Presentaciones" },
    { institution: "Google for Education", course: "Gestión de Aulas Virtuales Google Classroom y Workspace" }
  ],
  ecology: {
    rural: [
      { title: "PROYECTO DE ALFABETIZACIÓN EN ESCUELAS RURALES", institution: "Red de Educadores Comunitarios" }
    ],
    environmental: [
      { title: "TALLER DE ECO-SUSTENTABILIDAD Y RECICLAJE ESCOLAR", institution: "Municipalidad de Salta" }
    ]
  },
  certificatesScanned: [
    { 
      id: "cert_valeria_1", 
      title: "Título de Grado Universitario - Profesorado en Educación Secundaria", 
      year: "2013", 
      category: "profesion",
      institution: "Instituto de Educación Superior N° 6001",
      imageUrl: sampleCertImage1,
      image: sampleCertImage1 
    },
    { 
      id: "cert_valeria_2", 
      title: "Diplomatura Universitaria en Educación Digital y TICs", 
      year: "2019", 
      category: "profesion",
      institution: "Universidad Nacional de Salta",
      imageUrl: sampleCertImage2,
      image: sampleCertImage2 
    },
    { 
      id: "cert_valeria_3", 
      title: "Certificación Nacional en Alfabetización y Mediación Digital", 
      year: "2023", 
      category: "cursos",
      institution: "Secretaría de Innovación Pública - Punto Digital",
      imageUrl: sampleCertImage3,
      image: sampleCertImage3 
    }
  ],
  showCoverPage: true,
  layoutStyle: "executive-sidebar",
  signature: {
    type: "drawn",
    dataUrl: valeriaSignaturePhoto,
    signerName: "VALERIA SOLEDAD MEDINA",
    signerRole: "Profesora de Educación Secundaria en Lengua y Literatura",
    dni: "34591208",
    date: "Salta, 2025"
  },
  theme: {
    presetId: "navy-executive",
    primaryColor: "#1e3a8a",
    secondaryColor: "#172554",
    accentColor: "#d97706",
    textColor: "#0f172a",
    bgCorridor: "#1e3a8a",
    fontFamily: "'Outfit', sans-serif"
  }
};

export const initialCVData = standardExampleCVData;

export const blankCVTemplate = {
  id: "cv_blanco",
  showCoverPage: true,
  layoutStyle: "executive-sidebar",
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
    initials: "CV",
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
    primaryColor: "#FF2E63",
    secondaryColor: "#2B1B2E",
    accentColor: "#FFC93C",
    textColor: "#2B1B2E",
    bgCorridor: "#FF2E63",
    fontFamily: "Arial, sans-serif"
  }
};
