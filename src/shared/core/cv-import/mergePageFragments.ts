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

    // Merge personalInfo (keep truthy values, prefer non-empty)
    if (fragment.personalInfo) {
      for (const [key, value] of Object.entries(fragment.personalInfo)) {
        if (value && typeof value === 'string' && value.trim() !== '') {
          // If we already have this exact value, skip it (avoid duplicates)
          // Actually, we just overwrite if it's new and truthy. But usually personalInfo has distinct keys.
          if (!merged.personalInfo![key]) {
             merged.personalInfo![key] = value;
          } else if (merged.personalInfo![key] !== value) {
             // If they conflict, for personalInfo we usually keep the first encountered (page 1)
             // unless the new one is much longer/better. For simplicity, keep the first truthy.
          }
        }
      }
    }

    // Merge array fields
    const arrayFields = ['experience', 'education', 'skills', 'languages'];
    for (const field of arrayFields) {
      if (Array.isArray(fragment[field])) {
        if (!merged[field]) merged[field] = [];
        
        for (const item of fragment[field]) {
          if (item.continuesFromPrevious && merged[field].length > 0) {
            // Merge into the last item
            const lastItem = merged[field][merged[field].length - 1];
            for (const [k, v] of Object.entries(item)) {
              if (k === 'continuesFromPrevious') continue;
              if (typeof v === 'string' && typeof lastItem[k] === 'string') {
                // Append text
                lastItem[k] = `${lastItem[k].trim()} ${v.trim()}`.trim();
              } else if (!lastItem[k] && v) {
                // Fill missing fields
                lastItem[k] = v;
              }
            }
          } else {
            // It's a new item
            const newItem = { ...item };
            delete newItem.continuesFromPrevious;
            
            // Deduplicate exact matches
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
