import { useMemo } from 'react';
import { runAtsPreflightCheck } from '../pdf-engine/layers/ats/atsPreflightCheck';
import { resolveActivePreset } from '../pdf-engine/layers/presets/presetRegistry';
import { cvDataToContentSections } from '../pdf-engine/layers/records/cvDataAdapter';
import type { CVData } from '../../../types/cv';
import type { AtsPreflightResult } from '../pdf-engine/layers/ats/atsPreflightCheck';

export interface AtsLiveScore {
  result: AtsPreflightResult | null;
  score: number;
  levels: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  };
  warnings: AtsPreflightResult['warnings'];
  linearReadingOrder: string[];
}

export function useAtsLiveScore(cvData: any, jobDescription?: string): AtsLiveScore {
  return useMemo(() => {
    if (!cvData || typeof cvData !== 'object') {
      return {
        result: null,
        score: 80,
        levels: { criticalCount: 0, warningCount: 0, infoCount: 0 },
        warnings: [],
        linearReadingOrder: [],
      };
    }

    const preset = resolveActivePreset(cvData as CVData);
    const sections = cvDataToContentSections(cvData as CVData);
    const res = runAtsPreflightCheck(preset, sections, cvData as CVData, jobDescription ?? cvData?.jobTarget?.jobDescription);

    return {
      result: res,
      score: res.score,
      levels: {
        criticalCount: res.warnings.filter(w => w.level === 'critical').length,
        warningCount: res.warnings.filter(w => w.level === 'warning').length,
        infoCount: res.warnings.filter(w => w.level === 'info').length,
      },
      warnings: res.warnings,
      linearReadingOrder: res.linearReadingOrder,
    };
  }, [cvData, jobDescription]);
}
