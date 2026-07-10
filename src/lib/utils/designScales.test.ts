import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SPACE_SCALE, RADIUS_SCALE } from './designScales';

const tokensCss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../styles/tokens.css'),
  'utf-8'
);

describe('designScales', () => {
  it('spacing steps mirror the --space-* rem values in tokens.css', () => {
    for (const step of SPACE_SCALE) {
      if (step.value === 0) continue; // 0 is not a token
      const rem = step.value / 16; // tokens.css declares spacing in rem
      expect(tokensCss).toContain(`${step.token}: ${rem}rem;`);
    }
  });

  it('radius steps mirror the --radius-* px values in tokens.css', () => {
    for (const step of RADIUS_SCALE) {
      if (step.value === 0) continue;
      expect(tokensCss).toContain(`${step.token}: ${step.value}px;`);
    }
  });

  it('scales are ascending and start at 0', () => {
    for (const scale of [SPACE_SCALE, RADIUS_SCALE]) {
      expect(scale[0].value).toBe(0);
      for (let i = 1; i < scale.length; i++) {
        expect(scale[i].value).toBeGreaterThan(scale[i - 1].value);
      }
    }
  });
});
