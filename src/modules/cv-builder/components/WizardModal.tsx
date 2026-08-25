import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  User, 
  GraduationCap, 
  Briefcase, 
  FileText, 
  BookOpen, 
  Laptop, 
  Leaf, 
  Award, 
  PenTool, 
  Palette
} from 'lucide-react';
import EditorPanel from './EditorPanel';
import { Modal } from '../../../shared/core/ui/Modal';

export default function WizardModal({ 
  isOpen, 
  onClose, 
  onOpenPhotoCropper, 
  onOpenSignature, 
  cvData,
  setCvData 
}: any) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const wizardSteps = [
    { id: 'personales', title: '1. Datos Personales & Foto', icon: User },
    { id: 'formacion', title: '2. Formación Académica', icon: GraduationCap },
    { id: 'profesion', title: '3. Títulos Profesionales', icon: Briefcase },
    { id: 'experiencia', title: '4. Experiencia Laboral', icon: FileText },
    { id: 'cursos', title: '5. Cursos & Capacitaciones', icon: BookOpen },
    { id: 'informatica', title: '6. Informática & TICs', icon: Laptop },
    { id: 'ecologia', title: '7. Proyectos Comunitarios', icon: Leaf },
    { id: 'certificados', title: '8. Certificados Escaneados', icon: Award },
    { id: 'firma', title: '9. Firma Digital', icon: PenTool },
    { id: 'diseno', title: '10. Diseño & Colores Globales', icon: Palette }
  ];

  const totalSteps = wizardSteps.length;
  const activeStep = wizardSteps[currentStepIndex];

  const nextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((idx) => idx + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((idx) => idx - 1);
    }
  };

  const handleFinish = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Asistente Paso a Paso: ${activeStep.title}`}
      icon={<span className="w-7 h-7 rounded-xl bg-[var(--color-accent-purple)] text-white flex items-center justify-center font-black text-xs shadow-md">{currentStepIndex + 1}</span>}
      size="4xl"
      className="h-[88vh]"
      footer={
        <div className="w-full flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-white/20 bg-white/10 disabled:opacity-40 transition cursor-pointer text-white"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          <div className="text-xs font-semibold text-white/60">
            Sección {currentStepIndex + 1} de {totalSteps}
          </div>

          {currentStepIndex < totalSteps - 1 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-black text-xs shadow-lg transition cursor-pointer"
            >
              <Check className="w-4 h-4" /> Finalizar y Ver CV
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col h-full overflow-hidden space-y-3">
        {/* Progress Bar */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex-shrink-0">
          <div 
            className="bg-[var(--color-accent-purple)] h-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Wizard Step Selector Tabs Toolbar */}
        <div className="flex border border-white/10 bg-black/40 p-1.5 rounded-xl overflow-x-auto flex-shrink-0 no-scrollbar">
          {wizardSteps.map((step, idx) => {
            const IconComp = step.icon;
            const isActive = idx === currentStepIndex;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-accent-purple)] text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{step.id.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body - Directly Embedding EditorPanel */}
        <div className="flex-1 overflow-hidden min-h-[400px]">
          <EditorPanel 
            cvData={cvData}
            setCvData={setCvData}
            activeTab={activeStep.id}
            setActiveTab={(tabId) => {
              const foundIdx = wizardSteps.findIndex(s => s.id === tabId);
              if (foundIdx !== -1) setCurrentStepIndex(foundIdx);
            }}
            onOpenPhotoCropper={onOpenPhotoCropper}
            onOpenSignature={onOpenSignature}
            onOpenSavedCVs={() => {}}
          />
        </div>
      </div>
    </Modal>
  );
}
