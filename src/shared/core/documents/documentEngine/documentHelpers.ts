import {
  DOCUMENT_TYPE_REGISTRY,
  getDocumentTypeConfig,
  type RegisteredDocumentTypeId,
} from '../../capabilities/capabilityRegistry';

export const AUTOSAVE_DEBOUNCE_MS = 1500;

export function isProvisionalDocument(docData: any): boolean {
  return Boolean(docData?.isProvisional);
}

export function markAsConfirmed(docData: any): any {
  if (!docData) return docData;
  return { ...docData, isProvisional: false };
}

export function hasRealContent(docData: any): boolean {
  if (!docData) return false;
  
  const info = docData.personalInfo || {};
  if (info.fullName || info.givenNames || info.surname) return true;
  if (info.role || info.jobTitle || info.phone || info.email || info.website || info.portfolioUrl || info.cityProvince || info.address) return true;
  
  if (docData.roles && docData.roles.length > 0) return true;
  if (docData.education && docData.education.length > 0) return true;
  if (docData.experience && docData.experience.length > 0) return true;
  if (docData.coursesAndCertificates && docData.coursesAndCertificates.length > 0) return true;
  if (docData.languages && docData.languages.length > 0) return true;
  if (docData.skills && docData.skills.length > 0) return true;
  if (docData.customSections && docData.customSections.length > 0) return true;

  if (docData.cardOverrides) {
    const card = docData.cardOverrides;
    if (card.name || card.role || card.phone || card.email || card.website || card.address || card.companyName) return true;
  }

  if (
    docData.body?.hookParagraph ||
    docData.body?.evidenceParagraph ||
    docData.body?.closingParagraph ||
    docData.jobTarget?.jobTitle ||
    docData.jobTarget?.companyName ||
    docData.jobTarget?.jobDescription ||
    docData.coverLetterContent?.text ||
    docData.vacancy?.jobTitle
  ) return true;
  if (docData.bookMetadata?.title) return true;

  if (docData.modules && Object.values(docData.modules).some(Boolean)) return true;
  if (docData.monthOverrides && Object.keys(docData.monthOverrides).length > 0) return true;

  if (docData.type === 'editorial') {
    if (Array.isArray(docData.sections) && docData.sections.length > 0) return true;
    const editorialTitle = typeof docData.metadata?.title === 'string' ? docData.metadata.title.trim() : '';
    if (editorialTitle && editorialTitle !== 'Mi obra') return true;
  }

  return false;
}

const DRAFT_ID_TO_DOC_TYPE = new Map<string, RegisteredDocumentTypeId>(
  Object.values(DOCUMENT_TYPE_REGISTRY).map((entry) => [entry.draftIdPrefix, entry.id])
);

export function isDraftDocumentId(id: string): boolean {
  if (!id) return false;
  return DRAFT_ID_TO_DOC_TYPE.has(id);
}

export function inferDocTypeFromDraftId(id: string): RegisteredDocumentTypeId {
  return DRAFT_ID_TO_DOC_TYPE.get(id) ?? 'cv';
}

export function getDraftIdForDocType(docType: string): string {
  return getDocumentTypeConfig(docType).draftIdPrefix;
}
