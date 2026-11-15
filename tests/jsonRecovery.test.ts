/**
 * Regresión: recuperación de JSON desde texto libre de proveedores de IA.
 * Contrato usado por api/ai-generate.ts para validar la respuesta en el servidor.
 */
import { describe, it, expect } from 'vitest';
import { recoverJsonFromText } from '../api/_lib/aiProviders/jsonRecovery';

describe('recoverJsonFromText — extracción de JSON de texto libre', () => {
  it('devuelve ok:true para JSON válido plano', () => {
    const r = recoverJsonFromText('{"a": 1}');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ a: 1 });
      expect(JSON.parse(r.cleanText)).toEqual({ a: 1 });
    }
  });

  it('tolera fences de markdown ```json ... ```', () => {
    const r = recoverJsonFromText('```json\n{"a": 1, "b": [2, 3]}\n```');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ a: 1, b: [2, 3] });
  });

  it('tolera prosa antes y después del objeto', () => {
    const r = recoverJsonFromText('Claro, aquí está tu respuesta:\n{"summary": "hola"}\nEspero que te sirva.');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ summary: 'hola' });
  });

  it('acepta arrays JSON', () => {
    const r = recoverJsonFromText('[1, 2, 3]');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([1, 2, 3]);
  });

  it('devuelve ok:false para JSON truncado', () => {
    expect(recoverJsonFromText('{"a": 1, "b":').ok).toBe(false);
    expect(recoverJsonFromText('[1, 2').ok).toBe(false);
  });

  it('devuelve ok:false para entrada vacía, nula o sin JSON', () => {
    expect(recoverJsonFromText('').ok).toBe(false);
    expect(recoverJsonFromText('   ').ok).toBe(false);
    expect(recoverJsonFromText(null).ok).toBe(false);
    expect(recoverJsonFromText(undefined).ok).toBe(false);
    expect(recoverJsonFromText('no hay json por acá').ok).toBe(false);
  });

  it('devuelve ok:false para JSON sintácticamente inválido aunque tenga llaves', () => {
    expect(recoverJsonFromText('{a: 1,}').ok).toBe(false);
  });
});
