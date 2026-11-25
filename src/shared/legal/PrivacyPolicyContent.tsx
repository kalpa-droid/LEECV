import React from 'react';
import { Database } from 'lucide-react';
import { radius } from '../core/uiDesignSystem';

export function PrivacyPolicyContent() {
  return (
    <div className="space-y-4 text-xs text-[var(--ui-text-secondary)] leading-relaxed font-normal">
      <div
        style={{ borderRadius: radius.card }}
        className="p-3 bg-[var(--color-accent-purple-light)] border border-[var(--color-accent-purple)]/30 flex items-start gap-3"
      >
        <Database className="w-5 h-5 text-[var(--color-accent-purple-text)] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--color-accent-purple-text)]">
          LEECV opera bajo arquitectura Local-First: tus borradores, fotografías, firmas y certificados se procesan y guardan principalmente en tu propio dispositivo y son de tu exclusiva propiedad.
        </p>
      </div>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">1. Qué Datos Procesamos</h3>
      <p>
        Según la herramienta que utilices, podés cargar datos de currículum (foto personal, firma, certificados, experiencia y contacto), manuscritos editoriales, agendas o registros comerciales en FacturLee. Para cuentas y compras guardamos únicamente tu correo electrónico, historial de pagos, créditos disponibles y pases activos.
      </p>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">2. Almacenamiento Local, FacturLee Cifrado y Google Drive Personal</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>En tu navegador:</strong> Los borradores se conservan en la memoria local de tu dispositivo. En FacturLee la base de datos permanece cifrada con tu contraseña local (arquitectura de conocimiento cero) y nunca se replica en servidores de LEECV.
        </li>
        <li>
          <strong>En tu Google Drive personal (100% opcional):</strong> Si conectás tu Google Drive, LEECV utiliza exclusivamente el permiso mínimo limitado (<code>drive.file</code>). Eso significa que LEECV solo puede leer y guardar los archivos creados por la propia app dentro de las carpetas dedicadas de respaldo y documentos terminados, sin acceder jamás al resto de tu Drive ni almacenar tus tokens de Drive en nuestros servidores.
        </li>
        <li>
          <strong>Salas de Equipo en EditorLee:</strong> Únicamente los proyectos que decidas publicar en modo colaborativo se sincronizan en la nube privada para habilitar la edición por capítulos entre los integrantes que invites.
        </li>
      </ul>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">3. Uso de Inteligencia Artificial y Anonimización</h3>
      <p>
        Cuando activás mejoras de redacción o análisis con IA (Gemini, Groq u OpenRouter), nuestro sistema anonimiza automáticamente datos sensibles de contacto (DNI, CUIT, teléfonos, correos y direcciones) antes de enviar el texto. Tus documentos nunca se usan para entrenar modelos públicos de IA. En FacturLee el asistente trabaja solo con metadatos de estructura, jamás con importes ni datos de clientes.
      </p>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">4. Compartición y Derechos del Usuario</h3>
      <p>
        Nunca vendemos, alquilamos ni cedemos tus datos a terceros. Podés acceder, rectificar o pedir la eliminación definitiva de tu cuenta escribiendo a{' '}
        <a href="mailto:soporte@leecv.app" className="text-[var(--ui-text-primary)] underline font-bold">
          soporte@leecv.app
        </a>.
      </p>
    </div>
  );
}
