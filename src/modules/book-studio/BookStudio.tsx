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
  onNewCard?: () => void;
  onNewBook?: () => void;
  cycleUITheme?: () => void;
  onTabsChanged?: (tabs: any[]) => void;
  isLoggedIn?: boolean;
  onAuthToggle?: () => void;
}

export const BookStudio: React.FC<BookStudioProps> = ({
  currentUiTheme = 'day',
  documentTabs = [{ id: 'book', title: 'Libro Principal', docType: 'book' }],
  activeTabId = 'book',
  onSelectTab = () => {},
  onCloseTab = () => {},
  onNavigateToDocument = () => {},
  onNewCV,
  onNewCard,
  onNewBook,
  cycleUITheme = () => {},
  onTabsChanged = () => {},
  isLoggedIn = false,
  onAuthToggle = () => {},
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
      onNewCard={onNewCard}
      onNewBook={onNewBook}
      cycleUITheme={cycleUITheme}
      onTabsChanged={onTabsChanged}
      isLoggedIn={isLoggedIn}
      onAuthToggle={onAuthToggle}
    />
  );
};
