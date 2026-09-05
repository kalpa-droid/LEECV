import React from 'react';
import { Server } from 'lucide-react';
import { radius } from '../core/uiDesignSystem';

export function TermsOfServiceContent() {
  return (
    <div className="space-y-4 text-xs text-[var(--ui-text-secondary)] leading-relaxed font-normal">
      <div className={`p-3 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/30 rounded-[${radius.card}] flex items-start gap-3`}>
        <Server className="w-5 h-5 text-[var(--color-status-success-text)] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--color-status-success-text)]">
          Términos y condiciones de prestación del servicio de maquetación, almacenamiento en la nube y licencias Premium/Enterprise de LEECV.
        </p>
      </div>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">1. Aceptación de los Términos</h3>
      <p>
        Al acceder y utilizar la plataforma LEECV (leecv.app), aceptas cumplir con los presentes Términos de Servicio. El servicio está destinado a la creación, maquetación y almacenamiento de documentos profesionales legales y currículums vitae.
      </p>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">2. Licencias de Suscripción y Créditos PDF</h3>
      <p>
        LEECV ofrece planes Gratuito (con compras individuales o paquetes de créditos PDF), Pro (suscripción ilimitada individual con integración a Google Drive personal) y Enterprise (suscripción para equipos con almacenamiento LEECV Cloud de 50GB y gestión de candidatos).
      </p>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">3. Responsabilidad del Contenido</h3>
      <p>
        El usuario es el único responsable de la veracidad, exactitud y legalidad de los datos, certificados y contenidos ingresados en sus currículums y perfiles postulados.
      </p>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">4. Cancelaciones y Reembolsos</h3>
      <p>
        Las suscripciones mensuales pueden cancelarse en cualquier momento desde el panel de administración o mediante contacto directo. Los créditos no consumidos de paquetes (Pack 5 y Pack 10) permanecen disponibles en la cuenta del usuario sin fecha de caducidad. En caso de solicitar un reembolso de compras de paquetes de créditos no utilizados dentro de los primeros 14 días corridos tras la transacción, el usuario puede comunicarse con soporte para procesar la devolución mediante el mismo medio de pago utilizado.
      </p>
    </div>
  );
}
