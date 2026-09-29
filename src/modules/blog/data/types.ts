export interface FAQItem {
  question: string;
  answer: string;
}

export interface Article {
  slug: string;
  title: string;
  summary: string;
  category: string;
  readTime: string;
  date: string;
  author: string;
  content: string;
  ctaLabel?: string;
  ctaRoute?: string;
  schemaOrg?: Record<string, any>;
  faq?: FAQItem[];
}
