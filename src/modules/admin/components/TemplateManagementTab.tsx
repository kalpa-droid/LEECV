import React, { useEffect, useState } from 'react';
import { Preset } from '../../../shared/core/pdf-engine/layers/presets/presetSchema';
import { PRESET_LIST } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { fetchPresetsFromSupabase, savePresetToSupabase, deletePresetFromSupabase } from '../../../shared/core/pdf-engine/layers/presets/presetStorageService';
import { Palette, Code2, Save, Plus, Trash2, Layout, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../shared/core/ui/Toast';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';

export function TemplateManagementTab() {
  const { showSuccess, showError } = useToast();
  const { confirm } = useConfirm();
  const [presets, setPresets] = useState<Preset[]>(PRESET_LIST);
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESET_LIST[0]);
  const [activeSubTab, setActiveSubTab] = useState<'visual' | 'json'>('visual');
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(PRESET_LIST[0], null, 2));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadPresets() {
    setLoading(true);
    try {
      const fetched = await fetchPresetsFromSupabase();
      setPresets(fetched);
      if (fetched.length > 0) {
        setSelectedPreset(fetched[0]);
        setJsonText(JSON.stringify(fetched[0], null, 2));
      }
    } catch (err) {
      console.warn('Error cargando presets:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPresets();
  }, []);

  const handleSelectPreset = (p: Preset) => {
    setSelectedPreset(p);
    setJsonText(JSON.stringify(p, null, 2));
  };

  const handleUpdateField = (path: string, value: any) => {
    const updated = JSON.parse(JSON.stringify(selectedPreset));
    const parts = path.split('.');
    let curr = updated;
    for (let i = 0; i < parts.length - 1; i++) {
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = value;

    setSelectedPreset(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const handleSaveCurrentPreset = async () => {
    let presetToSave = selectedPreset;

    if (activeSubTab === 'json') {
      try {
        presetToSave = JSON.parse(jsonText);
        setSelectedPreset(presetToSave);
      } catch (err: any) {
        showError('JSON inválido: verifica la sintaxis antes de guardar.');
        return;
      }
    }

    if (!presetToSave.id || !presetToSave.name) {
      showError('El Preset debe incluir id y name válidos.');
      return;
    }

    setSaving(true);
    try {
      const res = await savePresetToSupabase(presetToSave);
      if (res.success) {
        showSuccess(`Plantilla "${presetToSave.name}" guardada y sincronizada en Supabase.`);
        loadPresets();
      } else {
        showError(res.error || 'Error guardando plantilla en Supabase.');
      }
    } catch (err: any) {
      showError(err?.message || 'Error al guardar la plantilla.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewPreset = () => {
    const newId = `preset-${Date.now().toString(36)}`;
    const newPreset: Preset = {
      ...JSON.parse(JSON.stringify(selectedPreset)),
      id: newId,
      name: `Nueva Plantilla (${presets.length + 1})`
    };

    setPresets(prev => [...prev, newPreset]);
    setSelectedPreset(newPreset);
    setJsonText(JSON.stringify(newPreset, null, 2));
    showSuccess('Nueva plantilla basada en el modelo actual creada. Ajusta los parámetros y presiona Guardar.');
  };

  const handleDeletePreset = () => {
    confirm({
      title: `¿Desactivar la plantilla "${selectedPreset.name}"?`,
      message: 'Esta plantilla dejará de estar disponible en el selector de la aplicación.',
      confirmText: 'Desactivar',
      variant: 'danger',
      onConfirm: async () => {
        const res = await deletePresetFromSupabase(selectedPreset.id);
        if (res.success) {
          showSuccess(`Plantilla "${selectedPreset.name}" desactivada.`);
          loadPresets();
        } else {
          showError(res.error || 'No se pudo desactivar la plantilla.');
        }
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#EFE2C9] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EFE2C9] pb-4">
        <div>
          <h2 className="text-base font-black text-[#2B1B2E] flex items-center gap-2">
            <Layout className="w-5 h-5 text-[#FF2E63]" />
            <span>Gestión Suprema de Plantillas y Presets (Capa 5/8)</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Edición en tiempo real de paletas de color, tipografía y geometría serializada en Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateNewPreset}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Plantilla</span>
          </button>

          <button
            onClick={handleSaveCurrentPreset}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Guardando...' : 'Guardar en Supabase'}</span>
          </button>
        </div>
      </div>

      {/* Preset Selector Grid */}
      <div className="space-y-2">
        <label className="block text-xs font-extrabold text-[#2B1B2E] uppercase tracking-wider">
          Seleccionar Plantilla Activa ({presets.length}):
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {presets.map(p => {
            const isSelected = p.id === selectedPreset.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#FF2E63] bg-rose-50/50 shadow-md ring-2 ring-rose-200'
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-slate-900 truncate">{p.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#FF2E63]" />}
                  </div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                    {p.pageCategory}
                  </span>
                </div>

                {/* Color Swatch Dots */}
                <div className="flex items-center gap-1 mt-3">
                  <div className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: p.palette.primary }} title="Primario" />
                  <div className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: p.palette.secondary }} title="Secundario" />
                  <div className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: p.palette.accent }} title="Acento" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Tabs: Visual Quick Editor vs Raw JSON Editor */}
      <div className="border-t border-[#EFE2C9] pt-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('visual')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'visual'
                  ? 'bg-[#2B1B2E] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Editor Rápido de Estilo</span>
            </button>

            <button
              onClick={() => setActiveSubTab('json')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'json'
                  ? 'bg-[#2B1B2E] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Editor JSON de Geometría Avanzada</span>
            </button>
          </div>

          <button
            onClick={handleDeletePreset}
            className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Desactivar Plantilla</span>
          </button>
        </div>

        {/* VISUAL QUICK EDITOR */}
        {activeSubTab === 'visual' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs">
            {/* Left Column: Identificadores y Paleta */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Propiedades Básicas & Paleta</span>
              </h3>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre de la Plantilla</label>
                <input
                  type="text"
                  value={selectedPreset.name}
                  onChange={(e) => handleUpdateField('name', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 outline-none focus:border-[#FF2E63]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Categoría de Página</label>
                <select
                  value={selectedPreset.pageCategory}
                  onChange={(e) => handleUpdateField('pageCategory', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 outline-none"
                >
                  <option value="documento">📄 Documento / CV A4</option>
                  <option value="tarjeta">🎴 Tarjeta de Presentación</option>
                </select>
              </div>

              {/* Color Swatches Controls */}
              <div className="space-y-3 pt-2">
                <label className="block text-[11px] font-black text-slate-800 uppercase">Paleta de Colores:</label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Color Primario</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedPreset.palette.primary}
                        onChange={(e) => handleUpdateField('palette.primary', e.target.value)}
                        className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={selectedPreset.palette.primary}
                        onChange={(e) => handleUpdateField('palette.primary', e.target.value)}
                        className="flex-1 p-2 rounded-lg border border-slate-300 font-mono text-slate-800 uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Color Secundario</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedPreset.palette.secondary}
                        onChange={(e) => handleUpdateField('palette.secondary', e.target.value)}
                        className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={selectedPreset.palette.secondary}
                        onChange={(e) => handleUpdateField('palette.secondary', e.target.value)}
                        className="flex-1 p-2 rounded-lg border border-slate-300 font-mono text-slate-800 uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Color de Acento</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedPreset.palette.accent}
                        onChange={(e) => handleUpdateField('palette.accent', e.target.value)}
                        className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={selectedPreset.palette.accent}
                        onChange={(e) => handleUpdateField('palette.accent', e.target.value)}
                        className="flex-1 p-2 rounded-lg border border-slate-300 font-mono text-slate-800 uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Color de Texto</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedPreset.palette.text}
                        onChange={(e) => handleUpdateField('palette.text', e.target.value)}
                        className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={selectedPreset.palette.text}
                        onChange={(e) => handleUpdateField('palette.text', e.target.value)}
                        className="flex-1 p-2 rounded-lg border border-slate-300 font-mono text-slate-800 uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Escala Tipográfica */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">Escala Tipográfica (pt)</h3>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Familia Tipográfica</label>
                <select
                  value={selectedPreset.typography.fontFamily}
                  onChange={(e) => handleUpdateField('typography.fontFamily', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 outline-none"
                >
                  <option value="Helvetica">Helvetica (Estándar Vectorial)</option>
                  <option value="Times-Roman">Times-Roman (Elegante Clásico)</option>
                  <option value="Courier">Courier (Monodistribuido / Técnico)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Título Nombre (pt)</label>
                  <input
                    type="number"
                    value={selectedPreset.typography.title}
                    onChange={(e) => handleUpdateField('typography.title', Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Encabezado Sección (pt)</label>
                  <input
                    type="number"
                    value={selectedPreset.typography.sectionHeading}
                    onChange={(e) => handleUpdateField('typography.sectionHeading', Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Título Registro (pt)</label>
                  <input
                    type="number"
                    value={selectedPreset.typography.itemTitle}
                    onChange={(e) => handleUpdateField('typography.itemTitle', Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Cuerpo de Texto (pt)</label>
                  <input
                    type="number"
                    value={selectedPreset.typography.body}
                    onChange={(e) => handleUpdateField('typography.body', Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RAW JSON GEOMETRY EDITOR */}
        {activeSubTab === 'json' && (
          <div className="space-y-3 bg-slate-950 p-4 rounded-2xl text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span>Edición Avanzada de Geometría JSON (Sectores, Layout y Objetos Fijos)</span>
              <span className="text-[10px] text-amber-400 font-bold">⚠️ Se valida esquema al guardar</span>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={16}
              className="w-full bg-slate-900 text-emerald-400 p-4 rounded-xl border border-slate-800 font-mono text-xs outline-none focus:border-purple-500 leading-relaxed resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
}
