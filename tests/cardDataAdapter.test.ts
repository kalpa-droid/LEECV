import { describe, it, expect, vi } from 'vitest';
import { buildCardDataFromCV } from '../src/shared/core/pdf-engine/layers/records/cardDataAdapter';

vi.mock('../src/shared/core/pdf-engine/layers/records/vcardGenerator', () => ({
  generateVCardQRCodeDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,fake_qr_data')
}));

describe('cardDataAdapter Unit Tests', () => {
  it('debe mapear correctamente website y address sin mezclar cityProvince', async () => {
    const cvData = {
      id: 'cv_123',
      personalInfo: {
        surname: 'Pérez',
        givenNames: 'Juan',
        phone: '+54 11 1234-5678',
        email: 'juan@perez.com',
        website: 'www.juanperez.design',
        cityProvince: 'Buenos Aires, Argentina'
      }
    };

    const cardData = await buildCardDataFromCV(cvData);
    expect(cardData.fullName).toBe('Juan Pérez');
    expect(cardData.website).toBe('www.juanperez.design');
    expect(cardData.address).toBe('Buenos Aires, Argentina');
  });

  it('debe generar URL pública correcta con formato /c/slug cuando hay publishedSlug', async () => {
    const cvData = {
      id: 'cv_456',
      personalInfo: { surname: 'García', givenNames: 'María' }
    };

    const cardData = await buildCardDataFromCV(cvData, 'maria-garcia-designer');
    expect(cardData.publishedCvUrl).toContain('/c/maria-garcia-designer');
  });

  it('debe dar prioridad a cardOverrides sobre los datos originales del CV', async () => {
    const cvData = {
      id: 'cv_789',
      personalInfo: {
        surname: 'López',
        givenNames: 'Carlos',
        phone: '+54 11 1111-1111',
        email: 'carlos@original.com'
      },
      cardOverrides: {
        fullName: 'Carlos López Studio',
        phone: '+54 11 9999-9999',
        email: 'contacto@carlosstudio.com'
      }
    };

    const cardData = await buildCardDataFromCV(cvData);
    expect(cardData.fullName).toBe('Carlos López Studio');
    expect(cardData.phone).toBe('+54 11 9999-9999');
    expect(cardData.email).toBe('contacto@carlosstudio.com');
  });

  it('debe funcionar en modo standalone cuando cvData es undefined/vacío', async () => {
    const cardData = await buildCardDataFromCV(undefined);
    expect(cardData.fullName).toBe('');
    expect(cardData.email).toBe('');
    expect(cardData.phone).toBe('');
    expect(cardData.website).toBe('');
    expect(cardData.address).toBe('');
  });
});
