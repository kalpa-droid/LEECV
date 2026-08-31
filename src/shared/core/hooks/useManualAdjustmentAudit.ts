import { useEffect } from 'react';
import { getSectionsRequiringManualAdjustment } from '../sectionRegistry';
import { getMountedManualAdjustments } from '../../../modules/cv-builder/components/editor/SectionManualAdjustment';

export function useManualAdjustmentAudit(cvData: any) {
  useEffect(() => {
    if (!import.meta.env.DEV || !cvData) return;

    const reqSections = getSectionsRequiringManualAdjustment(cvData.customSections || []);
    const mounted = getMountedManualAdjustments();

    const missing = reqSections.filter(s => {
      const isVisible = cvData.sectionVisibility?.[s.id] !== false;
      return isVisible && !mounted.has(s.id);
    });

    if (missing.length > 0) {
      console.error(
        `[LEECV Dev Audit] Warning: ${missing.length} active sections have no mounted SectionManualAdjustment:`,
        missing.map(s => s.id)
      );
    }
  }, [cvData]);
}
