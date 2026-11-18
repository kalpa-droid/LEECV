import { describe, it, expect } from 'vitest';
import { formatPlanReference, parsePlanReference } from '../../api/_lib/paymentProviders/planReference.js';

const TOKEN = '550e8400-e29b-41d4-a716-446655440000'; // 36 chars
const UID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'; // 36 chars

describe('formatPlanReference — formato compacto', () => {
  it('plan|exportToken|userId queda dentro del límite de 127 chars de PayPal', () => {
    const ref = formatPlanReference('credits_pack_10', TOKEN, UID);
    expect(ref).toBe(`credits_pack_10|${TOKEN}|${UID}`);
    expect(ref.length).toBeLessThanOrEqual(127);
  });

  it('sin userId deja el segmento vacío pero mantiene el formato', () => {
    expect(formatPlanReference('single_pdf', TOKEN, undefined)).toBe(`single_pdf|${TOKEN}|`);
  });
});

describe('parsePlanReference — formato compacto y JSON legacy (retrocompat)', () => {
  it('parsea el formato compacto completo', async () => {
    const parsed = await parsePlanReference(`credits_pack_5|${TOKEN}|${UID}`, 'paypal', 'CAP-123');
    expect(parsed).toEqual({ plan: 'credits_pack_5', exportToken: TOKEN, userId: UID });
  });

  it('parsea el formato compacto sin userId', async () => {
    const parsed = await parsePlanReference(`single_pdf|${TOKEN}|`, 'mercadopago', 'MP-1');
    expect(parsed?.plan).toBe('single_pdf');
    expect(parsed?.exportToken).toBe(TOKEN);
    expect(parsed?.userId).toBeUndefined();
  });

  it('mantiene retrocompatibilidad con el JSON legacy ya en vuelo', async () => {
    const legacy = JSON.stringify({ exportToken: TOKEN, plan: 'credits_pack_10', userId: UID });
    const parsed = await parsePlanReference(legacy, 'paypal', 'CAP-2');
    expect(parsed).toEqual({ plan: 'credits_pack_10', exportToken: TOKEN, userId: UID });
  });

  it('JSON legacy sin campo plan sigue siendo single_pdf (comportamiento histórico)', async () => {
    const parsed = await parsePlanReference(JSON.stringify({ exportToken: TOKEN }), 'mercadopago', 'MP-2');
    expect(parsed?.plan).toBe('single_pdf');
  });

  it('referencia vacía o unparseable devuelve null (no acredita nada)', async () => {
    expect(await parsePlanReference(null, 'paypal', 'X')).toBeNull();
    expect(await parsePlanReference('', 'paypal', 'X')).toBeNull();
    expect(await parsePlanReference('no-es-json-ni-compacto', 'paypal', 'X')).toBeNull();
  });

  it('plan desconocido devuelve null (fail-closed, nunca pro por defecto)', async () => {
    expect(await parsePlanReference('plan_fantasma|tok|uid', 'paypal', 'X')).toBeNull();
    expect(await parsePlanReference(JSON.stringify({ plan: 'plan_fantasma', exportToken: 'tok' }), 'paypal', 'X')).toBeNull();
  });
});
