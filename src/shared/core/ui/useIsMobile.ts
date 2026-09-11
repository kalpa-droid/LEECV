import { useState, useEffect } from 'react';
import { BREAKPOINTS, BreakpointCategory } from './breakpoints';

export function useIsMobile(breakpointPx: number = BREAKPOINTS.mobile) {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < breakpointPx : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpointPx]);

  return isMobile;
}

export function useBreakpoint(): BreakpointCategory {
  const [category, setCategory] = useState<BreakpointCategory>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width < BREAKPOINTS.mobile) return 'mobile';
    if (width < BREAKPOINTS.desktop) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.mobile) {
        setCategory('mobile');
      } else if (width < BREAKPOINTS.desktop) {
        setCategory('tablet');
      } else {
        setCategory('desktop');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return category;
}
