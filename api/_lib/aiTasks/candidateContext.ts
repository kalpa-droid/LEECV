/**
 * Construye el contexto que se le manda a la IA: solo la trayectoria útil,
 * serializada en una sola línea para gastar el mínimo de tokens.
 *
 * Diseño deliberado: ALLOWLIST explícita de lo que puede viajar al modelo.
 * Nada de metadata de UI/presentación (visibilidad, overrides, plantilla,
 * tema, layout) ni de preferencias — antes se mandaba todo cvData con
 * indentación, quemando cuota y distrayendo al modelo.
 */

const ALLOWLISTED_TOP_KEYS = [
  'personalInfo',
  'jobTarget',
  'summary',
  'objective',
  'frase',
  'experience',
  'education',
  'profession',
  'achievements',
  'portfolio',
  'projects',
  'publications',
  'coursesAndCertificates',
  'informatics',
  'hardSkills',
  'skills',
  'languages',
  'redes',
  'references',
  'certificatesScanned',
  'customSections',
  'personalizada-1',
  'personalizada-2',
  'personalizada-3',
  'personalizada-4',
  'personalizada-5'
] as const;

function isMeaningful(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

export function buildCandidateContext(cvData: any): string {
  if (!cvData) return 'No context available';

  if (cvData.type === 'editorial' || (Array.isArray(cvData.sections) && (cvData.design || cvData.designConfig))) {
    return buildEditorialDocumentDigest(cvData);
  }

  // Allowlist + deep clone por sección (no se muta el objeto original)
  const compact: Record<string, any> = {};
  for (const key of ALLOWLISTED_TOP_KEYS) {
    const raw = cvData[key];
    if (!isMeaningful(raw)) continue;
    try {
      compact[key] = JSON.parse(JSON.stringify(raw));
    } catch {
      // Si una sección no serializa (p. ej. ciclos), se omite sin romper la request
    }
  }

  // Redactar datos personales (deep clone ya hecho)
  if (compact.personalInfo) {
    const p = compact.personalInfo;
    if (p.dni) p.dni = '[DATO_PROTEGIDO]';
    if (p.cuit) p.cuit = '[DATO_PROTEGIDO]';
    if (p.phone) p.phone = '[DATO_PROTEGIDO]';
    if (p.email) p.email = '[DATO_PROTEGIDO]';

    // Ocultar calle, pero dejar ciudad/provincia
    if (p.address) p.address = '[DATO_PROTEGIDO]';
    if (p.location) p.location = '[DATO_PROTEGIDO]'; // Puede contener calle

    // Ocultar edad/estado civil para evitar sesgos
    if (p.birthDate) p.birthDate = '[DATO_PROTEGIDO]';
    if (p.estadoCivil) p.estadoCivil = '[DATO_PROTEGIDO]';
    if (p.nacionalidad) p.nacionalidad = '[DATO_PROTEGIDO]';

    // Eliminar base64 de imágenes (irrelevante para texto y pesa mucho)
    delete p.photoUrl;
    delete p.profilePhoto;
    delete p.signatureUrl;
  }

  // Eliminar imágenes de los certificados escaneados para ahorrar tokens
  if (Array.isArray(compact.certificatesScanned)) {
    compact.certificatesScanned.forEach((cert: any) => {
      if (cert && typeof cert === 'object') {
        delete cert.dataUrl;
        delete cert.imageUrl;
      }
    });
  }

  // Tachar emails y teléfonos en textos libres
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/g;

  function redactFreeText(obj: any): any {
    if (typeof obj === 'string') {
      let redacted = obj.replace(emailRegex, '[DATO_PROTEGIDO]');
      redacted = redacted.replace(phoneRegex, (match) => {
        const trimmed = match.trim();
        // Evitar tachar rangos de años comunes como 2020-2022 o fechas simples
        if (/^(19|20)\d{2}[-\s./]?(19|20)\d{2}$/.test(trimmed)) return match;
        if (/^\d{1,4}$/.test(trimmed)) return match;
        // Evitar tachar números de versión o fechas aisladas
        if (trimmed.length < 8 && !trimmed.startsWith('+')) return match;
        return '[DATO_PROTEGIDO]';
      });
      return redacted;
    }
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        obj[index] = redactFreeText(item);
      });
    } else if (obj !== null && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        obj[key] = redactFreeText(obj[key]);
      }
    }
    return obj;
  }

  redactFreeText(compact);

  return JSON.stringify(compact);
}

function redactPrivateStrings(raw: unknown): string {
  const txt = typeof raw === 'string' ? raw : '';
  if (!txt) return '';
  return txt
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[DATO_PROTEGIDO]')
    .replace(/(?:(?:\+|00)\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/g, (m) => {
      const t = m.trim();
      if (/^(19|20)\d{2}[-\s./]?(19|20)\d{2}$/.test(t) || /^\d{1,4}$/.test(t)) return m;
      return t.length >= 8 || t.startsWith('+') ? '[DATO_PROTEGIDO]' : m;
    });
}

function buildEditorialDocumentDigest(doc: any): string {
  const sections: any[] = Array.isArray(doc?.sections) ? doc.sections : [];
  const meta = doc?.metadata || doc?.docMeta || {};
  const design = doc?.design || doc?.designConfig || {};
  const tables: string[] = [];
  const figures: string[] = [];
  const bibliography: string[] = [];

  if (Array.isArray(doc?.bibliography)) {
    for (const b of doc.bibliography) {
      if (!b) continue;
      bibliography.push(
        `${b.bibAuthor || b.author || 'Autor'} (${b.bibYear || b.year || 's.f.'}) ${String(b.bibTitle || b.title || b.content || '').slice(0, 70)}`.trim(),
      );
    }
  }

  const outline = sections.slice(0, 40).map((sec, idx) => {
    const records: any[] = Array.isArray(sec?.records) ? sec.records : [];
    const subtitles: string[] = [];
    for (const r of records) {
      if (!r) continue;
      if (r.type === 'subtitle' && r.content) {
        subtitles.push(redactPrivateStrings(String(r.content).slice(0, 70)));
      } else if (r.type === 'table') {
        tables.push(
          `${sec.title || `Sección ${idx + 1}`}: ${r.tableCaption || r.content || (r.tableHeaders || []).join(' / ').slice(0, 60)}`,
        );
      } else if (r.type === 'image' || r.type === 'figure_placeholder') {
        figures.push(`${sec.title || `Sección ${idx + 1}`}: ${r.imageCaption || r.figureCaption || 'Figura'}`);
      } else if (r.type === 'bibliography_item') {
        bibliography.push(
          `${r.bibAuthor || 'Autor'} (${r.bibYear || 's.f.'}) ${String(r.bibTitle || r.content || '').slice(0, 70)}`.trim(),
        );
      }
    }
    const firstSnippet = records.find((r) => typeof r?.content === 'string' && r.content.trim())?.content || '';
    return {
      pos: idx + 1,
      key: sec?.sectionKey || 'capitulo',
      title: redactPrivateStrings(String(sec?.title || `Apartado ${idx + 1}`).slice(0, 90)),
      blocks: records.length,
      subtitles: subtitles.slice(0, 8),
      ...(firstSnippet ? { lead: redactPrivateStrings(String(firstSnippet).replace(/\s+/g, ' ').slice(0, 110)) } : {}),
    };
  });

  const digest = {
    docType: 'editorial',
    title: redactPrivateStrings(String(meta?.title || 'Sin título').slice(0, 120)),
    subtitle: redactPrivateStrings(String(meta?.subtitle || '').slice(0, 120)),
    author: redactPrivateStrings(String(meta?.author || '').slice(0, 80)),
    presetId: design?.presetId || meta?.presetId || 'libro-ensayo-novela',
    structuralNormId: design?.structuralNormId || 'libre',
    bibliographyStyle: design?.bibliographyStyle || design?.normId || meta?.citationNorm || 'tradicional',
    totalSections: sections.length,
    outline,
    tables: tables.slice(0, 20),
    figures: figures.slice(0, 20),
    bibliography: bibliography.slice(0, 25),
  };

  return JSON.stringify(digest);
}
