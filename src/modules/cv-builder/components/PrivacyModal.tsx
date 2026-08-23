import React, { useState } from 'react';
import { Shield, FileText, Lock, Database, Server } from 'lucide-react';
import { colorSystem } from '../../../shared/core/uiDesignSystem';
import { Modal } from '../../../shared/core/ui/Modal';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Política de Privacidad & Términos de Servicio"
      icon={<Shield className="w-5 h-5 text-purple-400" />}
      size="4xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Última actualización: Agosto 2026 — LEECV Inc.</span>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 bg-[var(--color-accent-base)] hover:bg-[#E31555] text-white font-extrabold text-xs rounded-xl transition cursor-pointer`}
          >
            Entendido
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-normal">
        {/* Tab Selector */}
        <div className="flex border-b border-purple-500/20 bg-slate-950/40 p-1 rounded-xl mb-4">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 text-xs font-bold transition flex-1 flex items-center justify-center gap-2 rounded-lg cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Política de Privacidad
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 text-xs font-bold transition flex-1 flex items-center justify-center gap-2 rounded-lg cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Términos de Uso y Servicio
          </button>
        </div>

        {activeTab === 'privacy' ? (
          <div className="space-y-4">
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-start gap-3">
              <Database className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-purple-200">
                LEECV respeta estrictamente tu privacidad. Todos tus datos personales, currículums, fotografías y certificados son de tu exclusiva propiedad y están protegidos por encriptación en tránsito y en reposo (RLS en Supabase).
              </p>
            </div>

            <h3 className="text-sm font-black text-white">1. Información que Recopilamos</h3>
            <p>
              Al utilizar LEECV, recopilamos la información que proporcionas voluntariamente al confeccionar tu currículum: nombre completo, datos de contacto, historial académico, experiencia laboral, habilidades y documentos adjuntos (fotos de perfil, firmas y certificados).
            </p>

            <h3 className="text-sm font-black text-white">2. Integración con Google OAuth y Google Drive API</h3>
            <p>
              Al conectar tu cuenta de Google Drive para el guardado de respaldos, solicitamos únicamente el permiso acotado <code>https://www.googleapis.com/auth/drive.file</code>. 
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>LEECV solo lee y escribe archivos creados por nuestra propia aplicación dentro de la carpeta dedicada <code>LEECV</code>.</li>
              <li>Nunca accedemos, leemos ni modificamos otros archivos personales de tu Google Drive.</li>
              <li>Los tokens de refresco se almacenan en servidores seguros con cifrado de nivel bancario y nunca son expuestos en el navegador.</li>
            </ul>

            <h3 className="text-sm font-black text-white">3. Uso y Compartición de Datos</h3>
            <p>
              Tus datos personales NUNCA serán vendidos, alquilados ni transferidos a terceros con fines publicitarios o comerciales. El procesamiento de datos se limita exclusivamente a permitir la edición, guardado y exportación en formato PDF de tus documentos.
            </p>

            <h3 className="text-sm font-black text-white">4. Almacenamiento y Derechos del Usuario</h3>
            <p>
              Puedes solicitar la eliminación total de tu cuenta, historial de currículums o revocar el acceso a tu Google Drive en cualquier momento desde el panel o desconectando el acceso desde la configuración de tu cuenta de Google.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
              <Server className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-200">
                Términos y condiciones de prestación del servicio de maquetación, almacenamiento en la nube y licencias Premium/Enterprise de LEECV.
              </p>
            </div>

            <h3 className="text-sm font-black text-white">1. Aceptación de los Términos</h3>
            <p>
              Al acceder y utilizar la plataforma LEECV, aceptas cumplir con los presentes Términos de Servicio. El servicio está destinado a la creación de documentos profesionales legales y currículums vitae.
            </p>

            <h3 className="text-sm font-black text-white">2. Licencias de Suscripción y Créditos PDF</h3>
            <p>
              LEECV ofrece planes Gratuito (con compras individuales de créditos PDF), Pro (suscripción ilimitada individual con integración a Google Drive personal) y Enterprise (suscripción para equipos con almacenamiento LEECV Cloud de 50GB y gestión de candidatos).
            </p>

            <h3 className="text-sm font-black text-white">3. Responsabilidad del Contenido</h3>
            <p>
              El usuario es el único responsable de la veracidad, exactitud y legalidad de los datos, certificados y contenidos ingresados en sus currículums y perfiles postulados.
            </p>

            <h3 className="text-sm font-black text-white">4. Cancelaciones y Reembolsos</h3>
            <p>
              Las suscripciones mensuales pueden cancelarse en cualquier momento desde el panel de administración o mediante contacto directo. Los créditos no consumidos permanecen disponibles en la cuenta del usuario.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
