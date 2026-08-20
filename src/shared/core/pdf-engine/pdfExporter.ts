import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { CvPdfDocument } from '../../../modules/cv-builder/components/pdf/CvPdfDocument';

const getMonthNameEs = (date = new Date()) => {
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return months[date.getMonth()];
};

/**
 * Native Vector PDF Generator powered by @react-pdf/renderer
 * (Yoga Flexbox C++ Layout Engine + TextKit font metrics)
 */
export async function exportCVToPDF(cvData: any): Promise<boolean> {
  const candidateName = (
    cvData?.personalInfo?.fullName || 
    `${cvData?.personalInfo?.surname || ''} ${cvData?.personalInfo?.givenNames || ''}`.trim() || 
    'Postulante'
  ).trim();

  const monthName = getMonthNameEs();
  const yearNum = new Date().getFullYear();
  const fileName = `CV - ${candidateName} - ${monthName} - ${yearNum}.pdf`;

  // Generate vector PDF blob natively without screen capture
  const docElement = React.createElement(CvPdfDocument, { cvData });
  const blob = await pdf(docElement as any).toBlob();

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
