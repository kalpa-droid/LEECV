import React from 'react';
import { Database } from 'lucide-react';
import { radius } from '../core/uiDesignSystem';

export function PrivacyPolicyContent() {
  return (
    <div className="space-y-4 text-xs text-[var(--ui-text-secondary)] leading-relaxed font-normal">
      <div className={`p-3 bg-[var(--color-accent-purple-light)] border border-[var(--color-accent-purple)]/30 rounded-[${radius.card}] flex items-start gap-3`}>
        <Database className="w-5 h-5 text-[var(--color-accent-purple-text)] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--color-accent-purple-text)]">
          LEECV respeta estrictamente tu privacidad. Todos tus datos personales, currículums, fotografías y certificados son de tu exclusiva propiedad y están protegidos por encriptación en tránsito y en reposo (RLS en Supabase y almacenamiento seguro en LEECV Cloud).
        </p>
      </div>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">1. Información que Recopilamos</h3>
      <p>
        Al utilizar LEECV, recopilamos la información que proporcionas voluntariamente al confeccionar tu currículum: nombre completo, datos de contacto, historial académico, experiencia laboral, habilidades y documentos adjuntos (fotos de perfil, firmas y certificados).
      </p>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">2. Almacenamiento en Supabase, LEECV Cloud y Google Drive API</h3>
      <p>
        Los datos de tus currículums y respaldos se almacenan de manera segura en Supabase Database, el almacenamiento privado LEECV Cloud (Enterprise) y opcionalmente en tu propia cuenta de Google Drive.
      </p>
      <p>
        Al conectar tu cuenta de Google Drive para el guardado de respaldos, solicitamos únicamente el permiso acotado <code>https://www.googleapis.com/auth/drive.file</code>:
      </p>
      <ul className="list-disc pl-5 space-y-1 text-[var(--ui-text-secondary)]">
        <li>LEECV solo lee y escribe archivos creados por nuestra propia aplicación dentro de la carpeta dedicada <code>LEECV</code>.</li>
        <li>Nunca accedemos, leemos ni modificamos otros archivos personales de tu Google Drive.</li>
        <li>Los tokens de refresco se almacenan en servidores seguros con cifrado de nivel bancario y nunca son expuestos en el navegador.</li>
      </ul>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">3. Uso y Compartición de Datos</h3>
      <p>
        Tus datos personales NUNCA serán vendidos, alquilados ni transferidos a terceros con fines publicitarios o comerciales. El procesamiento de datos se limita exclusivamente a permitir la edición, guardado, respaldos en la nube y exportación en formato PDF de tus documentos.
      </p>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">4. Derechos del Usuario y Borrado de Cuenta</h3>
      <p>
        Tienes el derecho inalienable de acceder, corregir o solicitar la eliminación total de tus datos personales, historial de currículums o revocar el acceso a tu Google Drive en cualquier momento directamente desde el panel o enviando una solicitud a soporte.
      </p>
    </div>
  );
}
