import React from 'react';
import { PAGE_SIZES } from '../../../../shared/core/pdf-engine/pageSizes';

export interface ExtraPageProps {
  title?: string;
  pageNum: number;
  totalPages?: number;
  paperSize?: string;
  theme?: any;
  sidebarContent?: React.ReactNode;
  children: React.ReactNode;
}

export function ExtraPage({
  title,
  pageNum,
  totalPages,
  paperSize = 'a4',
  theme = {} as any,
  sidebarContent,
  children
}: ExtraPageProps) {
  const paper = PAGE_SIZES[paperSize] || PAGE_SIZES.a4;
  const primaryColor = theme?.primaryColor || '#00A8A0';
  const fontFamily = theme?.fontFamily || 'Inter, sans-serif';

  // If a custom 1-column sidebar is provided, render in 3-column grid layout
  if (sidebarContent) {
    return (
      <div 
        className="a4-page-container grid grid-cols-3 rounded-sm relative overflow-hidden shadow-2xl mb-8"
        style={{
          width: `${paper.widthMm}mm`,
          height: `${paper.heightMm}mm`,
          fontFamily
        }}
      >
        <div className="col-span-1 flex flex-col relative h-full">
          {sidebarContent}
        </div>
        <div className="col-span-2 p-6 flex flex-col justify-between h-full">
          {children}
        </div>
      </div>
    );
  }

  // Full-width continuation page shell
  return (
    <div
      className="a4-page-container relative bg-white flex flex-col justify-between p-8 shadow-2xl mb-8 overflow-hidden rounded-sm border border-slate-200"
      style={{
        width: `${paper.widthMm}mm`,
        height: `${paper.heightMm}mm`,
        fontFamily
      }}
    >
      {/* Top Continuation Header */}
      <div className="flex items-center justify-between border-b pb-3 border-slate-200 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
            {title ? `${title} — (CONTINUACIÓN)` : 'HOJA DE CONTINUACIÓN'}
          </span>
        </div>
        {totalPages && (
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            PÁGINA {pageNum} DE {totalPages}
          </span>
        )}
      </div>

      {/* Main Page Body */}
      <div className="flex-1 space-y-4 overflow-hidden">
        {children}
      </div>

      {/* Page Footer */}
      <div className="border-t pt-3 border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase mt-4">
        <span>DOCUMENTO OFICIAL LEECV</span>
        <span>HOJA {pageNum}</span>
      </div>
    </div>
  );
}
