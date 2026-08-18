import React, { useState } from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  X, 
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

export default function WizardModal({ 
  isOpen, 
  onClose, 
  onOpenPhotoCropper, 
  onOpenSignature, 
  cvData,
  setCvData 
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

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
    { id: 'diseno', title: '10. Diseño & Colores Globale', icon: Palette }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full h-[88vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Wizard Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md">
              {currentStepIndex + 1}
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Asistente Paso a Paso: {activeStep.title}
              </h2>
              <p className="text-xs text-slate-500">Paso {currentStepIndex + 1} de {totalSteps} — Guiado Interactivo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 flex-shrink-0">
          <div 
            className="bg-gradient-to-r from-purple-600 to-pink-500 h-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Wizard Step Selector Tabs Toolbar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 p-1.5 overflow-x-auto flex-shrink-0 no-scrollbar">
          {wizardSteps.map((step, idx) => {
            const IconComp = step.icon;
            const isActive = idx === currentStepIndex;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{step.id.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body - Directly Embedding EditorPanel for 100% Unification */}
        <div className="flex-1 overflow-hidden">
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
          />
        </div>

        {/* Wizard Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between flex-shrink-0">
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          <div className="text-xs font-semibold text-slate-500">
            Sección {currentStepIndex + 1} de {totalSteps}
          </div>

          {currentStepIndex < totalSteps - 1 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs shadow-lg transition"
            >
              <Check className="w-4 h-4" /> Finalizar y Ver CV
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
