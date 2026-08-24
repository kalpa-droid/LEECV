import React, { useEffect, useState, Suspense, lazy } from 'react';
import { dal } from '../../../shared/core/storage/dataAccessLayer';
import { navigation } from '../../../shared/core/utils/navigation';
import { Spinner } from '../../../shared/core/ui/Spinner';
import { apiClient } from '../../../shared/core/utils/apiClient';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';

const CVPreview = lazy(() => import('./CVPreview'));

interface PublicCVViewProps {
  slugInput?: string;
}

export function PublicCVView({ slugInput }: PublicCVViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cvData, setCvData] = useState<any>(null);

  useEffect(() => {
    async function fetchPublicCV() {
      setLoading(true);
      await withErrorHandling(
        async () => {
          let slug = slugInput;

          if (!slug) {
            slug = navigation.getQueryParam('c') || 
                   navigation.getQueryParam('publicCv') || 
                   navigation.getQueryParam('share') || 
                   navigation.getPathname().replace('/c/', '').replace('/cv/', '');
          }

          if (!slug) {
            setError('No se especificó un código de CV válido.');
            return;
          }

          const record = await dal.publishedCvs.getBySlugOrId(slug);

          if (!record?.drive_file_id) {
            setError('El currículum solicitado no existe o no está publicado en la web.');
            return;
          }

          const driveUrl = `https://www.googleapis.com/drive/v3/files/${record.drive_file_id}?alt=media`;
          const { ok, data } = await apiClient.get(driveUrl, { requiresAuth: false });

          if (!ok || !data) {
            setError('No se pudo acceder al documento en Google Drive. Verifica que los permisos del archivo sean públicos.');
            return;
          }

          setCvData(data);
        },
        {
          context: 'Consulta de CV Público',
          errorMessage: 'Inconveniente al cargar el currículum público.'
        }
      );
      setLoading(false);
    }

    fetchPublicCV();
  }, [slugInput]);

  if (loading) {
    return (
      <div className="h-screen bg-[var(--ui-preview-bg)] flex flex-col items-center justify-center text-white p-6">
        <Spinner size="lg" />
        <p className="text-xs font-bold uppercase tracking-wider text-purple-300 mt-4 animate-pulse">
          Cargando Currículum Web Verificado…
        </p>
      </div>
    );
  }

  if (error || !cvData) {
    return (
      <div className="h-screen bg-[var(--ui-preview-bg)] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center text-3xl mb-4">
          ⚠️
        </div>
        <h2 className="text-lg font-black text-white mb-2">Currículum No Disponible</h2>
        <p className="text-xs text-slate-300 max-w-md mb-6 leading-relaxed">
          {error || 'No fue posible cargar la versión pública de este currículum.'}
        </p>
        <button
          onClick={() => { navigation.goTo('/'); }}
          className="px-5 py-2.5 bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-brand-hover)] text-white font-black text-xs rounded-xl shadow-lg transition"
        >
          🏠 Ir a la Página Principal de LEECV
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[var(--ui-preview-bg)] text-white flex flex-col font-sans overflow-hidden">
      {/* Public Header Bar */}
      <header className="bg-[var(--color-neutral-text-primary)] border-b border-purple-500/30 px-4 py-3 flex items-center justify-between z-30 shadow-lg shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">📄</span>
          <div>
            <h1 className="text-sm font-black text-white">
              {cvData?.personalInfo?.fullName || 'Currículum Vitae'}
            </h1>
            <p className="text-[10px] text-purple-300 font-bold flex items-center gap-1">
              <span>🔒 Verificado Oficial por LEECV</span>
              <span>• Solo Lectura</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => { navigation.goTo('/'); }}
          className="px-3.5 py-1.5 bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-brand-hover)] text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md"
        >
          ✏️ Crear mi propio CV
        </button>
      </header>

      {/* Public Viewer */}
      <main className="flex-1 bg-[var(--ui-preview-bg)] overflow-y-auto p-4 flex justify-center items-start relative">
        <Suspense fallback={<Spinner />}>
          <CVPreview cvData={cvData} activeTab="personales" zoomLevel={0.85} />
        </Suspense>
      </main>
    </div>
  );
}
