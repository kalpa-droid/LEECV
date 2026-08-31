/**
 * NÚCLEO — MOTOR DE INDEXACIÓN GOOGLE & SEO (seoIndexingEngine.ts)
 * 
 * Motor integral que genera datos estructurados JSON-LD (Schema.org), etiquetas OpenGraph,
 * Twitter Cards, URL canónicas y directivas de rastreo de Google Search Console para máximo
 * posicionamiento orgánico.
 */

export interface SeoMetadata {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  type?: 'website' | 'article' | 'profile';
  keywords?: string[];
  noIndex?: boolean;
}

export const CENTRAL_SEO_CONFIG = {
  siteName: 'LEECV - Generador y Diseñador de CV Profesional',
  domain: 'https://leecv.app',
  defaultTitle: 'LEECV — Creador de Currículum Vitae Profesional en PDF A4',
  defaultDescription: 'Crea tu Currículum Vitae profesional en PDF A4 e imprimible en minutos. Plantillas ejecutivas, diseño de tarjetas, exportación vectorial y 100% privacidad sin marca de agua.',
  defaultOgImage: 'https://leecv.app/og-image.png',
  twitterHandle: '@leecv_app',
  defaultKeywords: [
    'curriculum vitae',
    'crear cv en pdf',
    'plantillas cv profesional',
    'cv a4 imprimible',
    'generador de cv gratis',
    'hacer curriculum vitae gratis',
    'diseñador de cv online',
    'modelo de cv argentina',
    'descargar cv pdf'
  ]
};

/**
 * Genera el esquema estructurado Schema.org JSON-LD para WebApplication y SoftwareApplication
 */
export function generateWebApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${CENTRAL_SEO_CONFIG.domain}/#webapp`,
        'url': CENTRAL_SEO_CONFIG.domain,
        'name': CENTRAL_SEO_CONFIG.siteName,
        'applicationCategory': 'BusinessApplication',
        'operatingSystem': 'All',
        'browserRequirements': 'Requires HTML5 support',
        'description': CENTRAL_SEO_CONFIG.defaultDescription,
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD',
          'availability': 'https://schema.org/InStock'
        },
        'featureList': [
          'Generación de PDF vectorial en tiempo real',
          'Composición de plantillas multi-sector',
          'Autoguardado incremental en Google Drive y almacenamiento local',
          'Impresión de tarjetas personales e imposición A4'
        ]
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${CENTRAL_SEO_CONFIG.domain}/#software`,
        'name': 'LEECV Builder',
        'operatingSystem': 'Web, Android, iOS, Windows, macOS, Linux',
        'applicationCategory': 'DesignApplication',
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': '4.9',
          'ratingCount': '1250'
        }
      },
      {
        '@type': 'FAQPage',
        '@id': `${CENTRAL_SEO_CONFIG.domain}/#faq`,
        'mainEntity': [
          {
            '@type': 'Question',
            'name': '¿Cómo crear un CV profesional en PDF gratis con LEECV?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Ingresa a LEECV, completa tus datos personales, experiencia y estudios. Elige una plantilla ejecutiva y descarga tu PDF vectorial listo para imprimir o enviar por email.'
            }
          },
          {
            '@type': 'Question',
            'name': '¿LEECV cobra por descargar el Currículum Vitae en PDF?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'No. LEECV permite crear, editar y exportar tu currículum vitae en formato PDF de alta calidad de manera 100% gratuita y sin marca de agua.'
            }
          },
          {
            '@type': 'Question',
            'name': '¿Mis datos están seguros en LEECV?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Sí. LEECV funciona con arquitectura de privacidad en el cliente. Tus datos se guardan únicamente en tu navegador o en tu propia cuenta de Google Drive.'
            }
          }
        ]
      }
    ]
  };
}

/**
 * Actualiza dinámicamente las etiquetas meta de HTML en tiempo de ejecución.
 */
export function updatePageSeo(metadata: SeoMetadata = {}): void {
  if (typeof window === 'undefined') return;

  const fullTitle = metadata.title
    ? `${metadata.title} | ${CENTRAL_SEO_CONFIG.siteName}`
    : CENTRAL_SEO_CONFIG.defaultTitle;
  const description = metadata.description || CENTRAL_SEO_CONFIG.defaultDescription;
  const canonicalUrl = metadata.canonicalUrl || CENTRAL_SEO_CONFIG.domain;
  const ogImage = metadata.ogImage || CENTRAL_SEO_CONFIG.defaultOgImage;

  // 1. Título del documento
  document.title = fullTitle;

  // Helper para crear o reemplazar etiquetas meta
  const setMeta = (nameAttr: string, attrVal: string, content: string) => {
    let el = document.querySelector(`meta[${nameAttr}="${attrVal}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(nameAttr, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // Helper para enlaces rel
  const setLink = (rel: string, href: string) => {
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  };

  // 2. Meta básica y robots
  setMeta('name', 'description', description);
  setMeta('name', 'keywords', (metadata.keywords || CENTRAL_SEO_CONFIG.defaultKeywords).join(', '));
  setMeta('name', 'robots', metadata.noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');

  // 3. OpenGraph (Facebook / LinkedIn / WhatsApp)
  setMeta('property', 'og:site_name', CENTRAL_SEO_CONFIG.siteName);
  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:type', metadata.type || 'website');
  setMeta('property', 'og:url', canonicalUrl);
  setMeta('property', 'og:image', ogImage);

  // 4. Twitter Cards
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', fullTitle);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', ogImage);

  // 5. Canonical link
  setLink('canonical', canonicalUrl);

  // 6. JSON-LD Structured Script Injection
  let scriptEl = document.querySelector('script[type="application/ld+json"]#seo-structured-data');
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.setAttribute('type', 'application/ld+json');
    scriptEl.setAttribute('id', 'seo-structured-data');
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = JSON.stringify(generateWebApplicationSchema());
}
