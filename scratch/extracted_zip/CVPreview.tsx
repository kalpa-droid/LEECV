import React, { useState, useLayoutEffect, useRef, useMemo } from 'react';
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
  Calendar,
  Building2,
  Clock
} from 'lucide-react';

import { PAGE_SIZES, calculateItemsPerPage, getDynamicHeightChunks, packPrimarySectionsIntoPages, PrimarySectionBlock, PagePrimaryGroup } from '../../../shared/core/pdf-engine/pageSizes';
import { getColumnVariant } from '../../../shared/core/pdf-engine/columnVariants';
import { getSidebarPageChunks } from '../../../shared/core/pdf-engine/sidebarPagination';
import { CoverPageSection } from './preview/CoverPageSection';
import { ExtraPage } from './preview/ExtraPage';
import { ScannedCertificatesPages } from './preview/ScannedCertificatesPages';
import { CvPdfDocument } from './pdf/CvPdfDocument';
import { VectorDocViewer } from '../../../shared/core/pdf-engine/VectorDocViewer';
import { Sparkles, FileCheck } from 'lucide-react';

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
    theme = {}
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

  // Dynamic primary section blocks calculation for zero-overflow pagination across paper sizes
  const primaryOrder = [...new Set(cvData?.layout?.sectionOrders?.primaria || ["personales", "formacion", "profesion", "experiencia", "cursos", "ecologia"])] as string[];

  const primaryBlocks: PrimarySectionBlock[] = primaryOrder.map(secId => {
    if (secId === 'formacion') return { secId: 'formacion', items: education, itemType: 'exp' as const };
    if (secId === 'profesion') return { secId: 'profesion', items: sortedProfession, itemType: 'prof' as const };
    if (secId === 'experiencia') return { secId: 'experiencia', items: sortedExperience, itemType: 'exp' as const };
    if (secId === 'cursos') return { secId: 'cursos', items: sortedCourses, itemType: 'course' as const };
    if (secId === 'personales') return { secId: 'personales', items: [personalInfo], itemType: 'exp' as const };
    if (secId === 'ecologia') {
      const ruralItems = ecology?.rural || [];
      const envItems = ecology?.environmental || [];
      const communityItems = ecology?.community || [];
      const allEcology = [...ruralItems, ...envItems, ...communityItems];
      return { secId: 'ecologia', items: allEcology, itemType: 'course' as const };
    }
    return { secId, items: [], itemType: 'exp' as const };
  }).filter(b => b.items.length > 0);

  // ============================================================
  // PAGED.JS-INSPIRED NATIVE OVERFLOW DETECTION PAGINATION
  // ============================================================
  // Step 1: Initial optimistic over-packing pass (forces over-filling so DOM overflow detector trims down)
  const initialPacked = packPrimarySectionsIntoPages(primaryBlocks, paperSizeId, 40);

  // Step 2: Native browser overflow correction state
  // overflowCorrections stores how many items to REMOVE from the
  // end of each page's content to prevent overflow.
  const [overflowCorrections, setOverflowCorrections] = useState<Record<number, number>>({});
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Flatten all items from all blocks for redistribution
  const allFlatItems: { secId: string; item: any; itemType?: 'exp' | 'prof' | 'course' }[] = [];
  for (const block of primaryBlocks) {
    for (const item of block.items) {
      allFlatItems.push({ secId: block.secId, item, itemType: block.itemType });
    }
  }

  // Apply corrections: rebuild pages from initial packing + corrections
  const packedPages = React.useMemo(() => {
    if (Object.keys(overflowCorrections).length === 0) return initialPacked;

    // Rebuild flat assignment from initial packing
    const flatAssignment: { secId: string; item: any; itemType?: string; pageIdx: number }[] = [];
    initialPacked.forEach((page, pageIdx) => {
      page.blocks.forEach(block => {
        block.items.forEach(item => {
          flatAssignment.push({ secId: block.secId, item, itemType: block.itemType, pageIdx });
        });
      });
    });

    // Apply corrections: move overflow items to next page
    for (const [pageIdxStr, removeCount] of Object.entries(overflowCorrections)) {
      const pageIdx = parseInt(pageIdxStr);
      if (removeCount <= 0) continue;
      const pageItems = flatAssignment.filter(a => a.pageIdx === pageIdx);
      const toMove = pageItems.slice(-removeCount);
      for (const m of toMove) {
        const idx = flatAssignment.indexOf(m);
        if (idx >= 0) flatAssignment[idx].pageIdx = pageIdx + 1;
      }
      // Cascade: push down all subsequent pages
      for (let p = pageIdx + 1; p < initialPacked.length + 5; p++) {
        const pItems = flatAssignment.filter(a => a.pageIdx === p);
        // No overflow check here - the next render cycle will handle it
      }
    }

    // Rebuild pages from flat assignment
    const maxPage = Math.max(...flatAssignment.map(a => a.pageIdx), 0);
    const rebuilt: PagePrimaryGroup[] = [];
    for (let p = 0; p <= maxPage; p++) {
      const pageItems = flatAssignment.filter(a => a.pageIdx === p);
      if (pageItems.length === 0) continue;

      const blocks: PrimarySectionBlock[] = [];
      let currentSecId = '';
      let currentItems: any[] = [];
      let currentItemType: any = 'exp';

      for (const pi of pageItems) {
        if (pi.secId !== currentSecId) {
          if (currentItems.length > 0) {
            blocks.push({ secId: currentSecId, items: currentItems, itemType: currentItemType });
          }
          currentSecId = pi.secId;
          currentItems = [pi.item];
          currentItemType = pi.itemType;
        } else {
          currentItems.push(pi.item);
        }
      }
      if (currentItems.length > 0) {
        blocks.push({ secId: currentSecId, items: currentItems, itemType: currentItemType });
      }
      rebuilt.push({ pageIndex: p, blocks });
    }
    return rebuilt;
  }, [initialPacked, overflowCorrections]);

  // Step 3: After render, check each page for overflow using native innerContent.offsetHeight > mainCol.clientHeight
  useLayoutEffect(() => {
    const corrections: Record<number, number> = {};
    let needsCorrection = false;

    // Check page 2 (first body page at index 0) and all extra pages
    for (const [pageIdxStr, ref] of Object.entries(pageRefs.current)) {
      if (!ref) continue;
      const pageIdx = parseInt(pageIdxStr);

      // Find the main content column (col-span-2)
      const mainCol = ref.querySelector('[data-page-content]') as HTMLElement;
      if (!mainCol) continue;

      const innerContent = mainCol.firstElementChild as HTMLElement;
      const contentHeight = innerContent ? innerContent.offsetHeight : mainCol.scrollHeight;
      const containerHeight = mainCol.clientHeight;

      const isOverflowing = containerHeight > 0 && contentHeight > (containerHeight - 12);
      if (isOverflowing) {
        const existingCorrection = overflowCorrections[pageIdx] || 0;
        corrections[pageIdx] = existingCorrection + 1;
        needsCorrection = true;
      }
    }

    if (needsCorrection) {
      setOverflowCorrections(prev => {
        const next = { ...prev, ...corrections };
        const totalCorrections = Object.values(next).reduce((s, v) => s + v, 0);
        if (totalCorrections > allFlatItems.length) return prev;
        return next;
      });
    }
  }, [packedPages, cvData, paperSizeId]);

  const secondarySections = [...new Set(cvData?.layout?.sectionOrders?.secundaria || ["contacto", "competencias", "personales", "informatica"])] as string[];
  const sidebarPageChunks = getSidebarPageChunks(secondarySections, cvData, paperSizeId, 115);
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

  const renderDynamicSection = (secId: string, location: 'primaria' | 'secundaria' | 'ambas' = 'primaria', overrideItems?: any[]) => {
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
              {personalInfo.phone && (
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}>
                    <Phone className="w-3 h-3" />
                  </span>
                  <span>{personalInfo.phone}</span>
                </li>
              )}
              {personalInfo.email && (
                <li className="flex items-center gap-2 break-all">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}>
                    <Mail className="w-3 h-3" />
                  </span>
                  <span>{personalInfo.email}</span>
                </li>
              )}
              {personalInfo.facebook && (
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}>
                    <Globe className="w-3 h-3" />
                  </span>
                  <span>{personalInfo.facebook}</span>
                </li>
              )}
              {personalInfo.address && (
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}>
                    <MapPin className="w-3 h-3" />
                  </span>
                  <span>{personalInfo.address}</span>
                </li>
              )}
            </ul>
          </div>
        );

      case 'competencias':
        {
          const skillsList = Array.isArray(cvData?.skills) && cvData.skills.length > 0
            ? cvData.skills
            : Array.isArray(cvData?.competencias) && cvData.competencias.length > 0
            ? cvData.competencias
            : ["Pedagogía Dialógica", "Comunidades de Aprendizaje", "Alfabetización Digital", "Educación Inclusiva", "Gestión Institucional"];

          return (
            <div key={`sec-${location}-competencias`} id="cv-section-competencias" className="section-box-print mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2 border-b border-current pb-1 flex items-center gap-1.5 opacity-90">
                <Award className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> COMPETENCIAS CLAVE
              </h3>
              <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                {skillsList.map((skill: any, sIdx: number) => (
                  <span key={sIdx} className="px-2 py-0.5 bg-black/10 rounded">
                    {typeof skill === 'string' ? skill : skill.name || skill.title || String(skill)}
                  </span>
                ))}
              </div>
            </div>
          );
        }

      case 'personales':
        return (
          <div key={`sec-${location}-personales`} id={location === 'primaria' ? "cv-section-personales" : "cv-section-personales-side"} className="section-box-print space-y-2 mb-3">
            {personalInfo.quote && (
              <p className="text-[11px] font-bold italic text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200 border-l-4" style={{ borderLeftColor: theme.primaryColor }}>
                {personalInfo.quote}
              </p>
            )}
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
        {
          const listEdu = overrideItems || education;
          if (!listEdu || listEdu.length === 0) return null;
          return (
            <div key={`sec-${location}-formacion`} id="cv-section-formacion" className={`section-box-print ${variant.containerClass} mb-3`}>
              {renderSectionHeader(<GraduationCap className="w-4 h-4" />, "FORMACIÓN ACADÉMICA")}
              <div className={variant.gridClass}>
                {listEdu.map((edu: any, i: number) => (
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
        }

      case 'profesion':
        {
          const listProf = overrideItems || sortedProfession;
          if (!listProf || listProf.length === 0) return null;
          return (
            <div key={`sec-${location}-profesion`} id="cv-section-profesion" className={`section-box-print ${variant.containerClass} mb-3`}>
              {renderSectionHeader(<Briefcase className="w-4 h-4" />, `TÍTULOS PROFESIONALES (${sortedProfession.length})`)}
              <div className={variant.gridClass}>
                {listProf.map((prof: any, i: number) => (
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
        }

      case 'cursos':
        {
          const listCourses = overrideItems || sortedCourses;
          if (!listCourses || listCourses.length === 0) return null;
          return (
            <div key={`sec-${location}-cursos`} id="cv-section-cursos" className={`section-box-print ${variant.containerClass} mb-3`}>
              {renderSectionHeader(<BookOpen className="w-4 h-4" />, "CURSOS & CAPACITACIONES")}
              <div className={variant.gridClass}>
                {listCourses.map((item: any, i: number) => (
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
              {informatics.map((item: any, i: number) => (
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
          const listExp = overrideItems || sortedExperience;
          if (!listExp || listExp.length === 0) return null;
          return (
            <div key={`sec-${location}-experiencia`} id="cv-section-experiencia" className={`section-box-print ${variant.containerClass} mb-3`}>
              {renderSectionHeader(<Briefcase className="w-4 h-4" />, "EXPERIENCIA LABORAL")}
              <div className={variant.gridClass}>
                {listExp.map((exp: any, i: number) => (
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
  const totalPagesCalculated = (showCover ? 1 : 0) + packedPages.length + (extraSidebarChunks?.length || 0) + certPages.length;
  const totalHojasLabel = totalPagesCalculated === 1 ? '1 HOJA' : `${totalPagesCalculated} HOJAS`;

  return (
    <div 
      className="w-full min-h-full flex flex-col items-center print-wrapper relative"
      style={dynamicThemeStyle}
    >
      {/* Header: una sola vista, sin selector — el motor vectorial es el único camino */}
      <div className="w-full max-w-4xl flex items-center gap-2.5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-800 my-4 no-print">
        <FileCheck className="w-5 h-5 text-emerald-400" />
        <div>
          <span className="text-xs font-black uppercase tracking-wider block text-emerald-400">Motor Vectorial Nativo (@react-pdf/renderer)</span>
          <span className="text-[10px] text-slate-400 font-medium">Igual en PC y celular — es el mismo PDF que se descarga</span>
        </div>
      </div>

      <div className="w-full max-w-5xl h-[1200px] bg-slate-900 p-2.5 rounded-3xl shadow-2xl border border-slate-800 my-2 no-print">
        <VectorDocViewer document={<CvPdfDocument cvData={cvData} />} />
      </div>
    </div>
  );
}
