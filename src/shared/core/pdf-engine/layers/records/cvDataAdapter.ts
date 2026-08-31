import { ContentSection } from './recordTypes';
import { getSectionLabel } from '../../../sectionRegistry';
import { getCvFormat } from '../../../formats/cvFormatRegistry';

const sortByYearDesc = (items: any[]) => {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const yearA = parseInt((a.year || '').toString().match(/\d{4}/)?.[0] || '0', 10);
    const yearB = parseInt((b.year || '').toString().match(/\d{4}/)?.[0] || '0', 10);
    return yearB - yearA;
  });
};

/**
 * Translates raw cvData JSON into structured ContentSection[] records
 * for the 8-layer TemplateRenderer engine.
 */
export function cvDataToContentSections(cvData: any): ContentSection[] {
  if (!cvData) return [];

  const {
    personalInfo = {},
    education = [],
    profession = [],
    experience = [],
    informatics = [],
    coursesAndCertificates = [],
    skills = [],
    signature = {}
  } = cvData;

  const activeFormat = cvData?.activeFormatId ? getCvFormat(cvData.activeFormatId) : null;
  const hiddenFieldsSet = new Set(activeFormat?.hiddenPersonalFields || []);

  const sortedCourses = sortByYearDesc(coursesAndCertificates);
  const sortedExperience = sortByYearDesc(experience);
  const sortedProfession = sortByYearDesc(profession);

  const sections: ContentSection[] = [];

  // Contacto & Redes (Sidebar)
  sections.push({
    id: 'contacto',
    titleText: getSectionLabel('contacto'),
    records: [
      {
        id: 'rec-contact',
        kind: 'contact-item',
        targetSectorRole: 'sidebar',
        fields: {
          phone: personalInfo.phone || '',
          email: personalInfo.email || '',
          address: personalInfo.address || '',
          cityProvince: personalInfo.cityProvince || '',
          facebook: personalInfo.facebook || ''
        }
      }
    ]
  });

  // Datos Personales (Sidebar - Filtrados dinámicamente según hiddenPersonalFields del Formato Activo)
  const personalDetailsFields = {
    dni: hiddenFieldsSet.has('dni') ? '' : personalInfo.dni || '',
    cuit: hiddenFieldsSet.has('cuit') ? '' : personalInfo.cuit || '',
    birthDate: hiddenFieldsSet.has('birthDate') ? '' : personalInfo.birthDate || '',
    nacionalidad: hiddenFieldsSet.has('nacionalidad') ? '' : personalInfo.nacionalidad || '',
    estadoCivil: hiddenFieldsSet.has('estadoCivil') ? '' : personalInfo.estadoCivil || ''
  };

  const hasPersonalDetails = Object.values(personalDetailsFields).some((val) => !!val);
  if (hasPersonalDetails) {
    sections.push({
      id: 'datos-personales',
      titleText: getSectionLabel('datos-personales'),
      records: [
        {
          id: 'rec-personal-details',
          kind: 'contact-item',
          targetSectorRole: 'sidebar',
          fields: personalDetailsFields
        }
      ]
    });
  }

  // Frase / Lema Personal
  if (personalInfo.quote) {
    sections.push({
      id: 'frase',
      titleText: '',
      records: [
        {
          id: 'rec-frase',
          kind: 'quote-text',
          targetSectorRole: 'main',
          fields: { text: personalInfo.quote }
        }
      ]
    });
  }

  // Resumen Profesional (Main)
  if (cvData.summary) {
    sections.push({
      id: 'resumen',
      titleText: getSectionLabel('resumen'),
      records: [
        {
          id: 'rec-summary',
          kind: 'quote-text',
          targetSectorRole: 'main',
          fields: { text: cvData.summary }
        }
      ]
    });
  }

  // Habilidades Técnicas / Hard Skills (Sidebar)
  if (Array.isArray(cvData.hardSkills) && cvData.hardSkills.length > 0) {
    sections.push({
      id: 'habilidades',
      titleText: getSectionLabel('habilidades'),
      records: cvData.hardSkills.map((sk: any, idx: number) => ({
        id: `rec-hardskill-${idx}`,
        kind: 'skill',
        targetSectorRole: 'sidebar',
        fields: {
          name: typeof sk === 'string' ? sk : sk.name || sk.title || ''
        }
      }))
    });
  }

  // Competencias Clave (Sidebar)
  const skillList = Array.isArray(skills) && skills.length > 0
    ? skills
    : ["Pedagogía Dialógica", "Comunidades de Aprendizaje", "Alfabetización Digital", "Educación Inclusiva"];

  sections.push({
    id: 'competencias',
    titleText: getSectionLabel('competencias'),
    records: skillList.map((sk: any, idx: number) => ({
      id: `rec-skill-${idx}`,
      kind: 'skill',
      targetSectorRole: 'sidebar',
      fields: {
        name: typeof sk === 'string' ? sk : sk.name || sk.title || ''
      }
    }))
  });

  // Idiomas & Nivel (Sidebar)
  if (Array.isArray(cvData.languages) && cvData.languages.length > 0) {
    sections.push({
      id: 'idiomas',
      titleText: getSectionLabel('idiomas'),
      records: cvData.languages.map((lang: any, idx: number) => ({
        id: `rec-lang-${idx}`,
        kind: 'languages',
        targetSectorRole: 'sidebar',
        fields: {
          ...lang,
          idioma: lang.idioma || lang.language || lang.title || lang.name || '',
          nivel: lang.nivel || lang.level || ''
        }
      }))
    });
  }

  // Proyectos Destacados (Main)
  if (Array.isArray(cvData.projects) && cvData.projects.length > 0) {
    sections.push({
      id: 'proyectos',
      titleText: getSectionLabel('proyectos'),
      records: cvData.projects.map((proj: any, idx: number) => ({
        id: `rec-proj-${idx}`,
        kind: 'projects',
        targetSectorRole: 'main',
        fields: {
          ...proj,
          title: proj.title || proj.name || proj.tituloOGrado || '',
          institution: proj.institution || proj.institucion || '',
          year: (proj.year || proj.periodo || '').toString(),
          details: proj.details || proj.description || proj.descripcion || ''
        }
      }))
    });
  }

  // Publicaciones & Patentes (Main)
  if (Array.isArray(cvData.publications) && cvData.publications.length > 0) {
    sections.push({
      id: 'publicaciones',
      titleText: getSectionLabel('publicaciones'),
      records: cvData.publications.map((pub: any, idx: number) => ({
        id: `rec-pub-${idx}`,
        kind: 'publications',
        targetSectorRole: 'main',
        fields: {
          ...pub,
          title: pub.title || pub.tituloOGrado || '',
          autor: pub.autor || pub.author || '',
          institution: pub.institution || pub.institucion || '',
          year: (pub.year || pub.periodo || '').toString()
        }
      }))
    });
  }

  // Referencias Laborales (Main)
  if (Array.isArray(cvData.references) && cvData.references.length > 0) {
    sections.push({
      id: 'referencias',
      titleText: getSectionLabel('referencias'),
      records: cvData.references.map((ref: any, idx: number) => ({
        id: `rec-ref-${idx}`,
        kind: 'references',
        targetSectorRole: 'main',
        fields: {
          ...ref,
          personaReferencia: ref.personaReferencia || ref.name || ref.persona || '',
          cargo: ref.cargo || ref.role || '',
          institution: ref.institution || ref.company || ref.institucion || '',
          contactoReferencia: ref.contactoReferencia || ref.contact || ref.phone || ref.email || ''
        }
      }))
    });
  }

  // Informática (Sidebar)
  if (Array.isArray(informatics) && informatics.length > 0) {
    sections.push({
      id: 'informatica',
      titleText: getSectionLabel('informatica'),
      records: informatics.map((inf: any, idx: number) => ({
        id: `rec-inf-${idx}`,
        kind: 'course',
        targetSectorRole: 'sidebar',
        fields: {
          ...inf,
          title: inf.course || inf.title || inf.name || '',
          institution: inf.institution || inf.institucion || ''
        }
      }))
    });
  }

  // Formación Académica (Main)
  if (Array.isArray(education) && education.length > 0) {
    sections.push({
      id: 'formacion',
      titleText: getSectionLabel('formacion'),
      records: education.map((edu: any, idx: number) => ({
        id: `rec-edu-${idx}`,
        kind: 'education',
        targetSectorRole: 'main',
        fields: {
          ...edu,
          degree: edu.degree || edu.title || edu.tituloOGrado || '',
          institution: edu.institution || edu.institucion || '',
          level: edu.level || 'Superior',
          year: (edu.year || edu.periodo || '').toString()
        }
      }))
    });
  }

  // Títulos Profesionales (Main)
  if (Array.isArray(sortedProfession) && sortedProfession.length > 0) {
    sections.push({
      id: 'profesion',
      titleText: getSectionLabel('profesion'),
      records: sortedProfession.map((prof: any, idx: number) => ({
        id: `rec-prof-${idx}`,
        kind: 'education',
        targetSectorRole: 'main',
        fields: {
          ...prof,
          degree: prof.degree || prof.title || prof.tituloOGrado || '',
          institution: prof.institution || prof.institucion || '',
          year: (prof.year || prof.periodo || '').toString()
        }
      }))
    });
  }

  // Experiencia Laboral (Main)
  if (Array.isArray(sortedExperience) && sortedExperience.length > 0) {
    sections.push({
      id: 'experiencia',
      titleText: getSectionLabel('experiencia'),
      records: sortedExperience.map((exp: any, idx: number) => ({
        id: `rec-exp-${idx}`,
        kind: 'experience',
        targetSectorRole: 'main',
        fields: {
          ...exp,
          role: exp.role || exp.cargo || exp.title || '',
          institution: exp.institution || exp.company || exp.institucion || '',
          year: (exp.year || exp.periodo || '').toString(),
          details: exp.details || exp.description || exp.descripcion || ''
        }
      }))
    });
  }

  // Cursos & Capacitaciones (Main)
  if (Array.isArray(sortedCourses) && sortedCourses.length > 0) {
    sections.push({
      id: 'cursos',
      titleText: getSectionLabel('cursos'),
      records: sortedCourses.map((c: any, idx: number) => ({
        id: `rec-course-${idx}`,
        kind: 'course',
        targetSectorRole: 'main',
        fields: {
          ...c,
          title: c.title || c.name || c.course || c.tituloOGrado || '',
          institution: c.institution || c.institucion || '',
          hours: (() => {
            const raw = String(c.hours || c.cargaHoraria || '').trim();
            if (!raw) return '';
            return /hs/i.test(raw) ? raw : `${raw} hs`;
          })()
        }
      }))
    });
  }

  // Compromiso Ecológico & Proyectos Sustentables (Main)
  const ecologyItems = Array.isArray(cvData?.ecology)
    ? cvData.ecology
    : [
        ...(Array.isArray(cvData?.ecology?.rural) ? cvData.ecology.rural : []),
        ...(Array.isArray(cvData?.ecology?.environmental) ? cvData.ecology.environmental : []),
        ...(Array.isArray(cvData?.ecology?.community) ? cvData.ecology.community : []),
        ...(Array.isArray(cvData?.ecologia) ? cvData.ecologia : [])
      ];

  if (ecologyItems.length > 0) {
    sections.push({
      id: 'ecologia',
      titleText: getSectionLabel('ecologia'),
      records: ecologyItems.map((eco: any, idx: number) => ({
        id: `rec-eco-${idx}`,
        kind: 'course',
        targetSectorRole: 'main',
        fields: {
          ...eco,
          title: eco.title || eco.tituloOGrado || eco.course || eco.name || '',
          institution: eco.institution || eco.institucion || '',
          year: (eco.year || eco.periodo || '').toString(),
          details: eco.details || eco.description || eco.descripcion || ''
        }
      }))
    });
  }


  // Secciones Personalizadas Dinámicas (customSections)
  if (Array.isArray(cvData.customSections)) {
    cvData.customSections.forEach((cs: any) => {
      if (Array.isArray(cs.records) && cs.records.length > 0) {
        sections.push({
          id: cs.id,
          titleText: (cs.titleText || 'NUEVA SECCIÓN').toUpperCase(),
          records: cs.records.map((r: any, idx: number) => ({
            id: `rec-${cs.id}-${idx}`,
            kind: 'custom',
            targetSectorRole: 'main',
            fields: {
              ...r,
              _fields: cs.fields || ['tituloOGrado', 'institucion']
            }
          }))
        });
      }
    });
  }

  // Firma Digital (Main)
  const titlePrefix = personalInfo?.titlePrefix ? `${personalInfo.titlePrefix} ` : '';
  const autoSignerName = `${titlePrefix}${personalInfo?.givenNames || ''} ${personalInfo?.surname || ''}`.trim() || personalInfo?.fullName || '';
  const selectedRole = signature?.signerRole || (sortedProfession?.[0]?.degree || education?.[0]?.degree || '');
  const todayISO = new Date().toISOString().split('T')[0];
  const sigDate = signature?.date || todayISO;

  sections.push({
    id: 'firma',
    titleText: 'FIRMA REGISTRADA',
    records: [
      {
        id: 'rec-sig',
        kind: 'freeform',
        targetSectorRole: 'main',
        fields: {
          signerName: autoSignerName,
          signerRole: selectedRole,
          date: sigDate,
          dataUrl: signature?.dataUrl || ''
        }
      }
    ]
  });

  // Si el usuario eligió un Formato Global activo (ej: US Resume, Europass),
  // reordenar las secciones dinámicamente según el estándar internacional (defaultVisibleSections)
  let orderedSections = sections;
  if (activeFormat && Array.isArray(activeFormat.defaultVisibleSections) && activeFormat.defaultVisibleSections.length > 0) {
    const formatOrderMap = new Map<string, number>();
    activeFormat.defaultVisibleSections.forEach((secId, idx) => {
      formatOrderMap.set(secId, idx);
    });

    orderedSections = [...sections].sort((a, b) => {
      const posA = formatOrderMap.has(a.id) ? formatOrderMap.get(a.id)! : 999;
      const posB = formatOrderMap.has(b.id) ? formatOrderMap.get(b.id)! : 999;
      return posA - posB;
    });
  }

  // Mapear saltos de página configurados por el usuario
  const sectionPageBreaks = cvData?.layout?.sectionPageBreaks || cvData?.sectionPageBreaks || {};
  return orderedSections.map(sec => ({
    ...sec,
    breakBefore: !!sectionPageBreaks[sec.id]
  }));
}
