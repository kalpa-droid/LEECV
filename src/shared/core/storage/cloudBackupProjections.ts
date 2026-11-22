/**
 * Proyecciones por lista blanca para Respaldo en Nube Opt-In (Fase 4).
 *
 * Garantías:
 * - Solo sube TEXTO ESTRUCTURADO básico de tipos cuyo manifiesto declara `storage.cloudBackup`.
 * - Nunca incluye diseño (colores, fuentes, presets, layout), fotos, firmas, logos ni PDFs.
 * - `validateCloudBackupProjection` rechaza en runtime cualquier `data:`, `;base64,`, `blob:`,
 *   `asset://`, `boveda://` y cualquier payload que exceda `storage.cloudBackup.maxBytes`.
 */

import type { CloudBackupProjector } from '../../contracts/persistenceContract';
import { getDocumentTypeConfig, isRegisteredDocumentTypeId } from '../capabilities/capabilityRegistry';

const FORBIDDEN_BINARY_RE = /(?:^data:|\bbase64,|^(?:blob|asset|boveda):\/\/)/i;

const PERSONAL_TEXT_KEYS = [
  'title',
  'titlePrefix',
  'fullName',
  'givenNames',
  'surname',
  'role',
  'jobTitle',
  'email',
  'phone',
  'website',
  'portfolioUrl',
  'linkedin',
  'github',
  'cityProvince',
  'address',
  'location',
  'dni',
  'birthDate',
  'nacionalidad',
  'estadoCivil',
  'disponibilidad',
  'licenciaConducir',
  'quote',
  'summary',
] as const;

const CARD_OVERRIDE_TEXT_KEYS = [
  'name',
  'role',
  'companyName',
  'phone',
  'email',
  'website',
  'address',
  'tagline',
  'qrUrl',
] as const;

function stripBinaryStrings(value: unknown): unknown {
  if (typeof value === 'string') {
    return FORBIDDEN_BINARY_RE.test(value.trim()) ? '' : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripBinaryStrings(item));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/photo|image|logo|signature|avatar|dataurl|blob|binary/i.test(k)) continue;
      out[k] = stripBinaryStrings(v);
    }
    return out;
  }
  return value;
}

function pickTextFields(source: Record<string, any> | undefined, keys: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!source || typeof source !== 'object') return out;
  for (const key of keys) {
    const val = source[key];
    if (typeof val === 'string' && val.trim() && !FORBIDDEN_BINARY_RE.test(val.trim())) {
      out[key] = val;
    }
  }
  return out;
}

const cvProjector: CloudBackupProjector<any, Record<string, unknown>> = {
  toCloudProjection(data: any) {
    const safe = data && typeof data === 'object' ? data : {};
    return {
      personalInfo: pickTextFields(safe.personalInfo, PERSONAL_TEXT_KEYS),
      summary: typeof safe.summary === 'string' ? safe.summary : '',
      objective: typeof safe.objective === 'string' ? safe.objective : '',
      version_label: typeof safe.version_label === 'string' ? safe.version_label : undefined,
      experience: stripBinaryStrings(Array.isArray(safe.experience) ? safe.experience : []),
      education: stripBinaryStrings(Array.isArray(safe.education) ? safe.education : []),
      profession: stripBinaryStrings(Array.isArray(safe.profession) ? safe.profession : []),
      coursesAndCertificates: stripBinaryStrings(
        Array.isArray(safe.coursesAndCertificates) ? safe.coursesAndCertificates : []
      ),
      skills: stripBinaryStrings(Array.isArray(safe.skills) ? safe.skills : []),
      hardSkills: stripBinaryStrings(Array.isArray(safe.hardSkills) ? safe.hardSkills : []),
      languages: stripBinaryStrings(Array.isArray(safe.languages) ? safe.languages : []),
      informatics: stripBinaryStrings(Array.isArray(safe.informatics) ? safe.informatics : []),
      redes: stripBinaryStrings(Array.isArray(safe.redes) ? safe.redes : []),
      projects: stripBinaryStrings(Array.isArray(safe.projects) ? safe.projects : []),
      publications: stripBinaryStrings(Array.isArray(safe.publications) ? safe.publications : []),
      achievements: stripBinaryStrings(Array.isArray(safe.achievements) ? safe.achievements : []),
      references: stripBinaryStrings(Array.isArray(safe.references) ? safe.references : []),
      portfolio: stripBinaryStrings(Array.isArray(safe.portfolio) ? safe.portfolio : []),
      customSections: stripBinaryStrings(Array.isArray(safe.customSections) ? safe.customSections : []),
    };
  },
  fromCloudProjection(projection: Record<string, unknown>, defaults: any) {
    const base = defaults && typeof defaults === 'object' ? defaults : {};
    return {
      ...base,
      ...projection,
      personalInfo: {
        ...(base.personalInfo || {}),
        ...((projection.personalInfo as Record<string, unknown>) || {}),
      },
    };
  },
};

const businessCardProjector: CloudBackupProjector<any, Record<string, unknown>> = {
  toCloudProjection(data: any) {
    const safe = data && typeof data === 'object' ? data : {};
    return {
      personalInfo: pickTextFields(safe.personalInfo, PERSONAL_TEXT_KEYS),
      cardOverrides: pickTextFields(safe.cardOverrides, CARD_OVERRIDE_TEXT_KEYS),
      redes: stripBinaryStrings(Array.isArray(safe.redes) ? safe.redes : []),
    };
  },
  fromCloudProjection(projection: Record<string, unknown>, defaults: any) {
    const base = defaults && typeof defaults === 'object' ? defaults : {};
    return {
      ...base,
      personalInfo: {
        ...(base.personalInfo || {}),
        ...((projection.personalInfo as Record<string, unknown>) || {}),
      },
      cardOverrides: {
        ...(base.cardOverrides || {}),
        ...((projection.cardOverrides as Record<string, unknown>) || {}),
      },
      redes: Array.isArray(projection.redes) ? projection.redes : base.redes || [],
    };
  },
};

const coverLetterProjector: CloudBackupProjector<any, Record<string, unknown>> = {
  toCloudProjection(data: any) {
    const safe = data && typeof data === 'object' ? data : {};
    return {
      personalInfo: pickTextFields(safe.personalInfo, PERSONAL_TEXT_KEYS),
      body: stripBinaryStrings(safe.body && typeof safe.body === 'object' ? safe.body : {}),
      jobTarget: stripBinaryStrings(safe.jobTarget && typeof safe.jobTarget === 'object' ? safe.jobTarget : {}),
      vacancy: stripBinaryStrings(safe.vacancy && typeof safe.vacancy === 'object' ? safe.vacancy : {}),
      coverLetterContent: stripBinaryStrings(
        safe.coverLetterContent && typeof safe.coverLetterContent === 'object' ? safe.coverLetterContent : {}
      ),
      version_label: typeof safe.version_label === 'string' ? safe.version_label : undefined,
    };
  },
  fromCloudProjection(projection: Record<string, unknown>, defaults: any) {
    const base = defaults && typeof defaults === 'object' ? defaults : {};
    return {
      ...base,
      ...projection,
      personalInfo: {
        ...(base.personalInfo || {}),
        ...((projection.personalInfo as Record<string, unknown>) || {}),
      },
    };
  },
};

const projectorRegistry = new Map<string, CloudBackupProjector<any, Record<string, unknown>>>([
  ['cv', cvProjector],
  ['business_card', businessCardProjector],
  ['cover_letter', coverLetterProjector],
]);

export function registerCloudBackupProjector(
  docType: string,
  projector: CloudBackupProjector<any, Record<string, unknown>>
): void {
  projectorRegistry.set(docType, projector);
}

export function getCloudBackupProjector(docType: string): CloudBackupProjector<any, Record<string, unknown>> | null {
  return projectorRegistry.get(docType) ?? null;
}

function findForbiddenBinaryValue(value: unknown, currentPath: string = 'projection'): string | null {
  if (typeof value === 'string') {
    if (FORBIDDEN_BINARY_RE.test(value.trim())) {
      return `Contenido binario o referencia local prohibida en ${currentPath}`;
    }
    return null;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const err = findForbiddenBinaryValue(value[i], `${currentPath}[${i}]`);
      if (err) return err;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const err = findForbiddenBinaryValue(v, `${currentPath}.${k}`);
      if (err) return err;
    }
  }
  return null;
}

export interface ProjectionValidationResult {
  valid: boolean;
  byteSize: number;
  maxBytes: number;
  error?: string;
}

/**
 * Guardia genérica obligatoria antes de cualquier escritura en `document_backups`.
 */
export function validateCloudBackupProjection(
  docType: string,
  projection: Record<string, unknown>
): ProjectionValidationResult {
  if (!isRegisteredDocumentTypeId(docType)) {
    return { valid: false, byteSize: 0, maxBytes: 0, error: `Tipo de documento no registrado: ${docType}` };
  }

  const config = getDocumentTypeConfig(docType);
  if (config.storage.kind !== 'local' || !('cloudBackup' in config.storage) || !config.storage.cloudBackup) {
    return {
      valid: false,
      byteSize: 0,
      maxBytes: 0,
      error: `El tipo "${docType}" no admite respaldo en la nube (${config.storage.kind}).`,
    };
  }

  const maxBytes = config.storage.cloudBackup.maxBytes;
  const binaryError = findForbiddenBinaryValue(projection);
  if (binaryError) {
    return { valid: false, byteSize: 0, maxBytes, error: binaryError };
  }

  const json = JSON.stringify(projection);
  const byteSize = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(json).byteLength : Buffer.byteLength(json, 'utf8');
  if (byteSize > maxBytes) {
    return {
      valid: false,
      byteSize,
      maxBytes,
      error: `La proyección excede el tope permitido (${byteSize} > ${maxBytes} bytes).`,
    };
  }

  return { valid: true, byteSize, maxBytes };
}
