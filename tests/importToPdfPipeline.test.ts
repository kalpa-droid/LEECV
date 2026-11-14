import { describe, it, expect } from 'vitest';
import { normalizeImportedCvData, applyImportReview } from '../src/modules/cv-builder/utils/cvImportReview';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter';

/**
 * Contrato OCR -> PDF: ningun dato leido por la IA puede perderse en el camino.
 * Payload realista igual al que devuelve /api/cv-import-api (extract-page).
 */
const rawImported = {
  personalInfo: {
    fullName: 'Maria Fernanda Gomez',
    email: 'maria.gomez@example.com',
    phone: '+54 381 555-1234',
    role: 'Licenciada en Administracion',
    location: 'San Miguel de Tucuman, Tucuman',
    summary: 'Profesional con 5 anos gestionando equipos de ventas B2B.',
    dni: '33444555',
    cuit: '27-33444555-9',
    birthDate: '1992-07-14',
    estadoCivil: 'Soltera',
    nacionalidad: 'Argentina',
    disponibilidad: 'Inmediata',
    licenciaConducir: 'B1',
    linkedin: 'https://www.linkedin.com/in/mariagomez',
    portfolio: 'https://mariagomez.dev'
  },
  objective: 'Busco un rol de liderazgo comercial.',
  frase: 'Liderar es servir.',
  experience: [
    { company: 'Acme SA', role: 'Gerente de Ventas', startDate: '2021-03', endDate: 'Presente', description: 'Dirigi un equipo de 8 ejecutivos.' }
  ],
  education: [
    { institution: 'UNT', degree: 'Licenciatura en Administracion', startDate: '2017', endDate: '2019', description: 'Tesis sobre ventas B2B' }
  ],
  skills: ['Negociacion', 'Liderazgo'],
  languages: [
    { language: 'Ingles', proficiency: 'Avanzado' },
    { language: 'Portugues', proficiency: 'Intermedio' }
  ],
  coursesAndCertificates: [
    { title: 'Direccion Comercial', institution: 'UBA', year: '2023', hours: '40' }
  ],
  profession: [
    { degree: 'Abogada', institution: 'Universidad del Norte', year: '2020' }
  ],
  achievements: [
    { title: 'Mejor Vendedora 2022', institution: 'Acme SA', details: 'Incremento ventas 30%' }
  ],
  portfolio: [
    { title: 'Plan de expansion Tucuman', institution: 'Acme SA', details: 'Abrio 3 sucursales' }
  ],
  projects: [
    { title: 'CRM propio', institution: 'Acme SA', year: '2022', details: 'Redujo ciclo de venta 25%' }
  ],
  publications: [
    { title: 'Como vender en pymes', autor: 'Gomez, M.', year: '2024' }
  ],
  references: [
    { personaReferencia: 'Carlos Perez', cargo: 'Director de Ventas', institution: 'Acme SA', contactoReferencia: 'cperez@acme.com' }
  ],
  hardSkills: [
    { name: 'Salesforce', level: 'Avanzado' }
  ],
  informatics: [
    { title: 'Excel avanzado', course: 'Tablas dinamicas', institution: 'Capacitaciones SA' }
  ],
  redes: [
    { plataforma: 'GitHub', usuario: 'mgomez', url: 'https://github.com/mgomez' }
  ]
};

describe('OCR -> PDF pipeline: ningun dato se pierde', () => {
  const normalized = normalizeImportedCvData(rawImported);
  const applied = applyImportReview({}, normalized, { scalarFields: {}, listItems: {} });
  const sections = cvDataToContentSections(applied);
  const byId: Record<string, any> = {};
  sections.forEach((s: any) => { byId[s.id] = s; });

  it('1. nombre: fullName deriva givenNames/surname y aparece en el header', () => {
    expect(normalized.personalInfo.givenNames).toBe('Maria Fernanda');
    expect(normalized.personalInfo.surname).toBe('Gomez');
    expect(normalized.personalInfo.fullName).toBe('Maria Fernanda Gomez');
  });

  it('2. location -> cityProvince y role -> quote', () => {
    expect(normalized.personalInfo.cityProvince).toBe('San Miguel de Tucuman, Tucuman');
    expect(normalized.personalInfo.quote).toBe('Licenciada en Administracion');
  });

  it('3. linkedin/portfolio -> redes + website', () => {
    expect(normalized.personalInfo.website).toBe('https://mariagomez.dev');
    const urls = (normalized.redes || []).map((r: any) => r.url);
    expect(urls).toContain('https://www.linkedin.com/in/mariagomez');
    expect(urls).toContain('https://mariagomez.dev');
  });

  it('4. summary/objective/frase viajan a la raiz', () => {
    expect(normalized.summary).toBe(rawImported.personalInfo.summary);
    expect(normalized.objective).toBe(rawImported.objective);
    expect(normalized.frase).toBe(rawImported.frase);
  });

  it('5. campos personales densos se conservan (dni, cuit, birthDate, nacionalidad, estadoCivil, disponibilidad, licenciaConducir)', () => {
    expect(normalized.personalInfo.dni).toBe('33444555');
    expect(normalized.personalInfo.cuit).toBe('27-33444555-9');
    expect(normalized.personalInfo.birthDate).toBe('1992-07-14');
    expect(normalized.personalInfo.nacionalidad).toBe('Argentina');
    expect(normalized.personalInfo.estadoCivil).toBe('Soltera');
    expect(normalized.personalInfo.disponibilidad).toBe('Inmediata');
    expect(normalized.personalInfo.licenciaConducir).toBe('B1');
  });

  it('6. idiomas: proficiency llega como nivel al PDF', () => {
    expect(normalized.languages[0].nivel).toBe('Avanzado');
    expect(normalized.languages[1].nivel).toBe('Intermedio');
  });

  it('7. seccion contacto del PDF incluye website', () => {
    const contact = byId['contacto'];
    expect(contact).toBeDefined();
    expect(contact.records[0].fields.website).toBe('https://mariagomez.dev');
    expect(contact.records[0].fields.email).toBe('maria.gomez@example.com');
    expect(contact.records[0].fields.phone).toBe('+54 381 555-1234');
  });

  it('8. seccion datos-personales del PDF muestra los campos densos', () => {
    const datos = byId['datos-personales'];
    expect(datos).toBeDefined();
    const fields = datos.records[0].fields;
    expect(fields.dni).toBe('33444555');
    expect(fields.cuit).toBe('27-33444555-9');
    expect(fields.birthDate).toBe('1992-07-14');
    expect(fields.nacionalidad).toBe('Argentina');
    expect(fields.estadoCivil).toBe('Soltera');
    expect(fields.disponibilidad).toBe('Inmediata');
    expect(fields.licenciaConducir).toBe('B1');
  });

  it('9. resumen, objetivo y frase se renderizan en el PDF', () => {
    expect(byId['resumen'].records[0].fields.text).toBe(rawImported.personalInfo.summary);
    expect(byId['objetivo'].records[0].fields.text).toBe(rawImported.objective);
    expect(byId['frase'].records[0].fields.text).toBe(rawImported.frase);
  });

  it('10. las 14 listas llegan pobladas al PDF', () => {
    const checks: Array<[string, number]> = [
      ['experiencia', 1],
      ['formacion', 1],
      ['competencias', 2],
      ['idiomas', 2],
      ['cursos', 1],
      ['profesion', 1],
      ['logros', 1],
      ['portafolio', 1],
      ['proyectos', 1],
      ['publicaciones', 1],
      ['referencias', 1],
      ['habilidades', 1],
      ['informatica', 1],
      ['redes', 3]
    ];
    for (const [sectionId, count] of checks) {
      const sec = byId[sectionId];
      expect(sec, `seccion '${sectionId}' faltante`).toBeDefined();
      expect(sec.records.length, `seccion '${sectionId}' con registros insuficientes`).toBe(count);
    }
    expect(byId['idiomas'].records[0].fields.nivel).toBe('Avanzado');
    expect(byId['redes'].records.map((r: any) => r.fields.url)).toContain('https://www.linkedin.com/in/mariagomez');
  });

  it('11. aplicar revision sin seleccion reemplaza campos vacios del CV actual', () => {
    expect(applied.personalInfo.dni).toBe('33444555');
    expect(applied.summary).toBe(rawImported.personalInfo.summary);
    expect(applied.experience.length).toBe(1);
  });
});
