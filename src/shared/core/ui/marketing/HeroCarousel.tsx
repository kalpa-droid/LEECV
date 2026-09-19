import React, { useState, useEffect, useRef } from 'react';
import { FileText, Mail, CreditCard, BookOpen, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { radius, elevationSystem } from '../../uiDesignSystem';

export interface HeroCarouselSlide {
  id: 'cv' | 'cartas' | 'tarjetas' | 'libros';
  label: string;
  badge: string;
  title: string;
  description: string;
  image: string;
  route: string;
  ctaText: string;
  features: string[];
}

export interface HeroCarouselProps {
  onNavigate: (route: string) => void;
}

const SLIDES: HeroCarouselSlide[] = [
  {
    id: 'cv',
    label: 'Currículum Vitae',
    badge: 'Más Elegido',
    title: 'Currículum listo para enviar e imprimir',
    description: 'Elegí un diseño moderno, completá tus datos en vivo y descargá tu PDF en segundos sin marcas de agua.',
    image: '/marketing/preview-cv.webp',
    route: '/crear-cv',
    ctaText: 'Diseñar mi CV gratis',
    features: ['Lectura ATS garantizada', '100% Privado en tu navegador', 'Descarga instantánea'],
  },
  {
    id: 'cartas',
    label: 'Carta de Presentación',
    badge: 'Con Inteligencia Artificial',
    title: 'Cartas de presentación personalizadas',
    description: 'Redactá cartas formales adaptadas a cada puesto de trabajo con la ayuda de nuestra asistente de IA.',
    image: '/marketing/preview-cv.webp', // fallback seguro verified en public/marketing/
    route: '/crear-carta',
    ctaText: 'Redactar mi Carta con IA',
    features: ['Sincronizado con tu CV', 'IA de redacción profesional', 'Estilo unificado'],
  },
  {
    id: 'tarjetas',
    label: 'Tarjetas Personales',
    badge: 'Frente + Dorso',
    title: 'Tarjetas personales listas para imprimir',
    description: 'Diseñá tu tarjeta con código QR y logo. El sistema acomoda automáticamente varias tarjetas por hoja.',
    image: '/marketing/preview-tarjeta.webp',
    route: '/crear-tarjeta',
    ctaText: 'Crear mis Tarjetas',
    features: ['Varias tarjetas por hoja', 'Frente y dorso con QR', 'Listas para cortar'],
  },
  {
    id: 'libros',
    label: 'Libros y Folletos',
    badge: 'Organización Automática',
    title: 'Libros y folletos fáciles de armar',
    description: 'Convertí tus documentos en un librito o folleto. El sistema ordena las páginas para que al doblar queden perfectas.',
    image: '/marketing/preview-libro.webp',
    route: '/crear-libro',
    ctaText: 'Armar mi Libro',
    features: ['Páginas ordenadas solas', 'Márgenes de doblado seguros', 'Ideal para impresoras de casa'],
  },
];

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ onNavigate }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeSlide = SLIDES[activeIndex];

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % SLIDES.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIndex, isPaused]);

  const getSlideIcon = (id: string) => {
    switch (id) {
      case 'cartas':
        return Mail;
      case 'tarjetas':
        return CreditCard;
      case 'libros':
        return BookOpen;
      default:
        return FileText;
    }
  };

  return (
    <div
      className="w-full max-w-5xl mx-auto mt-8 flex flex-col gap-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Selector de Pestañas Superior del Carrusel */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {SLIDES.map((slide, idx) => {
          const Icon = getSlideIcon(slide.id);
          const isActive = idx === activeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] shadow-[var(--shadow-floating)] scale-105'
                  : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-panel)] hover:text-[var(--ui-text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{slide.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenedor Principal del Carrusel (Pantalla con Imagen + Overlay de Vidrio) */}
      <div className={`relative w-full rounded-[${radius.modal}] p-2 sm:p-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] shadow-[var(--shadow-overlay)] overflow-hidden group`}>
        <div className={`relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-[${radius.card}] overflow-hidden bg-[var(--ui-bg-panel)] flex items-center justify-center`}>
          {/* Imagen de Fondo con Transición Suave */}
          <img
            key={activeSlide.id}
            src={activeSlide.image}
            alt={activeSlide.title}
            loading="eager"
            className="w-full h-full object-cover object-top transition-all duration-700 ease-out transform group-hover:scale-105"
          />

          {/* Gradiente Protector de Legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ui-bg-panel)] via-[var(--ui-bg-panel)]/60 to-transparent" />

          {/* Tarjeta Glassmorphic Flotante en la Parte Inferior */}
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="text-left space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[var(--color-accent-text)] bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/30 px-2.5 py-1 rounded-full">
                <Sparkles className="w-3 h-3 text-[var(--color-accent-text)]" />
                {activeSlide.badge}
              </span>

              <h3 className="text-lg sm:text-2xl font-black text-[var(--ui-text-primary)] leading-tight">
                {activeSlide.title}
              </h3>

              <p className="text-xs sm:text-sm text-[var(--ui-text-secondary)] font-medium leading-relaxed">
                {activeSlide.description}
              </p>

              {/* Badges de Beneficios */}
              <div className="flex flex-wrap gap-2 pt-1">
                {activeSlide.features.map((feat) => (
                  <span
                    key={feat}
                    className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2.5 py-1 bg-[var(--ui-bg-panel)]/80 backdrop-blur border border-[var(--ui-border)] rounded-md text-[var(--ui-text-primary)]"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[var(--color-accent-emerald-bright)]" />
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            {/* Botón CTA Directo */}
            <button
              type="button"
              onClick={() => onNavigate(activeSlide.route)}
              className={`w-full md:w-auto px-6 py-3 rounded-[${radius.card}] bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-on-base)] font-bold text-sm shadow-[var(--shadow-floating)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0 ${elevationSystem.raised}`}
            >
              <span>{activeSlide.ctaText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Indicadores de Barras de Progreso Inferiores */}
        <div className="flex justify-center gap-1.5 mt-2 mb-1">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === activeIndex
                  ? 'w-8 bg-[var(--color-accent-base)]'
                  : 'w-2 bg-[var(--ui-border)] hover:bg-[var(--ui-text-secondary)]'
              }`}
              title={`Ir al elemento ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
