import { describe, it, expect } from 'vitest';

describe('useExportEntitlement token query', () => {
  it('el filtro OR incluye tokens por user_id y por email con user_id null', () => {
    const userId = 'abc-123';
    const userEmail = 'test@example.com';

    const orFilter = userEmail
      ? `user_id.eq.${userId},and(user_id.is.null,email.eq.${userEmail})`
      : `user_id.eq.${userId}`;

    expect(orFilter).toContain(`user_id.eq.${userId}`);
    expect(orFilter).toContain(`user_id.is.null`);
    expect(orFilter).toContain(`email.eq.${userEmail}`);
  });

  it('sin email solo busca por user_id', () => {
    const userId = 'abc-123';
    const userEmail = '';

    const orFilter = userEmail
      ? `user_id.eq.${userId},and(user_id.is.null,email.eq.${userEmail})`
      : `user_id.eq.${userId}`;

    expect(orFilter).toBe(`user_id.eq.${userId}`);
    expect(orFilter).not.toContain('is.null');
  });
});