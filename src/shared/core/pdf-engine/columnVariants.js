/**
 * columnVariants.js
 * Single source of truth for section column variant styling.
 * Adapts typography, grid columns, padding, and spacing automatically based on 
 * whether a section is rendered in the narrow sidebar ('secondary'), main area ('primary'), or full width ('both').
 */

export function getColumnVariant(location = 'primary') {
  if (location === 'secondary') {
    // Narrow sidebar column variant
    return {
      isNarrow: true,
      containerClass: 'space-y-2 text-[10px]',
      titleSizeClass: 'text-[11px] font-black tracking-wider uppercase',
      gridClass: 'grid grid-cols-1 gap-2',
      itemPaddingClass: 'p-2 rounded-lg bg-black/5 border border-black/10',
      badgeClass: 'px-2 py-0.5 text-[9px] font-bold rounded',
      detailTextClass: 'text-[9.5px] leading-tight opacity-90'
    };
  }

  if (location === 'both') {
    // Full width horizontal banner variant
    return {
      isNarrow: false,
      containerClass: 'space-y-4 text-xs',
      titleSizeClass: 'text-sm font-black tracking-wide uppercase',
      gridClass: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
      itemPaddingClass: 'p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-sm',
      badgeClass: 'px-3 py-1 text-xs font-black rounded-lg',
      detailTextClass: 'text-xs leading-relaxed opacity-95'
    };
  }

  // Primary main column variant (default)
  return {
    isNarrow: false,
    containerClass: 'space-y-3 text-[11px]',
    titleSizeClass: 'text-xs font-black tracking-wide uppercase',
    gridClass: 'grid grid-cols-1 gap-3',
    itemPaddingClass: 'p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 shadow-sm',
    badgeClass: 'px-2.5 py-0.5 text-[10px] font-black rounded',
    detailTextClass: 'text-[10.5px] leading-relaxed opacity-90'
  };
}
