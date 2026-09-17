import { useState, useEffect } from 'react';
import { BREAKPOINTS, BreakpointCategory } from './breakpoints';

export function useIsMobile(breakpointPx: number = BREAKPOINTS.tablet) {
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

export function useIsSmallMobile(breakpointPx: number = BREAKPOINTS.mobile) {
  const [isSmall, setIsSmall] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < breakpointPx : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const handler = () => setIsSmall(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpointPx]);

  return isSmall;
}

export interface ResponsiveInfo {
  isMobile: boolean;
  isSmallMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

export function useResponsive(): ResponsiveInfo {
  const [info, setInfo] = useState<ResponsiveInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isSmallMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1200,
        height: 800,
        orientation: 'landscape',
      };
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      isMobile: w < BREAKPOINTS.tablet,
      isSmallMobile: w < BREAKPOINTS.mobile,
      isTablet: w >= BREAKPOINTS.tablet && w < BREAKPOINTS.desktop,
      isDesktop: w >= BREAKPOINTS.desktop,
      width: w,
      height: h,
      orientation: w >= h ? 'landscape' : 'portrait',
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setInfo({
        isMobile: w < BREAKPOINTS.tablet,
        isSmallMobile: w < BREAKPOINTS.mobile,
        isTablet: w >= BREAKPOINTS.tablet && w < BREAKPOINTS.desktop,
        isDesktop: w >= BREAKPOINTS.desktop,
        width: w,
        height: h,
        orientation: w >= h ? 'landscape' : 'portrait',
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return info;
}

export function useBreakpoint(): BreakpointCategory {
  const [category, setCategory] = useState<BreakpointCategory>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width < BREAKPOINTS.tablet) return 'mobile';
    if (width < BREAKPOINTS.desktop) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.tablet) {
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
