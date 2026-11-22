import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, RefreshCw, Upload } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { importLinkedinArchive } from '../../../shared/core/importers/linkedinArchiveImporter';
import { useToast } from '../../../shared/core/ui/Toast';
import {
  PORT_CONTACT_PROFILE_V1,
  type ContactProfileFieldKey,
  type ContactProfileV1,
} from '../../../shared/contracts/ports/contactProfile';
import {
  type AvailablePortSource,
  checkPortSourceOutdated,
  listAvailablePortSources,
  resolvePortFromDocument,
  selectContactProfileFields,
} from '../../../shared/core/ports/portBroker';
import {
  CONTACT_FIELD_META,
  applySelectedContactFieldsToCard,
} from '../domain/cardContactImport';

interface Props {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export function CardExtractSection({ cvData, setCvData }: Props) {
  const { showSuccess, showError } = useToast();
  const [sources, setSources] = useState<AvailablePortSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>(cvData?.sourceCvTabId || '');
  const [previewProfile, setPreviewProfile] = useState<{
    data: ContactProfileV1;
    source: AvailablePortSource;
    revision: number;
  } | null>(null);
  const [selectedFields, setSelectedFields] = useState<Record<ContactProfileFieldKey, boolean>>({
    fullName: true,
    role: true,
    company: true,
    email: true,
    phone: true,
    website: true,
    cityProvince: true,
    address: true,
    linkedin: true,
    github: false,
    instagram: false,
    photoAssetUri: false,
  });
  const [isImporting, setIsImporting] = useState(false);
  const [outdatedRevision, setOutdatedRevision] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    listAvailablePortSources(PORT_CONTACT_PROFILE_V1)
      .then((list) => {
        if (!mounted) return;
        setSources(list);
        if (list.length > 0 && !selectedSourceId) {
          setSelectedSourceId(list[0].docId);
        }
      })
      .catch((err) => console.warn('Error listando CVs disponibles vía puerto contact-profile@1:', err));
    return () => {
      mounted = false;
    };
  }, [selectedSourceId]);

  useEffect(() => {
    let mounted = true;
    checkPortSourceOutdated(cvData?.contactSourceRef)
      .then((res) => {
        if (mounted) {
          setOutdatedRevision(res.outdated ? res.latestRevision : null);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [cvData?.contactSourceRef]);

  const loadSourcePreview = useCallback(async (sourceDocId: string) => {
    const source = sources.find((s) => s.docId === sourceDocId);
    if (!source) return;
    const resolved = await resolvePortFromDocument<ContactProfileV1>(
      PORT_CONTACT_PROFILE_V1,
      source.docType,
      source.docId,
    );
    if (!resolved) {
      showError('No pudimos leer los datos de contacto del CV elegido.');
      return;
    }
    setPreviewProfile({
      data: resolved.data,
      source,
      revision: resolved.revision,
    });
  }, [sources, showError]);

  useEffect(() => {
    if (!selectedSourceId || sources.length === 0) return;
    void loadSourcePreview(selectedSourceId);
  }, [selectedSourceId, sources.length, loadSourcePreview]);

  const availableFieldsInPreview = useMemo(() => {
    if (!previewProfile) return [];
    return CONTACT_FIELD_META.filter(({ key }) => {
      const val = previewProfile.data[key];
      return typeof val === 'string' && val.trim().length > 0;
    });
  }, [previewProfile]);

  const handleApplySelectedFields = () => {
    if (!previewProfile) return;
    const chosenKeys = availableFieldsInPreview
      .map((f) => f.key)
      .filter((k) => selectedFields[k]);

    if (chosenKeys.length === 0) {
      showError('Marcá al menos un campo para importar a tu tarjeta.');
      return;
    }

    const { picked, sourceRef } = selectContactProfileFields(
      previewProfile.data,
      chosenKeys,
      {
        docId: previewProfile.source.docId,
        docType: previewProfile.source.docType,
        revision: previewProfile.revision,
      },
    );

    setCvData((prev: any) => applySelectedContactFieldsToCard(prev, picked, sourceRef));
    setOutdatedRevision(null);
    showSuccess(`Se importaron ${sourceRef.importedFields.length} campos desde "${previewProfile.source.title}".`);
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
            cityProvince: p.cityProvince || prev.personalInfo?.cityProvince || '',
          },
          cardOverrides: {
            ...(prev.cardOverrides || {}),
            ...(p.fullName ? { fullName: p.fullName } : {}),
            ...(p.email ? { email: p.email } : {}),
            ...(p.phone ? { phone: p.phone } : {}),
            ...(p.cityProvince ? { address: p.cityProvince } : {}),
            ...(latestExp?.role ? { role: latestExp.role } : {}),
            ...(latestExp?.company ? { brandName: latestExp.company } : {}),
          },
          profession: latestExp
            ? [
                {
                  degree: latestExp.role || p.quote || 'Profesional',
                  institution: latestExp.company || '',
                  year: latestExp.year || '',
                },
              ]
            : prev.profession,
          roles: imported.experience && imported.experience.length > 0 ? imported.experience : prev.roles,
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
      <PanelSection icon={<Upload className="w-4 h-4 text-[var(--color-accent-text)]" />} title="Importar desde LinkedIn">
        <div className="p-4 rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] space-y-3">
          <p className="text-xs text-[var(--color-neutral-text-secondary)] leading-relaxed">
            Subí tu archivo copia de seguridad de LinkedIn (.zip) para completar nombre, empresa, puesto actual y contacto en tu tarjeta.
          </p>
          <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-xs font-semibold rounded-[var(--radius-button)] cursor-pointer hover:opacity-90 transition-all">
            <Upload className="w-3.5 h-3.5" />
            <span>{isImporting ? 'Procesando ZIP...' : 'Seleccionar archivo .zip de LinkedIn'}</span>
            <input type="file" accept=".zip" onChange={handleLinkedinUpload} disabled={isImporting} className="hidden" />
          </label>
        </div>
      </PanelSection>

      <PanelSection icon={<CreditCard className="w-4 h-4 text-[var(--color-accent-text)]" />} title="Importar desde un Currículum existente">
        <div className="p-3 bg-[var(--ui-bg-card)] rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] space-y-3">
          {outdatedRevision !== null && previewProfile && (
            <div className="p-2.5 rounded-[var(--radius-card)] bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/40 flex items-center justify-between gap-2 text-xs">
              <span className="text-[var(--color-secondary-text)] font-medium">
                El CV vinculado cambió (rev. {outdatedRevision}). Podés actualizar los campos elegidos.
              </span>
              <button
                type="button"
                onClick={handleApplySelectedFields}
                className="px-2.5 py-1 rounded-[var(--radius-control)] bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] font-bold text-[11px] flex items-center gap-1 cursor-pointer hover:opacity-90"
              >
                <RefreshCw className="w-3 h-3" /> Actualizar
              </button>
            </div>
          )}

          {sources.length === 0 ? (
            <div className="p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-text)]/40 rounded-[var(--radius-card)] text-xs text-[var(--color-status-warning-text)] leading-relaxed">
              <span className="font-bold block mb-1">Todavía no hay currículums guardados en esta computadora</span>
              <span>Podés completar los datos de tu tarjeta manualmente en Frente y Dorso, o importar un archivo de LinkedIn.</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">
                  Elegí de qué CV traer tus datos:
                </label>
                <select
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-[var(--radius-card)] border border-[var(--color-secondary-base)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer"
                >
                  {sources.map((item) => (
                    <option key={item.docId} value={item.docId}>
                      {item.title} {item.subtitle ? `· ${item.subtitle}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {availableFieldsInPreview.length > 0 ? (
                <div className="space-y-2 pt-2 border-t border-[var(--color-neutral-border)]">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-neutral-text-secondary)]">
                    <span>Campos disponibles en este CV</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allChecked = availableFieldsInPreview.every((f) => selectedFields[f.key]);
                        setSelectedFields((prev) => {
                          const next = { ...prev };
                          for (const f of availableFieldsInPreview) next[f.key] = !allChecked;
                          return next;
                        });
                      }}
                      className="text-[var(--color-accent-text)] hover:underline cursor-pointer"
                    >
                      {availableFieldsInPreview.every((f) => selectedFields[f.key]) ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {availableFieldsInPreview.map(({ key, label }) => {
                      const rawValue = String(previewProfile?.data[key] || '');
                      const displayVal = key === 'photoAssetUri' ? 'Imagen cargada en almacenamiento local' : rawValue;
                      return (
                        <label
                          key={key}
                          className="flex items-start gap-2 p-2 rounded-[var(--radius-control)] border border-[var(--color-neutral-border)] hover:bg-[var(--color-neutral-surface-muted)] cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(selectedFields[key])}
                            onChange={(e) =>
                              setSelectedFields((prev) => ({ ...prev, [key]: e.target.checked }))
                            }
                            className="mt-0.5 accent-[var(--color-accent-base)]"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-[var(--color-neutral-text-primary)] block">{label}</span>
                            <span className="text-[11px] text-[var(--color-neutral-text-secondary)] truncate block">
                              {displayVal}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleApplySelectedFields}
                    className="w-full py-2 px-3 rounded-[var(--radius-button)] bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] text-xs font-bold cursor-pointer hover:opacity-90 transition"
                  >
                    Importar campos seleccionados a la tarjeta
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[var(--color-neutral-text-secondary)]">
                  Este CV todavía no tiene datos de contacto cargados para importar.
                </p>
              )}
            </div>
          )}
        </div>
      </PanelSection>
    </div>
  );
}
