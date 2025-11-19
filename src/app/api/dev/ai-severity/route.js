// POST /api/dev/ai-severity : test severity inference endpoint
// 한국어: AI 위험도 추론 테스트용 엔드포인트(본문 텍스트 → level)
import { NextResponse } from "next/server";
import { inferSeverityFromText } from "@/lib/aiSeverity";

// Dev-only: quick AI severity probe without creating a signal
// GET /api/dev/ai-severity?text=...
export async function GET(req) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "disabled in production" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text") || "";
    if (!text.trim()) {
      return NextResponse.json({ error: "text query required" }, { status: 400 });
    }
    const n = await inferSeverityFromText(text);
    return NextResponse.json({ severity: n, usedOpenAI: !!process.env.OPENAI_API_KEY });
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
