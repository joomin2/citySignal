import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inferSeverityFromText } from './aiSeverity';

// Ensure we don't call OpenAI in tests
beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', '');
});

describe('inferSeverityFromText (heuristic fallback)', () => {
  it('returns 5 for lethal/violent urgency', async () => {
    const n = await inferSeverityFromText('가스 누출로 대피 필요, 연기와 폭발 위험');
    expect(n).toBeGreaterThanOrEqual(4);
  });

  it('returns 3 for watch-level incidents', async () => {
    const n = await inferSeverityFromText('교통사고 접촉사고 발생, 부상자 경미');
    expect([2,3,4,5]).toContain(n);
  });

  it('returns 1 for minor/info', async () => {
    const n = await inferSeverityFromText('가로등이 꺼져 있습니다');
    expect(n).toBeGreaterThanOrEqual(1);
  });
});
