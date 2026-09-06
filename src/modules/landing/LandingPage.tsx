import React from 'react';
import { FileText, CreditCard, BookOpen, Newspaper, Sparkles, ArrowRight, ShieldCheck, Zap, Award } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white flex flex-col font-sans">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('/')}>
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 rounded-2xl text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">
              LEECV <span className="text-emerald-400 font-medium text-sm">Studio Suite</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <button onClick={() => onNavigate('/crear-cv')} className="hover:text-emerald-400 transition-colors">
              Creador de CV
            </button>
            <button onClick={() => onNavigate('/crear-tarjeta')} className="hover:text-emerald-400 transition-colors">
              Tarjetas Personales
            </button>
            <button onClick={() => onNavigate('/crear-libro')} className="hover:text-emerald-400 transition-colors">
              Libros & Folletos Imprenta
            </button>
            <button onClick={() => onNavigate('/blog')} className="hover:text-emerald-400 transition-colors">
              Blog & Recursos
            </button>
          </nav>

          <button
            onClick={() => onNavigate('/crear-cv')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer hover:scale-[1.03]"
          >
            <span>Iniciar Ahora</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 font-semibold text-xs tracking-wider uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Suite Completa de Diseño y Publicación</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight max-w-5xl mx-auto leading-[1.1]">
            Crea <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Currículums, Tarjetas y Libros</span> en Calidad Imprenta Pro
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
            Plataforma integral para crear documentos profesionales con precisión vectorial A4, tarjetas personales con QR y motor de imposición de libros para abrochar en caballete.
          </p>

          {/* Tarjetas de Producto */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 max-w-6xl mx-auto">
            {/* Producto 1: CV Builder */}
            <div
              onClick={() => onNavigate('/crear-cv')}
              className="group bg-slate-900/90 rounded-3xl p-8 border border-slate-800 hover:border-emerald-500/50 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer flex flex-col justify-between text-left hover:-translate-y-1"
            >
              <div className="space-y-6">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 w-fit group-hover:scale-110 transition-transform">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                    Creador de CV A4
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Plantillas de 1 y 2 columnas validadas para filtros ATS, tipografía optimizada, firma digital y exportación vectorial PDF.
                  </p>
                </div>
              </div>

              <div className="pt-8 flex items-center text-emerald-400 font-bold text-sm group-hover:gap-3 transition-all">
                <span>Crear mi CV gratis</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>

            {/* Producto 2: Tarjetas Personales */}
            <div
              onClick={() => onNavigate('/crear-tarjeta')}
              className="group bg-slate-900/90 rounded-3xl p-8 border border-slate-800 hover:border-teal-500/50 shadow-xl hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-300 cursor-pointer flex flex-col justify-between text-left hover:-translate-y-1"
            >
              <div className="space-y-6">
                <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-teal-400 w-fit group-hover:scale-110 transition-transform">
                  <CreditCard className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white group-hover:text-teal-400 transition-colors">
                    Tarjetas Personales & Logo
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Diseño de tarjetas de presentación con código QR inteligente, foto o logo recortado, colores dominantes y grilla de imprenta (9 por hoja).
                  </p>
                </div>
              </div>

              <div className="pt-8 flex items-center text-teal-400 font-bold text-sm group-hover:gap-3 transition-all">
                <span>Diseñar Tarjeta</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>

            {/* Producto 3: Motor de Libros y Folletos */}
            <div
              onClick={() => onNavigate('/crear-libro')}
              className="group bg-slate-900/90 rounded-3xl p-8 border border-slate-800 hover:border-cyan-500/50 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer flex flex-col justify-between text-left hover:-translate-y-1"
            >
              <div className="space-y-6">
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-400 w-fit group-hover:scale-110 transition-transform">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                    Libros & Folletos Imprenta
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Motor de imposición de pliegos A4/A3 para abrochar en caballete. Convierte PDF a hojas listas para imprimir en imprentas o fotocopiadoras.
                  </p>
                </div>
              </div>

              <div className="pt-8 flex items-center text-cyan-400 font-bold text-sm group-hover:gap-3 transition-all">
                <span>Imponer Libro PDF</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Características Destacadas */}
      <section className="py-16 bg-slate-900/50 border-y border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3 p-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Procesamiento ultra-rápido</h3>
              <p className="text-slate-400 text-sm">
                Genera PDFs vectoriales e imposiciones en segundos directamente en tu navegador sin demoras.
              </p>
            </div>

            <div className="space-y-3 p-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Privacidad 100% garantizada</h3>
              <p className="text-slate-400 text-sm">
                Tus archivos y datos personales permanecen en tu dispositivo de forma segura.
              </p>
            </div>

            <div className="space-y-3 p-6">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Calidad Gráfica Profesional</h3>
              <p className="text-slate-400 text-sm">
                Archivos optimizados para estándares exigentes de imprenta offset, digital y selección de personal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Acceso al Blog */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Newspaper className="w-4 h-4" />
              <span>Blog & Guías Educativas</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Consejos de Empleabilidad y Técnicas de Impresión
            </h2>
            <p className="text-slate-400 text-sm max-w-xl">
              Aprende cómo optimizar tu CV para pasar los filtros ATS, crear tarjetas memorables y dominar la imposición de pliegos.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/blog')}
            className="shrink-0 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl transition-all cursor-pointer hover:scale-105 shadow-xl shadow-emerald-500/20"
          >
            Explorar Artículos del Blog
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-900 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 LEECV Studio. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <a href="/privacidad" className="hover:text-slate-300 transition-colors">Privacidad</a>
            <a href="/terminos" className="hover:text-slate-300 transition-colors">Términos de servicio</a>
            <a href="mailto:soporte@leecv.app" className="hover:text-slate-300 transition-colors">Soporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
