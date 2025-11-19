// GET /api/dev/test-ai : lightweight AI feature probe (dev only)
// 한국어: AI 관련 기능 간단 테스트용 (개발 환경 전용)
import { NextResponse } from "next/server";
import { inferSeverityFromText } from "@/lib/aiSeverity";

// GET /api/dev/test-ai?text=...
// Returns AI/heuristic severity plus timing + cache/meta for diagnostics.
export async function GET(req) {
  const started = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text") || "고속도로에서 다중 추돌 사고가 발생했고 연기가 나고 있어요";
    const apiKeyPresent = !!process.env.OPENAI_API_KEY;

    // Detect cache state (best-effort) BEFORE call
    const cache = globalThis._aiCache || new Map();
    const CACHE_TTL_MS = 60_000;
    const cachedEntry = cache.get(text);
    const now = Date.now();
    const cached = !!(cachedEntry && (now - cachedEntry.ts) < CACHE_TTL_MS);

    const severity = await inferSeverityFromText(text);

    const durationMs = Date.now() - started;
    return NextResponse.json({
      ok: true,
      input: text,
      severity,
      cached,
      openaiConfigured: apiKeyPresent,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message, durationMs: Date.now() - started }, { status: 500 });
  }
}
