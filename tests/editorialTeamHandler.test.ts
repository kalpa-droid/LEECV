import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = {
  user: { id: 'owner-1', email: 'owner@test.com' } as any,
  profile: { plan: 'free', plan_vence: null, pdf_export_access_mode: 'automatic' } as any,
  passes: [] as any[],
  orgMembers: [] as any[],
  project: {
    id: 'proj-1',
    org_id: 'org-1',
    owner_id: 'owner-1',
    title: 'Libro Equipo',
    max_members: 10,
  } as any,
  section: {
    id: 'sec-row-1',
    project_id: 'proj-1',
    section_key: 'ed_cap_1',
    title: 'Capítulo 1',
    records_json: [],
    content_markdown: '',
    locked_by: null as string | null,
    locked_by_email: null as string | null,
    lock_expires_at: null as string | null,
    version: 1,
  } as any,
};

vi.mock('../api/_lib/rateLimiter.js', () => ({
  requireRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock('../api/_lib/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'valid-owner') return { data: { user: { id: 'owner-1', email: 'owner@test.com' } }, error: null };
        if (token === 'valid-collab') return { data: { user: { id: 'collab-2', email: 'collab@test.com' } }, error: null };
        return { data: { user: null }, error: { message: 'invalid' } };
      }),
    },
    rpc: vi.fn().mockResolvedValue({ error: null }),
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: mockDb.profile, error: null })) })),
            ilike: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })),
          })),
        };
      }
      if (table === 'user_app_passes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(async () => ({ data: mockDb.passes, error: null })),
              })),
            })),
          })),
        };
      }
      if (table === 'editorial_team_projects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: mockDb.project, error: null })),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
        };
      }
      if (table === 'org_members') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              ilike: vi.fn(() => ({
                eq: vi.fn(async () => ({ data: [], error: null })),
              })),
            })),
          })),
          select: vi.fn((_cols: string) => ({
            eq: vi.fn((col: string, _val: string) => {
              if (col === 'org_id') {
                return {
                  in: vi.fn(async () => ({ data: mockDb.orgMembers, error: null })),
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      maybeSingle: vi.fn(async () => ({
                        data: mockDb.orgMembers.find((m) => m.user_id === 'collab-2') || null,
                        error: null,
                      })),
                    })),
                  })),
                };
              }
              return {};
            }),
          })),
          insert: vi.fn((row: any) => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => {
                mockDb.orgMembers.push(row);
                return { data: { id: `m-${mockDb.orgMembers.length}`, ...row }, error: null };
              }),
            })),
          })),
        };
      }
      if (table === 'editorial_team_sections') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: mockDb.section, error: null })),
              })),
            })),
          })),
          update: vi.fn((patch: any) => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => {
                  Object.assign(mockDb.section, patch);
                  return { data: mockDb.section, error: null };
                }),
              })),
            })),
          })),
        };
      }
      return {};
    }),
  },
}));

import { handleEditorialTeamAction } from '../api/_lib/editorialTeamHandler.js';

function makeRes() {
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
}

describe('Etapa 5 — Sala de Equipo EditorLee (hasta 10 personas + lock por capítulo)', () => {
  beforeEach(() => {
    mockDb.profile = { plan: 'free', plan_vence: null, pdf_export_access_mode: 'automatic' };
    mockDb.passes = [];
    mockDb.orgMembers = [{ id: 'm-owner', user_id: 'owner-1', invited_email: 'owner@test.com', status: 'active' }];
    mockDb.section.locked_by = null;
    mockDb.section.locked_by_email = null;
    mockDb.section.lock_expires_at = null;
    mockDb.section.version = 1;
  });

  it('bloquea creación de sala con 403 si el dueño no tiene pase de equipo o pase 30d', async () => {
    const res = makeRes();
    await handleEditorialTeamAction(
      { headers: { authorization: 'Bearer valid-owner' }, body: { title: 'Libro' } } as any,
      res,
      'team-create'
    );
    expect(res.statusCode).toBe(403);
  });

  it('permite invitar hasta completar 10 miembros totales y bloquea el 11°', async () => {
    for (let i = 1; i <= 9; i++) {
      mockDb.orgMembers.push({
        id: `m-${i}`,
        user_id: `u-${i}`,
        invited_email: `c${i}@test.com`,
        status: 'active',
      });
    }
    const res = makeRes();
    await handleEditorialTeamAction(
      { headers: { authorization: 'Bearer valid-owner' }, body: { projectId: 'proj-1', email: 'extra11@test.com' } } as any,
      res,
      'team-invite'
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('10');
  });

  it('impide pisar un capítulo bloqueado activamente por otro colaborador (409 Conflict)', async () => {
    mockDb.orgMembers.push({
      id: 'm-collab',
      user_id: 'collab-2',
      invited_email: 'collab@test.com',
      status: 'active',
    });

    // Owner adquiere el bloqueo del capítulo 1
    const lockRes = makeRes();
    await handleEditorialTeamAction(
      {
        headers: { authorization: 'Bearer valid-owner' },
        body: { projectId: 'proj-1', sectionKey: 'ed_cap_1', lockAction: 'acquire' },
      } as any,
      lockRes,
      'team-lock-section'
    );
    expect(lockRes.statusCode).toBe(200);
    expect(lockRes.body.section.locked_by).toBe('owner-1');

    // Colaborador intenta guardar o tomar el mismo capítulo -> 409
    const conflictRes = makeRes();
    await handleEditorialTeamAction(
      {
        headers: { authorization: 'Bearer valid-collab' },
        body: { projectId: 'proj-1', sectionKey: 'ed_cap_1', records: [{ id: 'r1', type: 'paragraph', content: 'Pisar' }] },
      } as any,
      conflictRes,
      'team-save-section'
    );
    expect(conflictRes.statusCode).toBe(409);
  });
});
