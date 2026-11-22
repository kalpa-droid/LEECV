import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PORT_CONTACT_PROFILE_V1 } from '../src/shared/contracts/ports/contactProfile';
import {
  extractContactProfileFromCv,
  selectContactProfileFields,
} from '../src/shared/core/ports/portBroker';
import {
  applySelectedContactFieldsToCard,
  createBlankCardDocumentData,
} from '../src/modules/card-studio/domain/cardContactImport';
import {
  APP_REGISTRY,
  findStandaloneStudioByRoute,
} from '../src/app/appRegistry';
import { scanCodeForDocTypeLeaks } from '../scripts/check-docType-leaks';

describe('Fase 9 — Cápsula independiente card-studio + puerto contact-profile@1', () => {
  it('monta business_card como estudio independiente fuera del workspace compartido de CV', () => {
    expect(APP_REGISTRY.business_card.usesSharedCvWorkspace).toBe(false);
    expect(APP_REGISTRY.business_card.StudioComponent).toBeDefined();
    expect(findStandaloneStudioByRoute('/crear-tarjeta')?.id).toBe('business_card');
  });

  it('extrae ContactProfileV1 desde CV e importa solo los campos elegidos sin sobrescribir ediciones no seleccionadas', () => {
    const sampleCv = {
      id: 'cv_origen_1',
      personalInfo: {
        fullName: 'Lucía Fernández',
        email: 'lucia@ejemplo.com',
        phone: '+54 11 5555-0000',
        cityProvince: 'Córdoba, Argentina',
        website: 'https://lucia.dev',
      },
      profession: [{ degree: 'Arquitecta de Software' }],
      experience: [{ company: 'Studio Norte', role: 'Tech Lead' }],
    };

    const profile = extractContactProfileFromCv(sampleCv);
    expect(profile.fullName).toBe('Lucía Fernández');
    expect(profile.email).toBe('lucia@ejemplo.com');
    expect(profile.company).toBe('Studio Norte');

    const baseCard = {
      ...createBlankCardDocumentData('card_1'),
      cardOverrides: {
        phone: '+54 9 11 MANUAL',
        role: 'Consultora Independiente',
      },
    };

    const { picked, sourceRef } = selectContactProfileFields(
      profile,
      ['fullName', 'email', 'company'],
      { docId: 'cv_origen_1', docType: 'cv', revision: 4 },
    );

    expect(sourceRef.portId).toBe(PORT_CONTACT_PROFILE_V1);
    expect(sourceRef.sourceRevision).toBe(4);
    expect(sourceRef.importedFields).toEqual(['fullName', 'email', 'company']);

    const updated = applySelectedContactFieldsToCard(baseCard, picked, sourceRef);
    expect(updated.cardOverrides.fullName).toBe('Lucía Fernández');
    expect(updated.cardOverrides.email).toBe('lucia@ejemplo.com');
    expect(updated.cardOverrides.brandName).toBe('Studio Norte');
    // Campos NO marcados mantienen su edición manual:
    expect(updated.cardOverrides.phone).toBe('+54 9 11 MANUAL');
    expect(updated.cardOverrides.role).toBe('Consultora Independiente');
    expect(updated.contactSourceRef.sourceDocId).toBe('cv_origen_1');
  });

  it('DisenoSection y CardExtractSection quedan libres de fugas de docType en AST', () => {
    for (const rel of [
      'src/modules/cv-builder/components/editor/sections/DisenoSection.tsx',
      'src/modules/card-studio/ui/CardExtractSection.tsx',
      'src/modules/card-studio/CardStudioContent.tsx',
    ]) {
      const src = fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
      const report = scanCodeForDocTypeLeaks(rel, src);
      expect(report.count, `${rel}: ${report.samples.join(', ')}`).toBe(0);
    }
  });
});
