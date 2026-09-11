/**
 * Centralized Breakpoint Tokens for Responsive Layouts & Hooks.
 * Ensures CSS media queries and JS hooks use the exact same thresholds.
 */
export const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
} as const;

export type BreakpointCategory = 'mobile' | 'tablet' | 'desktop';
