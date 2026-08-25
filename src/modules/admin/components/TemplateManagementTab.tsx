import React, { useEffect, useState } from 'react';
import { Preset } from '../../../shared/core/pdf-engine/layers/presets/presetSchema';
import { PRESET_LIST } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { fetchPresetsFromSupabase, savePresetToSupabase, deletePresetFromSupabase } from '../../../shared/core/pdf-engine/layers/presets/presetStorageService';
import { Palette, Code2, Save, Plus, Trash2, Layout, Sparkles, CheckCircle2, Wand2, Info } from 'lucide-react';
import { generateHarmonyPalette, HarmonyScheme } from '../../../shared/core/pdf-engine/layers/colors/colorSystem';
import { useToast } from '../../../shared/core/ui/Toast';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';

export function TemplateManagementTab() {
  const { showSuccess, showError } = useToast();
  const { confirm } = useConfirm();
  const [presets, setPresets] = useState<Preset[]>(PRESET_LIST);
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESET_LIST[0]);
  const [activeSubTab, setActiveSubTab] = useState<'visual' | 'json'>('visual');
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(PRESET_LIST[0], null, 2));
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [harmonyScheme, setHarmonyScheme] = useState<HarmonyScheme>('complementario');

  const handleGenerateHarmony = () => {
    const palette = generateHarmonyPalette(selectedPreset.palette.primary || 'var(--color-secondary-base)', harmonyScheme);
    const updated = {
      ...selectedPreset,
      palette: {
        ...selectedPreset.palette,
        secondary: palette.secondary,
        accent: palette.accent,
        text: palette.text,
      }
    };
    setSelectedPreset(updated);
    setJsonText(JSON.stringify(updated, null, 2));
    showSuccess(`¡Armonía ${harmonyScheme.toUpperCase()} generada con éxito!`);
  };

  async function loadPresets() {
    setLoading(true);
    try {
      const fetched = await fetchPresetsFromSupabase();
      if (Array.isArray(fetched) && fetched.length > 0) {
        setPresets(fetched);
        setSelectedPreset(fetched[0]);
        setJsonText(JSON.stringify(fetched[0], null, 2));
      } else {
        setPresets(PRESET_LIST);
        setSelectedPreset(PRESET_LIST[0]);
        setJsonText(JSON.stringify(PRESET_LIST[0], null, 2));
      }
    } catch (err) {
      console.warn('Error cargando presets:', err);
      setPresets(PRESET_LIST);
      setSelectedPreset(PRESET_LIST[0]);
      setJsonText(JSON.stringify(PRESET_LIST[0], null, 2));
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
      } catch {
        showError('JSON inválido: verifica la sintaxis antes de guardar.');
        return;
      }
    }

    if (!presetToSave.id || !presetToSave.name) {
      showError('El Preset debe incluir id y name válidos.');
      return;
    }

    setSaving(true);
    await withErrorHandling(
      async () => {
        const res = await savePresetToSupabase(presetToSave);
        if (res.success) {
          showSuccess(`Plantilla "${presetToSave.name}" guardada y sincronizada en Supabase.`);
          loadPresets();
        } else {
          showError(res.error || 'Error guardando plantilla en Supabase.');
        }
      },
      {
        context: 'Guardado de Plantilla',
        errorMessage: 'Error al guardar la plantilla.',
        notify: (msg) => showError(msg)
      }
    );
    setSaving(false);
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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--color-neutral-border)] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-neutral-border)] pb-4">
        <div>
          <h2 className="text-base font-black text-[var(--color-neutral-text-primary)] flex items-center gap-2">
            <Layout className="w-5 h-5 text-[var(--color-accent-text)]" />
            <span>Gestión Suprema de Plantillas y Presets (Capa 5/8)</span>
          </h2>
          <p className="text-xs text-[var(--color-neutral-text-secondary)] font-medium">
            Edición en tiempo real de paletas de color, tipografía y geometría serializada en Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateNewPreset}
            className="px-3.5 py-2 bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Plantilla</span>
          </button>

          <button
            onClick={handleSaveCurrentPreset}
            disabled={saving}
            className="px-4 py-2 bg-[var(--color-status-success-base)] hover:opacity-90 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Guardando...' : 'Guardar en Supabase'}</span>
          </button>
        </div>
      </div>

      {/* Preset Selector Grid */}
      <div className="space-y-2">
        <label className="block text-xs font-extrabold text-[var(--color-neutral-text-primary)] uppercase tracking-wider">
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
                    ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] shadow-md ring-2 ring-[var(--color-accent-base)]/30'
                    : 'border-[var(--color-neutral-border)] bg-[var(--color-neutral-surface-muted)] hover:bg-white hover:border-[var(--color-neutral-border-strong)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-[var(--color-neutral-text-primary)] truncate">{p.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[var(--color-accent-text)]" />}
                  </div>
                  <span className="text-[10px] uppercase font-extrabold text-[var(--color-neutral-text-secondary)] bg-[var(--color-neutral-border)]/50 px-2 py-0.5 rounded-md">
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
        {/* Sub-Tabs: Visual Quick Editor vs Raw JSON Editor */}
        <div className="border-t border-[var(--color-neutral-border)] pt-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-neutral-border)] pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubTab('visual')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'visual'
                    ? 'bg-[var(--color-neutral-text-primary)] text-white shadow-sm'
                    : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-border)]'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Editor Rápido de Estilo</span>
              </button>

              <button
                onClick={() => setActiveSubTab('json')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'json'
                    ? 'bg-[var(--color-neutral-text-primary)] text-white shadow-sm'
                    : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-border)]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Editor JSON de Geometría Avanzada</span>
              </button>
            </div>

            <button
              onClick={handleDeletePreset}
              className="text-xs font-bold text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-muted)] px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Desactivar Plantilla</span>
            </button>
          </div>

          {/* VISUAL QUICK EDITOR */}
          {activeSubTab === 'visual' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--color-neutral-surface-muted)] p-5 rounded-2xl border border-[var(--color-neutral-border)] text-xs">
              {/* Left Column: Identificadores y Paleta */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-[var(--color-neutral-text-primary)] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[var(--color-accent-purple-text)]" />
                  <span>Propiedades Básicas & Paleta</span>
                </h3>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Nombre de la Plantilla</label>
                  <input
                    type="text"
                    value={selectedPreset.name}
                    onChange={(e) => handleUpdateField('name', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--color-neutral-border)] bg-white font-bold text-[var(--color-neutral-text-primary)] outline-none focus:border-[var(--color-accent-base)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Categoría de Página</label>
                  <select
                    value={selectedPreset.pageCategory}
                    onChange={(e) => handleUpdateField('pageCategory', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--color-neutral-border)] bg-white font-bold text-[var(--color-neutral-text-primary)] outline-none"
                  >
                    <option value="documento">📄 Documento / CV A4</option>
                    <option value="tarjeta">🎴 Tarjeta de Presentación</option>
                  </select>
                </div>

                {/* Motor de Armonía de Color */}
                <div className="p-3 bg-[var(--color-accent-purple-light)] rounded-xl border border-[var(--color-accent-purple)]/30 space-y-2">
                  <label className="block text-[11px] font-black text-[var(--color-accent-purple-text)] flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-[var(--color-accent-purple-text)]" />
                    <span>Generador de Armonía Cromática (WCAG 2.1)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={harmonyScheme}
                      onChange={(e) => setHarmonyScheme(e.target.value as HarmonyScheme)}
                      className="flex-1 p-2 rounded-lg border border-[var(--color-accent-purple)]/30 bg-white font-bold text-[var(--color-accent-purple)] text-xs outline-none"
                    >
                      <option value="complementario">☯️ Complementario (Contraste Máximo)</option>
                      <option value="analogo">🎨 Análogo (Transición Suave)</option>
                      <option value="triadico">📐 Triádico (Vibrante Equilibrado)</option>
                      <option value="monocromo">🌓 Monocromo (Variaciones de Matiz)</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleGenerateHarmony}
                      className="px-3 py-2 bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-extrabold rounded-lg transition text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Generar</span>
                    </button>
                  </div>
                </div>

                {/* Color Swatches Controls */}
                <div className="space-y-3 pt-2">
                  <label className="block text-[11px] font-black text-[var(--color-neutral-text-primary)] uppercase">Paleta de Colores:</label>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Color Primario</label>
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
                          className="flex-1 p-2 rounded-lg border border-[var(--color-neutral-border)] font-mono text-[var(--color-neutral-text-primary)] uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Color Secundario</label>
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
                          className="flex-1 p-2 rounded-lg border border-[var(--color-neutral-border)] font-mono text-[var(--color-neutral-text-primary)] uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Color de Acento</label>
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
                          className="flex-1 p-2 rounded-lg border border-[var(--color-neutral-border)] font-mono text-[var(--color-neutral-text-primary)] uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Color de Texto</label>
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
                          className="flex-1 p-2 rounded-lg border border-[var(--color-neutral-border)] font-mono text-[var(--color-neutral-text-primary)] uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Leyenda de Roles del Diseñador */}
                {selectedPreset?.roleLegend && typeof selectedPreset.roleLegend === 'object' && Object.keys(selectedPreset.roleLegend).length > 0 && (
                  <div className="p-3 bg-[var(--color-status-warning-muted)] rounded-xl border border-[var(--color-status-warning-base)]/30 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[var(--color-status-warning-text)] font-extrabold text-[11px]">
                      <Info className="w-3.5 h-3.5 text-[var(--color-status-warning-text)]" />
                      <span>Leyenda de Roles de este Diseño</span>
                    </div>
                    <div className="space-y-1 text-[10.5px]">
                      {Object.entries(selectedPreset.roleLegend).map(([elem, role]) => (
                        <div key={elem} className="flex items-center justify-between text-[var(--color-neutral-text-secondary)] font-medium">
                          <span>{elem}:</span>
                          <span className="font-mono text-[var(--color-accent-purple)] font-bold">{String(role)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Escala Tipográfica */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-[var(--color-neutral-text-primary)] uppercase tracking-wider text-[11px]">Escala Tipográfica (pt)</h3>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Familia Tipográfica</label>
                  <select
                    value={selectedPreset.typography.fontFamily}
                    onChange={(e) => handleUpdateField('typography.fontFamily', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--color-neutral-border)] bg-white font-bold text-[var(--color-neutral-text-primary)] outline-none"
                  >
                    <option value="Helvetica">Helvetica (Estándar Vectorial)</option>
                    <option value="Times-Roman">Times-Roman (Elegante Clásico)</option>
                    <option value="Courier">Courier (Monodistribuido / Técnico)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Título Nombre (pt)</label>
                    <input
                      type="number"
                      value={selectedPreset.typography.title}
                      onChange={(e) => handleUpdateField('typography.title', Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-[var(--color-neutral-border)] font-bold text-[var(--color-neutral-text-primary)] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Encabezado Sección (pt)</label>
                    <input
                      type="number"
                      value={selectedPreset.typography.sectionHeading}
                      onChange={(e) => handleUpdateField('typography.sectionHeading', Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-[var(--color-neutral-border)] font-bold text-[var(--color-neutral-text-primary)] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Título Registro (pt)</label>
                    <input
                      type="number"
                      value={selectedPreset.typography.itemTitle}
                      onChange={(e) => handleUpdateField('typography.itemTitle', Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-[var(--color-neutral-border)] font-bold text-[var(--color-neutral-text-primary)] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Cuerpo de Texto (pt)</label>
                    <input
                      type="number"
                      value={selectedPreset.typography.body}
                      onChange={(e) => handleUpdateField('typography.body', Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-[var(--color-neutral-border)] font-bold text-[var(--color-neutral-text-primary)] bg-white"
                    />
                  </div>
                </div>

                {/* Diseño de Contenedores de Registro */}
                <div className="space-y-3 pt-3 border-t border-[var(--color-neutral-border)]">
                  <h4 className="font-extrabold text-[var(--color-neutral-text-primary)] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Layout className="w-4 h-4 text-[var(--color-accent-purple)]" />
                    <span>Diseño de Registros (Contenedores)</span>
                  </h4>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Contenedor Formación Académica</label>
                      <select
                        value={selectedPreset.recordCardDesigns?.education || 'accent-card'}
                        onChange={(e) => handleUpdateField('recordCardDesigns.education', e.target.value)}
                        className="w-full p-2 rounded-lg border border-[var(--color-neutral-border)] bg-white font-bold text-[var(--color-neutral-text-primary)]"
                      >
                        <option value="accent-card">🎨 Borde Acento (Accent Card)</option>
                        <option value="primary-card">🔷 Borde Primario (Primary Card)</option>
                        <option value="neutral-card">⚪ Borde Neutro (Neutral Card)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Contenedor Experiencia Laboral</label>
                      <select
                        value={selectedPreset.recordCardDesigns?.experience || 'primary-card'}
                        onChange={(e) => handleUpdateField('recordCardDesigns.experience', e.target.value)}
                        className="w-full p-2 rounded-lg border border-[var(--color-neutral-border)] bg-white font-bold text-[var(--color-neutral-text-primary)]"
                      >
                        <option value="primary-card">🔷 Borde Primario (Primary Card)</option>
                        <option value="accent-card">🎨 Borde Acento (Accent Card)</option>
                        <option value="neutral-card">⚪ Borde Neutro (Neutral Card)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Contenedor Cursos y Capacitaciones</label>
                      <select
                        value={selectedPreset.recordCardDesigns?.course || 'neutral-card'}
                        onChange={(e) => handleUpdateField('recordCardDesigns.course', e.target.value)}
                        className="w-full p-2 rounded-lg border border-[var(--color-neutral-border)] bg-white font-bold text-[var(--color-neutral-text-primary)]"
                      >
                        <option value="neutral-card">⚪ Borde Neutro (Neutral Card)</option>
                        <option value="accent-card">🎨 Borde Acento (Accent Card)</option>
                        <option value="primary-card">🔷 Borde Primario (Primary Card)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* RAW JSON GEOMETRY EDITOR */}
        {activeSubTab === 'json' && (
          <div className="space-y-3 bg-black/40 p-4 rounded-2xl text-xs font-mono border border-white/10">
            <div className="flex items-center justify-between text-white/60">
              <span>Edición Avanzada de Geometría JSON (Sectores, Layout y Objetos Fijos)</span>
              <span className="text-[10px] text-[var(--color-accent-amber-bright)] font-bold">⚠️ Se valida esquema al guardar</span>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={16}
              className="w-full bg-black/60 text-[var(--color-status-success-bright)] p-4 rounded-xl border border-white/10 font-mono text-xs outline-none focus:border-[var(--color-accent-purple)] leading-relaxed resize-y"
            />
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
