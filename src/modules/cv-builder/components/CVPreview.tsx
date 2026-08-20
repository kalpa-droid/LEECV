import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  GraduationCap, 
  Briefcase, 
  FileText, 
  BookOpen, 
  Laptop, 
  Leaf, 
  Award, 
  Phone, 
  Mail, 
  MapPin, 
  Globe,
  RotateCw,
  Calendar,
  Building2,
  Clock,
  ZoomIn,
  ZoomOut,
  Smartphone,
  Maximize2
} from 'lucide-react';

import { PAGE_SIZES, calculateItemsPerPage, getDynamicHeightChunks } from '../../../shared/core/pdf-engine/pageSizes';
import { getColumnVariant } from '../../../shared/core/pdf-engine/columnVariants';
import { getSidebarPageChunks } from '../../../shared/core/pdf-engine/sidebarPagination';
import { CoverPageSection } from './preview/CoverPageSection';
import { ExtraPage } from './preview/ExtraPage';
import { ScannedCertificatesPages } from './preview/ScannedCertificatesPages';

export default function CVPreview({ cvData, setCvData, activeTab, zoomLevel = 0.85 }: { cvData?: any; setCvData?: any; activeTab?: string; zoomLevel?: number }) {
  const { 
    personalInfo = {}, 
    roles = [], 
    education = [], 
    profession = [], 
    experience = [],
    informatics = [], 
    ecology = {},
    coursesAndCertificates = [], 
    certificatesScanned = [], 
    signature = {}, 
    theme = {},
    certificateDisplay = { certsPerPage: 1 }
  } = cvData || {};

  const layoutStyle = cvData?.layout?.layoutStyle || cvData?.layoutStyle || 'executive-sidebar';

  const paperSizeId = cvData?.layout?.paperSize || 'a4';
  const currentPaper = PAGE_SIZES[paperSizeId] || PAGE_SIZES.a4;

  // Auto-scroll to active section when tab changes
  React.useEffect(() => {
    if (!activeTab) return;
    const tabToIdMap: Record<string, string> = {
      personales: 'cv-section-personales',
      formacion: 'cv-section-formacion',
      profesion: 'cv-section-profesion',
      experiencia: 'cv-section-experiencia',
      cursos: 'cv-section-cursos',
      informatica: 'cv-section-informatica',
      ecologia: 'cv-section-ecologia',
      certificados: 'cv-section-certificados',
      firma: 'cv-section-firma',
      diseno: 'cv-section-personales'
    };

    const targetId = tabToIdMap[activeTab];
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeTab]);

  // Helper to extract 4-digit year and sort items descending (2025 -> 2024 -> 2023...)
  const sortByYearDesc = (items: any[]) => {
    if (!Array.isArray(items)) return [];
    return [...items].sort((a, b) => {
      const yearA = parseInt((a.year || '').toString().match(/\d{4}/)?.[0] || '0', 10);
      const yearB = parseInt((b.year || '').toString().match(/\d{4}/)?.[0] || '0', 10);
      return yearB - yearA;
    });
  };

  const sortedCourses = sortByYearDesc(coursesAndCertificates);
  const sortedExperience = sortByYearDesc(experience);
  const sortedProfession = sortByYearDesc(profession);

  // Dynamic pagination math calculated from real paper size height (A4, Carta, Oficio, Legal) & text length
  const FIRST_PAGE_PROF_LIMIT = calculateItemsPerPage(paperSizeId, 45, 110);
  const firstPageProfessions = sortedProfession.slice(0, FIRST_PAGE_PROF_LIMIT);
  const extraProfessions = sortedProfession.slice(FIRST_PAGE_PROF_LIMIT);

  const extraProfChunks = getDynamicHeightChunks(extraProfessions, paperSizeId, 'prof', 65, 2);
  const totalExtraProfPages = extraProfChunks.length;

  const expChunks = getDynamicHeightChunks(sortedExperience, paperSizeId, 'exp', 75, 2);
  const totalExpPages = Math.max(1, expChunks.length);

  const courseChunks = getDynamicHeightChunks(sortedCourses, paperSizeId, 'course', 75, 2);
  const totalCoursePages = Math.max(1, courseChunks.length);

  const secondarySections = [...new Set(cvData?.layout?.sectionOrders?.secundaria || ["personales", "informatica", "ecologia"])] as string[];
  const sidebarPageChunks = getSidebarPageChunks(secondarySections, cvData, paperSizeId, 70);
  const firstPageSidebarSections = sidebarPageChunks[0] || secondarySections;
  const extraSidebarChunks = sidebarPageChunks.slice(1);
  const totalSidebarPages = sidebarPageChunks.length;

  // Dynamic Sidebar Style based on layoutStyle
  const sidebarBgStyle = layoutStyle === 'minimal-editorial'
    ? { backgroundColor: '#f8fafc', color: '#1e293b', borderRight: '1px solid #e2e8f0' }
    : layoutStyle === 'modern-corporate'
    ? { backgroundColor: '#0f172a', color: '#ffffff' }
    : { backgroundColor: theme.primaryColor || '#ab5ba1', color: '#ffffff' };

  const sidebarHeaderBgStyle = layoutStyle === 'minimal-editorial'
    ? { backgroundColor: '#e2e8f0', color: '#0f172a' }
    : layoutStyle === 'modern-corporate'
    ? { backgroundColor: '#1e293b', color: '#ffffff' }
    : { backgroundColor: theme.secondaryColor || '#888888', color: '#ffffff' };

  // Section Header Renderer
  const renderSectionHeader = (icon, title) => {
    if (layoutStyle === 'modern-corporate') {
      return (
        <div className="border-b-2 font-black text-xs uppercase py-2 flex items-center gap-2 mb-3 tracking-wide" style={{ borderBottomColor: theme.primaryColor, color: theme.primaryColor }}>
          {icon}
          <span>{title}</span>
        </div>
      );
    }
    if (layoutStyle === 'minimal-editorial') {
      return (
        <div className="border-b border-slate-400 font-bold text-xs uppercase tracking-widest py-1.5 flex items-center gap-2 mb-3 text-slate-800" style={{ fontFamily: 'Georgia, serif' }}>
          {icon}
          <span>{title}</span>
        </div>
      );
    }
    // Default executive-sidebar
    return (
      <div className="text-white font-black text-xs uppercase px-4 py-2 flex items-center gap-2 -ml-6 pl-6 mb-2.5 shadow-sm rounded-r-lg" style={{ backgroundColor: theme.primaryColor }}>
        {icon}
        <span>{title}</span>
      </div>
    );
  };

  // Rotate individual certificate (0° -> 90° -> 180° -> 270° -> 0°)
  const handleRotateCert = (certId) => {
    if (!setCvData) return;
    setCvData((prev) => ({
      ...prev,
      certificatesScanned: prev.certificatesScanned.map((c) => {
        if (c.id === certId) {
          const nextRot = ((c.rotation || 0) + 90) % 360;
          return { ...c, rotation: nextRot };
        }
        return c;
      })
    }));
  };



  // Section Visibility & Column Assignment Helpers
  const isVis = (key) => cvData?.sectionVisibility?.[key] !== false;

  const getSectionColumn = (sectionKey) => {
    const directSetting = cvData?.layout?.columnAssignments?.[sectionKey];
    if (typeof directSetting === 'string') {
      return directSetting;
    }
    const leftList = cvData?.layout?.columnAssignments?.left || ["personales", "formacion", "cursos", "informatica"];
    const rightList = cvData?.layout?.columnAssignments?.right || ["profesion", "experiencia", "ecologia", "certificados", "firma"];

    const inLeft = leftList.includes(sectionKey);
    const inRight = rightList.includes(sectionKey);

    if (inLeft && inRight) return 'ambas';
    if (inLeft) return 'secundaria';
    return 'primaria';
  };

  const showInSecundaria = (secKey) => {
    const col = getSectionColumn(secKey);
    return (col === 'secundaria' || col === 'ambas') && isVis(secKey);
  };

  const showInPrimaria = (secKey) => {
    const col = getSectionColumn(secKey);
    return (col === 'primaria' || col === 'ambas') && isVis(secKey);
  };

  const renderDynamicSection = (secId: string, location: 'primaria' | 'secundaria' | 'ambas') => {
    if (location === 'secundaria' && !showInSecundaria(secId)) return null;
    if (location === 'primaria' && !showInPrimaria(secId)) return null;

    const variant = getColumnVariant(location === 'ambas' ? 'both' : location === 'secundaria' ? 'secondary' : 'primary');

    switch (secId) {
      case 'contacto':
        return (
          <div key={`sec-${location}-contacto`} id="cv-section-contacto" className="section-box-print mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5 border-b border-current pb-1 flex items-center gap-1.5 opacity-90">
              <Phone className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> CONTACTO & REDES
            </h3>
            <ul className="space-y-2 text-[11px] font-bold leading-tight">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}>
                  <Phone className="w-3 h-3" />
                </span>
                <span>{personalInfo.phone}</span>
              </li>
              <li className="flex items-center gap-2 break-all">
                <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}>
                  <Mail className="w-3 h-3" />
                </span>
                <span>{personalInfo.email}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}>
                  <Globe className="w-3 h-3" />
                </span>
                <span>{personalInfo.facebook}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}>
                  <MapPin className="w-3 h-3" />
                </span>
                <span>{personalInfo.address}</span>
              </li>
            </ul>
          </div>
        );

      case 'competencias':
        return (
          <div key={`sec-${location}-competencias`} id="cv-section-competencias" className="section-box-print mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2 border-b border-current pb-1 flex items-center gap-1.5 opacity-90">
              <Award className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> COMPETENCIAS CLAVE
            </h3>
            <div className="flex flex-wrap gap-1 text-[9px] font-bold">
              <span className="px-2 py-0.5 bg-black/10 rounded">Pedagogía Dialógica</span>
              <span className="px-2 py-0.5 bg-black/10 rounded">Comunidades de Aprendizaje</span>
              <span className="px-2 py-0.5 bg-black/10 rounded">Alfabetización Digital</span>
              <span className="px-2 py-0.5 bg-black/10 rounded">Educación Inclusiva</span>
              <span className="px-2 py-0.5 bg-black/10 rounded">Gestión Institucional</span>
            </div>
          </div>
        );

      case 'personales':
        return (
          <div key={`sec-${location}-personales`} id={location === 'primaria' ? "cv-section-personales" : "cv-section-personales-side"} className="section-box-print space-y-1.5 mb-3">
            {renderSectionHeader(<User className="w-4 h-4" />, "DATOS PERSONALES")}
            <div className={`grid ${location === 'secundaria' ? 'grid-cols-1 gap-1 text-[10px]' : 'grid-cols-3 gap-y-1.5 text-[11px]'} font-medium bg-slate-50/90 p-3 rounded-xl border border-slate-200/80`}>
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span className="font-bold uppercase pr-1" style={{ color: theme.accentColor }}>DNI:</span>
                <span className="text-slate-900 font-extrabold">{personalInfo.dni}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span className="font-bold uppercase pr-1" style={{ color: theme.accentColor }}>CUIT:</span>
                <span className="text-slate-900 font-extrabold">{personalInfo.cuit}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span className="font-bold uppercase pr-1" style={{ color: theme.accentColor }}>FECHA NAC.:</span>
                <span className="text-slate-900 font-extrabold">{personalInfo.birthDate}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span className="font-bold uppercase pr-1" style={{ color: theme.accentColor }}>DOMICILIO:</span>
                <span className="text-slate-900 font-extrabold">{personalInfo.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold uppercase pr-1" style={{ color: theme.accentColor }}>CIUDAD:</span>
                <span className="text-slate-900 font-extrabold">{personalInfo.cityProvince}</span>
              </div>
            </div>
          </div>
        );

      case 'formacion':
        if (!education || education.length === 0) return null;
        return (
          <div key={`sec-${location}-formacion`} id="cv-section-formacion" className={`section-box-print ${variant.containerClass} mb-3`}>
            {renderSectionHeader(<GraduationCap className="w-4 h-4" />, "FORMACIÓN ACADÉMICA")}
            <div className={variant.gridClass}>
              {education.map((edu, i) => (
                <div key={i} className={`${variant.itemPaddingClass} border-l-4`} style={{ borderLeftColor: theme.accentColor }}>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black text-white whitespace-nowrap shadow-sm" style={{ backgroundColor: theme.primaryColor }}>
                      {edu.level}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black whitespace-nowrap" style={{ backgroundColor: 'rgba(64,160,142,0.12)', color: theme.accentColor }}>
                      AÑO {edu.year}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 mt-1">{edu.degree}</h4>
                  <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" /> {edu.institution}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'profesion':
        if (!firstPageProfessions || firstPageProfessions.length === 0) return null;
        return (
          <div key={`sec-${location}-profesion`} id="cv-section-profesion" className={`section-box-print ${variant.containerClass} mb-3`}>
            {renderSectionHeader(<Briefcase className="w-4 h-4" />, `TÍTULOS PROFESIONALES (${sortedProfession.length})`)}
            <div className={variant.gridClass}>
              {firstPageProfessions.map((prof, i) => (
                <div key={i} className={`${variant.itemPaddingClass} border-l-4`} style={{ borderLeftColor: theme.primaryColor }}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 leading-tight">{prof.degree}</h4>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black text-white whitespace-nowrap ml-2 flex-shrink-0" style={{ backgroundColor: theme.primaryColor }}>
                      AÑO {prof.year}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold" style={{ color: theme.accentColor }}>{prof.institution}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'cursos':
        {
          const listCourses = sortedCourses && sortedCourses.length > 0 ? sortedCourses : (coursesAndCertificates || []);
          if (!listCourses || listCourses.length === 0) return null;
          return (
            <div key={`sec-${location}-cursos`} id="cv-section-cursos" className={`section-box-print ${variant.containerClass} mb-3`}>
              {renderSectionHeader(<BookOpen className="w-4 h-4" />, "CURSOS & CAPACITACIONES")}
              <div className={variant.gridClass}>
                {listCourses.map((item, i) => (
                  <div key={i} className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{item.title || item.name || item.course}</p>
                      <p className="text-slate-500 text-[9px] font-semibold">{item.institution}</p>
                    </div>
                    {item.hours && (
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-extrabold text-[9px]">
                        {item.hours}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }

      case 'informatica':
        if (!informatics || informatics.length === 0) return null;
        return (
          <div key={`sec-${location}-informatica`} id="cv-section-informatica" className={`section-box-print ${variant.containerClass} mb-3`}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2 border-b border-current pb-1 flex items-center gap-1.5 opacity-90">
              <Laptop className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> INFORMÁTICA & TICs
            </h3>
            <div className={variant.gridClass}>
              {informatics.map((item, i) => (
                <div key={i} className="border-l-2 border-current pl-2">
                  <p className="font-bold">{item.institution}</p>
                  <p className="font-semibold" style={{ color: theme.accentColor }}>{item.course}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'experiencia':
        {
          const listExp = sortedExperience || [];
          if (!listExp || listExp.length === 0) return null;
          return (
            <div key={`sec-${location}-experiencia`} id="cv-section-experiencia" className={`section-box-print ${variant.containerClass} mb-3`}>
              {renderSectionHeader(<Briefcase className="w-4 h-4" />, "EXPERIENCIA LABORAL")}
              <div className={variant.gridClass}>
                {listExp.map((exp, i) => (
                  <div key={i} className={`${variant.itemPaddingClass} border-l-4`} style={{ borderLeftColor: theme.primaryColor }}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900">{exp.role}</h4>
                      {exp.year && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black text-white whitespace-nowrap" style={{ backgroundColor: theme.primaryColor }}>
                          {exp.year}
                        </span>
                      )}
                    </div>
                    {exp.institution && (
                      <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" /> {exp.institution}
                      </p>
                    )}
                    {exp.details && (
                      <p className="text-[10px] text-slate-500 font-medium leading-snug">{exp.details}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }

      case 'ecologia':
        {
          const ruralItems = ecology?.rural || [];
          const envItems = ecology?.environmental || [];
          const communityItems = ecology?.community || [];
          const workshopItems = ecology?.workshops || [];
          const initItems = ecology?.initiatives || [];
          const otherItems = Array.isArray(ecology) ? ecology : [];
          const allEcology = [...ruralItems, ...envItems, ...communityItems, ...workshopItems, ...initItems, ...otherItems];

          if (allEcology.length === 0) return null;

          return (
            <div key={`sec-${location}-ecologia`} id="cv-section-ecologia" className={`section-box-print ${variant.containerClass} mb-3`}>
              {renderSectionHeader(<Leaf className="w-4 h-4" />, "PROYECTOS & COMUNIDAD")}
              <div className={variant.gridClass}>
                {allEcology.map((proj, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 p-2 rounded-xl border-l-2" style={{ borderLeftColor: theme.accentColor }}>
                    <p className="font-bold text-slate-900">{proj.title || proj.name || proj.course}</p>
                    {proj.institution && (
                      <p className="text-slate-500 text-[9px] font-semibold">{proj.institution}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }

      case 'firma':
        return (
          <div key={`sec-${location}-firma`} id="cv-section-firma" className="mt-3 pt-2 border-t border-slate-300 flex flex-col items-end section-box-print">
            <div className="w-56 text-center space-y-0.5">
              {signature?.dataUrl ? (
                <img src={signature.dataUrl} alt="Firma Digital" className="h-12 mx-auto object-contain mb-0.5" />
              ) : (
                <div className="h-9 border-b border-dashed border-slate-400 mb-0.5 flex items-center justify-center text-[10px] text-slate-400 font-medium italic">
                  [ Espacio para Firma Digital ]
                </div>
              )}
              <p className="text-xs font-black text-slate-800">
                {signature?.signerName || personalInfo.fullName || `${personalInfo.surname || ''} ${personalInfo.givenNames || ''}`.trim() || ''}
              </p>
              <p className="text-[10px] text-slate-500 font-semibold">
                {signature?.signerRole || roles?.[0] || sortedProfession?.[0]?.degree || ''}
              </p>
              <p className="text-[10px] text-slate-400">
                {signature?.date || (personalInfo.cityProvince ? `${personalInfo.cityProvince.split(',')[0]}, ${personalInfo.year || '2025'}` : '')}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Chunk certificates: ALWAYS 1 per A4 page
  const certPages = isVis('certificados') ? certificatesScanned.map(cert => [cert]) : [];

  // Dynamic Theme Styling
  const dynamicThemeStyle = {
    fontFamily: theme.fontFamily || 'Arial, sans-serif'
  };

  const showCover = (cvData?.showCoverPage ?? cvData?.layout?.showCoverPage) !== false;
  const startBodyPageNum = showCover ? 2 : 1;
  const totalPagesCalculated = (showCover ? 1 : 0) + 1 + (extraProfChunks?.length || 0) + (expChunks?.length > 1 ? expChunks.length - 1 : 0) + (courseChunks?.length > 1 ? courseChunks.length - 1 : 0) + certPages.length;
  const totalHojasLabel = totalPagesCalculated === 1 ? '1 HOJA' : `${totalPagesCalculated} HOJAS`;

  return (
    <div 
      className="w-full min-h-full flex flex-col items-center print-wrapper relative"
      style={dynamicThemeStyle}
    >
      {/* Pages Container with Responsive Scaling */}
      <div 
        className="w-full flex flex-col items-center gap-6 transition-transform duration-300 origin-top"
        style={{ 
          transform: `scale(${zoomLevel})`,
          marginBottom: zoomLevel < 1 ? `-${(1 - zoomLevel) * 65}%` : '0'
        }}
      >
      {/* Dynamic CSS Variables & Styles */}
      <style>{`
        :root {
          --primary-color: ${theme.primaryColor || '#ab5ba1'};
          --secondary-color: ${theme.secondaryColor || '#888888'};
          --accent-color: ${theme.accentColor || '#40a08e'};
          --text-color: ${theme.textColor || '#333333'};
          --bg-corridor: ${theme.bgCorridor || '#aa57a4'};
        }

        .a4-page-container {
          width: ${currentPaper.widthMm}mm;
          min-height: ${currentPaper.heightMm}mm;
          height: ${currentPaper.heightMm}mm;
          background: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          page-break-after: always;
          break-after: page;
          margin-bottom: 2rem;
        }

        .perspective-corridor-cv {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, var(--bg-corridor, ${theme.bgCorridor || theme.primaryColor || '#ab5ba1'}) 0%, rgba(255, 255, 255, 0.8) 35%, #ffffff 55%, #ffffff 100%);
          clip-path: polygon(18% 0, 82% 0, 100% 100%, 0% 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        @media print {
          @page {
            size: ${currentPaper.widthMm}mm ${currentPaper.heightMm}mm;
            margin: 0 !important;
          }

          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .print-wrapper {
            padding: 0 !important;
            background: white !important;
          }

          .a4-page-container {
            box-shadow: none !important;
            margin: 0 !important;
            width: ${currentPaper.widthMm}mm !important;
            height: ${currentPaper.heightMm}mm !important;
            page-break-after: always !important;
            break-after: page !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .section-box-print {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* PAGE 1: PORTADA EDITORIAL DE ALTO IMPACTO (SI ESTÁ ACTIVADA) */}
      {/* ========================================================================= */}
      {showCover && (
        <CoverPageSection
          cvData={cvData}
          theme={theme}
          paperSizeId={paperSizeId}
          totalHojasLabel={totalHojasLabel}
        />
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: DATOS PERSONALES, FORMACIÓN Y PROFESIÓN */}
      {/* ========================================================================= */}
      <div className="a4-page-container grid grid-cols-3">
        {/* Left Sidebar */}
        <div className="col-span-1 flex flex-col relative" style={sidebarBgStyle}>
          <div className="p-4 flex justify-center" style={sidebarHeaderBgStyle}>
            <div 
              className="w-32 h-40 border-4 flex flex-col items-center justify-center text-center p-1 overflow-hidden shadow-md transition-all duration-300 rounded-lg" 
              style={{ 
                borderColor: theme.accentColor || '#40a08e',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                boxShadow: `0 0 12px ${theme.accentColor || '#40a08e'}40`
              }}
            >
              {personalInfo.profilePhoto ? (
                <img src={personalInfo.profilePhoto} alt="Perfil" className="w-full h-full object-cover rounded" />
              ) : (
                <User className="w-10 h-10 text-white/90" />
              )}
            </div>
          </div>

          <div className="p-4 space-y-5 flex-1 relative">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5 border-b border-current pb-1 flex items-center gap-1.5 opacity-90">
                <Phone className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> CONTACTO & REDES
              </h3>
              <ul className="space-y-2 text-[11px] font-bold leading-tight">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}>
                    <Phone className="w-3 h-3" />
                  </span>
                  <span>{personalInfo.phone}</span>
                </li>
                <li className="flex items-center gap-2 break-all">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}>
                    <Mail className="w-3 h-3" />
                  </span>
                  <span>{personalInfo.email}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}>
                    <Globe className="w-3 h-3" />
                  </span>
                  <span>{personalInfo.facebook}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}>
                    <MapPin className="w-3 h-3" />
                  </span>
                  <span>{personalInfo.address}</span>
                </li>
              </ul>
            </div>

            {/* Dynamic Left Column (Secundaria) Section Rendering */}
            {firstPageSidebarSections.map((secId: string) => 
              renderDynamicSection(secId, 'secundaria')
            )}

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2 border-b border-current pb-1 flex items-center gap-1.5 opacity-90">
                <Award className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> COMPETENCIAS CLAVE
              </h3>
              <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                <span className="px-2 py-0.5 bg-black/10 rounded">Pedagogía Dialógica</span>
                <span className="px-2 py-0.5 bg-black/10 rounded">Comunidades de Aprendizaje</span>
                <span className="px-2 py-0.5 bg-black/10 rounded">Alfabetización Digital</span>
                <span className="px-2 py-0.5 bg-black/10 rounded">Educación Inclusiva</span>
                <span className="px-2 py-0.5 bg-black/10 rounded">Gestión Institucional</span>
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-bold text-xs">
              <span>{personalInfo.initials}</span>
              <span className="text-2xl font-black">{startBodyPageNum}</span>
            </div>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="col-span-2 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {personalInfo.surname} <span className="text-xl font-bold capitalize" style={{ color: theme.primaryColor }}>{personalInfo.givenNames}</span>
              </h1>
            </div>

            {personalInfo.quote && (
              <p className="text-[11px] font-bold italic text-slate-700 text-center leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200 border-l-4" style={{ borderLeftColor: theme.primaryColor }}>
                {personalInfo.quote}
              </p>
            )}

            {/* Dynamic Right Column (Primaria) Section Rendering */}
            {([...new Set(cvData?.layout?.sectionOrders?.primaria || ["personales", "formacion", "profesion", "experiencia", "cursos", "ecologia"])] as string[]).map((secId: string) => 
              renderDynamicSection(secId, 'primaria')
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGES TO N: PROFESIÓN & TITULACIONES ADICIONALES (REBALANCEO DINÁMICO A4) */}
      {/* ========================================================================= */}
      {extraProfChunks.map((extraProfGroup, extraPageIdx) => {
        const pageNum = startBodyPageNum + 1 + extraPageIdx;

        return (
          <div key={`extra-prof-${pageNum}`} className="a4-page-container grid grid-cols-3">
            {/* Left Sidebar */}
            <div className="col-span-1 flex flex-col relative" style={sidebarBgStyle}>
              <div className="p-5 text-center border-b border-current opacity-90" style={sidebarHeaderBgStyle}>
                <span className="text-2xl font-black tracking-widest">{personalInfo.initials}</span>
                <p className="text-[10px] font-semibold tracking-wider uppercase opacity-80 mt-0.5">Titulaciones & Grados</p>
              </div>

              <div className="p-4 space-y-4 flex-1 relative">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b border-current pb-1 flex items-center gap-1.5 opacity-90">
                  <Briefcase className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> FORMACIÓN DE GRADO
                </h3>

                {(() => {
                  const profStartIdx = FIRST_PAGE_PROF_LIMIT + extraProfChunks.slice(0, extraPageIdx).reduce((acc, c) => acc + c.length, 0) + 1;
                  const profEndIdx = profStartIdx + extraProfGroup.length - 1;
                  return (
                    <p className="text-[10px] leading-relaxed opacity-90">
                      Registros {profStartIdx} a {profEndIdx} de {sortedProfession.length} títulos profesionales, posgrados y certificaciones académicas.
                    </p>
                  );
                })()}

                <div className="pt-2 border-t border-current opacity-80">
                  <h4 className="text-[10px] font-black uppercase mb-1.5" style={{ color: theme.accentColor }}>NIVELES ACREDITADOS:</h4>
                  <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                    <span className="px-2 py-0.5 bg-black/10 rounded">Títulos Universitarios</span>
                    <span className="px-2 py-0.5 bg-black/10 rounded">Profesorado de Grado</span>
                    <span className="px-2 py-0.5 bg-black/10 rounded">Especialización & Posgrado</span>
                    <span className="px-2 py-0.5 bg-black/10 rounded">Formación Continua</span>
                  </div>
                </div>

                {/* Sidebar Footer */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-bold text-xs">
                  <span>{personalInfo.initials}</span>
                  <span className="text-2xl font-black">{pageNum}</span>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="col-span-2 p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <h1 className="text-xl font-black text-slate-900 uppercase">
                    {personalInfo.surname} <span style={{ color: theme.primaryColor }}>{personalInfo.givenNames}</span>
                  </h1>
                </div>

                {renderSectionHeader(<Briefcase className="w-4 h-4" />, `PROFESIÓN & TITULACIONES (${extraPageIdx + 2}/${totalExtraProfPages + 1})`)}

                <div className="space-y-2.5">
                  {extraProfGroup.map((prof, i) => (
                    <div key={i} className="bg-slate-50/90 border border-slate-200/80 p-3 rounded-xl space-y-1 section-box-print shadow-sm border-l-4" style={{ borderLeftColor: theme.primaryColor }}>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-slate-900 leading-snug">{prof.degree}</h4>
                        <span 
                          className="px-2.5 py-0.5 rounded text-[10px] font-black text-white whitespace-nowrap shadow-sm flex-shrink-0 inline-flex items-center gap-1" 
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          <Calendar className="w-3 h-3" /> AÑO {prof.year}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: theme.accentColor }}>
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" /> {prof.institution}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ========================================================================= */}
      {/* PAGES TO N: EXPERIENCIA LABORAL DOCENTE (REBALANCEO DINÁMICO A4) */}
      {/* ========================================================================= */}
      {expChunks.map((expGroup, expPageIdx) => {
        const pageNum = startBodyPageNum + 1 + totalExtraProfPages + expPageIdx;

        return (
          <div id={expPageIdx === 0 ? "cv-section-experiencia" : undefined} key={`exp-${pageNum}`} className="a4-page-container grid grid-cols-3">
            {/* Left Sidebar */}
            <div className="col-span-1 flex flex-col relative" style={sidebarBgStyle}>
              <div className="p-5 text-center border-b border-current opacity-90" style={sidebarHeaderBgStyle}>
                <span className="text-2xl font-black tracking-widest">{personalInfo.initials}</span>
                <p className="text-[10px] font-semibold tracking-wider uppercase opacity-80 mt-0.5">Trayectoria Docente</p>
              </div>

              <div className="p-4 space-y-5 flex-1 relative">
                {expPageIdx === 0 && showInSecundaria('ecologia') ? (
                  <div id="cv-section-ecologia">
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3 border-b border-current pb-1 flex items-center gap-1.5 opacity-90">
                      <Leaf className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> PROYECTOS & COMUNIDAD
                    </h3>

                    <div className="space-y-3 text-[10px]">
                      <div>
                        <p className="font-bold uppercase mb-1" style={{ color: theme.accentColor }}>RURAL Y AGRICULTURA:</p>
                        {(ecology?.rural || []).map((r, rIdx) => (
                          <div key={rIdx} className="mb-2 border-l-2 border-current pl-2">
                            <p className="font-bold">{r.title}</p>
                            <p className="opacity-80 italic">{r.institution}</p>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-current opacity-90">
                        <p className="font-bold uppercase mb-1" style={{ color: theme.accentColor }}>MEDIO AMBIENTE:</p>
                        {(ecology?.environmental || []).map((env, eIdx) => (
                          <div key={eIdx} className="mb-2 border-l-2 border-current pl-2">
                            <p className="font-bold">{env.title}</p>
                            <p className="opacity-80 italic">{env.institution}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider mb-2 border-b border-current pb-1 flex items-center gap-1.5 opacity-90">
                        <Briefcase className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> ÁREAS DE DESEMPEÑO
                      </h3>
                      {(() => {
                        const expStartIdx = expChunks.slice(0, expPageIdx).reduce((acc, c) => acc + c.length, 0) + 1;
                        const expEndIdx = expStartIdx + expGroup.length - 1;
                        return (
                          <p className="text-[10px] leading-relaxed opacity-90 mb-3">
                            Registros {expStartIdx} a {expEndIdx} de {sortedExperience.length} de la trayectoria docente y gestión escolar.
                          </p>
                        );
                      })()}
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black uppercase mb-1.5" style={{ color: theme.accentColor }}>PILARES PEDAGÓGICOS:</h4>
                      <ul className="text-[10px] space-y-1.5 font-semibold opacity-95">
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Gestión Documental & Archivo</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Mediación Lectora en Lengua</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Tutoría & Retención Rural</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Tertulias Dialógicas Literarias</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Sidebar Footer */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-bold text-xs">
                  <span>{personalInfo.initials}</span>
                  <span className="text-2xl font-black">{pageNum}</span>
                </div>
              </div>
            </div>

            {/* Right Main Content: Experiencia Laboral Docente */}
            <div className="col-span-2 p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <h1 className="text-xl font-black text-slate-900 uppercase">
                    {personalInfo.surname} <span style={{ color: theme.primaryColor }}>{personalInfo.givenNames}</span>
                  </h1>
                </div>

                {renderSectionHeader(<FileText className="w-4 h-4" />, `EXPERIENCIA LABORAL (${expPageIdx + 1}/${totalExpPages})`)}

                <div className="space-y-3">
                  {expGroup.map((exp, idx) => (
                    <div key={idx} className="bg-slate-50/90 border border-slate-200/80 p-3.5 rounded-xl space-y-1.5 section-box-print shadow-sm border-l-4" style={{ borderLeftColor: theme.primaryColor }}>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-slate-900 leading-snug">{exp.role}</h4>
                        <span 
                          className="px-2.5 py-0.5 rounded text-[10px] font-black text-white whitespace-nowrap shadow-sm flex-shrink-0 inline-flex items-center gap-1" 
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          <Calendar className="w-3 h-3" /> AÑO {exp.year}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: theme.accentColor }}>
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" /> {exp.institution}
                      </p>
                      
                      {exp.details && (
                        <p className="text-[10.5px] text-slate-600 font-medium italic border-t border-slate-200/60 pt-1.5 mt-1.5 leading-relaxed">
                          {exp.details}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ========================================================================= */}
      {/* PAGES TO N: CURSOS Y CAPACITACIONES DOCENTES (REBALANCEO DINÁMICO A4) */}
      {/* ========================================================================= */}
      {courseChunks.map((pageCoursesGroup, pageIdx) => {
        const pageNum = startBodyPageNum + 1 + totalExtraProfPages + totalExpPages + pageIdx;
        const isLastPage = pageIdx === totalCoursePages - 1;

        return (
          <div id={pageIdx === 0 ? "cv-section-cursos" : undefined} key={`course-${pageNum}`} className="a4-page-container grid grid-cols-3">
            {/* Sidebar */}
            <div className="col-span-1 flex flex-col relative" style={sidebarBgStyle}>
              <div className="p-5 text-center border-b border-current opacity-90" style={sidebarHeaderBgStyle}>
                <span className="text-2xl font-black tracking-widest">{personalInfo.initials}</span>
                <p className="text-[10px] font-semibold tracking-wider uppercase opacity-80 mt-0.5">Capacitación Continua</p>
              </div>

              <div className="p-4 space-y-4 flex-1 relative">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b border-current pb-1 flex items-center gap-1.5 opacity-90">
                  <Award className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> CERTIFICACIONES
                </h3>

                {pageIdx === 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] leading-relaxed opacity-90">
                      Formación pedagógica continua ordenada cronológicamente en instituciones educativas y plataformas de aprendizaje digital.
                    </p>
                    <div className="px-2.5 py-1.5 bg-black/10 rounded-lg text-[10px] font-extrabold text-center border border-current opacity-90">
                      Total: {sortedCourses.length} Certificaciones
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const courseStartIdx = courseChunks.slice(0, pageIdx).reduce((acc, c) => acc + c.length, 0) + 1;
                      const courseEndIdx = courseStartIdx + pageCoursesGroup.length - 1;
                      return (
                        <p className="text-[10px] leading-relaxed opacity-90">
                          Registros {courseStartIdx} a {courseEndIdx} de {sortedCourses.length} certificaciones acreditadas.
                        </p>
                      );
                    })()}
                    
                    <div>
                      <h4 className="text-[10px] font-black uppercase mb-1.5" style={{ color: theme.accentColor }}>EJES TEMÁTICOS:</h4>
                      <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                        <span className="px-2 py-0.5 bg-black/10 rounded">Educación Digital</span>
                        <span className="px-2 py-0.5 bg-black/10 rounded">Didáctica Lengua</span>
                        <span className="px-2 py-0.5 bg-black/10 rounded">ESI & Género</span>
                        <span className="px-2 py-0.5 bg-black/10 rounded">Gestión y Mediación</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sidebar Footer */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-bold text-xs">
                  <span>{personalInfo.initials}</span>
                  <span className="text-2xl font-black">{pageNum}</span>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="col-span-2 p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <h1 className="text-xl font-black text-slate-900 uppercase">
                    {personalInfo.surname} <span style={{ color: theme.primaryColor }}>{personalInfo.givenNames}</span>
                  </h1>
                </div>

                {renderSectionHeader(<BookOpen className="w-4 h-4" />, `CURSOS Y CAPACITACIONES (${pageIdx + 1}/${totalCoursePages})`)}

                <div className="space-y-3">
                  {pageCoursesGroup.map((c, cIdx) => (
                    <div key={cIdx} className="bg-slate-50/90 border border-slate-200/80 p-3.5 rounded-xl space-y-1.5 section-box-print shadow-sm border-l-4" style={{ borderLeftColor: theme.accentColor }}>
                      <div className="flex items-center justify-between gap-2">
                        <span 
                          className="px-2.5 py-0.5 rounded text-[10px] font-black text-white whitespace-nowrap shadow-sm flex-shrink-0 inline-flex items-center gap-1" 
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          <Calendar className="w-3 h-3" /> AÑO {c.year}
                        </span>
                        
                        {c.hours && (
                          <span 
                            className="px-2.5 py-0.5 rounded text-[10px] font-black whitespace-nowrap flex-shrink-0 inline-flex items-center gap-1" 
                            style={{ backgroundColor: 'rgba(64,160,142,0.12)', color: theme.accentColor }}
                          >
                            <Clock className="w-3 h-3" /> {c.hours}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-black text-slate-900 leading-snug">{c.title}</h4>

                      <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: theme.accentColor }}>
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" /> {c.institution}
                      </p>

                      {c.details && (
                        <p className="text-[10.5px] text-slate-600 font-medium italic border-t border-slate-200/60 pt-1.5 mt-1.5 leading-relaxed">
                          {c.details}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom User-Defined Dynamic Sections */}
              {cvData?.customSections && Array.isArray(cvData.customSections) && cvData.customSections.map((sec, idx) => (
                <div key={sec.id || idx} className="space-y-2 pt-2 border-t border-slate-200">
                  {renderSectionHeader(<Award className="w-4 h-4" />, (sec.title || 'SECCIÓN PERSONALIZADA').toUpperCase())}
                  <div className="space-y-1.5">
                    {Array.isArray(sec.records) && sec.records.map((rec, rIdx) => (
                      <div key={rIdx} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs font-medium space-y-0.5">
                        {Object.entries(rec).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 capitalize">{k}:</span>
                            <span className="text-slate-900">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Digital Signature Block on Last Course Page */}
              {isLastPage && isVis('firma') && (
                <div id="cv-section-firma" className="mt-3 pt-2 border-t border-slate-300 flex flex-col items-end section-box-print">
                  <div className="w-56 text-center space-y-0.5">
                    {signature?.dataUrl ? (
                      <img src={signature.dataUrl} alt="Firma Digital" className="h-12 mx-auto object-contain mb-0.5" />
                    ) : (
                      <div className="h-9 border-b border-dashed border-slate-400 mb-0.5 flex items-center justify-center text-[10px] text-slate-400 font-medium italic">
                        [ Espacio para Firma Digital ]
                      </div>
                    )}
                    <p className="text-xs font-black text-slate-800">
                      {signature?.signerName || personalInfo.fullName || `${personalInfo.surname || ''} ${personalInfo.givenNames || ''}`.trim() || ''}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      {signature?.signerRole || roles?.[0] || sortedProfession?.[0]?.degree || ''}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {signature?.date || (personalInfo.cityProvince ? `${personalInfo.cityProvince.split(',')[0]}, ${personalInfo.year || '2025'}` : '')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* ========================================================================= */}
      {/* SIDEBAR OVERFLOW PAGES (SI LA COLUMNA SECUNDARIA EXCEDE 1 PÁGINA) */}
      {/* ========================================================================= */}
      {extraSidebarChunks.map((sidebarGroup: string[], sidebarPageIdx: number) => {
        const pageNum = startBodyPageNum + 1 + totalExtraProfPages + totalExpPages + totalCoursePages + sidebarPageIdx;

        return (
          <ExtraPage
            key={`sidebar-extra-${pageNum}`}
            pageNum={pageNum}
            totalPages={totalPagesCalculated + extraSidebarChunks.length}
            paperSize={paperSizeId}
            theme={theme}
            sidebarContent={
              <div className="flex flex-col relative h-full w-full" style={sidebarBgStyle}>
                <div className="p-5 text-center border-b border-current opacity-90" style={sidebarHeaderBgStyle}>
                  <span className="text-2xl font-black tracking-widest">{personalInfo.initials}</span>
                  <p className="text-[10px] font-semibold tracking-wider uppercase opacity-80 mt-0.5">Información Adicional</p>
                </div>

                <div className="p-4 space-y-4 flex-1 relative">
                  {sidebarGroup.map((secId: string) => renderDynamicSection(secId, 'secundaria'))}

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-bold text-xs">
                    <span>{personalInfo.initials}</span>
                    <span className="text-2xl font-black">{pageNum}</span>
                  </div>
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h1 className="text-xl font-black text-slate-900 uppercase">
                  {personalInfo.surname} <span style={{ color: theme.primaryColor }}>{personalInfo.givenNames}</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Continuación de Secciones Complementarias ({sidebarPageIdx + 2}/{totalSidebarPages})
              </p>
            </div>
          </ExtraPage>
        );
      })}

      {/* ========================================================================= */}
      {/* APPENDED CERTIFICATE PAGES */}
      {/* ========================================================================= */}
      {certificatesScanned && certificatesScanned.length > 0 && (
        <div id="cv-section-certificados">
          <ScannedCertificatesPages certificates={certificatesScanned} theme={theme} onRotateCert={handleRotateCert} />
        </div>
      )}
      </div>

    </div>
  );
}
