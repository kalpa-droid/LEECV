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

  // Initial optimistic over-packing pass
  const initialPacked = packPrimarySectionsIntoPages(primaryBlocks, paperSizeId, 40);

  // Native browser overflow correction state
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

  const secondarySections = [...new Set(cvData?.layout?.sectionOrders?.secundaria || ["contacto", "competencias", "personales", "informatica"])] as string[];
  const sidebarPageChunks = getSidebarPageChunks(secondarySections, cvData, paperSizeId, 115);
  const firstPageSidebarSections = sidebarPageChunks[0] || secondarySections;
  const extraSidebarChunks = sidebarPageChunks.slice(1);
  const totalSidebarPages = sidebarPageChunks.length;

  // Dynamic Theme Styling
  const dynamicThemeStyle = {
    fontFamily: theme.fontFamily || 'Arial, sans-serif'
  };

  return (
    <div 
      className="w-full min-h-full flex flex-col items-center print-wrapper relative"
      style={dynamicThemeStyle}
    >
      {/* Header: una sola vista, sin selector — el motor vectorial es el único camino */}
      <div className="w-full max-w-4xl flex items-center gap-2.5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-800 my-4 no-print">
        <FileCheck className="w-5 h-5 text-emerald-400" />
        <div>
          <span className="text-xs font-black uppercase tracking-wider block text-emerald-400">Motor Vectorial Nativo (@react-pdf/renderer + pdf.js)</span>
          <span className="text-[10px] text-slate-400 font-medium">Igual en PC y celular — es el mismo PDF que se descarga</span>
        </div>
      </div>

      <div className="w-full max-w-5xl h-[1200px] bg-slate-900 p-2.5 rounded-3xl shadow-2xl border border-slate-800 my-2 no-print">
        <VectorDocViewer document={<CvPdfDocument cvData={cvData} />} />
      </div>
    </div>
  );
}
