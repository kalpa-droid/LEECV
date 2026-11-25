import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockState = {
  unclaimedRows: [] as any[],
  profileUpdates: [] as any[],
  tokenRow: { token: 'tok-valid', paid: false, user_id: 'uid-1' } as any,
};

vi.mock('../api/_lib/serverDal.js', () => ({
  serverDal: {
    processedPayments: {
      record: vi.fn().mockResolvedValue(undefined),
      getByProviderAndExternalId: vi.fn().mockResolvedValue(null),
      updateEntitlementStatus: vi.fn().mockResolvedValue(undefined),
    },
    adminNotifications: { create: vi.fn().mockResolvedValue(undefined) },
    profiles: { getByEmail: vi.fn().mockResolvedValue(null) },
    pendingGrants: { create: vi.fn().mockResolvedValue(undefined) },
  },
}));

vi.mock('../api/_lib/emails/sendPurchaseReceipt.js', () => ({
  sendPurchaseReceipt: vi.fn().mockResolvedValue(true),
}));

vi.mock('../api/_lib/whatsappAlert.js', () => ({
  dispatchWaAlert: vi.fn(),
}));

vi.mock('../api/_lib/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'none' } }) },
    from: vi.fn((table: string) => {
      if (table === 'pdf_export_tokens') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: mockState.tokenRow, error: null })),
            })),
          })),
        };
      }
      return {};
    }),
  },
}));

import { applyPayment } from '../api/_lib/applyPayment.js';
import { serverDal } from '../api/_lib/serverDal.js';
import { resolveCheckoutIdentity } from '../api/_lib/checkoutIdentity.js';
import {
  APP_PERMANENT_PASS_BY_DOC_TYPE,
  PASS_CREDIT_COSTS,
  isPurchasablePlan,
} from '../src/shared/core/payments/pricingCatalog.js';

function makeAdminClient() {
  return {
    rpc: vi.fn().mockResolvedValue({ error: null }),
    from: vi.fn((table: string) => {
      if (table === 'unclaimed_email_credits') {
        return {
          insert: vi.fn(async (row: any) => {
            mockState.unclaimedRows.push(row);
            return { error: null };
          }),
        };
      }
      if (table === 'profiles') {
        return {
          update: vi.fn((patch: any) => ({
            eq: vi.fn(async (col: string, val: string) => {
              mockState.profileUpdates.push({ patch, col, val });
              return { error: null };
            }),
          })),
        };
      }
      return {};
    }),
  } as any;
}

describe('Etapa 3 — Pases permanentes, Pase 30 días y Checkout contextual', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.unclaimedRows = [];
    mockState.profileUpdates = [];
    mockState.tokenRow = { token: 'tok-valid', paid: false, user_id: null };
  });

  it('catálogo de precios mantiene pro no-comprable y expone pases con equivalencias en créditos', () => {
    expect(isPurchasablePlan('pro')).toBe(false);
    expect(isPurchasablePlan('pass_30d')).toBe(true);
    expect(isPurchasablePlan('pass_editorlee')).toBe(true);
    expect(isPurchasablePlan('pass_facturlee')).toBe(true);
    expect(PASS_CREDIT_COSTS.pass_30d).toBe(5);
    expect(PASS_CREDIT_COSTS.pass_editorlee).toBe(10);
    expect(PASS_CREDIT_COSTS.pass_facturlee).toBe(10);
    expect(APP_PERMANENT_PASS_BY_DOC_TYPE.editorial).toBe('pass_editorlee');
    expect(APP_PERMANENT_PASS_BY_DOC_TYPE.invoice).toBe('pass_facturlee');
  });

  it('acredita pass_30d y pass_facturlee al perfil registrado sin recurrencia', async () => {
    const admin = makeAdminClient();
    vi.mocked(serverDal.profiles.getByEmail).mockResolvedValue({ id: 'u-pass-1' } as any);

    await applyPayment(admin, {
      userId: 'u-pass-1',
      email: 'pass@test.com',
      plan: 'pass_30d',
      metodoPago: 'mercadopago',
      externalId: 'mp-pass30-1',
      amount: 12500,
      currency: 'ARS',
    });

    expect(admin.rpc).toHaveBeenCalledWith('grant_pro_subscription', {
      p_payment_id: 'mercadopago:mp-pass30-1',
      p_user_id: 'u-pass-1',
      p_days: 30,
    });
    expect(mockState.profileUpdates[0]).toMatchObject({ patch: { plan: 'pass_30d' }, val: 'u-pass-1' });

    await applyPayment(admin, {
      userId: 'u-pass-1',
      email: 'pass@test.com',
      plan: 'pass_facturlee',
      metodoPago: 'paypal',
      externalId: 'pp-fact-1',
      amount: 17,
      currency: 'USD',
    });

    expect(admin.rpc).toHaveBeenCalledWith('grant_app_pass', {
      p_payment_id: 'paypal:pp-fact-1',
      p_user_id: 'u-pass-1',
      p_pass_id: 'pass_facturlee',
      p_days: null,
      p_source: 'purchase',
    });
  });

  it('guarda grant_payload en unclaimed_email_credits si un invitado compra un Pase sin cuenta', async () => {
    const admin = makeAdminClient();
    vi.mocked(serverDal.profiles.getByEmail).mockResolvedValue(null);

    await applyPayment(admin, {
      email: 'guestpass@test.com',
      plan: 'pass_editorlee',
      metodoPago: 'paypal',
      externalId: 'pp-guest-ed-1',
      amount: 17,
      currency: 'USD',
    });

    expect(mockState.unclaimedRows).toHaveLength(1);
    expect(mockState.unclaimedRows[0]).toMatchObject({
      email: 'guestpass@test.com',
      credits: 0,
      plan: 'pass_editorlee',
      grant_payload: { grantType: 'app_pass', passId: 'pass_editorlee' },
    });
  });

  it('resolveCheckoutIdentity valida returnPath permitido y descarta redirecciones externas', async () => {
    const makeRes = () => {
      const res: any = { statusCode: 200, body: null };
      res.status = (code: number) => {
        res.statusCode = code;
        return res;
      };
      res.json = (body: any) => {
        res.body = body;
        return res;
      };
      return res;
    };

    const validIdentity = await resolveCheckoutIdentity(
      {
        headers: {},
        body: {
          providerId: 'mercadopago',
          plan: 'pass_facturlee',
          email: 'cliente@test.com',
          exportToken: 'tok-valid',
          returnPath: '/crear-factura',
        },
      } as any,
      makeRes()
    );
    expect(validIdentity?.returnPath).toBe('/crear-factura');

    const unsafeIdentity = await resolveCheckoutIdentity(
      {
        headers: {},
        body: {
          providerId: 'mercadopago',
          plan: 'pass_30d',
          email: 'cliente@test.com',
          exportToken: 'tok-valid',
          returnPath: 'https://evil.example/phish',
        },
      } as any,
      makeRes()
    );
    expect(unsafeIdentity?.returnPath).toBeUndefined();
  });
});
