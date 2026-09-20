import { describe, it, expect } from 'vitest';
import { resolvePlannerStyles } from '../src/shared/core/pdf-engine/layers/planner/plannerStyleEngine';
import { getPreset } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';

describe('plannerStyleEngine', () => {
  it('resolves unified planner styles using default classic preset', () => {
    const preset = getPreset('planner-clasico');
    const styles = resolvePlannerStyles(preset, '#ffffff');

    expect(styles.monthName.fontSizePt).toBeGreaterThan(0);
    expect(styles.year.fontSizePt).toBeGreaterThan(0);
    expect(styles.dayNumber.fontSizePt).toBeGreaterThan(0);
    expect(styles.rolesColor.primary).toBeDefined();
    expect(typeof styles.contrastTextOnAccent('#000000')).toBe('string');
  });

  it('calculates accessible contrast text color for custom accent background', () => {
    const preset = getPreset('planner-clasico');
    const styles = resolvePlannerStyles(preset, '#ffffff');

    const textOnDark = styles.contrastTextOnAccent('#000000');
    expect(textOnDark).toBe('#ffffff');

    const textOnLight = styles.contrastTextOnAccent('#ffffff');
    expect(textOnLight).toBe('#0f172a');
  });
});
