import React, { useState, useEffect } from 'react';
import { Clock, Download, Sparkles, AlertTriangle } from 'lucide-react';
import { button } from '../uiDesignSystem';
import { exportAllCVsToZip } from '../utils/jsonImporterExporter';

interface GracePeriodBannerProps {
  graceEndsAt: string | null;
  cvList?: any[];
  userName?: string;
  onOpenRetentionModal?: () => void;
}

export const GracePeriodBanner: React.FC<GracePeriodBannerProps> = ({
  graceEndsAt,
  cvList = [],
  userName = 'Usuario',
  onOpenRetentionModal,
}) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    if (!graceEndsAt) return;

    const updateCountdown = () => {
      const target = new Date(graceEndsAt).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeftStr('0d 00h 00m');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeftStr(`${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [graceEndsAt]);

  const handleExportZip = async () => {
    try {
      setIsExporting(true);
      await exportAllCVsToZip(cvList, userName);
    } catch (err) {
      console.error('Error al exportar ZIP de emergencia:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full bg-amber-950/80 border border-amber-500/40 rounded-xl p-4 mb-6 backdrop-blur-md shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg bg-amber-900/60 text-amber-200 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-amber-200 text-sm">
              Período de Gracia Activo — Descarga de Emergencia Disponible
            </h4>
            {timeLeftStr && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-mono bg-amber-900/60 text-amber-200 border border-amber-500/40">
                <Clock className="w-3 h-3" />
                {timeLeftStr} restantes
              </span>
            )}
          </div>
          <p className="text-xs text-amber-100/90 mt-1 max-w-2xl leading-relaxed">
            Tu suscripción Pro/Enterprise ha vencido. Cuentas con 10 días para descargar un respaldo completo en .ZIP de tus CVs guardados antes de que tu cuenta pase definitivamente a plan gratuito.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
        <button
          onClick={handleExportZip}
          disabled={isExporting || cvList.length === 0}
          className={`${button.secondary} flex items-center justify-center gap-2 text-xs py-2 px-3 bg-amber-900/40 border-amber-500/40 text-amber-200 hover:bg-amber-800/60`}
        >
          <Download className="w-3.5 h-3.5" />
          {isExporting ? 'Generando .ZIP...' : 'Descargar Todo (.ZIP)'}
        </button>

        {onOpenRetentionModal && (
          <button
            onClick={onOpenRetentionModal}
            className={`${button.primary} flex items-center justify-center gap-2 text-xs py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 shadow-md`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Renovar con 20% OFF
          </button>
        )}
      </div>
    </div>
  );
};
