import { getDefaultTitleForDocType, hasCapability } from '../../capabilities/capabilityRegistry';

export function generateDocumentId(prefix: string): string {
  const now = new Date();
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  
  const HH = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  
  const decimas = Math.floor(now.getMilliseconds() / 100);
  
  const randomStr = Math.random().toString(36).substring(2, 5);
  return `doc_${prefix}_${YYYY}${MM}${DD}_${HH}${mm}${ss}_${decimas}_${randomStr}`;
}

export function deriveDocumentTitle(docType: string, docData: any): string {
  const isNameable = hasCapability(docType, 'nameable_title');
  const defaultTitle = getDefaultTitleForDocType(docType);

  if (!isNameable) {
    return defaultTitle; // Congelado para 'book'
  }

  const names = [];
  if (docData?.personalInfo?.givenNames || docData?.personalInfo?.surname) {
    if (docData.personalInfo.givenNames) names.push(docData.personalInfo.givenNames);
    if (docData.personalInfo.surname) names.push(docData.personalInfo.surname);
  } else if (docData?.personalInfo?.fullName) {
    names.push(docData.personalInfo.fullName);
  }
  
  if (names.length > 0) {
    return `${defaultTitle} de ${names.join(' ')}`;
  }
  
  return defaultTitle;
}
