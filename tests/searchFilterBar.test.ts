import { describe, expect, it } from 'vitest';
import { matchesSearchQuery, normalizeSearchText } from '../src/shared/core/ui/SearchFilterBar';

describe('SearchFilterBar (búsqueda >= 3 letras y normalización NFD)', () => {
  it('normaliza tildes y mayúsculas', () => {
    expect(normalizeSearchText('  Facturación   Electrónica  ')).toBe('facturacion electronica');
  });

  it('no filtra cuando la consulta tiene menos de 3 caracteres', () => {
    expect(matchesSearchQuery(['Diseño Web'], 'x', 3)).toBe(true);
    expect(matchesSearchQuery(['Diseño Web'], 'di', 3)).toBe(true);
  });

  it('filtra por coincidencia multi-campo y múltiples palabras con >= 3 caracteres', () => {
    const fields = ['Servicio de Impresión', 'Folleto A4 doble faz', 'SKU-902'];
    expect(matchesSearchQuery(fields, 'imp', 3)).toBe(true);
    expect(matchesSearchQuery(fields, 'impresion 902', 3)).toBe(true);
    expect(matchesSearchQuery(fields, 'impresion xyz', 3)).toBe(false);
  });
});
