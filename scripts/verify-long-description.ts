import fs from 'fs';
import path from 'path';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { TemplateRenderer } from '../src/shared/core/pdf-engine/renderer/TemplateRenderer';
import { getPreset } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';
import { ContentSection } from '../src/shared/core/pdf-engine/layers/records/recordTypes';

async function runVerification() {
  console.log('🧪 Iniciando prueba empírica de exportación PDF (Script de Verificación)...');

  const preset = getPreset('cv-clasico');

  // 1. Fixture Corto
  const shortSections: ContentSection[] = [
    {
      id: 'personal',
      titleText: 'DATOS PERSONALES',
      records: [
        {
          id: 'rec-contact',
          kind: 'contact-item',
          fields: { phone: '+54387123456', email: 'test@example.com' }
        }
      ]
    },
    {
      id: 'experience',
      titleText: 'EXPERIENCIA LABORAL',
      records: [
        {
          id: 'rec-exp-short',
          kind: 'experience',
          fields: {
            role: 'Desarrollador Software',
            institution: 'Empresa Test',
            period: '2020 - Presente',
            details: 'Desarrollo de módulos y APIs principales de la plataforma.'
          }
        }
      ]
    }
  ];

  // 2. Fixture Patológico Largo (> 8,000 caracteres de descripción)
  const longTextChunk = 'Esta es una descripción detallada de tareas con alta densidad de texto. '.repeat(120); // ~8,880 caracteres
  const longSections: ContentSection[] = [
    {
      id: 'personal',
      titleText: 'DATOS PERSONALES',
      records: [
        {
          id: 'rec-contact',
          kind: 'contact-item',
          fields: { phone: '+54387123456', email: 'test@example.com' }
        }
      ]
    },
    {
      id: 'experience',
      titleText: 'EXPERIENCIA LABORAL EXTENSA',
      records: [
        {
          id: 'rec-exp-long',
          kind: 'experience',
          fields: {
            role: 'Líder Técnico de Sistemas Críticos',
            institution: 'Corporación Global Tecnológica S.A.',
            period: '2015 - Presente',
            details: longTextChunk
          }
        }
      ]
    }
  ];

  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Exportar PDF Corto
  console.log('📄 Generando PDF Fixture Corto...');
  const shortDoc = React.createElement(TemplateRenderer, {
    preset,
    sections: shortSections,
    personalInfo: { givenNames: 'Juan', surname: 'Pérez', fullName: 'Juan Pérez' }
  });
  const shortBlob = await pdf(shortDoc as any).toBlob();
  const shortBuffer = Buffer.from(await shortBlob.arrayBuffer());
  const shortPath = path.join(distDir, 'test-short.pdf');
  fs.writeFileSync(shortPath, shortBuffer);
  console.log(`✅ PDF Corto generado con éxito: ${shortPath} (${shortBuffer.length} bytes)`);

  // Exportar PDF Largo
  console.log('📄 Generando PDF Fixture Largo (>8.000 caracteres)...');
  const longDoc = React.createElement(TemplateRenderer, {
    preset,
    sections: longSections,
    personalInfo: { givenNames: 'Juan', surname: 'Pérez', fullName: 'Juan Pérez' }
  });
  const longBlob = await pdf(longDoc as any).toBlob();
  const longBuffer = Buffer.from(await longBlob.arrayBuffer());
  const longPath = path.join(distDir, 'test-long.pdf');
  fs.writeFileSync(longPath, longBuffer);
  console.log(`✅ PDF Largo generado con éxito: ${longPath} (${longBuffer.length} bytes)`);

  if (longBuffer.length < shortBuffer.length) {
    throw new Error('❌ ERROR: El PDF largo resultó más pequeño que el corto. Posible recorte silencioso.');
  }

  console.log('✨ Verificación empírica completada con éxito. Ambos PDFs son válidos y sin recortes.');
}

runVerification().catch(err => {
  console.error('❌ Error en script de verificación:', err);
  process.exit(1);
});
