import React from 'react';
import { PRESET_LIST } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import {} from '../../../shared/core/pdf-engine/layers/presets/presetSchema';
import { FileText, CreditCard, Download, Printer, Layers } from 'lucide-react';
import { exportCVToPDF } from '../../../shared/core/pdf-engine/pdfExporter';
import { exportBusinessCardSheetToPDF } from '../../../shared/core/pdf-engine/cardSheetExporter';

interface TemplateMenuProps {
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  cvData: any;
}

export function TemplateMenu({ activePresetId, onSelectPreset, cvData }: TemplateMenuProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const activePreset = PRESET_LIST.find(p => p.id === activePresetId) || PRESET_LIST[0];

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (activePreset.pageCategory === 'tarjeta') {
        const personalInfo = cvData?.personalInfo || {};
        const cardData = {
          fullName: `${personalInfo.surname || ''} ${personalInfo.givenNames || ''}`.trim() || 'Juan Pérez',
          role: cvData?.roles?.[0] || cvData?.profession?.[0]?.degree || 'Profesional',
          phone: personalInfo.phone || '',
          email: personalInfo.email || '',
          website: personalInfo.cityProvince || '',
          brandName: personalInfo.surname ? `${personalInfo.surname} Studio` : 'Marca Personal',
          tagline: personalInfo.quote || 'Servicios Profesionales de Alta Calidad'
        };
        await exportBusinessCardSheetToPDF(cardData, activePreset);
      } else {
        await exportCVToPDF(cvData);
      }
    } catch (err) {
      console.error('Error al exportar documento:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl bg-black/40 backdrop-blur border border-white/10 rounded-2xl p-3.5 shadow-2xl mb-4 flex flex-wrap items-center justify-between gap-3 no-print">
      {/* Preset Category & Selector Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        <div className="flex items-center gap-1.5 text-xs font-black text-white/60 uppercase tracking-widest mr-2">
          <Layers className="w-4 h-4 text-[var(--color-accent-purple)]" />
          <span>Plantilla:</span>
        </div>

        {PRESET_LIST.map((preset) => {
          const isActive = preset.id === activePresetId;
          const isCard = preset.pageCategory === 'tarjeta';
          const Icon = isCard ? CreditCard : FileText;

          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                isActive
                  ? 'bg-[var(--color-accent-purple)] text-white border-[var(--color-accent-purple)]/50 shadow-lg scale-[1.02]'
                  : 'bg-white/10 text-white/80 border-white/10 hover:bg-white/20 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isCard ? 'text-[var(--color-accent-base)]' : 'text-[var(--color-accent-purple)]'}`} />
              <span>{preset.name}</span>
              <span className={`px-1.5 py-0.5 text-[9px] font-black rounded uppercase ${
                isActive ? 'bg-white/20 text-white' : 'bg-black/50 text-white/60'
              }`}>
                {preset.pageSizeId === 'tarjeta_estandar' ? '89×51mm' : preset.pageSizeId.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Export / Download Action Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-status-success-base)] text-white text-xs font-extrabold rounded-xl shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          {activePreset.pageCategory === 'tarjeta' ? (
            <>
              <Printer className="w-4 h-4" />
              <span>{isExporting ? 'Generando Pliego A4...' : 'Exportar Pliego Imprenta (2 Págs + Dúplex)'}</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generando PDF...' : 'Exportar Documento (PDF)'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
