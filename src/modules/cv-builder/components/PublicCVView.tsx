import React, { useEffect, useState, Suspense, lazy } from 'react';
import { supabase } from '../../../shared/core/lib/supabaseClient';
import { Spinner } from '../../../shared/core/ui/Spinner';

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
      try {
        setLoading(true);
        let slug = slugInput;

        if (!slug && typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          slug = params.get('c') || params.get('publicCv') || params.get('share') || window.location.pathname.replace('/c/', '').replace('/cv/', '');
        }

        if (!slug) {
          setError('No se proporcionó un identificador de CV válido.');
          setLoading(false);
          return;
        }

        if (!supabase) {
          setError('Sistema de base de datos no configurado.');
          setLoading(false);
          return;
        }

        // 1. Consultar puntero en Supabase
        const { data: record, error: dbErr } = await supabase
          .from('published_cvs')
          .select('drive_file_id, cv_id')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (dbErr || !record?.drive_file_id) {
          setError('El currículum solicitado no existe o no está publicado en la web.');
          setLoading(false);
          return;
        }

        // 2. Descargar JSON directamente del Google Drive del usuario (lectura pública)
        const driveUrl = `https://www.googleapis.com/drive/v3/files/${record.drive_file_id}?alt=media`;
        const res = await fetch(driveUrl);

        if (!res.ok) {
          setError('No se pudo acceder al documento en Google Drive. Verifica que los permisos del archivo sean públicos.');
          setLoading(false);
          return;
        }

        const data = await res.json();
        setCvData(data);
      } catch (err: any) {
        console.error('Error cargando CV público:', err);
        setError('Inconveniente al cargar el currículum público.');
      } finally {
        setLoading(false);
      }
    }

    fetchPublicCV();
  }, [slugInput]);

  if (loading) {
    return (
      <div className="h-screen bg-[#1F1322] flex flex-col items-center justify-center text-white p-6">
        <Spinner size="lg" />
        <p className="text-xs font-bold uppercase tracking-wider text-purple-300 mt-4 animate-pulse">
          Cargando Currículum Web Verificado…
        </p>
      </div>
    );
  }

  if (error || !cvData) {
    return (
      <div className="h-screen bg-[#1F1322] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center text-3xl mb-4">
          ⚠️
        </div>
        <h2 className="text-lg font-black text-white mb-2">Currículum No Disponible</h2>
        <p className="text-xs text-slate-300 max-w-md mb-6 leading-relaxed">
          {error || 'No fue posible cargar la versión pública de este currículum.'}
        </p>
        <button
          onClick={() => { window.location.href = '/'; }}
          className="px-5 py-2.5 bg-[var(--color-accent-base)] hover:bg-[#E31555] text-white font-black text-xs rounded-xl shadow-lg transition"
        >
          🏠 Ir a la Página Principal de LEECV
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1F1322] text-white flex flex-col font-sans overflow-hidden">
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
          onClick={() => { window.location.href = '/'; }}
          className="px-3.5 py-1.5 bg-[var(--color-accent-base)] hover:bg-[#E31555] text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md"
        >
          ✏️ Crear mi propio CV
        </button>
      </header>

      {/* Public Viewer */}
      <main className="flex-1 bg-[#1F1322] overflow-y-auto p-4 flex justify-center items-start relative">
        <Suspense fallback={<Spinner />}>
          <CVPreview cvData={cvData} activeTab="personales" zoomLevel={0.85} />
        </Suspense>
      </main>
    </div>
  );
}
