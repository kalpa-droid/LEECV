import {
  ALL_DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_REGISTRY,
  type RegisteredDocumentTypeId,
} from '../../capabilities/capabilityRegistry';
import { APP_SURFACE_MANIFEST } from '../../capabilities/appSurfaceManifest';
import { PRODUCT_ICON_IDS } from '../iconCatalog';

export type LandingAppCategory = 'empleo' | 'estudio_libros' | 'negocio_organizacion';

export interface LandingAppEntry {
  id: RegisteredDocumentTypeId;
  querySlug: string;
  category: LandingAppCategory;
  categoryLabel: string;
  navLabel: string;
  badge: string;
  title: string;
  tagline: string;
  description: string;
  benefits: readonly string[];
  ctaLabel: string;
  route: string;
  image: string;
  detailImage: string;
  productIconId: string;
  order: number;
}

interface LandingAppMeta {
  querySlug: string;
  category: LandingAppCategory;
  categoryLabel: string;
  navLabel: string;
  badge: string;
  title: string;
  tagline: string;
  description: string;
  benefits: readonly string[];
  ctaLabel: string;
  image: string;
  detailImage: string;
  order: number;
}

const LANDING_APP_META: Partial<Record<RegisteredDocumentTypeId, LandingAppMeta>> = {
  cv: {
    querySlug: 'cv',
    category: 'empleo',
    categoryLabel: 'Empleo',
    navLabel: 'Creador de CV',
    badge: 'Incluye Carta y Tarjeta QR gratis',
    title: 'Creador de CV + Carta y Tarjeta QR',
    tagline: 'Diseñado para superar filtros de selección · Carta y Tarjeta incluidas gratis',
    description:
      'Armá tu currículum en minutos, verificá la lectura automática y generá gratis tu Carta de Presentación y tu Tarjeta Personal con código QR desde los mismos datos.',
    benefits: [
      'Incluye Carta de Presentación y Tarjeta Personal con QR gratis',
      'Lectura clara para sistemas de selección, sin capas gráficas rotas',
      'Foto personal, firma y certificados en un solo archivo',
    ],
    ctaLabel: 'Crear mi CV gratis',
    image: '/marketing/preview-cv.webp',
    detailImage: '/marketing/preview-cv-detail.webp',
    order: 1,
  },
  editorial: {
    querySlug: 'editorlee',
    category: 'estudio_libros',
    categoryLabel: 'Estudio y Libros',
    navLabel: 'EditorLee',
    badge: 'Tesis, Libros e Informes',
    title: 'EditorLee — Tesis, Libros e Informes',
    tagline: 'Índice automático, citas académicas y exportación a PDF y Word',
    description:
      'Escribí o importá tus capítulos. EditorLee ordena portadas, notas al pie, bibliografía e índice general automáticamente, listo para entregar o encuadernar.',
    benefits: [
      'Índice automático, citas académicas y notas al pie ordenadas',
      'Descargá en PDF listo para imprimir o en Word editable (.docx)',
      'Opción de Pase Permanente de pago único sin abonos mensuales',
    ],
    ctaLabel: 'Abrir EditorLee gratis',
    image: '/marketing/preview-editor.webp',
    detailImage: '/marketing/preview-editor-detail.webp',
    order: 2,
  },
  book: {
    querySlug: 'libro',
    category: 'estudio_libros',
    categoryLabel: 'Estudio y Libros',
    navLabel: 'Libros y Folletos',
    badge: 'Listo para doblar',
    title: 'Libros y Folletos para Doblar',
    tagline: 'Páginas ordenadas automáticamente para imprimir en casa o en una imprenta',
    description:
      'Subí cualquier PDF y preparalo en minutos para doblar al medio como libro o folleto, con tapa, contratapa y separadores listos para armar.',
    benefits: [
      'Páginas reordenadas solas para imprimir en casa o llevar a una imprenta',
      'Portada, contratapa y separadores de capítulo en un clic',
      'Pagás solo 1 crédito cuando descargás el libro terminado',
    ],
    ctaLabel: 'Armar libro o folleto',
    image: '/marketing/preview-libro.webp',
    detailImage: '/marketing/preview-libro-detail.webp',
    order: 3,
  },
  invoice: {
    querySlug: 'facturlee',
    category: 'negocio_organizacion',
    categoryLabel: 'Negocio y Organización',
    navLabel: 'FacturLee',
    badge: '3 comprobantes gratis',
    title: 'FacturLee — Presupuestos y Comprobantes',
    tagline: 'Tus clientes, productos y comprobantes guardados con clave en tu computadora',
    description:
      'Creá presupuestos, remitos y recibos comerciales con cálculos automáticos y catálogo propio. Tus datos quedan cifrados en tu equipo y podés probar los primeros 3 PDFs gratis.',
    benefits: [
      'Tus primeros 3 comprobantes PDF son gratis para probar sin compromiso',
      'Bóveda cifrada en tu dispositivo más exportación a Excel de 5 hojas',
      'Opción de Pase Permanente de pago único, sin alquiler mensual',
    ],
    ctaLabel: 'Crear primer comprobante',
    image: '/marketing/preview-factura.webp',
    detailImage: '/marketing/preview-factura-detail.webp',
    order: 4,
  },
  planner: {
    querySlug: 'agenda',
    category: 'negocio_organizacion',
    categoryLabel: 'Negocio y Organización',
    navLabel: 'Agendas',
    badge: 'Año Completo',
    title: 'Agendas y Planificadores Anuales',
    tagline: '12 meses completos, vista semanal o diaria y hojas con puntos guía',
    description:
      'Personalizá tu agenda anual con tus colores favoritos, grilla de puntos o renglones, seguimiento de hábitos y margen cuidado para anillar o imprimir en casa.',
    benefits: [
      '12 meses completos con inicio en lunes o domingo',
      'Fondos con puntos guía, renglones o cuadrícula limpia',
      'Descargá el archivo listo para imprimir y anillar',
    ],
    ctaLabel: 'Diseñar mi agenda',
    image: '/marketing/preview-agenda.webp',
    detailImage: '/marketing/preview-agenda-detail.webp',
    order: 5,
  },
};

export const LANDING_APPS_CATALOG: readonly LandingAppEntry[] = ALL_DOCUMENT_TYPE_IDS
  .filter((id) => APP_SURFACE_MANIFEST[id]?.features.hasLandingCard === true)
  .map((id): LandingAppEntry | null => {
    const reg = DOCUMENT_TYPE_REGISTRY[id];
    const meta = LANDING_APP_META[id];
    if (!reg || !meta) return null;
    return {
      id,
      querySlug: meta.querySlug,
      category: meta.category,
      categoryLabel: meta.categoryLabel,
      navLabel: meta.navLabel,
      badge: meta.badge,
      title: meta.title,
      tagline: meta.tagline,
      description: meta.description,
      benefits: meta.benefits,
      ctaLabel: meta.ctaLabel,
      route: reg.route,
      image: meta.image,
      detailImage: meta.detailImage,
      productIconId: reg.ui.productIconId || PRODUCT_ICON_IDS.cv,
      order: meta.order,
    };
  })
  .filter((entry): entry is LandingAppEntry => entry !== null)
  .sort((a, b) => a.order - b.order);

export function findLandingAppByQuery(appParam?: string | null): LandingAppEntry {
  const normalized = (appParam || '').trim().toLowerCase();
  if (normalized) {
    const found = LANDING_APPS_CATALOG.find(
      (item) => item.querySlug === normalized || item.id === normalized,
    );
    if (found) return found;
  }
  return LANDING_APPS_CATALOG[0];
}
