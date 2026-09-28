export interface ExtractedJobData {
  keywords: string[];
  yearsOfExperience: number | null;
  degree: string | null;
  jobTitle: string | null;
}

export function extractJobData(text: string): ExtractedJobData {
  if (!text) return { keywords: [], yearsOfExperience: null, degree: null, jobTitle: null };
  
  // Normalizar acentos y pasar a minúsculas
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  
  // Extraer Años de Experiencia
  const yearsMatch = normalized.match(/(?:minimo|al menos|requerido)?\s*(\d+)\s*(?:a\s*\d+\s*)?anos?\s*(?:de\s*)?experiencia/i) 
    || normalized.match(/experiencia\s*(?:minima\s*de\s*)?(\d+)\s*anos?/i)
    || normalized.match(/(\d+)\+?\s*anos\s*de\s*experiencia/i);
  const yearsOfExperience = yearsMatch ? parseInt(yearsMatch[1], 10) : null;
  
  // Extraer Nivel Académico / Carrera
  let degree = null;
  if (normalized.includes("ingenier")) degree = "Ingeniería";
  else if (normalized.includes("licenciatura") || normalized.includes("licenciado")) degree = "Licenciatura";
  else if (normalized.includes("tecnicatura") || normalized.includes("tecnico")) degree = "Tecnicatura";
  else if (normalized.includes("terciario")) degree = "Terciario";
  else if (normalized.includes("universitario")) degree = "Universitario";
  
  // Palabras comunes a ignorar (stopwords)
  const stopwords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero', 'si', 'no', 'en', 'para', 'con', 'por', 'de', 'del', 'al', 'a', 'su', 'sus', 'te', 'se', 'lo', 'que', 'como', 'mas', 'muy', 'este', 'esta', 'estos', 'estas', 'es', 'son', 'ser', 'estar', 'tiene', 'tienen', 'hacer', 'anos', 'experiencia', 'busqueda', 'buscamos', 'importante', 'empresa', 'zona', 'lunes', 'viernes', 'horario', 'sueldo', 'remuneracion', 'puesto', 'cargo', 'requisitos', 'excluyente', 'deseable', 'secundario', 'completo']);
  
  // Extraer palabras clave
  const words = normalized.match(/\b[a-z0-9#+]{3,}\b/g) || [];
  
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (!stopwords.has(w) && !/^\d+$/.test(w)) { // Ignorar números solos
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  
  // Ordenar por frecuencia y quedarnos con las 15 más repetidas/relevantes
  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(e => e[0]);

  return {
    keywords,
    yearsOfExperience,
    degree,
    jobTitle: null
  };
}

export function checkKeywordInCV(keyword: string, cvData: any): boolean {
  if (!cvData) return false;
  const cvText = JSON.stringify(cvData).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return cvText.includes(keyword.toLowerCase());
}
