import React, { useState } from 'react';
import { Layout, FileText, ArrowLeft, ArrowRight, Image as ImageIcon, Palette, Check } from 'lucide-react';
import { BookImpositionOptions, CoverConfig, BackCoverConfig } from '../../shared/core/book-engine/impositionEngine';
import { COVER_PRESETS } from '../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';

interface BookConfigStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  pdfPageCount: number;
  onBack: () => void;
  onNext: () => void;
}

export const BookConfigStep: React.FC<BookConfigStepProps> = ({
  options,
  setOptions,
  pdfPageCount,
  onBack,
  onNext,
}) => {
  const [coverType, setCoverType] = useState<'source' | 'custom' | 'none'>(
    options.hasCover ? 'source' : options.customCover?.type === 'template' ? 'custom' : 'none'
  );
  const [backCoverType, setBackCoverType] = useState<'source' | 'custom' | 'none'>(
    options.hasBackCover ? 'source' : options.customBackCover?.type === 'template' ? 'custom' : 'none'
  );

  const [coverData, setCoverData] = useState<CoverConfig>(
    options.customCover || {
      type: 'template',
      title: '',
      author: '',
      publisher: '',
      coverStyle: 'monica-classic',
    }
  );

  const [backCoverData, setBackCoverData] = useState<BackCoverConfig>(
    options.customBackCover || {
      type: 'template',
      synopsis: '',
      publisher: '',
      isbn: '',
      coverStyle: 'monica-classic',
    }
  );

  const handleCoverTypeChange = (type: 'source' | 'custom' | 'none') => {
    setCoverType(type);
    if (type === 'source') {
      setOptions((prev) => ({ ...prev, hasCover: true, customCover: null }));
    } else if (type === 'custom') {
      setOptions((prev) => ({ ...prev, hasCover: false, customCover: coverData }));
    } else {
      setOptions((prev) => ({ ...prev, hasCover: false, customCover: null }));
    }
  };

  const handleBackCoverTypeChange = (type: 'source' | 'custom' | 'none') => {
    setBackCoverType(type);
    if (type === 'source') {
      setOptions((prev) => ({ ...prev, hasBackCover: true, customBackCover: null }));
    } else if (type === 'custom') {
      setOptions((prev) => ({ ...prev, hasBackCover: false, customBackCover: backCoverData }));
    } else {
      setOptions((prev) => ({ ...prev, hasBackCover: false, customBackCover: null }));
    }
  };

  const updateCoverField = (field: keyof CoverConfig, value: string) => {
    const updated = { ...coverData, type: 'template' as const, [field]: value };
    setCoverData(updated);
    if (coverType === 'custom') {
      setOptions((prev) => ({ ...prev, customCover: updated }));
    }
    // La contratapa no tiene selector de estilo propio — hereda el de la
    // tapa para que ambas caras del libro compartan la misma identidad
    // visual, en vez de quedar con paletas independientes por accidente.
    if (field === 'coverStyle') {
      const updatedBack = { ...backCoverData, coverStyle: value };
      setBackCoverData(updatedBack);
      if (backCoverType === 'custom') {
        setOptions((prev) => ({ ...prev, customBackCover: updatedBack }));
      }
    }
  };

  const updateBackCoverField = (field: keyof BackCoverConfig, value: string) => {
    const updated = { ...backCoverData, type: 'template' as const, [field]: value };
    setBackCoverData(updated);
    if (backCoverType === 'custom') {
      setOptions((prev) => ({ ...prev, customBackCover: updated }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Paso 2: Tapas, Contratapas y Ajustes de Imprenta
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Personaliza la presentación de tu libro. Puedes incluir tapas propias del PDF o generar tapas tipográficas profesionales.
        </p>
      </div>

      {/* Configuración de Tapa */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layout className="w-5 h-5 text-emerald-500" />
          Tapa del Libro
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleCoverTypeChange('source')}
            className={`p-4 rounded-xl border-2 font-medium text-sm text-left transition-all ${
              coverType === 'source'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            Página 1 del PDF es la Tapa
          </button>
          <button
            type="button"
            onClick={() => handleCoverTypeChange('custom')}
            className={`p-4 rounded-xl border-2 font-medium text-sm text-left transition-all ${
              coverType === 'custom'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            Diseñar Tapa Custom
          </button>
          <button
            type="button"
            onClick={() => handleCoverTypeChange('none')}
            className={`p-4 rounded-xl border-2 font-medium text-sm text-left transition-all ${
              coverType === 'none'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            Sin Tapa Especial
          </button>
        </div>

        {coverType === 'custom' && (
          <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-500" />
              Diseñador Tipográfico de Tapa
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Título del Libro
                </label>
                <input
                  type="text"
                  value={coverData.title || ''}
                  onChange={(e) => updateCoverField('title', e.target.value)}
                  placeholder="Ej. Cien Años de Soledad"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Autor
                </label>
                <input
                  type="text"
                  value={coverData.author || ''}
                  onChange={(e) => updateCoverField('author', e.target.value)}
                  placeholder="Ej. Gabriel García Márquez"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Editorial / Sello
                </label>
                <input
                  type="text"
                  value={coverData.publisher || ''}
                  onChange={(e) => updateCoverField('publisher', e.target.value)}
                  placeholder="Ej. Ediciones Kalpa"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Estilo de Portada (mismo catálogo que el editor de CV)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {COVER_PRESETS.map((presetItem) => {
                    const isActive = (coverData.coverStyle || 'monica-classic') === presetItem.id;
                    return (
                      <div
                        key={presetItem.id}
                        onClick={() => updateCoverField('coverStyle', presetItem.id)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          {/* check-contrast-ignore-next-line */}
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase" style={{ backgroundColor: presetItem.badgeBg, color: presetItem.badgeTextColor }}>
                            {presetItem.badgeLabel}
                          </span>
                          {isActive && <Check className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{presetItem.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{presetItem.subtitle}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuración de Contratapa */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-emerald-500" />
          Contratapa del Libro
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleBackCoverTypeChange('source')}
            className={`p-4 rounded-xl border-2 font-medium text-sm text-left transition-all ${
              backCoverType === 'source'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            Última pág. del PDF es Contratapa
          </button>
          <button
            type="button"
            onClick={() => handleBackCoverTypeChange('custom')}
            className={`p-4 rounded-xl border-2 font-medium text-sm text-left transition-all ${
              backCoverType === 'custom'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            Diseñar Contratapa Custom
          </button>
          <button
            type="button"
            onClick={() => handleBackCoverTypeChange('none')}
            className={`p-4 rounded-xl border-2 font-medium text-sm text-left transition-all ${
              backCoverType === 'none'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            Sin Contratapa Especial
          </button>
        </div>

        {backCoverType === 'custom' && (
          <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-500" />
              Diseñador de Contratapa (Sinopsis / ISBN)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Sinopsis / Reseña
                </label>
                <textarea
                  rows={3}
                  value={backCoverData.synopsis || ''}
                  onChange={(e) => updateBackCoverField('synopsis', e.target.value)}
                  placeholder="Escribe la reseña o resumen del libro que aparecerá en el dorso..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Código ISBN
                </label>
                <input
                  type="text"
                  value={backCoverData.isbn || ''}
                  onChange={(e) => updateBackCoverField('isbn', e.target.value)}
                  placeholder="Ej. 978-3-16-148410-0"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Editorial / Leyenda Final
                </label>
                <input
                  type="text"
                  value={backCoverData.publisher || ''}
                  onChange={(e) => updateBackCoverField('publisher', e.target.value)}
                  placeholder="Ej. Impreso en Buenos Aires"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Opciones de Hojas Blancas e Imprenta */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-500" />
          Retiros de Tapa y Cortesía
        </h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
            <input
              type="checkbox"
              checked={options.blankBehindCover !== false}
              onChange={(e) => setOptions((prev) => ({ ...prev, blankBehindCover: e.target.checked }))}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white block">
                Dejar reverso de Tapa en blanco (Retiro de Tapa)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Inserta una hoja blanca al dorso de la tapa para iniciar el contenido en hoja impar derecha.
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
            <input
              type="checkbox"
              checked={options.blankInFrontBackCover !== false}
              onChange={(e) => setOptions((prev) => ({ ...prev, blankInFrontBackCover: e.target.checked }))}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white block">
                Dejar reverso interior de Contratapa en blanco (Retiro de Contratapa)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Asegura que la contratapa quede aislada en el reverso exterior sin texto encimado.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Botones de Navegación */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver al Paso 1</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer hover:scale-[1.02]"
        >
          <span>Ver Resumen y Previsualización</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
