/**
 * Tests del núcleo de variantes de postulación.
 * Cubre: formato de label, detección de provisional, nunca-encadenar
 * sourceCvTabId, construcción de datos (reset carta / keepJobTarget)
 * y el orquestador createApplicationVariant con dependencias inyectadas.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  PROVISIONAL_APPLICATION_LABEL,
  buildApplicationVersionLabel,
  isProvisionalApplicationLabel,
  isApplicationVariant,
  resolveBaseSourceTabId,
  buildApplicationVariantData,
  computeApplicationRename,
  createApplicationVariant,
} from '../src/shared/core/documents/applicationVariant';

const baseCv = {
  id: 'cv_base_1',
  doc_type_id: 'cv',
  title: 'CV - José - Base',
  personalInfo: { fullName: 'José Burgos' },
  jobTarget: { jobTitle: 'Dev', companyName: 'ACME', jobDescription: 'aviso' },
  body: { salutation: 'Hola', hookParagraph: 'P1', evidenceParagraph: 'P2', closingParagraph: 'P3', signoff: 'Chau' },
  experience: [{ company: 'ACME' }],
};

describe('buildApplicationVersionLabel', () => {
  it('"Puesto · Empresa" cuando están ambos', () => {
    expect(buildApplicationVersionLabel('Frontend', 'Mercado Libre')).toBe('Frontend · Mercado Libre');
  });
  it('sólo puesto o sólo empresa', () => {
    expect(buildApplicationVersionLabel('Frontend')).toBe('Frontend');
    expect(buildApplicationVersionLabel('', 'Mercado Libre')).toBe('Mercado Libre');
    expect(buildApplicationVersionLabel('  ', '  ')).toBe(PROVISIONAL_APPLICATION_LABEL);
  });
  it('recorta espacios', () => {
    expect(buildApplicationVersionLabel('  Frontend  ', '  ACME ')).toBe('Frontend · ACME');
  });
});

describe('isProvisionalApplicationLabel', () => {
  it('reconoce los labels provisionales', () => {
    expect(isProvisionalApplicationLabel(PROVISIONAL_APPLICATION_LABEL)).toBe(true);
    expect(isProvisionalApplicationLabel('nueva postulacion')).toBe(true);
    expect(isProvisionalApplicationLabel('')).toBe(true);
    expect(isProvisionalApplicationLabel(undefined)).toBe(true);
    expect(isProvisionalApplicationLabel(null)).toBe(true);
  });
  it('un label manual NO es provisional', () => {
    expect(isProvisionalApplicationLabel('Frontend · ACME')).toBe(false);
    expect(isProvisionalApplicationLabel('Docencia')).toBe(false);
  });
});

describe('isApplicationVariant / resolveBaseSourceTabId', () => {
  it('un CV sin sourceCvTabId es el base', () => {
    expect(isApplicationVariant(baseCv)).toBe(false);
    expect(resolveBaseSourceTabId(baseCv)).toBe('cv_base_1');
  });
  it('una variante apunta al base original', () => {
    const variant = buildApplicationVariantData(baseCv, {});
    expect(isApplicationVariant(variant)).toBe(true);
  });
  it('NUNCA encadena A→B→C: variante de variante vuelve al base original', () => {
    const variant = buildApplicationVariantData(baseCv, {});
    variant.id = 'cv_variant_2';
    const second = buildApplicationVariantData(variant, {});
    expect(second.sourceCvTabId).toBe('cv_base_1');
  });
});

describe('buildApplicationVariantData', () => {
  it('resetea id y cuerpo de carta, pre-carga nada por defecto', () => {
    const v = buildApplicationVariantData(baseCv, {});
    expect(v.id).toBeUndefined();
    expect(v.doc_type_id).toBe('cv');
    expect(v.sourceCvTabId).toBe('cv_base_1');
    expect(v.body).toEqual({ salutation: '', hookParagraph: '', evidenceParagraph: '', closingParagraph: '', signoff: '' });
    expect(v.jobTarget).toEqual({});
    expect(v.version_label).toBe(PROVISIONAL_APPLICATION_LABEL);
  });
  it('no muta el CV original', () => {
    buildApplicationVariantData(baseCv, {});
    expect(baseCv.id).toBe('cv_base_1');
    expect(baseCv.body.salutation).toBe('Hola');
  });
  it('precarga jobTarget sólo con puesto/empresa explícitos', () => {
    const v = buildApplicationVariantData(baseCv, { puesto: 'Backend', empresa: 'Globant' });
    expect(v.jobTarget).toEqual({ jobTitle: 'Backend', companyName: 'Globant' });
    expect(v.version_label).toBe('Backend · Globant');
  });
  it('keepJobTarget conserva el jobTarget del origen', () => {
    const v = buildApplicationVariantData(baseCv, { keepJobTarget: true });
    expect(v.jobTarget).toEqual(baseCv.jobTarget);
    expect(v.jobTarget).not.toBe(baseCv.jobTarget); // copia, no referencia
  });
  it('resetLetterBody=false conserva la carta', () => {
    const v = buildApplicationVariantData(baseCv, { resetLetterBody: false });
    expect(v.body).toEqual(baseCv.body);
    expect(v.doc_type_id).toBe('cv'); // conserva el original
  });
  it('versionLabel explícita gana sobre el generado', () => {
    const v = buildApplicationVariantData(baseCv, { versionLabel: 'Docencia', puesto: 'Backend' });
    expect(v.version_label).toBe('Docencia');
  });
});

describe('computeApplicationRename', () => {
  it('renombra desde provisional al completar puesto/empresa', () => {
    expect(computeApplicationRename(PROVISIONAL_APPLICATION_LABEL, 'Backend', 'Globant')).toBe('Backend · Globant');
    expect(computeApplicationRename(undefined, 'Backend', 'Globant')).toBe('Backend · Globant');
  });
  it('sin puesto ni empresa no renombra', () => {
    expect(computeApplicationRename(PROVISIONAL_APPLICATION_LABEL, '', '')).toBeNull();
  });
  it('no pisa un label manual', () => {
    expect(computeApplicationRename('Docencia', 'Backend', 'Globant')).toBeNull();
    expect(computeApplicationRename('Backend · Globant', 'Backend', 'Globant')).toBeNull();
  });
  it('renombra con sólo puesto o sólo empresa', () => {
    expect(computeApplicationRename(PROVISIONAL_APPLICATION_LABEL, 'Backend', '')).toBe('Backend');
    expect(computeApplicationRename(PROVISIONAL_APPLICATION_LABEL, '', 'Globant')).toBe('Globant');
  });
});

describe('createApplicationVariant (deps inyectadas)', () => {
  const okSaveAs = vi.fn(async (_data: any, _label?: string) => ({ success: true, record: { id: 'cv_new_9' } }));
  const ensureTab = vi.fn(() => []);

  it('guarda, registra la pestaña y devuelve el id', async () => {
    okSaveAs.mockClear(); ensureTab.mockClear();
    const res = await createApplicationVariant({ cvData: baseCv }, { saveAs: okSaveAs, ensureTab: ensureTab as any });
    expect(res.success).toBe(true);
    expect(res.id).toBe('cv_new_9');
    expect(res.label).toBe(PROVISIONAL_APPLICATION_LABEL);
    expect(okSaveAs).toHaveBeenCalledTimes(1);
    const [data, label] = okSaveAs.mock.calls[0];
    expect(label).toBe(PROVISIONAL_APPLICATION_LABEL);
    expect(data.id).toBeUndefined();
    expect(data.sourceCvTabId).toBe('cv_base_1');
    expect(ensureTab).toHaveBeenCalledTimes(1);
    const [tabId, docType, tabData] = ensureTab.mock.calls[0] as any[];
    expect(tabId).toBe('cv_new_9');
    expect(docType).toBe('cv');
    expect(tabData.version_label).toBe(PROVISIONAL_APPLICATION_LABEL);
  });

  it('si la persistencia falla no registra pestaña', async () => {
    const failSaveAs = vi.fn(async () => ({ success: false, error: 'boom' }));
    ensureTab.mockClear();
    const res = await createApplicationVariant({ cvData: baseCv }, { saveAs: failSaveAs, ensureTab: ensureTab as any });
    expect(res.success).toBe(false);
    expect(res.error).toBe('boom');
    expect(ensureTab).not.toHaveBeenCalled();
  });

  it('si saveAs lanza excepción no registra pestaña', async () => {
    const throwSaveAs = vi.fn(async () => { throw new Error('net down'); });
    ensureTab.mockClear();
    const res = await createApplicationVariant({ cvData: baseCv }, { saveAs: throwSaveAs as any, ensureTab: ensureTab as any });
    expect(res.success).toBe(false);
    expect(ensureTab).not.toHaveBeenCalled();
  });

  it('si saveAs no devuelve record.id se reporta error sin pestaña fantasma', async () => {
    const noIdSaveAs = vi.fn(async () => ({ success: true }));
    ensureTab.mockClear();
    const res = await createApplicationVariant({ cvData: baseCv }, { saveAs: noIdSaveAs, ensureTab: ensureTab as any });
    expect(res.success).toBe(false);
    expect(ensureTab).not.toHaveBeenCalled();
  });
});
