import { describe, expect, it } from 'vitest';
import { normalizeAiDraftRecord } from '../src/shared/core/ui/RecordFormSection';

describe('normalizeAiDraftRecord — normalización de borradores devueltos por la IA', () => {
  const courseFields = ['tituloOGrado', 'institucion', 'periodo', 'cargaHoraria', 'descripcion'];

  it('conserva claves que ya son campos válidos de la sección', () => {
    const out = normalizeAiDraftRecord(
      { tituloOGrado: 'Curso de React', institucion: 'Platzi', descripcion: 'Avanzado' },
      courseFields
    );
    expect(out).toEqual({ tituloOGrado: 'Curso de React', institucion: 'Platzi', descripcion: 'Avanzado' });
  });

  it('traduce alias conocidos al campo canónico (titulo → tituloOGrado, description → descripcion)', () => {
    const out = normalizeAiDraftRecord(
      { titulo: 'Curso de React', empresa: 'Platzi', description: 'Avanzado' },
      courseFields
    );
    expect(out).toEqual({ tituloOGrado: 'Curso de React', institucion: 'Platzi', descripcion: 'Avanzado' });
  });

  it('descarta claves desconocidas y valores vacíos — nunca inventa campos', () => {
    const out = normalizeAiDraftRecord(
      { tituloOGrado: 'Curso', textoLibre: 'contenido suelto', nota: '9999', periodo: '' },
      courseFields
    );
    expect(out).toEqual({ tituloOGrado: 'Curso' });
  });

  it('no pisa un campo ya válido con un alias del mismo destino', () => {
    const out = normalizeAiDraftRecord(
      { tituloOGrado: 'Curso original', titulo: 'Curso alternativo' },
      courseFields
    );
    expect(out.tituloOGrado).toBe('Curso original');
  });

  it('lanza nada ante entrada nula o no-objeto, y devuelve objeto vacío', () => {
    expect(normalizeAiDraftRecord(null, courseFields)).toEqual({});
    expect(normalizeAiDraftRecord(undefined, courseFields)).toEqual({});
    expect(normalizeAiDraftRecord('texto' as any, courseFields)).toEqual({});
  });

  it('alias de persona de referencia solo aplican donde la sección los declara', () => {
    const expFields = ['cargo', 'institucion', 'personaReferencia', 'contactoReferencia', 'descripcion'];
    const out = normalizeAiDraftRecord(
      { referencia: 'Juan Pérez', contacto: 'juan@example.com', cargo: 'Tech Lead' },
      expFields
    );
    expect(out).toEqual({ personaReferencia: 'Juan Pérez', contactoReferencia: 'juan@example.com', cargo: 'Tech Lead' });

    // En una sección sin esos campos el alias se descarta en vez de filtrarse a texto libre
    const courseOut = normalizeAiDraftRecord({ referencia: 'Juan Pérez', contacto: 'juan@example.com' }, courseFields);
    expect(courseOut).toEqual({});
  });

  it('convierte números a texto y hace trim', () => {
    const out = normalizeAiDraftRecord({ tituloOGrado: '  Curso  ', cargaHoraria: 40 }, courseFields);
    expect(out.tituloOGrado).toBe('Curso');
    expect(out.cargaHoraria).toBe('40');
  });
});
