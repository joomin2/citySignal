// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inferSeverityFromText } from './aiSeverity.js';

beforeEach(() => {
  // Ensure heuristic branch by clearing API key
  vi.stubEnv('OPENAI_API_KEY', '');
});

describe('inferSeverityFromText heuristic classification', () => {
  it('classifies lethal/violent text high (>=4)', async () => {
    const n = await inferSeverityFromText('폭발 위험 가스 누출로 즉시 대피 필요');
    expect(n).toBeGreaterThanOrEqual(4);
  });
  it('classifies minor infrastructure issue low (<=2)', async () => {
    const n = await inferSeverityFromText('가로등 고장으로 주변이 어두움');
    expect(n).toBeLessThanOrEqual(2);
  });
});
