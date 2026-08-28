import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { TemplateRenderer } from './renderer/TemplateRenderer';
import { getPreset } from './layers/presets/presetRegistry';
import { cvDataToContentSections } from './layers/records/cvDataAdapter';
import { exportBusinessCardSheetToPDF } from './cardSheetExporter';
import { Preset } from './layers/presets/presetSchema';
import { getMonthNameEs } from '../utils/formatDate';
import { downloadBlob } from '../utils/downloadUtils';

/**
 * Native Vector PDF Generator powered by 8-Layer TemplateRenderer + @react-pdf/renderer
 */
export async function exportCVToPDF(cvData: any, presetInput?: Preset, atsMode?: boolean): Promise<boolean> {
  const preset = presetInput || getPreset('cv-clasico');
  const candidateName = (
    cvData?.personalInfo?.fullName || 
    `${cvData?.personalInfo?.surname || ''} ${cvData?.personalInfo?.givenNames || ''}`.trim() || 
    'Postulante'
  ).trim();

  const monthName = getMonthNameEs();
  const yearNum = new Date().getFullYear();
  const fileName = atsMode 
    ? `CV - ${candidateName} - ${monthName} - ${yearNum} - ATS.pdf`
    : `CV - ${candidateName} - ${monthName} - ${yearNum}.pdf`;

  const sections = cvDataToContentSections(cvData);
  const docElement = React.createElement(TemplateRenderer, {
    preset,
    atsMode,
    sections,
    personalInfo: cvData?.personalInfo || {},
    certificatesScanned: cvData?.certificatesScanned || [],
    showCoverPage: cvData?.showCoverPage !== false,
    coverFeaturedEducationId: cvData?.coverFeaturedEducationId,
    coverFeaturedProfessionId: cvData?.coverFeaturedProfessionId,
    roles: cvData?.roles || [],
    education: cvData?.education || [],
    professions: cvData?.professions || [],
    layoutOverrides: cvData?.layout,
    customRecordCardDesigns: cvData?.recordCardDesigns
  });

  // Generate vector PDF blob natively without screen capture
  const blob = await pdf(docElement as any).toBlob();
  downloadBlob(blob, fileName);

  return true;
}

import { buildCardDataFromCV } from './layers/records/cardDataAdapter';

/**
 * Universal PDF exporter connecting all document types (CVs, Business Card Sheets, etc.)
 */
export async function exportDocumentToPDF(cvData: any, presetId: string = 'cv-clasico', atsMode?: boolean): Promise<boolean> {
  const preset = getPreset(presetId);

  if (preset.pageCategory === 'tarjeta') {
    const cardData = await buildCardDataFromCV(cvData);
    return exportBusinessCardSheetToPDF(cardData, preset);
  }

  return exportCVToPDF(cvData, preset, atsMode);
}
