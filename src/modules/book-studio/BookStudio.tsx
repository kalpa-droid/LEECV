import React from 'react';
import { BookStudioContent } from './BookStudioContent';

interface BookStudioProps {
  onBackToHome?: () => void;
  documentTabs?: any[];
  activeTabId?: string;
  onSelectTab?: (id: string) => void;
  onCloseTab?: (id: string) => void;
  onNavigateToDocument?: (id: string, targetDocType: 'cv' | 'business_card' | 'book') => void;
  onNewCV?: () => void;
  onNewBook?: () => void;
  cycleUITheme?: () => void;
}

export const BookStudio: React.FC<BookStudioProps> = ({
  documentTabs = [{ id: 'book', title: 'Libro Principal', docType: 'book' }],
  activeTabId = 'book',
  onSelectTab = () => {},
  onCloseTab = () => {},
  onNavigateToDocument = () => {},
  onNewCV,
  onNewBook,
  cycleUITheme = () => {},
}) => {
  return (
    <BookStudioContent
      documentTabs={documentTabs}
      activeTabId={activeTabId}
      onSelectTab={onSelectTab}
      onCloseTab={onCloseTab}
      onNavigateToDocument={onNavigateToDocument}
      onNewCV={onNewCV}
      onNewBook={onNewBook}
      cycleUITheme={cycleUITheme}
    />
  );
};
