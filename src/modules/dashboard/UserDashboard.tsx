import React, { useState, useEffect, useMemo } from 'react';
import { 
  Cloud, HardDrive, CheckCircle2, AlertCircle, Search, RefreshCw, 
  Trash2, Download, ExternalLink, ShieldCheck, Filter, FileText, 
  ArrowLeft, LogOut, CheckSquare, Square, Sparkles
} from 'lucide-react';
import { supabase } from '../../shared/core/lib/supabaseClient';
import { dal } from '../../shared/core/storage/dataAccessLayer';
import { useEntitlements, getPlanLabel, getPlanBadgeClass, PLAN_FEATURES } from '../../shared/core/entitlements/useEntitlements';
import { usePdfExportGate } from '../../shared/core/entitlements/usePdfExportGate';
import { backupCvToGoogleDrive, deleteBackupFromDrive } from '../../shared/core/storage/driveBackupService';
import { getLEECVCloudUsage } from '../../shared/core/storage/leecvCloudBackend';
import { exportAllCVsToZip, exportCVToZip } from '../../shared/core/utils/jsonImporterExporter';
import { GracePeriodBanner } from '../../shared/core/ui/GracePeriodBanner';
import { RetentionOfferModal } from '../payments/components/RetentionOfferModal';
import { button, badge, glassmorphism, input } from '../../shared/core/uiDesignSystem';

interface UserDashboardProps {
  onBackToApp?: () => void;
  onNavigateToCv?: (cvId: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onBackToApp,
  onNavigateToCv,
}) => {
  const { plan, isPremium, inGracePeriod, graceEndsAt, cloudStorageGB } = useEntitlements();
  const { credits } = usePdfExportGate();
  const [cvList, setCvList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'unbacked' | 'backed'>('all');
  const [selectedCvIds, setSelectedCvIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [cloudUsage, setCloudUsage] = useState<{ usedGB: number; totalGB: number; percentUsed: number } | null>(null);

  // Cuota real de LEECV Cloud — solo aplica a Enterprise, se consulta aparte de
  // la lista de CVs porque requiere listar el bucket de Storage, no la tabla `cvs`.
  useEffect(() => {
    if (plan !== 'enterprise') return;
    getLEECVCloudUsage().then(setCloudUsage);
  }, [plan]);

  // Cargar perfil y lista de CVs
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [profile, cvs] = await Promise.all([
          dal.profiles.getById(user.id),
          dal.cvs.listByUser(user.id),
        ]);
        setUserProfile(profile);
        setCvList(cvs || []);
      }
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filtrado de CVs
  const filteredCvs = useMemo(() => {
    return cvList.filter(cv => {
      const matchQuery = (cv.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cv.candidate_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cv.dni || '').includes(searchQuery);

      if (!matchQuery) return false;

      if (filterMode === 'backed') return !!cv.drive_file_id;
      if (filterMode === 'unbacked') return !cv.drive_file_id;
      return true;
    });
  }, [cvList, searchQuery, filterMode]);

  // Manejo de Selección Múltiple
  const handleToggleSelectAll = () => {
    if (selectedCvIds.size === filteredCvs.length) {
      setSelectedCvIds(new Set());
    } else {
      setSelectedCvIds(new Set(filteredCvs.map(cv => cv.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedCvIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedCvIds(next);
  };

  // Acciones Masivas
  const handleBulkBackupToDrive = async () => {
    if (selectedCvIds.size === 0) return;
    const ids = Array.from(selectedCvIds);
    setProcessingIds(new Set(ids));
    setStatusMessage({ text: 'Iniciando respaldo masivo en Google Drive...', type: 'info' });

    let successCount = 0;
    for (const id of ids) {
      try {
        const fullCv = await dal.cvs.getById(id);
        if (fullCv) {
          fullCv.id = id;
          const res = await backupCvToGoogleDrive(fullCv, plan);
          if (res.success) successCount++;
        }
      } catch (err) {
        console.error(`Error respaldando CV ${id}:`, err);
      }
    }

    setProcessingIds(new Set());
    setSelectedCvIds(new Set());
    setStatusMessage({
      text: `Respaldo completado: ${successCount} de ${ids.length} CVs respaldados con éxito.`,
      type: successCount > 0 ? 'success' : 'error',
    });
    loadDashboardData();
  };

  const handleBulkReleaseFromDrive = async () => {
    if (selectedCvIds.size === 0) return;
    const ids = Array.from(selectedCvIds);
    setProcessingIds(new Set(ids));
    setStatusMessage({ text: 'Liberando archivos seleccionados de Google Drive...', type: 'info' });

    let successCount = 0;
    for (const id of ids) {
      const cv = cvList.find(c => c.id === id);
      if (cv) {
        const res = await deleteBackupFromDrive(id, cv.drive_file_id);
        if (res.success) successCount++;
      }
    }

    setProcessingIds(new Set());
    setSelectedCvIds(new Set());
    setStatusMessage({
      text: `Archivos liberados de Drive: ${successCount} de ${ids.length} CVs liberados. Permanecen en LEECV Cloud.`,
      type: 'success',
    });
    loadDashboardData();
  };

  const handleBulkDownloadZip = async () => {
    if (selectedCvIds.size === 0) return;
    const selectedItems = cvList.filter(c => selectedCvIds.has(c.id));
    const fullItems = await Promise.all(
      selectedItems.map(async item => {
        const fullData = await dal.cvs.getById(item.id);
        return { ...item, cv_data: fullData };
      })
    );
    await exportAllCVsToZip(fullItems, userProfile?.email || 'Usuario');
  };

  // Acción Individual
  const handleSingleBackup = async (cv: any) => {
    setProcessingIds(prev => new Set(prev).add(cv.id));
    try {
      const fullCv = await dal.cvs.getById(cv.id);
      if (fullCv) {
        fullCv.id = cv.id;
        const res = await backupCvToGoogleDrive(fullCv, plan);
        if (res.success) {
          setStatusMessage({ text: `CV "${cv.title || 'Sin título'}" respaldado en Google Drive.`, type: 'success' });
          loadDashboardData();
        } else {
          setStatusMessage({ text: `Error al respaldar en Drive: ${res.error}`, type: 'error' });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(cv.id);
        return next;
      });
    }
  };

  const handleSingleRelease = async (cv: any) => {
    setProcessingIds(prev => new Set(prev).add(cv.id));
    try {
      const res = await deleteBackupFromDrive(cv.id, cv.drive_file_id);
      if (res.success) {
        setStatusMessage({ text: `Respaldo liberado de Drive para "${cv.title || 'Sin título'}".`, type: 'success' });
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(cv.id);
        return next;
      });
    }
  };

  // Cálculo de estadísticas
  const totalCount = cvList.length;
  const backedCount = cvList.filter(c => c.drive_file_id).length;
  const unbackedCount = totalCount - backedCount;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER DEL DASHBOARD */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className={`${button.ghost} p-2 rounded-lg text-slate-400 hover:text-white`}
                title="Volver a la aplicación"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Panel de Almacenamiento y Gestión
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                  plan === 'pro' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' :
                  inGracePeriod ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {inGracePeriod ? 'Gracia (10d)' : getPlanLabel(plan)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {userProfile?.email || 'Usuario LEECV'} — Control granular de respaldos en nube y Google Drive.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {inGracePeriod && (
              <button
                onClick={() => setIsRetentionModalOpen(true)}
                className={`${button.primary} text-xs py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center gap-1.5`}
              >
                <Sparkles className="w-4 h-4" />
                Oferta 20% OFF
              </button>
            )}

            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className={`${button.secondary} text-xs py-2 px-3 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800`}
              >
                Ir al Editor
              </button>
            )}
          </div>
        </header>

        {/* BANNER DE PERÍODO DE GRACIA (SI APLICA) */}
        {inGracePeriod && (
          <GracePeriodBanner
            graceEndsAt={graceEndsAt}
            cvList={cvList}
            userName={userProfile?.email}
            onOpenRetentionModal={() => setIsRetentionModalOpen(true)}
          />
        )}

        {/* MENSAJES DE ESTADO PUNTUALES */}
        {statusMessage && (
          <div className={`p-3 rounded-lg text-xs font-medium border flex items-center justify-between ${
            statusMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
            statusMessage.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
            'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}>
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">×</button>
          </div>
        )}

        {/* TARJETAS DE MEDIDORES Y ALMACENAMIENTO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* TARJETA 1: LEECV CLOUD / CRÉDITOS DISPONIBLES */}
          <div className={`rounded-xl p-5 border ${glassmorphism.card} bg-slate-900/60 border-slate-800 space-y-3`}>
            {plan === 'enterprise' ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-purple-400" />
                    LEECV Cloud
                  </span>
                  <span className="text-xs font-semibold text-purple-400">
                    {PLAN_FEATURES.enterprise.cloudStorageGB} GB
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-white tracking-tight">
                    {cloudUsage ? `${cloudUsage.usedGB} GB` : '…'}
                    <span className="text-sm font-medium text-slate-400"> / {PLAN_FEATURES.enterprise.cloudStorageGB} GB</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {cloudUsage ? `${cloudUsage.percentUsed}% usado — actualizado ahora` : 'Consultando uso real...'}
                  </p>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${cloudUsage?.percentUsed || 0}%` }} />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Créditos de Exportación
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {credits} Disponibles
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-white tracking-tight">
                    {credits} {credits === 1 ? 'Crédito' : 'Créditos'}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {credits > 0
                      ? 'Tenés créditos activos para exportar PDFs A4 o publicar tu CV sin límite de tiempo.'
                      : 'Sin créditos activos. Podés comprar un paquete o suscribirte a Pro/Enterprise.'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* TARJETA 2: GOOGLE DRIVE BACKUP */}
          <div className={`rounded-xl p-5 border ${glassmorphism.card} bg-slate-900/60 border-slate-800 space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-teal-400" />
                Google Drive Backup
              </span>
              <span className="text-xs font-semibold text-teal-400">
                {backedCount} / {totalCount} Respaldados
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white tracking-tight">
                {Math.round((backedCount / (totalCount || 1)) * 100)}%
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">CVs sincronizados en el Drive personal.</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-teal-400 h-full rounded-full" style={{ width: `${Math.round((backedCount / (totalCount || 1)) * 100)}%` }} />
            </div>
          </div>

          {/* TARJETA 3: DESCARGA MASIVA */}
          <div className={`rounded-xl p-5 border ${glassmorphism.card} bg-slate-900/60 border-slate-800 flex flex-col justify-between`}>
            <div>
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-2">
                <Download className="w-4 h-4 text-emerald-400" />
                Exportación Masiva (.ZIP)
              </span>
              <p className="text-xs text-slate-300">
                Genera un archivo empaquetado con todos tus CVs estructurados y sus imágenes anexas.
              </p>
            </div>
            <button
              onClick={() => exportAllCVsToZip(cvList, userProfile?.email)}
              disabled={totalCount === 0}
              className={`${button.secondary} text-xs py-2 mt-3 w-full border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center justify-center gap-2`}
            >
              <Download className="w-3.5 h-3.5" />
              Descargar Todo en ZIP
            </button>
          </div>

        </div>

        {/* TABLA Y HERRAMIENTAS DE GESTIÓN */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">

          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* BUSCADOR */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por título, candidato o DNI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${input.base} pl-9 text-xs py-2 bg-slate-950 border-slate-800 text-slate-200`}
              />
            </div>

            {/* PESTAÑAS DE FILTRADO POR ESTADO */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterMode === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({totalCount})
              </button>
              <button
                onClick={() => setFilterMode('unbacked')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterMode === 'unbacked' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                No respaldados ({unbackedCount})
              </button>
              <button
                onClick={() => setFilterMode('backed')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterMode === 'backed' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                En Google Drive ({backedCount})
              </button>
            </div>
          </div>

          {/* BARRA DE ACCIONES MASIVAS (CUANDO HAY SELECCIÓN) */}
          {selectedCvIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-teal-500/10 border border-teal-500/30 p-3 rounded-lg text-xs animate-fade-in">
              <span className="font-medium text-teal-300">
                {selectedCvIds.size} {selectedCvIds.size === 1 ? 'CV seleccionado' : 'CVs seleccionados'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkBackupToDrive}
                  className={`${button.primary} text-xs py-1.5 px-3 bg-teal-600 hover:bg-teal-500 flex items-center gap-1.5`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  Respaldar en Google Drive
                </button>

                <button
                  onClick={handleBulkReleaseFromDrive}
                  className={`${button.secondary} text-xs py-1.5 px-3 border-teal-500/30 text-teal-300 hover:bg-teal-500/20 flex items-center gap-1.5`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Liberar de Google Drive
                </button>

                <button
                  onClick={handleBulkDownloadZip}
                  className={`${button.secondary} text-xs py-1.5 px-3 border-slate-700 bg-slate-800 text-slate-200 flex items-center gap-1.5`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar (.ZIP)
                </button>
              </div>
            </div>
          )}

          {/* TABLA DE CVS */}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <button onClick={handleToggleSelectAll} className="text-slate-400 hover:text-white">
                      {selectedCvIds.size > 0 && selectedCvIds.size === filteredCvs.length ? (
                        <CheckSquare className="w-4 h-4 text-teal-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">Título / Postulante</th>
                  <th className="p-3">Última Modificación</th>
                  <th className="p-3">Estado de Respaldo</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-400" />
                      Cargando lista de documentos...
                    </td>
                  </tr>
                ) : filteredCvs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No se encontraron currículums en este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredCvs.map(cv => {
                    const isSelected = selectedCvIds.has(cv.id);
                    const isProcessing = processingIds.has(cv.id);
                    const isBacked = !!cv.drive_file_id;

                    return (
                      <tr
                        key={cv.id}
                        className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-teal-500/5' : ''}`}
                      >
                        <td className="p-3 text-center">
                          <button onClick={() => handleToggleSelectOne(cv.id)} className="text-slate-400 hover:text-white">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-teal-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="p-3 font-medium text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <div>
                              <div>{cv.title || cv.candidate_name || 'Sin título'}</div>
                              {cv.candidate_name && cv.title && (
                                <div className="text-[11px] text-slate-400">{cv.candidate_name} {cv.dni ? `• DNI: ${cv.dni}` : ''}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {cv.updated_at ? new Date(cv.updated_at).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="p-3">
                          {isBacked ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              <CheckCircle2 className="w-3 h-3 text-teal-400" />
                              Google Drive Sync
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                              <Cloud className="w-3 h-3" />
                              Solo LEECV Cloud
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-right space-x-2">
                          {isBacked ? (
                            <button
                              onClick={() => handleSingleRelease(cv)}
                              disabled={isProcessing}
                              className="text-xs text-slate-400 hover:text-rose-400 p-1 rounded transition-colors"
                              title="Liberar de Google Drive (mantener en Cloud)"
                            >
                              Liberar de Drive
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSingleBackup(cv)}
                              disabled={isProcessing}
                              className="text-xs text-teal-400 hover:text-teal-300 font-medium p-1 rounded transition-colors"
                              title="Respaldar en Google Drive"
                            >
                              Respaldar
                            </button>
                          )}

                          {onNavigateToCv && (
                            <button
                              onClick={() => onNavigateToCv(cv.id)}
                              className="text-xs text-slate-300 hover:text-white p-1 rounded transition-colors underline"
                            >
                              Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* MODAL DE OFERTA DE RETENCIÓN */}
      <RetentionOfferModal
        isOpen={isRetentionModalOpen}
        onClose={() => setIsRetentionModalOpen(false)}
        userId={userProfile?.id || ''}
      />
    </div>
  );
};
