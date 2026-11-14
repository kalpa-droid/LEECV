export interface CVFragment {
  personalInfo?: Record<string, string>;
  experience?: Array<any>;
  education?: Array<any>;
  skills?: Array<any>;
  languages?: Array<any>;
  [key: string]: any;
}

export function mergePageFragments(fragments: CVFragment[]): CVFragment {
  const merged: CVFragment = {
    personalInfo: {
      summary: '',
      objective: '',
      frase: ''
    },
    experience: [],
    education: [],
    skills: [],
    languages: []
  };

  for (const fragment of fragments) {
    if (!fragment) continue;

    if (fragment.personalInfo) {
      for (const [key, value] of Object.entries(fragment.personalInfo)) {
        if (value && typeof value === 'string' && value.trim() !== '') {
          if (!merged.personalInfo![key]) {
             merged.personalInfo![key] = value;
          }
        }
      }
    }

    // Textos raíz (resumen, objetivo, frase) — el fusionado anterior los olvidaba
    for (const field of ['summary', 'objective', 'frase'] as const) {
      const value = (fragment as any)[field];
      if (typeof value === 'string' && value.trim()) {
        const existing = (merged as any)[field];
        if (!existing || (typeof existing === 'string' && !existing.trim())) {
          (merged as any)[field] = value.trim();
        }
      }
    }

    const arrayFields = [
      'experience',
      'education',
      'skills',
      'languages',
      'coursesAndCertificates',
      'projects',
      'publications',
      'achievements',
      'references',
      'hardSkills',
      'informatics',
      'portfolio',
      'profession',
      'redes',
      'frase'
    ];
    for (const field of arrayFields) {
      if (Array.isArray(fragment[field])) {
        if (!merged[field]) merged[field] = [];
        
        for (const item of fragment[field]) {
          if (item.continuesFromPrevious && merged[field].length > 0) {
            const lastItem = merged[field][merged[field].length - 1];
            for (const [k, v] of Object.entries(item)) {
              if (k === 'continuesFromPrevious') continue;
              if (typeof v === 'string' && typeof lastItem[k] === 'string') {
                lastItem[k] = `${lastItem[k].trim()} ${v.trim()}`.trim();
              } else if (!lastItem[k] && v) {
                lastItem[k] = v;
              }
            }
          } else {
            const newItem = { ...item };
            delete newItem.continuesFromPrevious;
            const isDuplicate = merged[field].some((existing: any) => 
              JSON.stringify(existing) === JSON.stringify(newItem)
            );
            if (!isDuplicate) {
              merged[field].push(newItem);
            }
          }
        }
      }
    }
  }

  return merged;
}
