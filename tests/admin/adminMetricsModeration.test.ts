import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests de las server actions admin agregadas en PR-E:
 * metrics-by-product / list-published-cvs / set-published-cv-active /
 * list-ai-cooldowns.
 *
 * Reglas de seguridad que se defienden acá:
 *
 * 1. Toda acción pasa por requireAdmin + requireRateLimit; los errores 500
 *    devuelven un mensaje genérico (nunca err.message del backend).
 * 2. set-published-cv-active valida UUID e isActive estrictamente, NUNCA
 *    borra nada (solo cambia is_active) y audita en admin_audit_logs.
 * 3. list-published-cvs pagina acotando limit; la búsqueda por email ocurre
 *    server-side (el cliente nunca recibe emails que no pidió... más allá
 *    de que es un panel admin: el punto es no filtrar datos crudos de DB).
 * 4. list-ai-cooldowns nunca expone la key ni el hash completo (el test fija
 *    que la respuesta viene tal cual del DAL, que devuelve solo el prefix).
 */

const h = vi.hoisted(() => ({
  countByDocType: vi.fn(),
  countPaidByDocType: vi.fn(),
  revenueByPlanCurrency: vi.fn(),
  listForModeration: vi.fn(),
  setActive: vi.fn(),
  adminAuditLog: vi.fn(),
  listActiveCooldowns: vi.fn(),
}));

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
  },
}));

vi.mock('../../api/_lib/authMiddleware.js', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-user-1' } }),
}));

vi.mock('../../api/_lib/rateLimiter.js', () => ({
  requireRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../api/_lib/serverDal.js', () => ({
  serverDal: {
    profiles: { getById: vi.fn(), updateSubscription: vi.fn() },
    adminAuditLogs: { log: h.adminAuditLog },
    unclaimedCredits: {
      listPending: vi.fn(),
      getById: vi.fn(),
      markReminded: vi.fn(),
    },
    cvs: { countByDocType: h.countByDocType },
    exportTokens: { countPaidByDocType: h.countPaidByDocType },
    processedPayments: { revenueByPlanCurrency: h.revenueByPlanCurrency },
    publishedCvs: { listForModeration: h.listForModeration, setActive: h.setActive },
    aiKeyCooldowns: { listActive: h.listActiveCooldowns },
  },
}));

vi.mock('../../api/_lib/applyPayment.js', () => ({
  applyPayment: vi.fn().mockResolvedValue({ type: 'payment_applied' }),
}));

vi.mock('../../api/_lib/sentryBackend.js', () => ({
  captureBackendException: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../api/_lib/paymentProviders/registry.js', () => ({
  diagnoseAllProviders: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../api/_lib/aiProviders/registry.js', () => ({
  AI_PROVIDERS: {},
}));

vi.mock('../../api/_lib/aiProviders/keyRotation.js', () => ({
  getAiKeyCooldownSummary: vi.fn().mockResolvedValue({}),
  clearExpiredCooldowns: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../api/_lib/paymentReconciler.js', () => ({
  reconcilePendingPayments: vi.fn(),
}));

vi.mock('../../api/_lib/emails/sendUnclaimedCreditsReminder.js', () => ({
  sendUnclaimedCreditsReminder: vi.fn(),
}));

import handler from '../../api/admin-api.js';
import { requireAdmin } from '../../api/_lib/authMiddleware.js';
import { requireRateLimit } from '../../api/_lib/rateLimiter.js';

const UUID = '123e4567-e89b-12d3-a456-426655440000';

function makeRes() {
  const res: any = {
    statusCode: 0,
    body: null as any,
    status(code: number) { res.statusCode = code; return res; },
    json(payload: any) { res.body = payload; return res; },
  };
  return res;
}

function makeReq(body: any, query: Record<string, string> = {}, method: 'GET' | 'POST' = 'GET') {
  return {
    method,
    query,
    body,
    headers: { 'x-forwarded-for': '1.2.3.4' },
    socket: { remoteAddress: '1.2.3.4' },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-user-1' } } as any);
  vi.mocked(requireRateLimit).mockResolvedValue(true as any);
  h.countByDocType.mockResolvedValue([{ docType: 'cv', count: 12 }]);
  h.countPaidByDocType.mockResolvedValue([{ docType: 'cv', count: 5 }]);
  h.revenueByPlanCurrency.mockResolvedValue([{ plan: 'single_pdf', currency: 'ars', totalAmount: 15000, count: 3 }]);
  h.listForModeration.mockResolvedValue({ items: [], totalCount: 0 });
  h.setActive.mockResolvedValue({ id: UUID, user_id: 'owner-1', slug: 'cv-juan', is_active: false });
  h.adminAuditLog.mockResolvedValue(undefined);
  h.listActiveCooldowns.mockResolvedValue([{ provider: 'groq', keyHashPrefix: 'a1b2c3d4', pausedUntil: '2026-11-18T12:00:00Z', updatedAt: '2026-11-18T10:00:00Z' }]);
});

describe('admin-api action=metrics-by-product - métricas por producto', () => {
  it('GET devuelve documentos, exportaciones pagas e ingresos agregados', async () => {
    const res = makeRes();
    await handler(makeReq({}, { action: 'metrics-by-product' }, 'GET'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.documentsByType).toEqual([{ docType: 'cv', count: 12 }]);
    expect(res.body?.paidExportsByDocType).toEqual([{ docType: 'cv', count: 5 }]);
    expect(res.body?.revenueByPlanCurrency).toEqual([{ plan: 'single_pdf', currency: 'ars', totalAmount: 15000, count: 3 }]);
    expect(res.body?.generatedAt).toBeTruthy();
    expect(h.countByDocType).toHaveBeenCalledTimes(1);
    expect(h.countPaidByDocType).toHaveBeenCalledTimes(1);
    expect(h.revenueByPlanCurrency).toHaveBeenCalledTimes(1);
  });

  it('rechaza POST con 405', async () => {
    const res = makeRes();
    await handler(makeReq({}, { action: 'metrics-by-product' }, 'POST'), res);
    expect(res.statusCode).toBe(405);
    expect(h.countByDocType).not.toHaveBeenCalled();
  });

  it('si el DAL falla devuelve 500 genérico SIN filtrar err.message', async () => {
    h.revenueByPlanCurrency.mockRejectedValue(new Error('relation "processed_payments" does not exist'));

    const res = makeRes();
    await handler(makeReq({}, { action: 'metrics-by-product' }, 'GET'), res);

    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('processed_payments');
    expect(JSON.stringify(res.body)).not.toContain('relation');
  });
});

describe('admin-api action=list-published-cvs - moderación de publicaciones', () => {
  it('GET devuelve la página y el total; pasa q/page/limit al DAL', async () => {
    h.listForModeration.mockResolvedValue({
      items: [{ id: 'p1', slug: 'cv-ana', isActive: true, ownerEmail: 'ana@x.com' }],
      totalCount: 1,
    });

    const res = makeRes();
    await handler(makeReq({}, { action: 'list-published-cvs', page: '1', limit: '20', q: 'ana@x.com' }, 'GET'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.items).toHaveLength(1);
    expect(res.body?.totalCount).toBe(1);
    expect(h.listForModeration).toHaveBeenCalledWith({ search: 'ana@x.com', page: 1, limit: 20 });
  });

  it('acota limit a 50 aunque se pida más', async () => {
    const res = makeRes();
    await handler(makeReq({}, { action: 'list-published-cvs', limit: '500' }, 'GET'), res);

    expect(res.statusCode).toBe(200);
    expect(h.listForModeration).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
  });

  it('rechaza POST con 405', async () => {
    const res = makeRes();
    await handler(makeReq({}, { action: 'list-published-cvs' }, 'POST'), res);
    expect(res.statusCode).toBe(405);
  });

  it('si el DAL falla devuelve 500 genérico', async () => {
    h.listForModeration.mockRejectedValue(new Error('profiles!inner does not exist'));

    const res = makeRes();
    await handler(makeReq({}, { action: 'list-published-cvs' }, 'GET'), res);

    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('profiles!inner');
  });
});

describe('admin-api action=set-published-cv-active - activar/desactivar publicación', () => {
  it('POST desactiva y audita con el user_id del dueño', async () => {
    const res = makeRes();
    await handler(makeReq({ id: UUID, isActive: false }, { action: 'set-published-cv-active' }, 'POST'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.isActive).toBe(false);
    expect(h.setActive).toHaveBeenCalledWith(UUID, false);
    expect(h.adminAuditLog).toHaveBeenCalledWith(
      'admin-user-1', 'set_published_cv_active', 'owner-1',
      expect.objectContaining({ publishedCvId: UUID, slug: 'cv-juan', isActive: false })
    );
  });

  it('reason opcional se recorta a 500 y se incluye en la auditoría', async () => {
    const reason = 'x'.repeat(600);

    const res = makeRes();
    await handler(makeReq({ id: UUID, isActive: true, reason }, { action: 'set-published-cv-active' }, 'POST'), res);

    expect(res.statusCode).toBe(200);
    const details = h.adminAuditLog.mock.calls[0][3];
    expect(details.reason).toHaveLength(500);
  });

  it('rechaza id que no es UUID (400) sin tocar la DB', async () => {
    const res = makeRes();
    await handler(makeReq({ id: 'no-uuid', isActive: true }, { action: 'set-published-cv-active' }, 'POST'), res);
    expect(res.statusCode).toBe(400);
    expect(h.setActive).not.toHaveBeenCalled();
  });

  it('rechaza isActive no booleano (400) sin tocar la DB', async () => {
    const res = makeRes();
    await handler(makeReq({ id: UUID, isActive: 'false' }, { action: 'set-published-cv-active' }, 'POST'), res);
    expect(res.statusCode).toBe(400);
    expect(h.setActive).not.toHaveBeenCalled();
  });

  it('publicación inexistente → 404', async () => {
    h.setActive.mockResolvedValue(null);

    const res = makeRes();
    await handler(makeReq({ id: UUID, isActive: false }, { action: 'set-published-cv-active' }, 'POST'), res);
    expect(res.statusCode).toBe(404);
    expect(h.adminAuditLog).not.toHaveBeenCalled();
  });

  it('rechaza GET con 405', async () => {
    const res = makeRes();
    await handler(makeReq({}, { action: 'set-published-cv-active' }, 'GET'), res);
    expect(res.statusCode).toBe(405);
    expect(h.setActive).not.toHaveBeenCalled();
  });

  it('si el DAL falla devuelve 500 genérico SIN filtrar err.message', async () => {
    h.setActive.mockRejectedValue(new Error('new row violates row-level security policy'));

    const res = makeRes();
    await handler(makeReq({ id: UUID, isActive: false }, { action: 'set-published-cv-active' }, 'POST'), res);

    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('row-level security');
  });
});

describe('admin-api action=list-ai-cooldowns - pausas de claves de IA', () => {
  it('GET devuelve las pausas activas tal cual las entrega el DAL', async () => {
    const res = makeRes();
    await handler(makeReq({}, { action: 'list-ai-cooldowns' }, 'GET'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.cooldowns).toEqual([
      { provider: 'groq', keyHashPrefix: 'a1b2c3d4', pausedUntil: '2026-11-18T12:00:00Z', updatedAt: '2026-11-18T10:00:00Z' },
    ]);
    expect(h.listActiveCooldowns).toHaveBeenCalledTimes(1);
  });

  it('rechaza POST con 405', async () => {
    const res = makeRes();
    await handler(makeReq({}, { action: 'list-ai-cooldowns' }, 'POST'), res);
    expect(res.statusCode).toBe(405);
  });

  it('si el DAL falla devuelve 500 genérico SIN filtrar err.message', async () => {
    h.listActiveCooldowns.mockRejectedValue(new Error('connection to server at "db.internal" refused'));

    const res = makeRes();
    await handler(makeReq({}, { action: 'list-ai-cooldowns' }, 'GET'), res);

    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('db.internal');
  });
});
