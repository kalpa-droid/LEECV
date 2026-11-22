import React from 'react';

export interface ActionGridProps {
  children: React.ReactNode;
  columns?: 1 | 2;
  className?: string;
}

/**
 * Grilla compacta para organizar botones mosaico (`ActionTileButton`) en 1 o 2
 * columnas limpias, reduciendo drásticamente el scroll vertical en móvil y escritorio.
 */
export const ActionGrid: React.FC<ActionGridProps> = ({
  children,
  columns = 2,
  className = '',
}) => {
  const colsClass =
    columns === 1
      ? 'grid-cols-1'
      : 'grid-cols-2';

  return (
    <div className={`grid ${colsClass} gap-2.5 ${className}`}>
      {children}
    </div>
  );
};
