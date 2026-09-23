import { describe, it, expect } from 'vitest';
import { getPresentContactFields } from '../sharedFields';
import { ContentRecord } from '../recordTypes';

describe('getPresentContactFields', () => {
  const mockRec = (fields: Record<string, string>): ContentRecord => ({
    id: 'test',
    kind: 'contact-item',
    fields
  });

  it('should return known fields and respect cardOmit', () => {
    const rec = mockRec({
      phone: '123',
      dni: '456',
      cityProvince: 'CABA'
    });

    const docFields = getPresentContactFields(rec, 'document');
    expect(docFields).toHaveLength(3);
    expect(docFields.map(f => f.key)).toEqual(['phone', 'cityProvince', 'dni']);

    const cardFields = getPresentContactFields(rec, 'card');
    expect(cardFields).toHaveLength(1);
    expect(cardFields[0].key).toBe('phone');
  });

  it('should return custom fields with humanized labels', () => {
    const rec = mockRec({
      phone: '123',
      linkedinPerfil: 'user123',
      portfolioUrl: 'my-site'
    });

    const fields = getPresentContactFields(rec, 'document');
    expect(fields).toHaveLength(3);
    
    const linkedin = fields.find(f => f.key === 'linkedinPerfil');
    expect(linkedin?.cvLabel).toBe('Linkedin Perfil:');
    expect(linkedin?.value).toBe('user123');

    const portfolio = fields.find(f => f.key === 'portfolioUrl');
    expect(portfolio?.cvLabel).toBe('Portfolio Url:');
  });

  it('should filter out denylist keys', () => {
    const rec = mockRec({
      phone: '123',
      _meta: 'hidden',
      createdAt: '2023',
      id: 'internalId'
    });

    const fields = getPresentContactFields(rec, 'document');
    expect(fields).toHaveLength(1);
    expect(fields[0].key).toBe('phone');
  });
});
