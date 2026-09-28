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
    personalInfo: {},
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

    const arrayFields = ['experience', 'education', 'skills', 'languages'];
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
