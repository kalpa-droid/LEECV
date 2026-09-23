import { describe, it, expect } from 'vitest';
import { inferPdfRole } from '../recordLayoutEngine';

describe('inferPdfRole', () => {
  it('should infer badge for time-related keywords', () => {
    expect(inferPdfRole('fecha', '2023')).toBe('badge');
    expect(inferPdfRole('periodo', '2020-2023')).toBe('badge');
    expect(inferPdfRole('year', '2023')).toBe('badge');
  });

  it('should handle accents properly (NFD normalization)', () => {
    expect(inferPdfRole('período', '2023')).toBe('badge'); // Was failing before
    expect(inferPdfRole('duración', '3 meses')).toBe('badge');
    expect(inferPdfRole('año', '2023')).toBe('badge');
    expect(inferPdfRole('título', 'Licenciado')).toBe('title');
  });

  it('should infer extra for links', () => {
    expect(inferPdfRole('linkedin', 'user')).toBe('extra');
    expect(inferPdfRole('url', 'http://a.com')).toBe('extra');
    expect(inferPdfRole('someUnknownKey', 'http://my-portfolio.com')).toBe('extra'); // Data heuristic
    expect(inferPdfRole('contacto', 'test@test.com')).toBe('extra'); // Data heuristic (@)
  });

  it('should infer title and subtitle', () => {
    expect(inferPdfRole('nombreEmpresa', 'Acme Corp')).toBe('subtitle');
    expect(inferPdfRole('cargoOcupado', 'Gerente')).toBe('title');
  });

  it('should infer description for long text or newlines', () => {
    expect(inferPdfRole('notas', 'A\nB')).toBe('description'); // Newline heuristic
    const longText = 'A'.repeat(121);
    expect(inferPdfRole('cualquierCosa', longText)).toBe('description'); // Length heuristic
  });
});
