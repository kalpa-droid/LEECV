export interface CoverLetterData {
  layout?: {
    paperSize?: string;
    pageSizeId?: string;
  };
  personalInfo?: {
    fullName?: string;
    givenNames?: string;
    surname?: string;
    email?: string;
    phone?: string;
    address?: string;
    cityProvince?: string;
  };
  jobTarget?: {
    companyName?: string;
    jobTitle?: string;
    recipientName?: string;
    jobDescription?: string;
  };
  body?: {
    salutation?: string;
    hookParagraph?: string;
    evidenceParagraph?: string;
    closingParagraph?: string;
    signoff?: string;
  };
  date?: string;
  signature?: {
    dataUrl?: string;
    signerName?: string;
    signerRole?: string;
  };
}

export function prepareCoverLetterRenderData(data: CoverLetterData) {
  const p = data.personalInfo || {};
  const j = data.jobTarget || {};
  const b = data.body || {};

  const fullName = p.fullName || `${p.givenNames || ''} ${p.surname || ''}`.trim() || 'Nombre Completo';
  const today = data.date || new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });

  return {
    sender: {
      fullName,
      email: p.email || '',
      phone: p.phone || '',
      address: p.address || '',
      cityProvince: p.cityProvince || ''
    },
    dateStr: today,
    recipient: {
      name: j.recipientName || 'Responsable de Selección',
      company: j.companyName || 'Empresa Destino',
      title: j.jobTitle || 'Puesto Postulado'
    },
    content: {
      salutation: b.salutation || 'Estimado/a responsable de selección,',
      hookParagraph: b.hookParagraph || '',
      evidenceParagraph: b.evidenceParagraph || '',
      closingParagraph: b.closingParagraph || '',
      signoff: b.signoff || 'Atentamente,'
    },
    signature: data.signature
  };
}
