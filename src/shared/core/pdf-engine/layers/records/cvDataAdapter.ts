import { ContentSection, CvRecordKind } from './recordTypes';
import { getSectionLabel } from '../../../sectionRegistry';
import { resolveActiveFormat } from '../../../formats/cvFormatRegistry';
import { resolveDisplayName } from '../../../utils/cvDataSchema';
import { resolveDateRange } from './dateRangeResolver';
import { CANONICAL_SECTION_ORDER } from '../../../sections/canonicalSectionOrder';

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
export function cvDataToContentSections(cvData: any): ContentSection<CvRecordKind>[] {
  if (!cvData) return [];

  const isVisible = (id: string) => cvData?.sectionVisibility?.[id] !== false;

  const {
    personalInfo = {},
    education = [],
    profession = [],
    experience = [],
    coursesAndCertificates = [],
    customSections = [],
    skills = [],
    informatics = [],
    signature = {}
  } = cvData;

  const activeFormat = resolveActiveFormat(cvData);
  const hiddenFieldsSet = new Set(activeFormat?.hiddenPersonalFields || []);

  const sortedEducation = sortByYearDesc(education);
  const sortedCourses = sortByYearDesc(coursesAndCertificates);
  const sortedExperience = sortByYearDesc(experience);
  const sortedProfession = sortByYearDesc(profession);
  const sortedProjects = sortByYearDesc(cvData.projects);
  const sortedPublications = sortByYearDesc(cvData.publications);

  const sections: ContentSection<CvRecordKind>[] = [];

  // Contacto & Redes (Sidebar)
  if (isVisible('contacto')) {
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
  }

  // Datos Personales (Sidebar - Filtrados dinámicamente según hiddenPersonalFields del Formato Activo)
  const personalDetailsFields = {
    dni: hiddenFieldsSet.has('dni') ? '' : personalInfo.dni || '',
    cuit: hiddenFieldsSet.has('cuit') ? '' : personalInfo.cuit || '',
    birthDate: hiddenFieldsSet.has('birthDate') ? '' : personalInfo.birthDate || '',
    nacionalidad: hiddenFieldsSet.has('nacionalidad') ? '' : personalInfo.nacionalidad || '',
    estadoCivil: hiddenFieldsSet.has('estadoCivil') ? '' : personalInfo.estadoCivil || '',
    disponibilidad: hiddenFieldsSet.has('disponibilidad') ? '' : personalInfo.disponibilidad || '',
    licenciaConducir: hiddenFieldsSet.has('licenciaConducir') ? '' : personalInfo.licenciaConducir || ''
  };

  const hasPersonalDetails = Object.values(personalDetailsFields).some((val) => !!val);
  if (isVisible('datos-personales') && hasPersonalDetails) {
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

  // Frase / Lema Personal / Cita (Solo si existe un texto de cita explícito cvData.frase)
  if (isVisible('frase') && cvData?.frase && typeof cvData.frase === 'string' && cvData.frase.trim().length > 0) {
    sections.push({
      id: 'frase',
      titleText: '',
      records: [
        {
          id: 'rec-frase',
          kind: 'quote-text',
          targetSectorRole: 'main',
          fields: { text: cvData.frase }
        }
      ]
    });
  }

  // Resumen Profesional / Extracto (Main)
  if (isVisible('resumen') && cvData.summary) {
    sections.push({
      id: 'resumen',
      titleText: '',
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

  // Redes Sociales & Enlaces (Sidebar)
  if (isVisible('redes') && Array.isArray(cvData.redes) && cvData.redes.length > 0) {
    sections.push({
      id: 'redes',
      titleText: getSectionLabel('redes'),
      records: cvData.redes.map((r: any, idx: number) => ({
        id: `rec-redes-${idx}`,
        kind: 'social-link',
        fieldLabelOverrides: r.fieldLabelOverrides,
        targetSectorRole: 'sidebar',
        fields: {
          label: r.usuario ? `${r.plataforma || 'Red'}: ${r.usuario}` : r.plataforma || r.url || '',
          url: r.url || (r.plataforma === 'Email' && r.usuario ? `mailto:${r.usuario}` : ''),
          icon: r.plataforma === 'LinkedIn' ? 'social-professional'
            : r.plataforma === 'Email' ? 'social-email'
            : r.plataforma?.includes('GitHub') || r.plataforma?.includes('GitLab') ? 'social-code'
            : 'social-web'
        }
      }))
    });
  }

  // Habilidades Técnicas / Hard Skills (Sidebar)
  if (isVisible('habilidades') && Array.isArray(cvData.hardSkills) && cvData.hardSkills.length > 0) {
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
  if (isVisible('competencias') && Array.isArray(skills) && skills.length > 0) {
    sections.push({
      id: 'competencias',
      titleText: getSectionLabel('competencias'),
      records: skills.map((sk: any, idx: number) => ({
        id: `rec-skill-${idx}`,
        kind: 'skill',
        targetSectorRole: 'sidebar',
        fields: {
          name: typeof sk === 'string' ? sk : sk.name || sk.title || ''
        }
      }))
    });
  }

  // Idiomas & Nivel (Sidebar)
  if (isVisible('idiomas') && Array.isArray(cvData.languages) && cvData.languages.length > 0) {
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
  if (isVisible('proyectos') && Array.isArray(sortedProjects) && sortedProjects.length > 0) {
    sections.push({
      id: 'proyectos',
      titleText: getSectionLabel('proyectos'),
      records: sortedProjects.map((proj: any, idx: number) => {
        const { startDate, endDate, ...projRest } = proj || {};
        return {
          id: `rec-proj-${idx}`,
          kind: 'projects',
          fieldLabelOverrides: proj.fieldLabelOverrides,
          targetSectorRole: 'main',
          fields: {
            ...projRest,
            title: proj.title || proj.name || proj.tituloOGrado || '',
            institution: proj.institution || proj.institucion || '',
            year: resolveDateRange(proj),
            details: proj.details || proj.description || proj.descripcion || ''
          }
        };
      })
    });
  }

  // Publicaciones & Patentes (Main)
  if (isVisible('publicaciones') && Array.isArray(sortedPublications) && sortedPublications.length > 0) {
    sections.push({
      id: 'publicaciones',
      titleText: getSectionLabel('publicaciones'),
      records: sortedPublications.map((pub: any, idx: number) => {
        const { startDate, endDate, ...pubRest } = pub || {};
        return {
          id: `rec-pub-${idx}`,
          kind: 'publications',
          fieldLabelOverrides: pub.fieldLabelOverrides,
          targetSectorRole: 'main',
          fields: {
            ...pubRest,
            title: pub.title || pub.tituloOGrado || '',
            autor: pub.autor || pub.author || '',
            institution: pub.institution || pub.institucion || '',
            year: resolveDateRange(pub)
          }
        };
      })
    });
  }

  // Referencias Laborales (Main)
  if (isVisible('referencias') && Array.isArray(cvData.references) && cvData.references.length > 0) {
    sections.push({
      id: 'referencias',
      titleText: getSectionLabel('referencias'),
      records: cvData.references.map((ref: any, idx: number) => ({
        id: `rec-ref-${idx}`,
        kind: 'references',
        fieldLabelOverrides: ref.fieldLabelOverrides,
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
  if (isVisible('informatica') && Array.isArray(informatics) && informatics.length > 0) {
    sections.push({
      id: 'informatica',
      titleText: getSectionLabel('informatica'),
      records: informatics.map((inf: any, idx: number) => ({
        id: `rec-inf-${idx}`,
        kind: 'course',
        fieldLabelOverrides: inf.fieldLabelOverrides,
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
  if (isVisible('formacion') && Array.isArray(sortedEducation) && sortedEducation.length > 0) {
    sections.push({
      id: 'formacion',
      titleText: getSectionLabel('formacion'),
      records: sortedEducation.map((edu: any, idx: number) => {
        const { startDate, endDate, ...eduRest } = edu || {};
        return {
          id: `rec-edu-${idx}`,
          kind: 'education',
          fieldLabelOverrides: edu.fieldLabelOverrides,
          targetSectorRole: 'main',
          fields: {
            ...eduRest,
            degree: edu.degree || edu.title || edu.tituloOGrado || '',
            institution: edu.institution || edu.institucion || '',
            level: edu.level || 'Superior',
            year: resolveDateRange(edu)
          }
        };
      })
    });
  }

  // Títulos Profesionales (Main)
  if (isVisible('profesion') && Array.isArray(sortedProfession) && sortedProfession.length > 0) {
    sections.push({
      id: 'profesion',
      titleText: getSectionLabel('profesion'),
      records: sortedProfession.map((prof: any, idx: number) => {
        const { startDate, endDate, ...profRest } = prof || {};
        return {
          id: `rec-prof-${idx}`,
          kind: 'education',
          fieldLabelOverrides: prof.fieldLabelOverrides,
          targetSectorRole: 'main',
          fields: {
            ...profRest,
            degree: prof.degree || prof.title || prof.tituloOGrado || '',
            institution: prof.institution || prof.institucion || '',
            year: resolveDateRange(prof)
          }
        };
      })
    });
  }

  // Experiencia Laboral (Main)
  if (isVisible('experiencia') && Array.isArray(sortedExperience) && sortedExperience.length > 0) {
    sections.push({
      id: 'experiencia',
      titleText: getSectionLabel('experiencia'),
      records: sortedExperience.map((exp: any, idx: number) => {
        const { startDate, endDate, ...expRest } = exp || {};
        return {
          id: `rec-exp-${idx}`,
          kind: 'experience',
          fieldLabelOverrides: exp.fieldLabelOverrides,
          targetSectorRole: 'main',
          fields: {
            ...expRest,
            role: exp.role || exp.cargo || exp.title || '',
            institution: exp.institution || exp.company || exp.institucion || '',
            year: resolveDateRange(exp),
            details: exp.details || exp.description || exp.descripcion || ''
          }
        };
      })
    });
  }

  // Cursos & Capacitaciones (Main)
  if (isVisible('cursos') && Array.isArray(sortedCourses) && sortedCourses.length > 0) {
    sections.push({
      id: 'cursos',
      titleText: getSectionLabel('cursos'),
      records: sortedCourses.map((c: any, idx: number) => {
        const { startDate, endDate, ...cRest } = c || {};
        return {
          id: `rec-course-${idx}`,
          kind: 'course',
          fieldLabelOverrides: c.fieldLabelOverrides,
          targetSectorRole: 'main',
          fields: {
            ...cRest,
            title: c.title || c.name || c.course || c.tituloOGrado || '',
            institution: c.institution || c.institucion || '',
            year: resolveDateRange(c),
            hours: (() => {
              const raw = String(c.hours || c.cargaHoraria || '').trim();
              if (!raw) return '';
              return /hs/i.test(raw) ? raw : `${raw} hs`;
            })()
          }
        };
      })
    });
  }

  // Secciones Personalizadas Dinámicas (customSections)
  if (Array.isArray(cvData.customSections)) {
    cvData.customSections.forEach((cs: any) => {
      if (cs && cs.id && isVisible(cs.id)) {
        sections.push({
          id: cs.id,
          titleText: (cs.titleText || 'NUEVA SECCIÓN').toUpperCase(),
          records: Array.isArray(cs.records) ? cs.records.map((r: any, idx: number) => ({
            id: `rec-${cs.id}-${idx}`,
            kind: 'custom',
            fieldLabelOverrides: r.fieldLabelOverrides,
            targetSectorRole: 'main',
            fields: {
              ...r,
              _fields: cs.fields || ['tituloOGrado', 'institucion']
            }
          })) : []
        });
      }
    });
  }

  // Firma Digital (Main)
  const autoSignerName = resolveDisplayName(personalInfo);
  const selectedRole = signature?.signerRole || (sortedProfession?.[0]?.degree || sortedEducation?.[0]?.degree || '');
  const todayISO = new Date().toISOString().split('T')[0];
  const sigDate = signature?.date || todayISO;

  if (signature?.dataUrl || signature?.signerName) {
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
            dataUrl: signature.dataUrl
          }
        }
      ]
    });
  }

  // Priorizar el orden manual configurado por el usuario en cvData.layout.sectionOrders (primaria/secundaria)
  const userPrimOrder = cvData?.layout?.sectionOrders?.primaria;
  const userSecOrder = cvData?.layout?.sectionOrders?.secundaria;
  const hasUserCustomOrder = (Array.isArray(userPrimOrder) && userPrimOrder.length > 0) || (Array.isArray(userSecOrder) && userSecOrder.length > 0);

  let orderedSections = sections;

  const canonicalOrderMap = new Map<string, number>();
  CANONICAL_SECTION_ORDER.forEach((secId, idx) => {
    canonicalOrderMap.set(secId, idx);
  });

  if (hasUserCustomOrder) {
    const combinedUserOrder = [
      ...(Array.isArray(userSecOrder) ? userSecOrder : []),
      ...(Array.isArray(userPrimOrder) ? userPrimOrder : [])
    ];
    const userOrderMap = new Map<string, number>();
    combinedUserOrder.forEach((secId, idx) => {
      if (!userOrderMap.has(secId)) {
        userOrderMap.set(secId, idx);
      }
    });

    orderedSections = [...sections].sort((a, b) => {
      const posA = userOrderMap.has(a.id) ? userOrderMap.get(a.id)! : 1000 + (canonicalOrderMap.get(a.id) ?? 999);
      const posB = userOrderMap.has(b.id) ? userOrderMap.get(b.id)! : 1000 + (canonicalOrderMap.get(b.id) ?? 999);
      return posA - posB;
    });
  } else if (activeFormat && Array.isArray(activeFormat.defaultVisibleSections) && activeFormat.defaultVisibleSections.length > 0) {
    const formatOrderMap = new Map<string, number>();
    activeFormat.defaultVisibleSections.forEach((secId, idx) => {
      formatOrderMap.set(secId, idx);
    });

    orderedSections = [...sections].sort((a, b) => {
      const posA = formatOrderMap.has(a.id) ? formatOrderMap.get(a.id)! : 1000 + (canonicalOrderMap.get(a.id) ?? 999);
      const posB = formatOrderMap.has(b.id) ? formatOrderMap.get(b.id)! : 1000 + (canonicalOrderMap.get(b.id) ?? 999);
      return posA - posB;
    });
  } else {
    orderedSections = [...sections].sort((a, b) => {
      const posA = canonicalOrderMap.get(a.id) ?? 999;
      const posB = canonicalOrderMap.get(b.id) ?? 999;
      return posA - posB;
    });
  }

  // Invariante de Motor: La sección de Firma Digital ('firma') es la sección terminal absoluta del CV
  const sigIdx = orderedSections.findIndex(sec => sec.id === 'firma');
  if (sigIdx !== -1 && sigIdx < orderedSections.length - 1) {
    const [sigSec] = orderedSections.splice(sigIdx, 1);
    orderedSections.push(sigSec);
  }

  // Mapear saltos de página configurados por el usuario
  const sectionPageBreaks = cvData?.layout?.sectionPageBreaks || cvData?.sectionPageBreaks || {};
  return orderedSections.map(sec => ({
    ...sec,
    breakBefore: !!sectionPageBreaks[sec.id]
  }));
}
