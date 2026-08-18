import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SecondaryNavbar from './components/SecondaryNavbar';
import EditorPanel from './components/EditorPanel';
import CVPreview from './components/CVPreview';
import PhotoCropperModal from './components/PhotoCropperModal';
import SignatureModal from './components/SignatureModal';
import WizardModal from './components/WizardModal';
import SavedCVsModal from './components/SavedCVsModal';
import { initialCVData } from './data/initialCVData';
import { saveCV } from './services/cvStorageService';

export default function App() {
  const [cvData, setCvData] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('clear')) {
      try { localStorage.clear(); } catch {}
    }
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cv_premium_data') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...initialCVData,
            ...parsed,
            showCoverPage: parsed.showCoverPage !== undefined ? parsed.showCoverPage : true,
            layoutStyle: parsed.layoutStyle || 'executive-sidebar',
            theme: {
              ...initialCVData.theme,
              ...(parsed.theme || {})
            },
            personalInfo: { 
              ...initialCVData.personalInfo, 
              ...(parsed.personalInfo || {}),
              profilePhoto: (parsed.personalInfo?.profilePhoto && parsed.personalInfo.profilePhoto.trim() !== '') 
                ? parsed.personalInfo.profilePhoto 
                : initialCVData.personalInfo.profilePhoto
            },
            roles: Array.isArray(parsed.roles) ? parsed.roles : initialCVData.roles,
            education: Array.isArray(parsed.education) ? parsed.education : initialCVData.education,
            profession: Array.isArray(parsed.profession) ? parsed.profession : initialCVData.profession,
            experience: (Array.isArray(parsed.experience) && parsed.experience.length > 0) ? parsed.experience : initialCVData.experience,
            coursesAndCertificates: Array.isArray(parsed.coursesAndCertificates) ? parsed.coursesAndCertificates : initialCVData.coursesAndCertificates,
            certificatesScanned: Array.isArray(parsed.certificatesScanned) ? parsed.certificatesScanned : [],
            informatics: Array.isArray(parsed.informatics) ? parsed.informatics : initialCVData.informatics,
            ecology: (parsed.ecology && typeof parsed.ecology === 'object') ? { ...initialCVData.ecology, ...parsed.ecology } : initialCVData.ecology,
            signature: {
              ...initialCVData.signature,
              ...(parsed.signature || {}),
              dataUrl: (parsed.signature?.dataUrl && parsed.signature.dataUrl.trim() !== '') 
                ? parsed.signature.dataUrl 
                : initialCVData.signature.dataUrl
            },
            certificateDisplay: {
              ...initialCVData.certificateDisplay,
              ...(parsed.certificateDisplay || {})
            }
          };
        }
      } catch {
        return initialCVData;
      }
    }
    return initialCVData;
  });

  const [activeTab, setActiveTab] = useState('personales');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const [isPhotoCropperOpen, setIsPhotoCropperOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSavedCVsOpen, setIsSavedCVsOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Autosave to localStorage on state change
  useEffect(() => {
    localStorage.setItem('cv_premium_data', JSON.stringify(cvData));
  }, [cvData]);

  // Direct 1-Click Native A4 PDF Download Engine with Dynamic Import
  const handlePrint = async () => {
    const element = document.querySelector('.print-wrapper');
    if (!element) {
      window.print();
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const surname = (cvData?.personalInfo?.surname || 'BURGOS').trim().replace(/\s+/g, '_');
      const given = (cvData?.personalInfo?.givenNames || 'Monica').trim().replace(/\s+/g, '_');
      const fileName = `CV_${surname}_${given}_A4.pdf`;

      const opt = {
        margin:       0,
        filename:     fileName,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Error generando PDF nativo:', err);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleLoadExampleCV = () => {
    setCvData(initialCVData);
    localStorage.setItem('cv_premium_data', JSON.stringify(initialCVData));
  };

  const handleSaveCV = async () => {
    setIsSaving(true);
    try {
      await saveCV(cvData);
      alert(`CV de "${cvData?.personalInfo?.fullName || 'Postulante'}" guardado correctamente con compresión WebP.`);
    } catch (err) {
      console.error(err);
      alert('Error al guardar CV');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartNewCVWizard = () => {
    const newCVTemplate = {
      id: `cv_${Date.now()}`,
      personalInfo: {
        fullName: "",
        surname: "",
        givenNames: "",
        dni: "",
        cuit: "",
        birthDate: "",
        address: "",
        cityProvince: "",
        phone: "",
        email: "",
        profilePhoto: "",
        quote: "",
        initials: "CV",
        year: new Date().getFullYear().toString()
      },
      roles: [
        "Título / Rol Profesional 1",
        "Título / Rol Profesional 2",
        "Especialización / Rol 3"
      ],
      education: [
        { level: "NIVEL SECUNDARIO", institution: "Nombre del Colegio / Instituto", year: "2015", degree: "Título Obtenido" },
        { level: "ESTUDIO SUPERIOR", institution: "Universidad / Instituto Superior", year: "2020", degree: "Título Profesional de Grado" }
      ],
      profession: [
        { institution: "Instituto de Educación / Universidad", year: "2022", degree: "Título Profesional Principal" },
        { institution: "Ministerio / Ente Emisor", year: "2023", degree: "Especialización o Posgrado" },
        { institution: "Plataforma Educativa", year: "2024", degree: "Certificación Profesional Académica" }
      ],
      experience: [
        { institution: "Institución Educativa / Empresa 1", role: "Cargo o Puesto Principal", year: "2025", details: "Planificación didáctica, conducción de equipos y proyectos institucionales." },
        { institution: "Institución Educativa 2", role: "Docente / Profesional", year: "2024", details: "Desempeño frente a aula, evaluación pedagógica y mediación de aprendizajes." },
        { institution: "Institución Educativa 3", role: "Tutor / Coordinador", year: "2023", details: "Coordinación de talleres pedagógicos y retención escolar." },
        { institution: "Institución Educativa 4", role: "Docente Titular", year: "2022", details: "Gestión de proyectos integrados e innovación en el aula." }
      ],
      coursesAndCertificates: [
        { year: "2025", institution: "Ministerio de Educación / Universidad", title: "Curso de Actualización Pedagógica y Educación Digital", hours: "60 hs", details: "Resolución Ministerial Aprobada" },
        { year: "2024", institution: "Plataforma de Aprendizaje Virtual", title: "Seminario en Herramientas TICs e Inclusión Educativa", hours: "40 hs", details: "Certificado Oficial de Aprobación" },
        { year: "2024", institution: "Fundación Educativa", title: "Taller sobre Estrategias Didácticas e Interacción Dialógica", hours: "30 hs", details: "Aprobación con Distinción" },
        { year: "2023", institution: "Instituto Superior de Formación Docente", title: "Jornada de Capacitación en Convivencia Escolar y ESI", hours: "50 hs", details: "Certificación Jurisdiccional" },
        { year: "2023", institution: "Secretaría de Innovación Pública", title: "Curso de Alfabetización Digital Nivel Avanzado", hours: "45 hs", details: "Certificado Nacional" },
        { year: "2022", institution: "Asociación Pedagógica", title: "Simposio de Transformación y Gestión Institucional", hours: "35 hs", details: "Acreditación Académica" }
      ],
      informatics: [
        { institution: "Plataforma Nacional Digital", course: "Alfabetización Digital y Manejo de Entornos Virtuales" },
        { institution: "Secretaría de Innovación", course: "Enseñar y Aprender con Tecnologías de la Información (TICs)" }
      ],
      ecology: {
        rural: [
          { title: "TALLER DE PROYECTOS COMUNITARIOS RURALES", institution: "Ministerio de Desarrollo Social" }
        ],
        environmental: [
          { title: "PROYECTO DE CUIDADO AMBIENTAL Y ECO-SUSTENTABILIDAD", institution: "Red Comunitaria Regional" }
        ]
      },
      certificatesScanned: [],
      signature: { type: "drawn", dataUrl: "", signerName: "NOMBRE Y APELLIDO", signerRole: "Profesional", date: "2025" }
    };

    setCvData(newCVTemplate);
    setIsWizardOpen(true);
  };

  const handleSavePhoto = (croppedPhotoUrl) => {
    setCvData((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        profilePhoto: croppedPhotoUrl
      }
    }));
  };

  const handleSaveSignature = (signatureData) => {
    setCvData((prev) => ({
      ...prev,
      signature: signatureData
    }));
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Top Header Navbar (Row 1 - Global Actions) */}
      <Navbar 
        onPrint={handlePrint}
        onLoadExampleCV={handleLoadExampleCV}
        onStartNewCVWizard={handleStartNewCVWizard}
      />

      {/* Secondary Full-Width Sub-Header Navbar Toolbar (Row 2 - Section Tabs) */}
      <SecondaryNavbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isPanelOpen={isPanelOpen}
        setIsPanelOpen={setIsPanelOpen}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Editor Sidebar */}
        {isPanelOpen && (
          <div className="w-full lg:w-96 flex-shrink-0 h-full overflow-hidden border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 no-print animate-fade-in">
            <EditorPanel 
              cvData={cvData}
              setCvData={setCvData}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenPhotoCropper={() => setIsPhotoCropperOpen(true)}
              onOpenSignature={() => setIsSignatureOpen(true)}
            />
          </div>
        )}

        {/* Right Live Preview Area */}
        <div className="flex-1 h-full overflow-y-auto">
          <CVPreview cvData={cvData} setCvData={setCvData} activeTab={activeTab} />
        </div>
      </main>

      {/* Modals */}
      <PhotoCropperModal 
        isOpen={isPhotoCropperOpen}
        onClose={() => setIsPhotoCropperOpen(false)}
        onSavePhoto={handleSavePhoto}
        currentPhoto={cvData.personalInfo.profilePhoto}
      />

      <SignatureModal 
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        onSaveSignature={handleSaveSignature}
        currentSignature={cvData.signature}
      />

      <WizardModal 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onOpenPhotoCropper={() => setIsPhotoCropperOpen(true)}
        onOpenSignature={() => setIsSignatureOpen(true)}
        cvData={cvData}
        setCvData={setCvData}
      />

      <SavedCVsModal
        isOpen={isSavedCVsOpen}
        onClose={() => setIsSavedCVsOpen(false)}
        onSelectCV={(loadedCV) => setCvData(loadedCV)}
      />

      {/* PDF Generation Toast Indicator */}
      {isGeneratingPDF && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 border border-purple-500/50 animate-pulse no-print">
          <div className="w-6 h-6 border-3 border-purple-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-xs font-black text-purple-300">Generando PDF A4 Nativo Directo...</p>
            <p className="text-[10px] text-slate-300">Descargando archivo idéntico a la vista previa sin cuadro de diálogo</p>
          </div>
        </div>
      )}
    </div>
  );
}
