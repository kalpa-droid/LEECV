/**
 * Constructor de metadatos PDF nativos orientados a sistemas ATS.
 *
 * Inyecta información invisible visualmente pero indexada por motores ATS y buscadores de RRHH
 * en el diccionario estándar del PDF (`Title`, `Author`, `Subject`, `Keywords`).
 */

import { resolveDisplayName } from '../../../utils/cvDataSchema';

export interface PdfDocumentMeta {
  title: string;
  author: string;
  subject: string;
  keywords: string;
}

export function buildPdfDocumentMeta(cvData: any, presetName?: string): PdfDocumentMeta {
  const personalInfo = cvData?.personalInfo || {};
  const author = resolveDisplayName(personalInfo) || 'Candidato';
  const jobTitle = String(cvData?.jobTarget?.jobTitle || '').trim();
  const companyName = String(cvData?.jobTarget?.companyName || '').trim();

  const hasValidTitle = Boolean(jobTitle && jobTitle.toLowerCase() !== 'ninguno');
  const hasValidCompany = Boolean(companyName && companyName.toLowerCase() !== 'ninguna');

  const titleParts = [author];
  if (hasValidTitle) {
    titleParts.push(hasValidCompany ? `${jobTitle} (${companyName})` : jobTitle);
  } else if (presetName) {
    titleParts.push('Currículum Vitae');
  }
  const title = titleParts.join(' — ');

  const subject =
    String(cvData?.atsMetadata?.subject || '').trim() ||
    (hasValidTitle
      ? `Postulación: ${jobTitle}${hasValidCompany ? ` · ${companyName}` : ''}`
      : 'Currículum Vitae Profesional');

  const keywordPool: string[] = [];
  const pushKw = (raw: unknown) => {
    const clean = typeof raw === 'string' ? raw.trim() : '';
    if (clean) keywordPool.push(clean);
  };

  if (Array.isArray(cvData?.atsMetadata?.keywords)) {
    cvData.atsMetadata.keywords.forEach(pushKw);
  }
  if (hasValidTitle) pushKw(jobTitle);
  if (hasValidCompany) pushKw(companyName);
  pushKw(personalInfo?.role || personalInfo?.title);

  if (Array.isArray(cvData?.skills)) {
    cvData.skills.slice(0, 12).forEach((s: any) => pushKw(typeof s === 'string' ? s : s?.name || s?.title));
  }
  if (Array.isArray(cvData?.hardSkills)) {
    cvData.hardSkills.slice(0, 12).forEach((s: any) => pushKw(typeof s === 'string' ? s : s?.name || s?.title));
  }

  const dedupedKeywords: string[] = [];
  const seen = new Set<string>();
  for (const kw of keywordPool) {
    const norm = kw.toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      dedupedKeywords.push(kw);
    }
  }

  return {
    title,
    author,
    subject,
    keywords: dedupedKeywords.join(', '),
  };
}
