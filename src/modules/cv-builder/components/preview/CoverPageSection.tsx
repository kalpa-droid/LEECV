import React from 'react';
import { User } from 'lucide-react';
import { PAGE_SIZES, PageSize } from '../../../../shared/core/pdf-engine/pageSizes';

export interface CoverPageSectionProps {
  cvData: any;
  theme?: any;
  paperSizeId?: string;
  totalHojasLabel?: string;
}

export function CoverPageSection({
  cvData,
  theme = {},
  paperSizeId = 'a4',
  totalHojasLabel = '1 HOJA'
}: CoverPageSectionProps) {
  const personalInfo = cvData?.personalInfo || {};
  const roles = cvData?.roles || [];
  const currentPaper: PageSize = (PAGE_SIZES as any)[paperSizeId] || PAGE_SIZES.a4;
  const coverPreset = cvData?.coverPreset || 'monica-classic';

  const primaryColor = theme?.primaryColor || '#ab5ba1';
  const secondaryColor = theme?.secondaryColor || '#888888';
  const accentColor = theme?.accentColor || '#40a08e';

  return (
    <div 
      className={`a4-page-container rounded-sm transition-all relative overflow-hidden ${
        coverPreset === 'modern-corporate'
          ? 'bg-slate-900 text-white'
          : coverPreset === 'minimal-editorial'
          ? 'bg-white text-slate-900 border-8 border-slate-900'
          : coverPreset === 'creative-cardon'
          ? 'bg-gradient-to-br from-[#00A8A0] via-[#005f5a] to-[#2B1B2E] text-white border-4 border-[#FFC93C]'
          : 'bg-[#ab5ba1]'
      }`}
      style={{ 
        width: `${currentPaper.widthMm}mm`,
        height: `${currentPaper.heightMm}mm`,
        backgroundColor: (coverPreset === 'monica-classic' || !coverPreset) ? primaryColor : undefined 
      }}
    >
      <div className="perspective-corridor-cv">
        {/* Profile Photo */}
        <div 
          className={`mt-10 w-44 h-56 flex flex-col items-center justify-center text-center p-2 shadow-2xl overflow-hidden transition-all duration-300 ${
            coverPreset === 'modern-corporate'
              ? 'rounded-none border-4 border-amber-400 shadow-amber-400/20'
              : coverPreset === 'minimal-editorial'
              ? 'rounded-full w-48 h-48 border-2 border-slate-900 shadow-none'
              : coverPreset === 'creative-cardon'
              ? 'rounded-3xl border-4 border-[#FFC93C] ring-4 ring-[#FF2E63] shadow-2xl'
              : 'rounded-2xl border-4'
          }`}
          style={{ 
            borderColor: (coverPreset === 'monica-classic' || !coverPreset) ? accentColor : undefined, 
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
          }}
        >
          {personalInfo.profilePhoto ? (
            <img src={personalInfo.profilePhoto} alt="Perfil" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <div className="flex flex-col items-center text-white">
              <User className="w-12 h-12 mb-2 stroke-[1.5]" style={{ stroke: accentColor }} />
              <span className="text-[11px] font-bold tracking-wider">[Foto de Perfil]</span>
            </div>
          )}
        </div>

        {/* Header Title */}
        <div className="mt-5 text-center space-y-1">
          <span className={`px-3 py-1 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest ${
            coverPreset === 'creative-cardon'
              ? 'bg-[#FF2E63] text-white border border-[#FFC93C]'
              : 'bg-white/20'
          }`}>
            PORTAFOLIO PROFESIONAL
          </span>
          <h1 
            className="text-4xl font-black tracking-wider uppercase drop-shadow-md text-center"
            style={{ fontFamily: theme.fontFamily || 'inherit' }}
          >
            Curriculum Vitae
          </h1>
        </div>

        {/* Candidate Name & Featured Roles */}
        <div className="mt-6 w-5/6 text-center flex flex-col items-center flex-grow">
          <h2 
            className="text-2xl font-black italic mb-4 tracking-wide border-b-2 pb-2 border-current"
            style={{ 
              color: coverPreset === 'minimal-editorial' ? '#0f172a' : coverPreset === 'creative-cardon' ? '#FFC93C' : '#ffffff', 
              fontFamily: theme.fontFamily || 'Georgia, serif' 
            }}
          >
            {personalInfo.fullName}
          </h2>

          {/* Featured Roles Badges */}
          <div className="flex flex-wrap justify-center gap-1.5 max-w-lg">
            {(() => {
              const featEdu = (cvData?.education || []).find((e: any, idx: number) => String(e.id || idx) === String(cvData?.coverFeaturedEducationId));
              const featProf = (cvData?.professions || []).find((p: any, idx: number) => String(p.id || idx) === String(cvData?.coverFeaturedProfessionId));

              const featuredBadges: string[] = [];
              if (featEdu) featuredBadges.push(featEdu.degree);
              if (featProf) featuredBadges.push(featProf.degree);

              const defaultRoles = featuredBadges.length > 0 ? featuredBadges : roles;

              return defaultRoles.map((role: string, idx: number) => (
                <span 
                  key={idx}
                  className={`px-3 py-1 text-[11px] font-extrabold shadow-sm border ${
                    coverPreset === 'modern-corporate'
                      ? 'bg-amber-400 text-slate-950 rounded-none border-amber-300'
                      : coverPreset === 'minimal-editorial'
                      ? 'bg-slate-100 text-slate-900 rounded-md border-slate-300'
                      : coverPreset === 'creative-cardon'
                      ? 'bg-[#FF2E63] text-white rounded-xl border-[#FFC93C] shadow-md font-black'
                      : 'bg-slate-800/90 text-white rounded-lg border-slate-700/60'
                  }`}
                >
                  {role}
                </span>
              ));
            })()}
          </div>

          {/* Profile Quote */}
          {personalInfo.quote && (
            <p className="mt-6 text-xs font-bold italic text-slate-800 max-w-md bg-white/60 p-3 rounded-xl backdrop-blur leading-relaxed shadow-sm">
              {personalInfo.quote}
            </p>
          )}
        </div>

        {/* Bottom Identification Summary Badge */}
        <div className={`absolute bottom-8 w-5/6 backdrop-blur text-white px-6 py-3 rounded-2xl flex items-center justify-between text-xs font-bold shadow-2xl border ${
          coverPreset === 'creative-cardon'
            ? 'bg-[#FF2E63]/90 border-[#FFC93C]'
            : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div>
            <p className="text-[10px] text-purple-300 font-extrabold uppercase">DNI: {personalInfo.dni} | CUIT: {personalInfo.cuit}</p>
            <p className="text-white text-[11px] font-extrabold">{personalInfo.cityProvince}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-purple-300 font-bold block">{personalInfo.initials} | AÑO {personalInfo.year || '2026'}</span>
            <span className="text-[11px] text-teal-300 font-extrabold">DOCUMENTO OFICIAL - {totalHojasLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
