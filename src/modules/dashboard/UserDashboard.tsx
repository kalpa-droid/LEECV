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
import { button, badge, glassmorphism, input, radius } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

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
  const t = useText();
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
    <div className="h-[100dvh] w-full overflow-y-auto bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] p-4 md:p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER DEL DASHBOARD */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-3">
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className={`${button.ghost} p-2 rounded-[${radius.control}] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]`}
                title={t.dashboard.backToAppTitle}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[var(--ui-text-primary)] tracking-tight">
                  {t.dashboard.headerTitle}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
inGracePeriod ? 'bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-base)]/40' : getPlanBadgeClass(plan)
                }`}>
                  {inGracePeriod ? 'Gracia (10d)' : getPlanLabel(plan)}
                </span>
              </div>
              <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
                {userProfile?.email || 'Usuario LEECV'} {t.dashboard.headerSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {inGracePeriod && (
              <button
                onClick={() => setIsRetentionModalOpen(true)}
                className={`${button.primary} text-xs py-2 px-3 bg-gradient-to-r from-[var(--color-status-success-bright)] to-[var(--color-status-success-base)] flex items-center gap-1.5`}
              >
                <Sparkles className="w-4 h-4" />
                {t.dashboard.retentionOfferBadge}
              </button>
            )}

            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className={`${button.secondary} text-xs py-2 px-3 border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-panel)]`}
              >
                {t.dashboard.goToEditorBtn}
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
          <div className={`p-3 rounded-[${radius.card}] text-xs font-medium border flex items-center justify-between ${
            statusMessage.type === 'success' ? 'bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/30 text-[var(--color-status-success-text)]' :
            statusMessage.type === 'error' ? 'bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/30 text-[var(--color-status-danger-text)]' :
            'bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 text-[var(--color-secondary-text)]'
          }`}>
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]">×</button>
          </div>
        )}

        {/* TARJETAS DE MEDIDORES Y ALMACENAMIENTO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* TARJETA 1: LEECV CLOUD / CRÉDITOS DISPONIBLES */}
          <div className={`rounded-[${radius.card}] p-5 border ${glassmorphism.card} bg-[var(--ui-bg-card)] border-[var(--ui-border)] space-y-3`}>
            {plan === 'enterprise' ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--ui-text-secondary)] flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-[var(--color-accent-purple-text)]" />
                    {t.dashboard.leecvCloudTitle}
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-accent-purple-text)]">
                    {PLAN_FEATURES.enterprise.cloudStorageGB} {t.dashboard.gbUnit}
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[var(--ui-text-primary)] tracking-tight">
                    {cloudUsage ? `${cloudUsage.usedGB} GB` : '…'}
                    <span className="text-sm font-medium text-[var(--ui-text-secondary)]"> / {PLAN_FEATURES.enterprise.cloudStorageGB} {t.dashboard.gbUnit}</span>
                  </div>
                  <p className="text-[11px] text-[var(--ui-text-secondary)] mt-0.5">
                    {cloudUsage ? `${cloudUsage.percentUsed}% usado — actualizado ahora` : 'Consultando uso real...'}
                  </p>
                </div>
                <div className="w-full bg-[var(--ui-bg-panel)] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[var(--color-accent-purple)] h-full rounded-full transition-all" style={{ width: `${cloudUsage?.percentUsed || 0}%` }} />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--ui-text-secondary)] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[var(--color-status-success-text)]" />
                    {t.dashboard.exportCreditsTitle}
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-status-success-text)]">
                    {credits} {t.dashboard.availableCount}
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[var(--ui-text-primary)] tracking-tight">
                    {credits} {credits === 1 ? 'Crédito' : 'Créditos'}
                  </div>
                  <p className="text-[11px] text-[var(--ui-text-secondary)] mt-0.5">
                    {credits > 0
                      ? 'Tenés créditos activos para exportar PDFs A4 o publicar tu CV sin límite de tiempo.'
                      : 'Sin créditos activos. Podés comprar un paquete o suscribirte a Pro/Enterprise.'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* TARJETA 2: GOOGLE DRIVE BACKUP */}
          <div className={`rounded-[${radius.card}] p-5 border ${glassmorphism.card} bg-[var(--ui-bg-card)] border-[var(--ui-border)] space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--ui-text-secondary)] flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-[var(--color-secondary-text)]" />
                {t.dashboard.driveBackupTitle}
              </span>
              <span className="text-xs font-semibold text-[var(--color-secondary-text)]">
                {backedCount} / {totalCount} {t.dashboard.backedUpStatus}
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[var(--ui-text-primary)] tracking-tight">
                {Math.round((backedCount / (totalCount || 1)) * 100)}%
              </div>
              <p className="text-[11px] text-[var(--ui-text-secondary)] mt-0.5">{t.dashboard.driveSyncDescription}</p>
            </div>
            <div className="w-full bg-[var(--ui-bg-panel)] rounded-full h-1.5 overflow-hidden">
              <div className="bg-[var(--color-secondary-base)] h-full rounded-full" style={{ width: `${Math.round((backedCount / (totalCount || 1)) * 100)}%` }} />
            </div>
          </div>

          {/* TARJETA 3: DESCARGA MASIVA */}
          <div className={`rounded-[${radius.card}] p-5 border ${glassmorphism.card} bg-[var(--ui-bg-card)] border-[var(--ui-border)] flex flex-col justify-between`}>
            <div>
              <span className="text-xs font-medium text-[var(--ui-text-secondary)] flex items-center gap-1.5 mb-2">
                <Download className="w-4 h-4 text-[var(--color-status-success-text)]" />
                {t.dashboard.bulkExportTitle}
              </span>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                {t.dashboard.bulkExportDescription}
              </p>
            </div>
            <button
              onClick={() => exportAllCVsToZip(cvList, userProfile?.email)}
              disabled={totalCount === 0}
              className={`${button.secondary} text-xs py-2 mt-3 w-full border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] hover:bg-[var(--ui-btn-neutral-hover)] flex items-center justify-center gap-2`}
            >
              <Download className="w-3.5 h-3.5" />
              {t.dashboard.downloadAllZipBtn}
            </button>
          </div>

        </div>

        {/* TABLA Y HERRAMIENTAS DE GESTIÓN */}
        <div className={`bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.card}] p-5 space-y-4`}>

          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* BUSCADOR */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--ui-text-secondary)]" />
              <input
                type="text"
                placeholder={t.dashboard.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${input.base} pl-9 text-xs py-2 bg-[var(--ui-bg-panel)] border-[var(--ui-border)] text-[var(--ui-text-primary)]`}
              />
            </div>

            {/* PESTAÑAS DE FILTRADO POR ESTADO */}
            <div className={`flex items-center gap-1 bg-[var(--ui-bg-panel)] p-1 rounded-[${radius.card}] border border-[var(--ui-border)] w-full sm:w-auto overflow-x-auto`}>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterMode === 'all' ? 'bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)]' : 'text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]'
                }`}
              >
                {t.dashboard.filterAll}{totalCount})
              </button>
              <button
                onClick={() => setFilterMode('unbacked')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterMode === 'unbacked' ? 'bg-[var(--ui-bg-panel)] text-[var(--color-status-warning-text)]' : 'text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]'
                }`}
              >
                {t.dashboard.filterNotBackedUp}{unbackedCount})
              </button>
              <button
                onClick={() => setFilterMode('backed')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterMode === 'backed' ? 'bg-[var(--ui-bg-panel)] text-[var(--color-secondary-text)]' : 'text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]'
                }`}
              >
                {t.dashboard.filterInDrive}{backedCount})
              </button>
            </div>
          </div>

          {/* BARRA DE ACCIONES MASIVAS (CUANDO HAY SELECCIÓN) */}
          {selectedCvIds.size > 0 && (
            <div className={`flex flex-wrap items-center justify-between gap-3 bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 p-3 rounded-[${radius.card}] text-xs animate-fade-in`}>
              <span className="font-medium text-[var(--color-secondary-text)]">
                {selectedCvIds.size} {selectedCvIds.size === 1 ? 'CV seleccionado' : 'CVs seleccionados'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkBackupToDrive}
                  className={`${button.primary} text-xs py-1.5 px-3 bg-[var(--color-secondary-base)] hover:bg-[var(--color-secondary-hover-dark)] flex items-center gap-1.5`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  {t.dashboard.bulkActionBackupDrive}
                </button>

                <button
                  onClick={handleBulkReleaseFromDrive}
                  className={`${button.secondary} text-xs py-1.5 px-3 border-[var(--color-secondary-base)]/30 text-[var(--color-secondary-text)] hover:bg-[var(--color-secondary-hover-dark)]/20 flex items-center gap-1.5`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t.dashboard.bulkActionReleaseDrive}
                </button>

                <button
                  onClick={handleBulkDownloadZip}
                  className={`${button.secondary} text-xs py-1.5 px-3 border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] flex items-center gap-1.5`}
                >
                  <Download className="w-3.5 h-3.5" />
                  {t.dashboard.bulkActionDownloadZip}
                </button>
              </div>
            </div>
          )}

          {/* TABLA DE CVS */}
          <div className={`overflow-x-auto rounded-[${radius.card}] border border-[var(--ui-border)]`}>
            <table className="w-full text-left text-xs text-[var(--ui-text-secondary)]">
              <thead className="bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] font-semibold border-b border-[var(--ui-border)] uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <button onClick={handleToggleSelectAll} className="text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]">
                      {selectedCvIds.size > 0 && selectedCvIds.size === filteredCvs.length ? (
                        <CheckSquare className="w-4 h-4 text-[var(--color-secondary-text)]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">{t.dashboard.tableColTitle}</th>
                  <th className="p-3">{t.dashboard.tableColLastMod}</th>
                  <th className="p-3">{t.dashboard.tableColBackupStatus}</th>
                  <th className="p-3 text-right">{t.dashboard.tableColActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[var(--ui-bg-panel)]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[var(--ui-text-secondary)]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--color-secondary-text)]" />
                      {t.dashboard.loadingDocs}
                    </td>
                  </tr>
                ) : filteredCvs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[var(--ui-text-secondary)]">
                      {t.dashboard.emptyFilterResults}
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
                        className={`hover:hover:bg-[var(--ui-btn-neutral-hover)] transition-colors ${isSelected ? 'bg-[var(--color-secondary-muted)]' : ''}`}
                      >
                        <td className="p-3 text-center">
                          <button onClick={() => handleToggleSelectOne(cv.id)} className="text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[var(--color-secondary-text)]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="p-3 font-medium text-[var(--ui-text-primary)]">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[var(--ui-text-secondary)] shrink-0" />
                            <div>
                              <div>{cv.title || cv.candidate_name || 'Sin título'}</div>
                              {cv.candidate_name && cv.title && (
                                <div className="text-[11px] text-[var(--ui-text-secondary)]">{cv.candidate_name} {cv.dni ? `• DNI: ${cv.dni}` : ''}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-[var(--ui-text-secondary)] font-mono text-[11px]">
                          {cv.updated_at ? new Date(cv.updated_at).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="p-3">
                          {isBacked ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] border border-[var(--color-secondary-base)]/30">
                              <CheckCircle2 className="w-3 h-3 text-[var(--color-secondary-text)]" />
                              {t.dashboard.statusDriveSync}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] border border-[var(--ui-border)]">
                              <Cloud className="w-3 h-3" />
                              {t.dashboard.statusOnlyCloud}
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-right space-x-2">
                          {isBacked ? (
                            <button
                              onClick={() => handleSingleRelease(cv)}
                              disabled={isProcessing}
                              className="text-xs text-[var(--ui-text-secondary)] hover:text-[var(--color-status-danger-text)] p-1 rounded transition-colors"
                              title={t.dashboard.releaseFromDriveTitle}
                            >
                              {t.dashboard.releaseFromDriveBtn}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSingleBackup(cv)}
                              disabled={isProcessing}
                              className="text-xs text-[var(--color-secondary-text)] hover:text-[var(--color-secondary-text)] font-medium p-1 rounded transition-colors"
                              title={t.dashboard.backupToDriveTitle}
                            >
                              {t.dashboard.backupToDriveBtn}
                            </button>
                          )}

                          {onNavigateToCv && (
                            <button
                              onClick={() => onNavigateToCv(cv.id)}
                              className="text-xs text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] p-1 rounded transition-colors underline"
                            >
                              {t.dashboard.editBtn}
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
}
