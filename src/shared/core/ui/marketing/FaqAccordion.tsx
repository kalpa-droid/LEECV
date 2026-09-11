import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqAccordionProps {
  items: FaqItem[];
  className?: string;
}

export const FaqAccordion: React.FC<FaqAccordionProps> = ({ items, className = '' }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div 
            key={index} 
            className="border border-[var(--ui-border)] bg-[var(--ui-bg-card)] rounded-[12px] overflow-hidden transition-all duration-200"
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full flex items-center justify-between p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-base)] cursor-pointer"
              aria-expanded={isOpen}
            >
              <span className="font-bold text-[var(--ui-text-primary)] pr-4">{item.question}</span>
              <ChevronDown 
                className={`w-5 h-5 text-[var(--ui-text-secondary)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
              />
            </button>
            
            <div 
              className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
              aria-hidden={!isOpen}
            >
              <div className="p-5 pt-0 text-[var(--ui-text-secondary)] text-sm leading-relaxed border-t border-transparent mt-1">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
