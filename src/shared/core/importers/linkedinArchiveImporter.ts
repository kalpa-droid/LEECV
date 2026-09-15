import JSZip from 'jszip';
import Papa from 'papaparse';

export interface ImportedCvData {
  personalInfo?: {
    fullName?: string;
    givenNames?: string;
    surname?: string;
    email?: string;
    phone?: string;
    cityProvince?: string;
    quote?: string;
  };
  experience?: Array<{
    role: string;
    company: string;
    year: string;
    details?: string;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  skills?: string[];
  languages?: Array<{
    language: string;
    level: string;
  }>;
  coursesAndCertificates?: Array<{
    title: string;
    institution: string;
    year: string;
  }>;
}

export async function importLinkedinArchive(file: File): Promise<ImportedCvData> {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);

  const result: ImportedCvData = {
    personalInfo: {},
    experience: [],
    education: [],
    skills: [],
    languages: [],
    coursesAndCertificates: []
  };

  const findFileInZip = (name: string) => {
    const matchedKey = Object.keys(zipContent.files).find(k => k.toLowerCase().endsWith(name.toLowerCase()));
    return matchedKey ? zipContent.files[matchedKey] : null;
  };

  // 1. Profile.csv
  const profileFile = findFileInZip('Profile.csv');
  if (profileFile) {
    const text = await profileFile.async('string');
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    const row = parsed.data?.[0];
    if (row) {
      const given = row['First Name'] || row['Nombres'] || '';
      const surname = row['Last Name'] || row['Apellidos'] || '';
      result.personalInfo = {
        givenNames: given,
        surname: surname,
        fullName: `${given} ${surname}`.trim(),
        cityProvince: row['Location'] || row['Ubicación'] || '',
        quote: row['Headline'] || row['Titular'] || row['Summary'] || ''
      };
    }
  }

  // 2. Positions.csv
  const positionsFile = findFileInZip('Positions.csv');
  if (positionsFile) {
    const text = await positionsFile.async('string');
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    result.experience = (parsed.data || [])
      .filter(r => r['Title'] || r['Company Name'])
      .map(r => ({
        role: r['Title'] || r['Cargo'] || 'Puesto',
        company: r['Company Name'] || r['Empresa'] || '',
        year: [r['Started On'], r['Finished On'] || 'Presente'].filter(Boolean).join(' - '),
        details: r['Description'] || ''
      }));
  }

  // 3. Education.csv
  const eduFile = findFileInZip('Education.csv');
  if (eduFile) {
    const text = await eduFile.async('string');
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    result.education = (parsed.data || [])
      .filter(r => r['School Name'] || r['Degree Name'])
      .map(r => ({
        degree: r['Degree Name'] || r['Título'] || 'Estudios',
        institution: r['School Name'] || r['Institución'] || '',
        year: [r['Start Date'], r['End Date']].filter(Boolean).join(' - ')
      }));
  }

  // 4. Skills.csv
  const skillsFile = findFileInZip('Skills.csv');
  if (skillsFile) {
    const text = await skillsFile.async('string');
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    result.skills = (parsed.data || [])
      .map(r => r['Name'] || r['Nombre'] || '')
      .filter(Boolean);
  }

  // 5. Languages.csv
  const langFile = findFileInZip('Languages.csv');
  if (langFile) {
    const text = await langFile.async('string');
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    result.languages = (parsed.data || [])
      .filter(r => r['Name'] || r['Nombre'])
      .map(r => ({
        language: r['Name'] || r['Nombre'] || '',
        level: r['Proficiency'] || r['Nivel'] || 'Intermedio'
      }));
  }

  // 6. Certifications.csv
  const certsFile = findFileInZip('Certifications.csv');
  if (certsFile) {
    const text = await certsFile.async('string');
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    result.coursesAndCertificates = (parsed.data || [])
      .filter(r => r['Name'] || r['Authority'])
      .map(r => ({
        title: r['Name'] || r['Nombre'] || '',
        institution: r['Authority'] || r['Emisor'] || '',
        year: r['Started On'] || r['Finished On'] || ''
      }));
  }

  return result;
}
