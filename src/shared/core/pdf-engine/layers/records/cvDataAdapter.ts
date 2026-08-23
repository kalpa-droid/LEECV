import { ContentSection, ContentRecord } from './recordTypes';

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

  const sortedCourses = sortByYearDesc(coursesAndCertificates);
  const sortedExperience = sortByYearDesc(experience);
  const sortedProfession = sortByYearDesc(profession);

  const sections: ContentSection[] = [];

  // Contacto & Redes (Sidebar)
  sections.push({
    id: 'contacto',
    titleText: 'CONTACTO & REDES',
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

  // Datos Personales (Sidebar)
  sections.push({
    id: 'datos-personales',
    titleText: 'DATOS PERSONALES',
    records: [
      {
        id: 'rec-personal-details',
        kind: 'contact-item',
        targetSectorRole: 'sidebar',
        fields: {
          dni: personalInfo.dni || '',
          cuit: personalInfo.cuit || '',
          birthDate: personalInfo.birthDate || ''
        }
      }
    ]
  });

  // Frase / Lema Personal — sección INDEPENDIENTE, no un campo atrapado
  // adentro de "Datos Personales". Así el sistema de columnas dinámicas
  // (Paneles) la puede mover sola, igual que cualquier otro registro.
  if (personalInfo.quote) {
    sections.push({
      id: 'frase',
      titleText: '',
      records: [
        {
          id: 'rec-frase',
          kind: 'quote-text',
          targetSectorRole: 'sidebar',
          fields: { text: personalInfo.quote }
        }
      ]
    });
  }

  // Competencias Clave (Sidebar)
  const skillList = Array.isArray(skills) && skills.length > 0
    ? skills
    : ["Pedagogía Dialógica", "Comunidades de Aprendizaje", "Alfabetización Digital", "Educación Inclusiva"];

  sections.push({
    id: 'competencias',
    titleText: 'COMPETENCIAS CLAVE',
    records: skillList.map((sk: any, idx: number) => ({
      id: `rec-skill-${idx}`,
      kind: 'skill',
      targetSectorRole: 'sidebar',
      fields: {
        name: typeof sk === 'string' ? sk : sk.name || sk.title || ''
      }
    }))
  });

  // Informática (Sidebar)
  if (Array.isArray(informatics) && informatics.length > 0) {
    sections.push({
      id: 'informatica',
      titleText: 'INFORMÁTICA & TICs',
      records: informatics.map((inf: any, idx: number) => ({
        id: `rec-inf-${idx}`,
        kind: 'course',
        targetSectorRole: 'sidebar',
        fields: {
          title: inf.course || inf.title || '',
          institution: inf.institution || ''
        }
      }))
    });
  }

  // Formación Académica (Main)
  if (Array.isArray(education) && education.length > 0) {
    sections.push({
      id: 'formacion',
      titleText: 'FORMACIÓN ACADÉMICA',
      records: education.map((edu: any, idx: number) => ({
        id: `rec-edu-${idx}`,
        kind: 'education',
        targetSectorRole: 'main',
        fields: {
          degree: edu.degree || '',
          institution: edu.institution || '',
          level: edu.level || 'Superior',
          year: (edu.year || '').toString()
        }
      }))
    });
  }

  // Títulos Profesionales (Main)
  if (Array.isArray(sortedProfession) && sortedProfession.length > 0) {
    sections.push({
      id: 'profesion',
      titleText: `TÍTULOS PROFESIONALES (${sortedProfession.length})`,
      records: sortedProfession.map((prof: any, idx: number) => ({
        id: `rec-prof-${idx}`,
        kind: 'education',
        targetSectorRole: 'main',
        fields: {
          degree: prof.degree || '',
          institution: prof.institution || '',
          year: (prof.year || '').toString()
        }
      }))
    });
  }

  // Experiencia Laboral (Main)
  if (Array.isArray(sortedExperience) && sortedExperience.length > 0) {
    sections.push({
      id: 'experiencia',
      titleText: 'EXPERIENCIA LABORAL',
      records: sortedExperience.map((exp: any, idx: number) => ({
        id: `rec-exp-${idx}`,
        kind: 'experience',
        targetSectorRole: 'main',
        fields: {
          role: exp.role || '',
          institution: exp.institution || exp.company || '',
          year: (exp.year || '').toString(),
          details: exp.details || exp.description || ''
        }
      }))
    });
  }

  // Cursos & Capacitaciones (Main)
  if (Array.isArray(sortedCourses) && sortedCourses.length > 0) {
    sections.push({
      id: 'cursos',
      titleText: 'CURSOS & CAPACITACIONES',
      records: sortedCourses.map((c: any, idx: number) => ({
        id: `rec-course-${idx}`,
        kind: 'course',
        targetSectorRole: 'main',
        fields: {
          title: c.title || c.name || c.course || '',
          institution: c.institution || '',
          hours: (() => {
            const raw = String(c.hours || '').trim();
            if (!raw) return '';
            return /hs/i.test(raw) ? raw : `${raw} hs`;
          })()
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

  return sections;
}
