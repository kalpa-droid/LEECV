import React from 'react';
import { BookStudioContent } from './BookStudioContent';

interface BookStudioProps {
  currentUiTheme?: string;
  onBackToHome?: () => void;
  documentTabs?: any[];
  activeTabId?: string;
  onSelectTab?: (id: string) => void;
  onCloseTab?: (id: string) => void;
  onNavigateToDocument?: (id: string, targetDocType: 'cv' | 'business_card' | 'book') => void;
  onNewCV?: () => void;
  onNewBook?: () => void;
  cycleUITheme?: () => void;
  onTabsChanged?: (tabs: any[]) => void;
}

export const BookStudio: React.FC<BookStudioProps> = ({
  currentUiTheme = 'day',
  documentTabs = [{ id: 'book', title: 'Libro Principal', docType: 'book' }],
  activeTabId = 'book',
  onSelectTab = () => {},
  onCloseTab = () => {},
  onNavigateToDocument = () => {},
  onNewCV,
  onNewBook,
  cycleUITheme = () => {},
  onTabsChanged = () => {},
}) => {
  return (
    <BookStudioContent
      currentUiTheme={currentUiTheme}
      documentTabs={documentTabs}
      activeTabId={activeTabId}
      onSelectTab={onSelectTab}
      onCloseTab={onCloseTab}
      onNavigateToDocument={onNavigateToDocument}
      onNewCV={onNewCV}
      onNewBook={onNewBook}
      cycleUITheme={cycleUITheme}
      onTabsChanged={onTabsChanged}
    />
  );
};
