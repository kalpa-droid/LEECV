import React, { useState, useEffect } from 'react';
import { Sparkles, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Download, CreditCard } from 'lucide-react';
import type { CoverLetterTab } from './CoverLetterDock';
import type { CoverLetterData } from '../../../shared/core/pdf-engine/layers/records/coverLetterDataAdapter';
import { generateAiCompletion } from '../../../shared/core/ai/aiClient';
import { COVER_LETTER_PRESETS } from '../../../shared/core/presets/coverLetterPresetCatalog';
import { PAGE_SIZES } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import { importLinkedinArchive } from '../../../shared/core/importers/linkedinArchiveImporter';
import { button } from '../../../shared/core/uiDesignSystem';
import { exportCoverLetterToDocx } from '../../../shared/core/export/docxExporter';
import { downloadBlob } from '../../../shared/core/utils/downloadUtils';
import { getOpenTabs } from '../../../shared/core/documents/tabStore';
import { loadCVById, getSavedCVsList } from '../../cv-builder/services/cvStorageService';
import { CoverLetterOnboardingModal } from './CoverLetterOnboardingModal';

interface CoverLetterEditorPanelProps {
  activeTab: CoverLetterTab;
  data: CoverLetterData;
  onChangeData: (data: CoverLetterData) => void;
  presetId: string;
  onSelectPreset: (presetId: string) => void;
  aiCredits?: number;
  onRefreshCredits?: () => void;
}

export const CoverLetterEditorPanel: React.FC<CoverLetterEditorPanelProps> = ({
  activeTab,
  data,
  onChangeData,
  presetId,
  onSelectPreset,
  aiCredits = 3,
  onRefreshCredits
}) => {
  const [tone, setTone] = useState<'professional' | 'enthusiastic' | 'executive' | 'creative'>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savedCVs, setSavedCVs] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    getSavedCVsList()
      .then((list) => {
        if (isMounted) setSavedCVs(list || []);
      })
      .catch((err) => console.warn('Error al obtener CVs guardados:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Lista de CVs disponibles (Pestañas abiertas + Almacenamiento local)
  const openTabsList = getOpenTabs();
  const openCvTabs = openTabsList.filter(t => !t.docType || t.docType === 'cv');

  const availableCvMap = new Map<string, { id: string; title: string; subtitle?: string }>();

  openCvTabs.forEach((t) => {
    const id = t.id || t.cvId;
    if (id) {
      availableCvMap.set(id, {
        id,
        title: t.title,
        subtitle: t.versionLabel ? `(Pestaña abierta - ${t.versionLabel})` : '(Pestaña abierta)'
      });
    }
  });

  savedCVs.forEach((scv) => {
    const id = scv.id;
    if (id && !availableCvMap.has(id)) {
      availableCvMap.set(id, {
        id,
        title: scv.title || scv.personalInfo?.fullName || 'CV Guardado',
        subtitle: '(Guardado en almacenamiento)'
      });
    }
  });

  const availableCvs = Array.from(availableCvMap.values());

  const handleLinkCv = async (id: string) => {
    if (!id) return;
    setFeedback(null);
    const loaded = await loadCVById(id);
    if (loaded) {
      onChangeData({
        ...data,
        sourceCvTabId: id,
        personalInfo: {
          ...(data.personalInfo || {}),
          fullName: loaded.personalInfo?.fullName || data.personalInfo?.fullName,
          email: loaded.personalInfo?.email || data.personalInfo?.email,
          phone: loaded.personalInfo?.phone || data.personalInfo?.phone,
          cityProvince: loaded.personalInfo?.cityProvince || data.personalInfo?.cityProvince
        },
        roles: loaded.roles || (data as any).roles || [],
        profession: loaded.profession || (data as any).profession || []
      } as any);
      setFeedback({ type: 'success', text: `Datos e historial vinculados desde CV "${loaded.title || 'Seleccionado'}".` });
    } else {
      setFeedback({ type: 'error', text: 'Error al recuperar los datos del CV seleccionado.' });
    }
  };

  const updateJobTarget = (field: string, val: string) => {
    onChangeData({
      ...data,
      jobTarget: {
        ...(data.jobTarget || {}),
        [field]: val
      }
    });
  };

  const updateBody = (field: string, val: string) => {
    onChangeData({
      ...data,
      body: {
        ...(data.body || {}),
        [field]: val
      }
    });
  };

  const handleLinkedinUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setFeedback(null);
    try {
      const importedCv = await importLinkedinArchive(file);
      if (importedCv.personalInfo) {
        onChangeData({
          ...data,
          personalInfo: {
            ...(data.personalInfo || {}),
            fullName: importedCv.personalInfo.fullName || data.personalInfo?.fullName,
            email: importedCv.personalInfo.email || data.personalInfo?.email,
            phone: importedCv.personalInfo.phone || data.personalInfo?.phone,
            cityProvince: importedCv.personalInfo.cityProvince || data.personalInfo?.cityProvince
          },
          roles: importedCv.experience || (data as any).roles || [],
          profession: (importedCv.education || []).map((e: any) => ({ degree: e.degree, institution: e.institution, year: e.year })) || (data as any).profession || []
        } as any);
      }
      setFeedback({ type: 'success', text: 'Datos e historial de LinkedIn importados con éxito.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error importando archivo de LinkedIn.' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    setFeedback(null);
    try {
      const blob = await exportCoverLetterToDocx(data);
      const name = data.personalInfo?.fullName || 'Candidato';
      downloadBlob(blob, `Carta de Presentacion - ${name}.docx`);
      setFeedback({ type: 'success', text: 'Documento Word (.docx) descargado con éxito.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al exportar archivo .docx.' });
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleGenerateAi = async () => {
    setIsGenerating(true);
    setFeedback(null);

    const j = data.jobTarget || {};
    const p = data.personalInfo || {};
    const roles: any[] = (data as any).roles || [];
    const profession: any[] = (data as any).profession || [];

    const expStr = roles.length > 0
      ? roles.map(r => `- ${r.role || r.title || 'Puesto'} en ${r.company || 'Empresa'} (${r.year || 'Año'}): ${r.details || ''}`).join('\n')
      : 'Sin experiencia previa registrada.';

    const eduStr = profession.length > 0
      ? profession.map(e => `- ${e.degree || e.title || 'Título'} en ${e.institution || 'Institución'} (${e.year || ''})`).join('\n')
      : 'Sin títulos o estudios registrados.';

    const systemPrompt = `Eres un experto redactor de cartas de presentación profesionales en español. 
Tu objetivo es redactar una carta de presentación altamente adaptada y convincente basada en los datos del candidato, su experiencia laboral previa y la descripción de la vacante.
Debes devolver el resultado con exactamente 3 párrafos en formato JSON estructurado con las siguientes claves:
{
  "salutation": "Estimado/a responsable de selección,",
  "hookParagraph": "Primer párrafo de gancho destacando entusiasmo y encaje con el puesto.",
  "evidenceParagraph": "Segundo párrafo de evidencia conectando experiencia previa y logros relevantes del candidato.",
  "closingParagraph": "Tercer párrafo de cierre solicitando entrevista.",
  "signoff": "Atentamente,"
}
No devuelvas marcado markdown alrededor del JSON. Solo el objeto JSON plano.`;

    const userPrompt = `
DATOS DEL CANDIDATO:
- Nombre: ${p.fullName || 'Candidato'}
- Email: ${p.email || ''}
- Ubicación: ${p.cityProvince || ''}

TRAYECTORIA Y EXPERIENCIA LABORAL:
${expStr}

FORMACIÓN ACADÉMICA Y TÍTULOS:
${eduStr}

VACANTE OBJETIVO:
- Puesto: ${j.jobTitle || 'Profesional'}
- Empresa: ${j.companyName || 'Empresa'}
- Reclutador: ${j.recipientName || 'Responsable de Selección'}
- Descripción del Puesto:
${j.jobDescription || 'Sin descripción detallada. Generar carta profesional genérica pero relevante.'}

TONO DESEADO: ${tone.toUpperCase()}
`;

    try {
      const res = await generateAiCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.7
      });

      let jsonClean = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonClean);

      onChangeData({
        ...data,
        body: {
          salutation: parsed.salutation || 'Estimado/a responsable de selección,',
          hookParagraph: parsed.hookParagraph || '',
          evidenceParagraph: parsed.evidenceParagraph || '',
          closingParagraph: parsed.closingParagraph || '',
          signoff: parsed.signoff || 'Atentamente,'
        }
      });

      setFeedback({
        type: 'success',
        text: `¡Carta generada con éxito usando ${res.providerUsed.toUpperCase()}! Te quedan ${res.remainingCredits} créditos.`
      });
      if (onRefreshCredits) onRefreshCredits();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Error al generar la carta con IA.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 bg-[var(--ui-bg-app)] overflow-y-auto p-6 text-[var(--ui-text-primary)]">
      {feedback && (
        <div className={`mb-6 p-4 rounded-[12px] border flex items-center gap-3 text-xs ${
          feedback.type === 'success'
            ? 'bg-[var(--color-status-success-muted)] border-[var(--ui-border)] text-[var(--color-status-success-text)]'
            : 'bg-[var(--color-status-danger-muted)] border-[var(--ui-border)] text-[var(--color-status-danger-text)]'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {activeTab === 'source_data' && (
        <div className="space-y-6 max-w-2xl">
          <div>
            <h3 className="text-sm font-semibold mb-1">Origen de Datos del Candidato</h3>
            <p className="text-xs text-[var(--ui-text-secondary)]">
              Vincular tus datos personales y trayectoria desde un CV abierto, guardado o archivo ZIP de LinkedIn.
            </p>
          </div>

          {/* Selector de CV */}
          <div className="p-4 rounded-[12px] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] space-y-3">
            <h4 className="text-xs font-semibold text-[var(--ui-text-primary)] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--color-primary-base)]" />
              Vincular datos desde un Currículum (CV)
            </h4>
            {availableCvs.length === 0 ? (
              <p className="text-xs text-[var(--ui-text-secondary)]">
                No hay ningún CV abierto ni guardado. Puedes completar tus datos manualmente abajo o importar un ZIP de LinkedIn.
              </p>
            ) : availableCvs.length === 1 ? (
              <div className="flex items-center justify-between text-xs p-2.5 rounded-[10px] bg-[var(--ui-bg-app)] border border-[var(--ui-border)]">
                <div>
                  <span className="font-bold block">📄 {availableCvs[0].title}</span>
                  <span className="text-[10px] text-[var(--ui-text-secondary)]">{availableCvs[0].subtitle}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleLinkCv(availableCvs[0].id)}
                  className="px-3 py-1 bg-[var(--color-primary-base)] text-white text-xs font-semibold rounded-[8px] hover:opacity-90 transition-all"
                >
                  Vincular
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-medium">Seleccionar CV:</label>
                <select
                  value={(data as any)?.sourceCvTabId || availableCvs[0].id}
                  onChange={(e) => handleLinkCv(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-bg-app)] text-[var(--ui-text-primary)] font-medium outline-none cursor-pointer"
                >
                  {availableCvs.map((item) => (
                    <option key={item.id} value={item.id}>
                      📄 {item.title} {item.subtitle}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Importador de LinkedIn */}
          <div className="p-4 rounded-[12px] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] space-y-4">
            <h4 className="text-xs font-semibold text-[var(--ui-text-primary)] flex items-center gap-2">
              <Upload className="w-4 h-4 text-[var(--ui-text-primary)]" />
              Importar copia de seguridad de LinkedIn (.zip)
            </h4>
            <p className="text-xs text-[var(--ui-text-secondary)]">
              Obtén tu archivo ZIP en LinkedIn (Configuración &gt; Privacidad de datos &gt; Obtener una copia de tus datos).
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-base)] text-white text-xs font-semibold rounded-[10px] cursor-pointer hover:opacity-90 transition-all">
              <Upload className="w-3.5 h-3.5" />
              <span>{isImporting ? 'Procesando ZIP...' : 'Seleccionar archivo .zip'}</span>
              <input type="file" accept=".zip" onChange={handleLinkedinUpload} disabled={isImporting} className="hidden" />
            </label>
          </div>

          {/* Campos Manuales */}
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium mb-1">Nombre Completo</label>
              <input
                type="text"
                value={data.personalInfo?.fullName || ''}
                onChange={(e) => onChangeData({ ...data, personalInfo: { ...(data.personalInfo || {}), fullName: e.target.value } })}
                placeholder="Ej: Laura Mónica González"
                className="w-full px-3 py-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={data.personalInfo?.email || ''}
                  onChange={(e) => onChangeData({ ...data, personalInfo: { ...(data.personalInfo || {}), email: e.target.value } })}
                  placeholder="laura@ejemplo.com"
                  className="w-full px-3 py-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Ciudad / Provincia</label>
                <input
                  type="text"
                  value={data.personalInfo?.cityProvince || ''}
                  onChange={(e) => onChangeData({ ...data, personalInfo: { ...(data.personalInfo || {}), cityProvince: e.target.value } })}
                  placeholder="Córdoba, Argentina"
                  className="w-full px-3 py-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vacancy' && (
        <div className="space-y-6 max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold mb-1">Información de la Vacante</h3>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                Pega la descripción del puesto y datos de la empresa para que la IA adapte los argumentos exactos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="px-3 py-1.5 bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/40 text-[var(--color-accent-text)] hover:bg-[var(--color-accent-base)] hover:text-[var(--color-accent-on-base)] text-xs font-bold rounded-[8px] flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autocompletar con 1-Clic</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Puesto Objetivo</label>
                <input
                  type="text"
                  value={data.jobTarget?.jobTitle || ''}
                  onChange={(e) => updateJobTarget('jobTitle', e.target.value)}
                  placeholder="Ej: Gerente de Operaciones Logísticas"
                  className="w-full px-3 py-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Empresa</label>
                <input
                  type="text"
                  value={data.jobTarget?.companyName || ''}
                  onChange={(e) => updateJobTarget('companyName', e.target.value)}
                  placeholder="Ej: Mercado Libre"
                  className="w-full px-3 py-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Destinatario / Persona de Contacto</label>
              <input
                type="text"
                value={data.jobTarget?.recipientName || ''}
                onChange={(e) => updateJobTarget('recipientName', e.target.value)}
                placeholder="Ej: Lic. Martín Soria (Responsable de Selección)"
                className="w-full px-3 py-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Descripción de la Oferta de Empleo (JD)</label>
              <textarea
                rows={6}
                value={data.jobTarget?.jobDescription || ''}
                onChange={(e) => updateJobTarget('jobDescription', e.target.value)}
                placeholder="Pega aquí el texto completo del aviso de trabajo..."
                className="w-full px-3 py-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai_generate' && (
        <div className="space-y-6 max-w-2xl">
          <div>
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-status-warning-text)]" />
              Generación de Carta con IA
            </h3>
            <p className="text-xs text-[var(--ui-text-secondary)]">
              Elige el tono deseado. La IA analizará la trayectoria del candidato y los requerimientos del puesto para redactar los 3 párrafos clave.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-medium">Tono de Redacción</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'professional', label: 'Profesional & Directo', desc: 'Formal, preciso e enfocado en resultados.' },
                { id: 'enthusiastic', label: 'Entusiasta & Apasionado', desc: 'Destaca alto interés y energía por el proyecto.' },
                { id: 'executive', label: 'Ejecutivo & Liderazgo', desc: 'Enfocado en visión estratégica y gestión.' },
                { id: 'creative', label: 'Creativo & Innovador', desc: 'Estilo dinámico para entornos tecnológicos o de diseño.' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id as any)}
                  className={`p-3 rounded-[12px] border text-left transition-all ${
                    tone === t.id
                      ? 'border-[var(--color-primary-base)] bg-[var(--color-primary-muted)] text-[var(--ui-text-primary)] font-medium'
                      : 'border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-border-hover)]'
                  }`}
                >
                  <div className="text-xs font-semibold">{t.label}</div>
                  <div className="text-[11px] opacity-75 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--ui-border)] flex items-center justify-between">
            <div className="text-xs text-[var(--ui-text-secondary)]">
              Créditos disponibles: <strong className="text-[var(--color-status-warning-text)]">{aiCredits}</strong>
            </div>

            <button
              type="button"
              onClick={handleGenerateAi}
              disabled={isGenerating || aiCredits <= 0}
              className={`flex items-center gap-2 ${button.primary}`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Redactando carta...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generar Carta con IA</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="space-y-6 max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold mb-1">Editor de Párrafos</h3>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                Ajusta o edita manualmente las secciones del texto o descárgalo en formato Word.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportDocx}
              disabled={isExportingDocx}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs font-semibold text-[var(--ui-text-primary)] hover:border-[var(--ui-border-hover)] transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[var(--color-primary-base)]" />
              <span>{isExportingDocx ? 'Generando DOCX...' : 'Descargar como Word (.docx)'}</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Saludo Inicial</label>
              <input
                type="text"
                value={data.body?.salutation || ''}
                onChange={(e) => updateBody('salutation', e.target.value)}
                placeholder="Estimado/a responsable de selección,"
                className="w-full px-3 py-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Párrafo 1 — Gancho e Interés</label>
              <textarea
                rows={3}
                value={data.body?.hookParagraph || ''}
                onChange={(e) => updateBody('hookParagraph', e.target.value)}
                placeholder="Expresa tu motivación por el puesto..."
                className="w-full px-3 py-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Párrafo 2 — Evidencia y Logros</label>
              <textarea
                rows={4}
                value={data.body?.evidenceParagraph || ''}
                onChange={(e) => updateBody('evidenceParagraph', e.target.value)}
                placeholder="Detalla tu experiencia clave y encaje técnico..."
                className="w-full px-3 py-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Párrafo 3 — Cierre y Llamado a la Acción</label>
              <textarea
                rows={3}
                value={data.body?.closingParagraph || ''}
                onChange={(e) => updateBody('closingParagraph', e.target.value)}
                placeholder="Solicita una entrevista de trabajo..."
                className="w-full px-3 py-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Despedida</label>
              <input
                type="text"
                value={data.body?.signoff || ''}
                onChange={(e) => updateBody('signoff', e.target.value)}
                placeholder="Atentamente,"
                className="w-full px-3 py-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'styling' && (
        <div className="space-y-6 max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold mb-1">Diseño y Estilo Editorial</h3>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                Selecciona el estilo de encabezado y la disposición visual de la carta.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportDocx}
              disabled={isExportingDocx}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] rounded-[10px] text-xs font-semibold text-[var(--ui-text-primary)] hover:border-[var(--ui-border-hover)] transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[var(--color-primary-base)]" />
              <span>{isExportingDocx ? 'Generando DOCX...' : 'Descargar como Word (.docx)'}</span>
            </button>
          </div>

          <div className="p-4 rounded-[12px] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] space-y-2">
            <label className="block text-xs font-semibold text-[var(--ui-text-primary)]">
              ¿En qué hoja la vas a imprimir?
            </label>
            <select
              value={(data as any)?.layout?.pageSizeId || (data as any)?.layout?.paperSize || 'a4'}
              onChange={(e) => {
                const val = e.target.value;
                onChangeData({
                  ...data,
                  layout: {
                    ...((data as any).layout || {}),
                    pageSizeId: val,
                    paperSize: val
                  }
                } as any);
              }}
              className="w-full text-xs p-2.5 rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-bg-app)] text-[var(--ui-text-primary)] font-medium outline-none cursor-pointer"
            >
              {Object.values(PAGE_SIZES)
                .filter((s: any) => s.category === 'documento' && ['a4', 'carta', 'legal', 'oficio'].includes(s.id))
                .map((size: any) => (
                  <option key={size.id} value={size.id}>
                    📄 {size.label}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {Object.values(COVER_LETTER_PRESETS).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPreset(p.id)}
                className={`p-4 rounded-[12px] border text-left transition-all ${
                  presetId === p.id
                    ? 'border-[var(--color-primary-base)] bg-[var(--color-primary-muted)] text-[var(--ui-text-primary)] shadow-[var(--shadow-raised)]'
                    : 'border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-border-hover)]'
                }`}
              >
                <div className="text-xs font-bold mb-1">{p.name}</div>
                <div className="text-[11px] opacity-75">{p.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <CoverLetterOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        data={data}
        onChangeData={onChangeData}
      />
    </div>
  );
};
