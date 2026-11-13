import { describe, it, expect } from 'vitest';
import { isFragmentEffectivelyEmpty } from '../api/_lib/cvImportGate';

describe('cvImportGate — isFragmentEffectivelyEmpty', () => {
  it('objeto vacío → vacío', () => {
    expect(isFragmentEffectivelyEmpty({})).toBe(true);
    expect(isFragmentEffectivelyEmpty(null)).toBe(true);
    expect(isFragmentEffectivelyEmpty(undefined)).toBe(true);
    expect(isFragmentEffectivelyEmpty('texto')).toBe(true);
  });

  it('todo vacío pero estructura completa → vacío', () => {
    const fragment = {
      personalInfo: { fullName: '', email: '', phone: '' },
      experience: [],
      education: [],
      skills: [],
      languages: [],
      coursesAndCertificates: [],
    };
    expect(isFragmentEffectivelyEmpty(fragment)).toBe(true);
  });

  it('personalInfo con un solo campo → NO vacío', () => {
    expect(isFragmentEffectivelyEmpty({ personalInfo: { email: 'a@b.com' } })).toBe(false);
  });

  it('una sola experiencia → NO vacío', () => {
    expect(isFragmentEffectivelyEmpty({ experience: [{ company: 'Globant' }] })).toBe(false);
  });

  it('un campo string suelto fuera de personalInfo cuenta como contenido', () => {
    expect(isFragmentEffectivelyEmpty({ summary: 'Desarrollador' })).toBe(false);
  });
});
