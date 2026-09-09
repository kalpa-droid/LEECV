import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePdfExportGate } from './usePdfExportGate';
import { supabase } from '../lib/supabaseClient';

vi.mock('react', () => ({
  useState: (initial: any) => {
    let state = initial;
    const setState = (updater: any) => {
      state = typeof updater === 'function' ? updater(state) : updater;
    };
    return [state, setState];
  },
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('usePdfExportGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks export when user is not authenticated (fail closed)', async () => {
    vi.mocked(supabase!.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    const gate = usePdfExportGate();
    const allowed = await gate.consumeCredits(1);

    expect(allowed).toBe(false);
  });

  it('allows export without consuming credits for PRO plan users', async () => {
    vi.mocked(supabase!.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    vi.mocked(supabase!.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { plan: 'pro' } }),
        }),
      }),
    } as any);

    const gate = usePdfExportGate();
    const allowed = await gate.consumeCredits(5);

    expect(allowed).toBe(true);
    expect(supabase!.rpc).not.toHaveBeenCalled();
  });

  it('consumes page credits via consume_pdf_credits_for_pages for free users with enough credits', async () => {
    vi.mocked(supabase!.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    vi.mocked(supabase!.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { plan: 'free' } }),
        }),
      }),
    } as any);

    vi.mocked(supabase!.rpc).mockResolvedValue({
      data: 3, // 3 credits remaining
      error: null,
    } as any);

    const gate = usePdfExportGate();
    const allowed = await gate.consumeCredits(12); // needs 2 credits

    expect(allowed).toBe(true);
    expect(supabase!.rpc).toHaveBeenCalledWith('consume_pdf_credits_for_pages', {
      p_user_id: 'user-123',
      p_page_count: 12,
    });
  });

  it('blocks export when credits are insufficient (remainingCredits === null)', async () => {
    vi.mocked(supabase!.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    vi.mocked(supabase!.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { plan: 'free' } }),
        }),
      }),
    } as any);

    vi.mocked(supabase!.rpc).mockResolvedValue({
      data: null, // insufficient credits
      error: null,
    } as any);

    const gate = usePdfExportGate();
    const allowed = await gate.consumeCredits(25); // needs 3 credits

    expect(allowed).toBe(false);
  });

  it('falls back to consume_pdf_credit with p_user_id if consume_pdf_credits_for_pages fails', async () => {
    vi.mocked(supabase!.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    vi.mocked(supabase!.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { plan: 'free' } }),
        }),
      }),
    } as any);

    vi.mocked(supabase!.rpc)
      .mockResolvedValueOnce({ data: null, error: { message: 'Function not found' } } as any)
      .mockResolvedValueOnce({ data: true, error: null } as any);

    const gate = usePdfExportGate();
    const allowed = await gate.consumeCredits(1);

    expect(allowed).toBe(true);
    expect(supabase!.rpc).toHaveBeenNthCalledWith(1, 'consume_pdf_credits_for_pages', {
      p_user_id: 'user-123',
      p_page_count: 1,
    });
    expect(supabase!.rpc).toHaveBeenNthCalledWith(2, 'consume_pdf_credit', {
      p_user_id: 'user-123',
    });
  });

  it('fails closed when RPC errors out on both calls', async () => {
    vi.mocked(supabase!.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    vi.mocked(supabase!.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { plan: 'free' } }),
        }),
      }),
    } as any);

    vi.mocked(supabase!.rpc)
      .mockResolvedValueOnce({ data: null, error: { message: 'RPC Error 1' } } as any)
      .mockResolvedValueOnce({ data: null, error: { message: 'RPC Error 2' } } as any);

    const gate = usePdfExportGate();
    const allowed = await gate.consumeCredits(1);

    expect(allowed).toBe(false);
  });
});
