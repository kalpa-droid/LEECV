import React from 'react';
import { PAGE_SIZES } from '../../../../shared/core/pdf-engine/pageSizes';

export function ExtraPage({
  title,
  pageNum,
  totalPages,
  paperSize = 'a4',
  theme = {},
  children
}) {
  const paper = PAGE_SIZES[paperSize] || PAGE_SIZES.a4;
  const primaryColor = theme.primaryColor || '#00A8A0';
  const fontFamily = theme.fontFamily || 'Inter, sans-serif';

  return (
    <div
      className="cv-page cv-extra-page relative bg-white flex flex-col justify-between p-10 border border-slate-200 shadow-2xl mb-8 overflow-hidden"
      style={{
        width: `${paper.pxWidth}px`,
        height: `${paper.pxHeight}px`,
        fontFamily
      }}
    >
      {/* Top Continuation Header */}
      <div className="flex items-center justify-between border-b pb-3 border-slate-200 mb-6">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
            {title} — (CONTINUACIÓN)
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase">
          PÁGINA {pageNum} DE {totalPages}
        </span>
      </div>

      {/* Main Page Body */}
      <div className="flex-1 space-y-4">
        {children}
      </div>

      {/* Page Footer */}
      <div className="border-t pt-3 border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase mt-6">
        <span>DOCUMENTO OFICIAL LEECV</span>
        <span>HOJA {pageNum}</span>
      </div>
    </div>
  );
}
