export function sanitizeCvData(rawCvData: any = {}) {
  const data: any = typeof rawCvData === 'object' && rawCvData !== null ? rawCvData : {};

  return {
    id: data.id || `cv_${Date.now()}`,
    title: data.title || 'Mi Currículum Vitae',
    updatedAt: data.updatedAt || new Date().toISOString(),
    showCoverPage: data.showCoverPage !== false,
    // Nombre canónico único para "qué plantilla/preset visual está eligiendo el usuario".
    // Antes existían 3 nombres para esto (coverPreset / layoutStyle / layout.layoutStyle)
    // y ninguno se conectaba de verdad al motor de render — activePresetId es el único
    // que el motor realmente lee (ver presetRegistry.ts / CVPreview.tsx).
    activePresetId: data.activePresetId || 'cv-clasico',
    coverFeaturedEducationId: data.coverFeaturedEducationId ?? null,
    coverFeaturedProfessionId: data.coverFeaturedProfessionId ?? null,

    personalInfo: {
      fullName: data.personalInfo?.fullName || '',
      surname: data.personalInfo?.surname || '',
      givenNames: data.personalInfo?.givenNames || '',
      dni: data.personalInfo?.dni || '',
      cuit: data.personalInfo?.cuit || '',
      birthDate: data.personalInfo?.birthDate || '',
      phone: data.personalInfo?.phone || '',
      email: data.personalInfo?.email || '',
      address: data.personalInfo?.address || '',
      cityProvince: data.personalInfo?.cityProvince || '',
      facebook: data.personalInfo?.facebook || '',
      year: data.personalInfo?.year || '2026',
      quote: data.personalInfo?.quote || '',
      profilePhoto: data.personalInfo?.profilePhoto || ''
    },

    roles: Array.isArray(data.roles) ? data.roles : [],
    education: Array.isArray(data.education) ? data.education : [],
    profession: Array.isArray(data.profession) ? data.profession : (Array.isArray(data.professions) ? data.professions : []),
    experience: Array.isArray(data.experience) ? data.experience : [],
    coursesAndCertificates: Array.isArray(data.coursesAndCertificates) ? data.coursesAndCertificates : [],
    informatics: Array.isArray(data.informatics) ? data.informatics : [],
    certificatesScanned: Array.isArray(data.certificatesScanned) ? data.certificatesScanned : [],
    customSections: Array.isArray(data.customSections)
      ? data.customSections.map((cs: any) => ({
          id: cs.id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          titleText: cs.titleText || 'NUEVA SECCIÓN',
          fields: Array.isArray(cs.fields) ? cs.fields : ['tituloOGrado', 'institucion'],
          records: Array.isArray(cs.records) ? cs.records : []
        }))
      : [],

    ecology: {
      rural: Array.isArray(data.ecology?.rural) ? data.ecology.rural : [],
      environmental: Array.isArray(data.ecology?.environmental) ? data.ecology.environmental : [],
      community: Array.isArray(data.ecology?.community) ? data.ecology.community : [],
      workshops: Array.isArray(data.ecology?.workshops) ? data.ecology.workshops : [],
      initiatives: Array.isArray(data.ecology?.initiatives) ? data.ecology.initiatives : []
    },

    signature: {
      dataUrl: data.signature?.dataUrl || '',
      signerName: data.signature?.signerName || '',
      signerRole: data.signature?.signerRole || '',
      date: data.signature?.date || ''
    },

    sectionVisibility: {
      personales: data.sectionVisibility?.personales !== false,
      formacion: data.sectionVisibility?.formacion !== false,
      profesion: data.sectionVisibility?.profesion !== false,
      experiencia: data.sectionVisibility?.experiencia !== false,
      cursos: data.sectionVisibility?.cursos !== false,
      informatica: data.sectionVisibility?.informatica !== false,
      ecologia: data.sectionVisibility?.ecologia !== false,
      certificados: data.sectionVisibility?.certificados !== false,
      firma: data.sectionVisibility?.firma !== false
    },

    layout: {
      columnAssignments: data.layout?.columnAssignments || {
        personales: 'secundaria',
        formacion: 'primaria',
        profesion: 'primaria',
        experiencia: 'primaria',
        cursos: 'primaria',
        informatica: 'secundaria',
        ecologia: 'secundaria',
        certificados: 'primaria',
        firma: 'primaria'
      },
      sectionOrders: {
        secundaria: Array.isArray(data.layout?.sectionOrders?.secundaria)
          ? [...new Set(data.layout.sectionOrders.secundaria)]
          : ['personales', 'informatica', 'ecologia'],
        primaria: Array.isArray(data.layout?.sectionOrders?.primaria)
          ? [...new Set(data.layout.sectionOrders.primaria)]
          : ['personales', 'formacion', 'profesion', 'experiencia', 'cursos', 'ecologia']
      }
    },

    // Antes este campo no se preservaba: sanitizeCvData lo borraba en cada carga
    // (recarga de página, "cargar de ejemplo", restaurar de localStorage), lo que
    // dejaba cvData.theme en undefined y rompía el panel de Color/Tipografía.
    theme: {
      presetId: data.theme?.presetId || 'navy-executive',
      primaryColor: data.theme?.primaryColor || '#1e3a8a',
      secondaryColor: data.theme?.secondaryColor || '#172554',
      accentColor: data.theme?.accentColor || '#d97706',
      textColor: data.theme?.textColor || '#0f172a',
      bgCorridor: data.theme?.bgCorridor || data.theme?.primaryColor || '#1e3a8a',
      fontFamily: data.theme?.fontFamily || "'Outfit', sans-serif"
    }
  };
}
