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

  if (docData.coverLetterContent?.text || docData.vacancy?.jobTitle) return true;
  if (docData.bookMetadata?.title) return true;

  return false;
}

export function isDraftDocumentId(id: string): boolean {
  if (!id) return false;
  return ['draft_cv', 'draft_card', 'draft_book', 'draft_cover_letter'].includes(id);
}

export function inferDocTypeFromDraftId(id: string): 'cv' | 'business_card' | 'book' | 'cover_letter' {
  if (id === 'draft_card') return 'business_card';
  if (id === 'draft_book') return 'book';
  if (id === 'draft_cover_letter') return 'cover_letter';
  return 'cv';
}

export function getDraftIdForDocType(docType: string): string {
  if (docType === 'business_card') return 'draft_card';
  if (docType === 'book') return 'draft_book';
  if (docType === 'cover_letter') return 'draft_cover_letter';
  return 'draft_cv';
}
