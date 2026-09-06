import React from 'react';

export interface MarketingSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function MarketingSection({ children, className = '', id }: MarketingSectionProps) {
  return (
    <section id={id} className={`py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto ${className}`}>
      {children}
    </section>
  );
}
