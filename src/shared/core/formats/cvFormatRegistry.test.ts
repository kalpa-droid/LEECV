import { describe, it, expect } from 'vitest';
import { resolvePersonalFieldVisibility, getCvFormat } from './cvFormatRegistry';

describe('cvFormatRegistry - personalFieldPolicy', () => {
  it('should correctly resolve policies based on format (hide vs user)', () => {
    // US Resume hides DNI
    expect(resolvePersonalFieldVisibility({ activeFormatId: 'us-resume' }, 'dni')).toBe(false);
    expect(resolvePersonalFieldVisibility({ activeFormatId: 'us-resume' }, 'profilePhoto')).toBe(false);

    // LATAM Clásico allows user to decide (defaults to true)
    expect(resolvePersonalFieldVisibility({ activeFormatId: 'latam-clasico' }, 'dni')).toBe(true);
    expect(resolvePersonalFieldVisibility({ activeFormatId: 'latam-clasico' }, 'profilePhoto')).toBe(true);

    // ATS One Column allows user to decide
    expect(resolvePersonalFieldVisibility({ activeFormatId: 'ats-one-column' }, 'dni')).toBe(true);

    // Europass allows user to decide
    expect(resolvePersonalFieldVisibility({ activeFormatId: 'europass' }, 'dni')).toBe(true);
  });

  it('should respect user overrides when format allows', () => {
    const cvData = {
      activeFormatId: 'latam-clasico',
      personalFieldOverrides: {
        dni: 'hide'
      }
    };
    
    // User chose to hide DNI
    expect(resolvePersonalFieldVisibility(cvData, 'dni')).toBe(false);
    
    // Other fields are still true
    expect(resolvePersonalFieldVisibility(cvData, 'cuit')).toBe(true);
  });

  it('should respect legacy hiddenFields when format allows', () => {
    const cvData = {
      activeFormatId: 'latam-clasico',
      hiddenFields: ['dni', 'birthDate']
    };
    
    expect(resolvePersonalFieldVisibility(cvData, 'dni')).toBe(false);
    expect(resolvePersonalFieldVisibility(cvData, 'birthDate')).toBe(false);
    expect(resolvePersonalFieldVisibility(cvData, 'cuit')).toBe(true);
  });

  it('should ignore user overrides if format forces hide', () => {
    const cvData = {
      activeFormatId: 'us-resume',
      personalFieldOverrides: {
        dni: 'show'
      }
    };
    
    // Even if user wants to show it, the format 'us-resume' explicitly hides it
    expect(resolvePersonalFieldVisibility(cvData, 'dni')).toBe(false);
  });
});
