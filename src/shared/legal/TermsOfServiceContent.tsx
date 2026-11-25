import React from 'react';
import { Server } from 'lucide-react';
import { radius } from '../core/uiDesignSystem';
import { getPacksSentence } from '../core/payments/legalCopyEngine';

export function TermsOfServiceContent() {
  return (
    <div className="space-y-4 text-xs text-[var(--ui-text-secondary)] leading-relaxed font-normal">
      <div
        style={{ borderRadius: radius.card }}
        className="p-3 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/30 flex items-start gap-3"
      >
        <Server className="w-5 h-5 text-[var(--color-status-success-text)] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--color-status-success-text)]">
          Condiciones generales de toda la plataforma LEECV (5 aplicaciones + Carta y Tarjeta incluidas en CV) y anexos particulares por herramienta.
        </p>
      </div>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">1. Aceptación y Naturaleza de la Plataforma</h3>
      <p>
        Al utilizar LEECV (<a href="https://leecv.app" className="underline font-bold text-[var(--ui-text-primary)]">leecv.app</a>), aceptás estos Términos de Servicio. LEECV provee herramientas web de uso local en tu navegador para crear y descargar currículums (con carta de presentación y tarjeta personal incluidas sin cargo), publicaciones en EditorLee, armado de libros o folletos, agendas y comprobantes comerciales locales en FacturLee.
      </p>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">2. Créditos, Pase Permanente y Pases Prepago (Sin Débitos Automáticos)</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Edición gratuita:</strong> Armar, previsualizar y guardar borradores en tu equipo o tu Google Drive personal es gratis en las 5 herramientas. Carta de Presentación y Tarjeta Personal con QR dentro del Creador de CV son gratuitas. FacturLee incluye además tus primeros 3 comprobantes PDF gratuitos para evaluar el servicio.
        </li>
        <li>
          <strong>Créditos prepago sin vencimiento:</strong> Las compras puntuales o paquetes ({getPacksSentence()}) otorgan créditos reutilizables que nunca vencen. Un mismo desbloqueo de exportación habilita la descarga local del documento y sus formatos complementarios (PDF, Word en EditorLee, Excel en FacturLee) y su copia en tu Google Drive dentro de la sesión de entrega.
        </li>
        <li>
          <strong>Pase Permanente (Pago Único):</strong> Habilita descargas ilimitadas en la herramienta adquirida (EditorLee o FacturLee) durante toda la vigencia comercial de la generación mayor actual (<strong>V3.x</strong>), con una <strong>garantía mínima de disponibilidad operativa de 24 meses</strong> desde la compra y portabilidad garantizada de tus archivos en formatos abiertos (.json, .docx, .xlsx, .pdf). Una eventual futura generación mayor (V4.x) podrá requerir actualización opcional con beneficio preferencial sin afectar la exportación de tus respaldos.
        </li>
        <li>
          <strong>Pase Total 30 Días y Sala de Equipo EditorLee (30 Días):</strong> Son pases prepagos a plazo fijo por 30 días corridos, mediante compra directa o canje interno de créditos. <strong>LEECV no realiza débitos automáticos ni renovaciones ocultas</strong>: al finalizar el plazo, el pase vence sin cargos futuros salvo que decidas renovarlo manualmente.
        </li>
      </ul>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">3. Suspensión, Bajas Legales y Discontinuación</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Baja con causa (sin reembolso):</strong> LEECV podrá suspender o cancelar cuentas que incurran en contracargos fraudulentos tras consumir exportaciones, automatización abusiva/scraping, reventa no autorizada de accesos, intentos de intrusión o uso ilícito o falsificación documental.
        </li>
        <li>
          <strong>Cuentas gratuitas inactivas:</strong> Las cuentas gratuitas sin créditos ni pases activos que permanezcan 24 meses seguidos sin actividad podrán depurarse previo aviso por correo con 30 días de anticipación, sin afectar copias guardadas en tu dispositivo o Google Drive.
        </li>
        <li>
          <strong>Cierre o discontinuación programada:</strong> En caso de cierre definitivo de la plataforma o de alguna herramienta, LEECV detendrá las ventas afectadas y notificará por correo y aviso visible con <strong>60 a 90 días corridos de anticipación</strong> para descargar respaldos y usar saldos pendientes (aplicando reembolso proporcional sobre Pases Permanentes adquiridos en los últimos 12 meses o días remanentes de pases de 30 días).
        </li>
      </ul>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">4. Condiciones Particulares por Aplicación</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Anexo FacturLee (Comprobantes no fiscales y cifrado local):</strong> FacturLee genera presupuestos, remitos y recibos internos de uso comercial. <strong>No es un sistema fiscal homologado</strong> ante organismos tributarios (como ARCA/ex-AFIP, SII o SAT) ni emite CAE electrónico. La bóveda se cifra localmente con tu contraseña: si perdés tanto la contraseña como tu Llave de Rescate, LEECV no posee copia ni clave maestra para recuperarla.
        </li>
        <li>
          <strong>Anexo EditorLee y Libros/Folletos:</strong> El usuario declara contar con derechos sobre los textos, imágenes y PDFs que procesa. Las guías de citas académicas, márgenes y armado de páginas son herramientas de asistencia técnica: antes de encargar una tirada física en imprenta, verificá siempre una prueba impresa final. En Salas de Equipo de EditorLee, el líder es responsable de las invitaciones que envía a sus colaboradores.
        </li>
        <li>
          <strong>Anexo CV, Carta y Tarjeta:</strong> El diagnóstico automático (ATS) y la asistencia con IA son orientativos y no garantizan entrevistas ni resultados de procesos de selección externos. El usuario es responsable por la veracidad de sus datos y certificados.
        </li>
      </ul>

      <h3 className="text-sm font-black text-[var(--ui-text-primary)]">5. Reembolsos y Contacto</h3>
      <p>
        Podés solicitar el reembolso total de paquetes, pases o créditos sin consumir dentro de los <strong>14 días corridos</strong> posteriores a la compra escribiendo a{' '}
        <a href="mailto:soporte@leecv.app" className="text-[var(--ui-text-primary)] underline font-bold">
          soporte@leecv.app
        </a>{' '}
        con tu número de orden o correo de pago.
      </p>
    </div>
  );
}
