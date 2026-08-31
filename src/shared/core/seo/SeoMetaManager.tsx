import React, { useEffect } from 'react';
import { updatePageSeo, SeoMetadata } from './seoIndexingEngine';

export interface SeoMetaManagerProps extends SeoMetadata {
  children?: React.ReactNode;
}

/**
 * Componente declarativo que administra los metadatos de SEO, OpenGraph y JSON-LD
 * según la pantalla o documento activo.
 */
export function SeoMetaManager({
  title,
  description,
  canonicalUrl,
  ogImage,
  type,
  keywords,
  noIndex,
  children
}: SeoMetaManagerProps) {
  useEffect(() => {
    updatePageSeo({
      title,
      description,
      canonicalUrl,
      ogImage,
      type,
      keywords,
      noIndex
    });
  }, [title, description, canonicalUrl, ogImage, type, keywords, noIndex]);

  return <>{children}</>;
}
