import React, { useState } from 'react';
import { Shield, FileText, Lock, X, Check, Eye, Database, Server } from 'lucide-react';

export default function PrivacyModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('privacy'); // 'privacy' | 'terms'

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#2B1B2E] border border-purple-500/30 text-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-purple-500/20 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide text-white">Política de Privacidad & Términos de Servicio</h2>
              <p className="text-[11px] text-purple-300/70">Cumplimiento Legal, Protección de Datos Personales y Permisos OAuth Google</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-purple-500/20 bg-slate-950/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2.5 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-[#FF2E63] text-white bg-purple-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-[#FF2E63]" /> Política de Privacidad
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2.5 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'terms'
                ? 'border-[#00A8A0] text-white bg-emerald-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#00A8A0]" /> Términos de Uso y Servicio
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed font-normal">
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

        {/* Footer */}
        <div className="px-6 py-3 border-t border-purple-500/20 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Última actualización: Agosto 2026 — LEECV Inc.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#FF2E63] hover:bg-[#E31555] text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
