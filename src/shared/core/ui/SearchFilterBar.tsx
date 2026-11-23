import React from 'react';
import { Search, X } from 'lucide-react';
import { elevationSystem, typeScale } from '../uiDesignSystem';

/**
 * Normaliza texto para búsqueda insensible a tildes, mayúsculas y espacios extra
 * (Regla 8: normalización NFD).
 */
export function normalizeSearchText(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evalúa si una entidad coincide con la búsqueda cuando tiene al menos `minChars` letras.
 * Si la consulta tiene menos de `minChars` caracteres, devuelve `true` (sin filtrar).
 */
export function matchesSearchQuery(
  fields: ReadonlyArray<string | number | null | undefined>,
  query: string,
  minChars = 3,
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < minChars) return true;

  const haystack = normalizeSearchText(
    fields.filter((f) => f !== null && f !== undefined && String(f).trim() !== '').join(' '),
  );
  if (!haystack) return false;

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

export interface SearchFilterBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minChars?: number;
  totalCount?: number;
  filteredCount?: number;
  className?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
}

export function SearchFilterBar({
  value,
  onChange,
  placeholder = 'Buscar (escribí al menos 3 letras)...',
  minChars = 3,
  totalCount,
  filteredCount,
  className = '',
  ariaLabel = 'Buscador',
  autoFocus = false,
}: SearchFilterBarProps) {
  const normalizedLen = normalizeSearchText(value).length;
  const isWaitingMoreChars = normalizedLen > 0 && normalizedLen < minChars;
  const isFilterActive = normalizedLen >= minChars;

  return (
    <div className={`space-y-1 ${className}`}>
      <div
        className={`relative flex items-center rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-btn-outline-bg)] ${elevationSystem.raised} focus-within:border-[var(--color-accent-base)] focus-within:ring-2 focus-within:ring-[var(--color-accent-muted)] transition-all`}
      >
        <Search className="w-3.5 h-3.5 text-[var(--color-neutral-text-secondary)] ml-3 shrink-0 pointer-events-none" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && value) {
              e.stopPropagation();
              onChange('');
            }
          }}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="w-full bg-transparent px-2.5 py-2 text-[12px] text-[var(--ui-text-primary)] placeholder:text-[var(--color-neutral-text-muted)] outline-none"
        />
        {isFilterActive && typeof filteredCount === 'number' && typeof totalCount === 'number' && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] shrink-0 mr-1">
            {filteredCount} de {totalCount}
          </span>
        )}
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Limpiar búsqueda"
            title="Limpiar búsqueda"
            className="p-1.5 mr-1 rounded-full text-[var(--color-neutral-text-secondary)] hover:text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-panel)] transition cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isWaitingMoreChars && (
        <p className={`${typeScale.micro} text-[var(--color-neutral-text-secondary)] pl-1`}>
          Escribí al menos {minChars} letras para filtrar...
        </p>
      )}
    </div>
  );
}

export default SearchFilterBar;
