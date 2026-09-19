import React, { useState, useEffect } from 'react';
import { CreditCard, Upload, FileText } from 'lucide-react';
import { PanelSection } from '../PanelSection';
import { getOpenTabs } from '../../../../../shared/core/documents/tabStore';
import { loadCVById, getSavedCVsList } from '../../../services/cvStorageService';
import { importLinkedinArchive } from '../../../../../shared/core/importers/linkedinArchiveImporter';
import { useToast } from '../../../../../shared/core/ui/Toast';

interface Props {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export function CardExtractSection({ cvData, setCvData }: Props) {
  const { showSuccess, showError } = useToast();
  const [savedCVs, setSavedCVs] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getSavedCVsList()
      .then((list) => {
        if (isMounted) setSavedCVs(list || []);
      })
      .catch((err) => console.warn('Error al cargar CVs guardados:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  const openTabsList = getOpenTabs();
  const openCvTabs = openTabsList.filter(t => !t.docType || t.docType === 'cv');

  // Combinar pestañas abiertas y CVs guardados evitando duplicados
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
    const loaded = await loadCVById(id);
    if (loaded) {
      setCvData((prev: any) => ({
        ...prev,
        sourceCvTabId: id,
        personalInfo: loaded.personalInfo || prev.personalInfo,
        roles: loaded.roles || prev.roles,
        profession: loaded.profession || prev.profession
      }));
      showSuccess(`Datos vinculados desde CV "${loaded.title || 'Seleccionado'}".`);
    } else {
      showError('No se pudieron recuperar los datos del CV seleccionado.');
    }
  };

  const handleLinkedinUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const imported = await importLinkedinArchive(file);
      setCvData((prev: any) => {
        const p = imported.personalInfo || {};
        const latestExp = imported.experience?.[0];

        return {
          ...prev,
          personalInfo: {
            ...(prev.personalInfo || {}),
            fullName: p.fullName || prev.personalInfo?.fullName || '',
            email: p.email || prev.personalInfo?.email || '',
            phone: p.phone || prev.personalInfo?.phone || '',
            cityProvince: p.cityProvince || prev.personalInfo?.cityProvince || ''
          },
          profession: latestExp ? [
            {
              degree: latestExp.role || p.quote || 'Profesional',
              institution: latestExp.company || '',
              year: latestExp.year || ''
            }
          ] : prev.profession,
          roles: imported.experience && imported.experience.length > 0 ? imported.experience : prev.roles
        };
      });

      showSuccess('¡Datos de LinkedIn importados con éxito para la tarjeta personal!');
    } catch (err: any) {
      showError(err.message || 'Error al procesar el archivo .zip de LinkedIn.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sección 1: Importar ZIP de LinkedIn */}
      <PanelSection icon={<Upload className="w-4 h-4 text-[var(--color-accent-text)]" />} title="Importar desde LinkedIn">
        <div className="p-4 rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] space-y-3">
          <p className="text-xs text-[var(--color-neutral-text-secondary)] leading-relaxed">
            Subí tu archivo copia de seguridad de LinkedIn (.zip) para auto-completar tu nombre, empresa, puesto actual y vías de contacto en tu tarjeta personal.
          </p>
          <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-[var(--color-primary-base)] text-white text-xs font-semibold rounded-[var(--radius-button)] cursor-pointer hover:opacity-90 transition-all">
            <Upload className="w-3.5 h-3.5" />
            <span>{isImporting ? 'Procesando ZIP...' : 'Seleccionar archivo .zip de LinkedIn'}</span>
            <input type="file" accept=".zip" onChange={handleLinkedinUpload} disabled={isImporting} className="hidden" />
          </label>
        </div>
      </PanelSection>

      {/* Sección 2: Fuente de Datos desde un CV */}
      <PanelSection icon={<CreditCard className="w-4 h-4 text-[var(--color-accent-text)]" />} title="Vincular con un Currículum">
        <div className="p-3 bg-[var(--ui-bg-card)] rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] space-y-3">
          {availableCvs.length === 0 ? (
            <div className="p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-text)]/40 rounded-[var(--radius-card)] text-xs text-[var(--color-status-warning-text)] leading-relaxed">
              <span className="font-bold block mb-1">⚠️ No hay currículums abiertos ni guardados</span>
              <span>Podés introducir los datos de tu tarjeta personal manualmente, importar un ZIP de LinkedIn o crear un CV para vincular sus datos.</span>
            </div>
          ) : availableCvs.length === 1 ? (
            <div className="p-3 bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 rounded-[var(--radius-card)] text-xs text-[var(--color-secondary-text)] flex items-center justify-between">
              <div>
                <span className="font-bold block">📄 {availableCvs[0].title}</span>
                <span className="text-[10px] opacity-75">{availableCvs[0].subtitle}</span>
              </div>
              <button
                type="button"
                onClick={() => handleLinkCv(availableCvs[0].id)}
                className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] cursor-pointer hover:opacity-90 transition"
              >
                Vincular
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">
                Seleccionar CV para extraer registros:
              </label>
              <select
                value={cvData?.sourceCvTabId || availableCvs[0].id}
                onChange={(e) => handleLinkCv(e.target.value)}
                className="w-full text-xs p-2.5 rounded-[var(--radius-card)] border border-[var(--color-secondary-base)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer"
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
      </PanelSection>
    </div>
  );
}
