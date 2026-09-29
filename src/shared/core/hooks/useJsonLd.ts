import { useEffect } from 'react';

export function useJsonLd(schema: any | null) {
  useEffect(() => {
    if (!schema) return;
    
    // Create script element
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    
    // Check if one already exists with the same signature, else append
    // (In a simple SPA, we just append on mount and remove on unmount)
    document.head.appendChild(script);
    
    return () => {
      document.head.removeChild(script);
    };
  }, [schema]);
}
