import { valeriaProfilePhoto } from "./valeriaExampleAssets.ts";
import { sampleCertImage1, sampleCertImage2, sampleCertImage3 } from "./exampleCertificates.ts";

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
  activePresetId: "cv-clasico",
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

export const blankCVTemplate = {
  id: "cv_blanco",
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
    primaryColor: "#FF2E63",
    secondaryColor: "#2B1B2E",
    accentColor: "#FFC93C",
    textColor: "#2B1B2E",
    bgCorridor: "#FF2E63",
    fontFamily: "Arial, sans-serif"
  }
};

export const danielaExampleCVData = {
  id: "cv_daniela_burgos_2026",
  isOfficial: false,
  personalInfo: {
    fullName: "MÓNICA DANIELA BURGOS",
    surname: "BURGOS",
    givenNames: "MÓNICA DANIELA",
    dni: "33.456.789",
    cuit: "27-33456789-4",
    birthDate: "15 de Mayo de 1988",
    address: "Salta, Argentina",
    cityProvince: "Salta - Provincia de Salta",
    phone: "+54 387 500-1234",
    email: "monicadanielaburgos@gmail.com",
    facebook: "",
    profilePhoto: "",
    quote: "Prof. de Educación Secundaria en Lengua y Literatura | Referente SINIDE | Capacitadora Docente en Tecnologías e Innovación Pedagógica",
    year: "2026"
  },
  roles: [
    "Prof. de Educación Secundaria en Lengua y Literatura",
    "Referente SINIDE - Ministerio de Educación",
    "Capacitadora Docente Virtual y Mediación Lectora"
  ],
  education: [
    {
      level: "NIVEL TERCIARIO / SUPERIOR",
      institution: "Instituto Superior del Profesorado N° 6005 - Salta",
      year: "2018",
      degree: "Prof. de Educación Secundaria en Lengua y Literatura"
    },
    {
      level: "NIVEL SECUNDARIO COMPLETO",
      institution: "Colegio Secundario N° 5080 / Instituto Salta",
      year: "2005",
      degree: "Bachiller con Orientación Humana"
    }
  ],
  profession: [
    {
      institution: "Instituto Superior del Profesorado N° 6005",
      year: "2018",
      degree: "Profesora de Educación Secundaria en Lengua y Literatura",
      details: "Título Oficial con Validez Nacional."
    }
  ],
  experience: [
    {
      institution: "Ministerio de Educación, Cultura, Ciencia y Tecnología - Colegio Secundario N° 5170",
      role: "Personal Administrativo - Referente SINIDE",
      year: "2026",
      details: "Carga y gestión de matrícula, asistencia y trayectoria académica en el Sistema Integral de Información Digital Educativa (SINIDE)."
    },
    {
      institution: "Ministerio de Educación - Colegio Secundario N° 5170",
      role: "Profesora de Lengua y Literatura - 5° Año",
      year: "2026",
      details: "Docente a cargo de la asignatura Lengua y Literatura para el 5° año del ciclo orientado."
    },
    {
      institution: "Fundación Forge - Colegio Secundario N° 5170",
      role: "Conducción de Alumnos",
      year: "2026",
      details: "Estrategias para despertar la motivación y la curiosidad en estudiantes de 5° año."
    },
    {
      institution: "Ministerio de Educación - Colegio Secundario N° 5170",
      role: "Personal Administrativo - Referente SINIDE",
      year: "2025",
      details: "Administración digital de registros educativos y validación de trayectorias escolares."
    },
    {
      institution: "Ministerio de Educación - Colegio Secundario N° 5170",
      role: "Profesora de Lengua y Literatura - 5° Año",
      year: "2025",
      details: "Planificación de secuencias didácticas y coordinación de tertulias literarias."
    },
    {
      institution: "Ministerio de Educación - Colegio Secundario N° 5170",
      role: "Personal Administrativo - Bibliotecario",
      year: "2024",
      details: "Organización del catálogo bibliográfico y fomento de la lectura escolar."
    },
    {
      institution: "Ministerio de Educación - Colegio Polimodal Rural N° 4547",
      role: "Profesora de Lengua y Literatura - 1° Año",
      year: "2024",
      details: "Desarrollo de competencias lingüísticas en ámbito educativo rural."
    },
    {
      institution: "Fundación Inclusión Social para las Comunidades",
      role: "Tutor Pedagógico de Concursos Escolares",
      year: "2023",
      details: "Conducción de alumnos en proyectos culturales, medioambientales y de salud integral."
    },
    {
      institution: "Colegio Secundario Rural N° 5191",
      role: "Conducción de Alumnos en Carácter de Tutor",
      year: "2022",
      details: "Proyecto 'Construyendo una imagen para Nuestra institución'."
    },
    {
      institution: "Ministerio de Educación - Subsecretaría de Desarrollo Curricular",
      role: "Capacitadora Docente Virtual y Equipo Provincial",
      year: "2021",
      details: "Dictado de cursos virtuales 'Docentes Artesanos' y 'Tertulias Dialógicas Literarias'."
    },
    {
      institution: "Colegio Secundario Rural N° 5191 Pluricurso (Amaicha, Tacuil, Colomé, La Angostura)",
      role: "Profesora de Lengua, Arte y Comunicación / Asistente Técnico",
      year: "2019",
      details: "Acompañamiento pedagógico y dictado de clases en pluriaño rural multipunto."
    },
    {
      institution: "Dirección de Educación Permanente de Jóvenes y Adultos - Plan FinEs",
      role: "Promotora Educativa",
      year: "2017",
      details: "Articulación e integración de jóvenes y adultos al sistema educativo formal."
    }
  ],
  coursesAndCertificates: [
    { year: "2026", institution: "Fundación Forge / Col. Sec. N° 5170", title: "Conducción de Alumnos: Estrategias para despertar la motivación y la curiosidad", hours: "60 hs" },
    { year: "2025", institution: "Ministerio de Educación, Ciencia y Tecnología de Salta", title: "Inteligencia Artificial y Tecnologías Emergentes en la Educación", hours: "80 hs" },
    { year: "2025", institution: "Subsecretaría de Desarrollo Curricular e Innovación Pedagógica", title: "Taller de Lectura y Tertulias Dialógicas Literarias", hours: "50 hs" },
    { year: "2024", institution: "Ministerio de Educación de Salta", title: "Gestión Bibliotecaria Escolar y Sistema SINIDE", hours: "60 hs" },
    { year: "2024", institution: "Ministerio de Educación", title: "Seminario de Innovación Educativa y Acompañamiento a las Trayectorias Escolares", hours: "40 hs" },
    { year: "2023", institution: "Fundación Inclusión Social para las Comunidades", title: "Concurso Revalorizando nuestras culturas", hours: "35 hs" },
    { year: "2023", institution: "Fundación Inclusión Social", title: "Concurso Reciclamos para cuidar el medio ambiente", hours: "35 hs" },
    { year: "2023", institution: "Fundación Inclusión Social", title: "Concurso El cuidado de mi cuerpo", hours: "35 hs" },
    { year: "2022", institution: "Col. Sec. Rural N° 5191", title: "Proyecto Construyendo una imagen para nuestra institución", hours: "40 hs" },
    { year: "2021", institution: "Ministerio de Educación de Salta", title: "Programa Nacional Comunidades de Aprendizaje - Equipo Provincial", hours: "120 hs" },
    { year: "2021", institution: "Subsecretaría de Desarrollo Curricular", title: "Capacitadora Docentes Artesanos de sus propias prácticas", hours: "60 hs" },
    { year: "2021", institution: "Subsecretaría de Desarrollo Curricular", title: "Capacitadora Tertulias dialógicas literarias", hours: "60 hs" },
    { year: "2021", institution: "Ministerio de Educación de Salta", title: "I Congreso Provincial Virtual de Educación - Ponente Taller", hours: "30 hs" },
    { year: "2020", institution: "Comunidades de Aprendizaje Salta", title: "1° Encuentro Provincial Interacciones que transforman", hours: "40 hs" },
    { year: "2020", institution: "Programa Nacional Comunidades de Aprendizaje", title: "Encuentros de Re-sensibilización Comunidades de Aprendizaje", hours: "40 hs" },
    { year: "2019", institution: "Col. Sec. Rural N° 5191 (Amaicha, Tacuil, Colomé, La Angostura)", title: "Profesor de Acompañamiento a las Trayectorias Escolares", hours: "90 hs" },
    { year: "2018", institution: "Ministerio de Educación", title: "Jornada Provincial de Lengua y Literatura", hours: "30 hs" },
    { year: "2017", institution: "Dirección de Educación Permanente de Jóvenes y Adultos", title: "Promotora Educativa Plan FinEs", hours: "60 hs" },
    { year: "2004", institution: "Instituto Superior N° 6005", title: "Capacitaciones Iniciales en Lengua y Promoción de la Lectura", hours: "40 hs" }
  ],
  informatics: [
    { institution: "Ministerio de Educación", course: "Sistema SINIDE (Sistema Integral de Información Digital Educativa)" },
    { institution: "Ministerio de Educación", course: "Plataformas Virtuales de Aprendizaje y Herramientas Digitales" },
    { institution: "Punto Digital", course: "Procesadores de Texto y Planillas de Cálculo Avanzadas" }
  ],
  ecology: {
    rural: [
      { title: "Acompañamiento a las Trayectorias Escolares RURALES (Amaicha, Tacuil, Colomé, La Angostura)", institution: "Col. Sec. Rural N° 5191" }
    ],
    environmental: [
      { title: "Proyecto Reciclamos para cuidar el medio ambiente", institution: "Fundación Inclusión Social" }
    ]
  },
  certificatesScanned: [
    { 
      id: "cert_daniela_1", 
      title: "Título Profesora de Educación Secundaria en Lengua y Literatura", 
      year: "2018", 
      category: "profesion",
      institution: "Instituto Superior del Profesorado N° 6005",
      imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000'><rect width='800' height='1000' fill='%231e293b'/><text x='400' y='450' font-family='sans-serif' font-size='24' fill='%2338bdf8' text-anchor='middle'>T%C3%ADtulo Profesora de Lengua y Literatura</text><text x='400' y='500' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle'>Instituto Superior N%C2%B0 6005 - Salta</text></svg>",
      image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000'><rect width='800' height='1000' fill='%231e293b'/><text x='400' y='450' font-family='sans-serif' font-size='24' fill='%2338bdf8' text-anchor='middle'>T%C3%ADtulo Profesora de Lengua y Literatura</text><text x='400' y='500' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle'>Instituto Superior N%C2%B0 6005 - Salta</text></svg>"
    },
    { 
      id: "cert_daniela_2", 
      title: "Título Bachiller con Orientación Humana", 
      year: "2005", 
      category: "profesion",
      institution: "Colegio Secundario N° 5080",
      imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000'><rect width='800' height='1000' fill='%231e293b'/><text x='400' y='450' font-family='sans-serif' font-size='24' fill='%2338bdf8' text-anchor='middle'>T%C3%ADtulo Bachiller con Orientaci%C3%B3n Humana</text><text x='400' y='500' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle'>Colegio Secundario N%C2%B0 5080</text></svg>",
      image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000'><rect width='800' height='1000' fill='%231e293b'/><text x='400' y='450' font-family='sans-serif' font-size='24' fill='%2338bdf8' text-anchor='middle'>T%C3%ADtulo Bachiller con Orientaci%C3%B3n Humana</text><text x='400' y='500' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle'>Colegio Secundario N%C2%B0 5080</text></svg>"
    }
  ],
  signature: {
    type: "drawn",
    dataUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100' viewBox='0 0 300 100'><text x='150' y='50' font-family='cursive' font-size='28' fill='%230284c7' text-anchor='middle'>M%C3%B3nica Burgos</text></svg>",
    signerName: "MÓNICA DANIELA BURGOS",
    signerRole: "Prof. de Educ. Secundaria en Lengua y Literatura",
    dni: "33.456.789",
    date: "2026-08-20"
  },
  activePresetId: "cv-clasico",
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

export const initialCVData = blankCVTemplate;

