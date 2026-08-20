import React from 'react';

/**
 * Shared Spinner Component
 * Unified loading indicator
 */
export function Spinner({ size = 'md', className = '', label = null }) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-3',
    lg: 'w-10 h-10 border-4'
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <div
        className={`${sizeMap[size] || sizeMap.md} border-[#FF2E63] border-t-transparent rounded-full animate-spin flex-shrink-0`}
      />
      {label && <span className="text-xs font-bold text-[#2B1B2E]">{label}</span>}
    </div>
  );
}
