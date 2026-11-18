import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests de la retención Opción B de unclaimed_email_credits (PR-D2):
 *  - día 7 sin reclamar → 1 único email recordatorio (claim atómico, revert si falla).
 *  - día 365 sin reclamar → expira + anonimiza el email conservando importes.
 */

const h = vi.hoisted(() => ({
  from: vi.fn(),
  reminderEmail: vi.fn(),
  adminNotificationCreate: vi.fn(),
  captureBackendException: vi.fn(),
}));

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  supabaseAdmin: { from: h.from },
}));

vi.mock('../../api/_lib/serverDal.js', () => ({
  serverDal: {
    adminNotifications: { create: h.adminNotificationCreate },
  },
}));

vi.mock('../../api/_lib/emails/sendUnclaimedCreditsReminder.js', () => ({
  sendUnclaimedCreditsReminder: h.reminderEmail,
}));

vi.mock('../../api/_lib/sentryBackend.js', () => ({
  captureBackendException: h.captureBackendException,
}));

import {
  sendUnclaimedReminders,
  expireUnclaimedCredits,
  UNCLAIMED_REMINDER_DAYS,
  UNCLAIMED_EXPIRE_DAYS,
} from '../../api/_lib/unclaimedCreditsMaintenance.js';

/** Builder supabase-js encadenable y "thenable" (await sobre la cadena). */
function chainable(result: any) {
  const b: any = {};
  for (const m of ['select', 'eq', 'is', 'lt', 'limit', 'order', 'update', 'insert', 'range']) {
    b[m] = vi.fn(() => b);
  }
  b.maybeSingle = vi.fn(async () => result);
  b.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return b;
}

/** Encola resultados: cada from() consume el siguiente. */
function queueFromResults(results: any[]) {
  const builders: any[] = [];
  h.from.mockImplementation(() => {
    const next = results.length > 0 ? results.shift() : { data: null, error: null };
    const b = chainable(next);
    builders.push(b);
    return b;
  });
  return builders;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.reminderEmail.mockResolvedValue(true);
  h.adminNotificationCreate.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('constantes de retención (Opción B)', () => {
  it('recordatorio a los 7 días y expiración a los 365', () => {
    expect(UNCLAIMED_REMINDER_DAYS).toBe(7);
    expect(UNCLAIMED_EXPIRE_DAYS).toBe(365);
  });
});

describe('sendUnclaimedReminders', () => {
  it('envía 1 único recordatorio por fila candidata y marca reminder_sent_at', async () => {
    queueFromResults([
      // select de candidatos
      { data: [{ id: 'u1', email: 'a@x.com', credits: 5 }], error: null },
      // claim atómico (maybeSingle)
      { data: { id: 'u1' }, error: null },
    ]);

    const summary = await sendUnclaimedReminders();

    expect(summary).toEqual({ candidates: 1, sent: 1, failed: 0 });
    expect(h.reminderEmail).toHaveBeenCalledTimes(1);
    expect(h.reminderEmail).toHaveBeenCalledWith('a@x.com', 5);
  });

  it('si el envío falla revierte el sello para reintentar en la próxima corrida', async () => {
    h.reminderEmail.mockResolvedValue(false);
    const builders = queueFromResults([
      { data: [{ id: 'u2', email: 'b@x.com', credits: 1 }], error: null },
      { data: { id: 'u2' }, error: null }, // claim OK
      { error: null },                      // revert (update reminder_sent_at=null)
    ]);

    const summary = await sendUnclaimedReminders();

    expect(summary).toEqual({ candidates: 1, sent: 0, failed: 1 });
    const reverted = builders.some((b) =>
      b.update.mock.calls.some((args: any[]) => args[0]?.reminder_sent_at === null)
    );
    expect(reverted).toBe(true);
  });

  it('no envía si otra operación ganó la carrera del claim (maybeSingle → null)', async () => {
    queueFromResults([
      { data: [{ id: 'u3', email: 'c@x.com', credits: 10 }], error: null },
      { data: null, error: null }, // perdió la carrera
    ]);

    const summary = await sendUnclaimedReminders();

    expect(summary).toEqual({ candidates: 1, sent: 0, failed: 0 });
    expect(h.reminderEmail).not.toHaveBeenCalled();
  });
});

describe('expireUnclaimedCredits', () => {
  it('expira y anonimiza el email conservando importes; notifica UNA vez al admin', async () => {
    const builders = queueFromResults([
      // select de candidatos
      { data: [{ id: 'e1' }, { id: 'e2' }], error: null },
      // update por fila (maybeSingle)
      { data: { id: 'e1' }, error: null },
      { data: { id: 'e2' }, error: null },
    ]);

    const summary = await expireUnclaimedCredits();

    expect(summary).toEqual({ expired: 2 });
    const anonUpdates = builders.filter((b) =>
      b.update.mock.calls.some((args: any[]) =>
        String(args[0]?.email || '').startsWith('anonymized+') &&
        String(args[0]?.email || '').endsWith('@expired.invalid') &&
        Boolean(args[0]?.expired_at)
      )
    );
    expect(anonUpdates).toHaveLength(2);
    expect(h.adminNotificationCreate).toHaveBeenCalledTimes(1);
    expect(h.adminNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'unclaimed_credits_expired' })
    );
  });

  it('sin candidatos no notifica', async () => {
    queueFromResults([{ data: [], error: null }]);

    const summary = await expireUnclaimedCredits();

    expect(summary).toEqual({ expired: 0 });
    expect(h.adminNotificationCreate).not.toHaveBeenCalled();
  });
});
