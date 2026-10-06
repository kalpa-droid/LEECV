import React from 'react';
import { Database } from 'lucide-react';
import { radius } from '../core/uiDesignSystem';

export function PrivacyPolicyContent() {
  return (
    <div className="space-y-4 text-xs text-[var(--ui-text-secondary)] leading-relaxed font-normal">
      <div className={`p-3 bg-[var(--color-accent-purple-light)] border border-[var(--color-accent-purple)]/30 rounded-[${radius.card}] flex items-start gap-3`}>
        <Database className="w-5 h-5 text-[var(--color-accent-purple-text)] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--color-accent-purple-text)]">
          LEECV respeta estrictamente tu privacidad. Todos tus datos personales, currículums, fotografías y certificados son de tu exclusiva propiedad y están protegidos por encriptación en tránsito y en reposo .
        </p>
      </div>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">1. Información que Recopilamos</h3>
      <p>
        Al utilizar LEECV, recopilamos la información que proporcionas voluntariamente al confeccionar tu currículum: nombre completo, datos de contacto, historial académico, experiencia laboral, habilidades y documentos adjuntos (fotos de perfil, firmas y certificados).
      </p>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">2. Almacenamiento Seguro de Datos</h3>
      <p>
        Los datos de tus currículums y respaldos se almacenan de manera segura y privada.
      </p>
      

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">3. Uso de Inteligencia Artificial (IA) y Privacidad</h3>
      <p>
        LEECV utiliza servicios de IA (Gemini y Groq) para mejorar la redacción de tu currículum, resumir experiencia y generar cartas de presentación.
        <strong>Tu privacidad está garantizada por diseño:</strong> antes de que cualquier texto salga de tu navegador hacia la IA, nuestro sistema interno anonimiza la información eliminando automáticamente datos sensibles de contacto como DNI, teléfonos, correos electrónicos y direcciones físicas. Los modelos de IA no entrenan con tus datos.
      </p>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">4. Uso y Compartición de Datos</h3>
      <p>
        Tus datos personales NUNCA serán vendidos, alquilados ni transferidos a terceros con fines publicitarios o comerciales. El procesamiento de datos se limita exclusivamente a permitir la edición, guardado, respaldos en la nube y exportación en formato PDF de tus documentos.
      </p>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">5. Derechos del Usuario y Borrado de Cuenta</h3>
      <p>
        Tienes el derecho inalienable de acceder, corregir o solicitar la eliminación total de tus datos personales e historial de currículums en cualquier momento directamente desde el panel o enviando un correo a nuestro equipo de soporte a <a href="mailto:soporte@leecv.app" className="text-[var(--ui-text-primary)] underline font-bold">soporte@leecv.app</a>.
      </p>
    </div>
  );
}
