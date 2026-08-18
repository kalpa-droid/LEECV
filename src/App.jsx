import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SecondaryNavbar from './components/SecondaryNavbar';
import EditorPanel from './components/EditorPanel';
import CVPreview from './components/CVPreview';
import PhotoCropperModal from './components/PhotoCropperModal';
import SignatureModal from './components/SignatureModal';
import WizardModal from './components/WizardModal';
import { initialCVData } from './data/initialCVData';

export default function App() {
  const [cvData, setCvData] = useState(() => {
    const saved = localStorage.getItem('cv_premium_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...initialCVData,
          ...parsed,
          personalInfo: { 
            ...initialCVData.personalInfo, 
            ...parsed.personalInfo,
            profilePhoto: parsed.personalInfo?.profilePhoto || initialCVData.personalInfo.profilePhoto
          },
          experience: (parsed.experience && parsed.experience.length > 0) ? parsed.experience : initialCVData.experience,
          ecology: (parsed.ecology && (parsed.ecology.rural || parsed.ecology.environmental)) ? parsed.ecology : initialCVData.ecology
        };
      } catch (e) {
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

  // Autosave to localStorage on state change
  useEffect(() => {
    localStorage.setItem('cv_premium_data', JSON.stringify(cvData));
  }, [cvData]);

  const handlePrint = () => {
    window.print();
  };

  const handleLoadExampleCV = () => {
    setCvData(initialCVData);
    localStorage.setItem('cv_premium_data', JSON.stringify(initialCVData));
  };

  const handleStartNewCVWizard = () => {
    const emptyCV = {
      ...initialCVData,
      personalInfo: {
        fullName: "NOMBRE Y APELLIDO",
        surname: "APELLIDO",
        givenNames: "Nombre",
        dni: "",
        cuit: "",
        birthDate: "",
        address: "",
        cityProvince: "",
        phone: "",
        email: "",
        facebook: "",
        profilePhoto: "",
        quote: "“Mi perfil profesional y trayectoria educativa”",
        initials: "N.A",
        year: "2025"
      },
      roles: ["Título o Rol Principal 1", "Título o Rol Principal 2"],
      education: [{ level: "SECUNDARIO COMPLETO", institution: "Institución Educativa", year: "2020", degree: "Título Obtenido" }],
      profession: [{ institution: "Universidad / Instituto", year: "2024", degree: "Título Profesional" }],
      experience: [{ institution: "Escuela / Institución", role: "Cargo o Puesto Desempeñado", year: "2025", details: "Tareas principales" }],
      coursesAndCertificates: [{ year: "2025", institution: "Institución Emisora", title: "Nombre del Curso o Capacitación", hours: "40 hs", details: "Certificado Aprobado" }],
      informatics: [{ institution: "Plataforma Digital", course: "Nombre del Curso de Informática" }],
      certificatesScanned: [],
      signature: { type: "drawn", dataUrl: "", signerName: "", signerRole: "", date: "2025" }
    };

    setCvData(emptyCV);
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
          <CVPreview cvData={cvData} setCvData={setCvData} />
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
    </div>
  );
}
