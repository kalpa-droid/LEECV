import { getPageSize, PageSize } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import {
  applyGlobalConfigWithCascade,
  clearManualOverride,
  detectGlobalConflicts,
  GlobalApplyMode,
  GlobalCascadeConflict,
  markManualOverride,
} from '../../../shared/core/presets/configCascadeEngine';

export type BookPrintTarget = 'home' | 'print_shop';

export type BookPaperSizeId =
  | 'A4'
  | 'CARTA'
  | 'OFICIO'
  | 'LEGAL'
  | 'A3'
  | 'SRA3'
  | 'A3_PLUS'
  | 'A2';

export interface BookPaperSpec {
  id: BookPaperSizeId;
  pageSizeKey: string;
  pageSize: PageSize;
  /** Título en lenguaje sencillo para UI de Book Studio. */
  shortTitle: string;
  /** Etiqueta técnica siempre entre paréntesis para cumplimiento plain-language. */
  technicalParen: string;
  /** Subtítulo amigable con el uso recomendado. */
  usageSubtitle: string;
  widthMm: number;
  heightMm: number;
  widthPt: number;
  heightPt: number;
  coverCanvasWidth: number;
  coverCanvasHeight: number;
  recommendedFor: BookPrintTarget[];
}

const PAPER_METADATA: Record<
  BookPaperSizeId,
  {
    pageSizeKey: string;
    shortTitle: string;
    technicalParen: string;
    usageSubtitle: string;
    recommendedFor: BookPrintTarget[];
  }
> = {
  A4: {
    pageSizeKey: 'a4',
    shortTitle: 'Hoja común de impresora',
    technicalParen: '(A4 · 210 × 297 mm)',
    usageSubtitle: 'La hoja clásica de casa y oficina para imprimir sin problemas',
    recommendedFor: ['home'],
  },
  CARTA: {
    pageSizeKey: 'carta',
    shortTitle: 'Hoja carta americana',
    technicalParen: '(Carta · 216 × 279 mm)',
    usageSubtitle: 'Un poco más ancha y corta; muy usada en impresoras de oficina',
    recommendedFor: ['home'],
  },
  OFICIO: {
    pageSizeKey: 'oficio',
    shortTitle: 'Hoja oficio alargada',
    technicalParen: '(Oficio · 216 × 330 mm)',
    usageSubtitle: 'Resmas escolares o administrativas largas de Latinoamérica',
    recommendedFor: ['home'],
  },
  LEGAL: {
    pageSizeKey: 'legal',
    shortTitle: 'Hoja legal extra larga',
    technicalParen: '(Legal · 216 × 356 mm)',
    usageSubtitle: 'Formato largo estándar para textos extensos en bandeja casera',
    recommendedFor: ['home'],
  },
  A3: {
    pageSizeKey: 'a3',
    shortTitle: 'Hoja doble grande',
    technicalParen: '(A3 · 297 × 420 mm)',
    usageSubtitle: 'Sirve tanto en impresoras caseras amplias como en imprentas digitales',
    recommendedFor: ['home', 'print_shop'],
  },
  SRA3: {
    pageSizeKey: 'sra3',
    shortTitle: 'Hoja de imprenta digital',
    technicalParen: '(SRA3 · 320 × 450 mm)',
    usageSubtitle: 'Deja resto de papel para pasar por guillotina sin achicar páginas',
    recommendedFor: ['print_shop'],
  },
  A3_PLUS: {
    pageSizeKey: 'a3_plus',
    shortTitle: 'Hoja extra grande con margen',
    technicalParen: '(A3+ · 329 × 483 mm)',
    usageSubtitle: 'Ideal para trazadores e impresoras gráficas de formato amplio',
    recommendedFor: ['print_shop'],
  },
  A2: {
    pageSizeKey: 'a2',
    shortTitle: 'Hoja editorial amplia',
    technicalParen: '(A2 · 420 × 594 mm)',
    usageSubtitle: 'Para tiradas editoriales grandes que se cortan y doblan en taller',
    recommendedFor: ['print_shop'],
  },
};

function computeCoverCanvasDimensions(id: BookPaperSizeId, pageSize: PageSize): { width: number; height: number } {
  if (id === 'A4') return { width: 1748, height: 2480 };
  if (id === 'A3') return { width: 2480, height: 3508 };
  const basePxPerMm = 1748 / 210;
  let width = Math.round(pageSize.widthMm * basePxPerMm);
  let height = Math.round(pageSize.heightMm * basePxPerMm);
  const maxDim = 3800;
  if (height > maxDim) {
    const scale = maxDim / height;
    width = Math.round(width * scale);
    height = maxDim;
  }
  return { width, height };
}

export const BOOK_PAPER_SPECS: Record<BookPaperSizeId, BookPaperSpec> = (
  Object.keys(PAPER_METADATA) as BookPaperSizeId[]
).reduce((acc, id) => {
  const meta = PAPER_METADATA[id];
  const pageSize = getPageSize(meta.pageSizeKey);
  const canvasDims = computeCoverCanvasDimensions(id, pageSize);
  acc[id] = {
    id,
    pageSizeKey: meta.pageSizeKey,
    pageSize,
    shortTitle: meta.shortTitle,
    technicalParen: meta.technicalParen,
    usageSubtitle: meta.usageSubtitle,
    widthMm: pageSize.widthMm,
    heightMm: pageSize.heightMm,
    widthPt: pageSize.widthPt,
    heightPt: pageSize.heightPt,
    coverCanvasWidth: canvasDims.width,
    coverCanvasHeight: canvasDims.height,
    recommendedFor: meta.recommendedFor,
  };
  return acc;
}, {} as Record<BookPaperSizeId, BookPaperSpec>);

export function resolveBookPaperSpec(paperSize?: string): BookPaperSpec {
  const normalized = (paperSize || 'A4').toUpperCase() as BookPaperSizeId;
  return BOOK_PAPER_SPECS[normalized] || BOOK_PAPER_SPECS.A4;
}

export interface BookPrintProfileDefaults {
  paperSize: BookPaperSizeId;
  destination: 'A' | 'B' | 'C';
  unprintableMarginMm: number;
  showGuides: boolean;
  applyCreep: boolean;
  paperThicknessMm: number;
}

export interface BookPrintProfileConfig {
  id: BookPrintTarget;
  emoji: string;
  shortName: string;
  pillText: string;
  title: string;
  summary: string;
  allowedPaperSizes: BookPaperSizeId[];
  defaults: BookPrintProfileDefaults;
}

export const BOOK_PRINT_PROFILES: Record<BookPrintTarget, BookPrintProfileConfig> = {
  home: {
    id: 'home',
    emoji: '🏠',
    shortName: 'En casa',
    pillText: 'En casa',
    title: 'Imprimir en casa o en oficina',
    summary:
      'Hojas fáciles de conseguir hasta doble grande (A4, Carta, Oficio, Legal o A3), con margen de seguridad para que tu impresora no corte los bordes.',
    allowedPaperSizes: ['A4', 'CARTA', 'OFICIO', 'LEGAL', 'A3'],
    defaults: {
      paperSize: 'A4',
      destination: 'A',
      unprintableMarginMm: 5,
      showGuides: false,
      applyCreep: false,
      paperThicknessMm: 0,
    },
  },
  print_shop: {
    id: 'print_shop',
    emoji: '🏭',
    shortName: 'Imprenta',
    pillText: 'Imprenta',
    title: 'Llevar a imprenta o centro gráfico',
    summary:
      'Hojas grandes de imprenta (A3, SRA3, A3+ o A2), impresión al borde sin margen blanco, líneas guía para recortar y opción de tapa envolvente con lomo.',
    allowedPaperSizes: ['A3', 'SRA3', 'A3_PLUS', 'A2'],
    defaults: {
      paperSize: 'SRA3',
      destination: 'C',
      unprintableMarginMm: 0,
      showGuides: true,
      applyCreep: true,
      paperThicknessMm: 0.12,
    },
  },
};

export interface BookControlledFieldLabels {
  [field: string]: string;
}

export const BOOK_CONTROLLED_FIELD_LABELS: BookControlledFieldLabels = {
  paperSize: 'Hoja donde se imprimirá',
  destination: 'Destino de tapa y contratapa',
  unprintableMarginMm: 'Margen de borde de impresora',
  showGuides: 'Guías de doblez y recorte',
  applyCreep: 'Ajuste de páginas de adentro',
  paperThicknessMm: 'Grosor del papel para el lomo',
};

export function inferBookPrintTarget(options: {
  printTarget?: BookPrintTarget;
  paperSize?: BookPaperSizeId;
  unprintableMarginMm?: number;
  destination?: 'A' | 'B' | 'C';
}): BookPrintTarget {
  if (options.printTarget === 'home' || options.printTarget === 'print_shop') {
    return options.printTarget;
  }
  const paper = (options.paperSize || 'A4').toUpperCase() as BookPaperSizeId;
  if (paper === 'SRA3' || paper === 'A3_PLUS' || paper === 'A2') return 'print_shop';
  if (options.unprintableMarginMm === 0 && options.destination === 'C') return 'print_shop';
  return 'home';
}

export function detectBookPrintTargetConflicts<T extends Record<string, any>>(
  currentOptions: T,
  target: BookPrintTarget,
): GlobalCascadeConflict[] {
  const profile = BOOK_PRINT_PROFILES[target];
  return detectGlobalConflicts(
    currentOptions,
    profile.defaults as unknown as Record<string, unknown>,
    BOOK_CONTROLLED_FIELD_LABELS,
  );
}

export function applyBookPrintProfile<T extends { manualOverrides?: Record<string, boolean>; printTarget?: BookPrintTarget }>(
  currentOptions: T,
  target: BookPrintTarget,
  mode: GlobalApplyMode = 'preserve-manual',
): T {
  const profile = BOOK_PRINT_PROFILES[target];
  const applied = applyGlobalConfigWithCascade(currentOptions, {
    alwaysPatch: { printTarget: target } as Partial<T>,
    defaultsPatch: profile.defaults as unknown as Partial<T>,
    mode,
  });
  // En casa no existe la cubierta envolvente con lomo (destino C): se normaliza.
  const asRecord = applied as unknown as { destination?: string; manualOverrides?: Record<string, boolean> };
  if (target === 'home' && asRecord.destination === 'C') {
    return {
      ...applied,
      destination: asRecord.manualOverrides?.destination ? 'B' : 'A',
    } as T;
  }
  return applied;
}

export function markBookFieldManual<T extends { manualOverrides?: Record<string, boolean> }>(
  currentOptions: T,
  fieldKey: keyof BookPrintProfileDefaults,
): T {
  return markManualOverride(currentOptions, String(fieldKey));
}

export function clearBookFieldManual<T extends { manualOverrides?: Record<string, boolean>; printTarget?: BookPrintTarget; paperSize?: BookPaperSizeId }>(
  currentOptions: T,
  fieldKey: keyof BookPrintProfileDefaults,
): T {
  const target = inferBookPrintTarget(currentOptions);
  const profile = BOOK_PRINT_PROFILES[target];
  return clearManualOverride(currentOptions, String(fieldKey), profile.defaults[fieldKey]);
}
