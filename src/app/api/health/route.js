/**
 * /api/health
 * GET — Basic healthcheck for app and DB
 * - Returns service status, DB ping time, and counts snapshot
 * -----------------------------------------------------------
 * 한국어 요약
 * - 애플리케이션 및 DB 기본 상태 확인용
 * - 서비스 정상 여부(ok), DB 응답 시간(dbMs), 문서 수(counts) 등 반환
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Signal from "@/models/signal";

export async function GET() {
  const started = Date.now();
  let dbMs = null;
  let counts = null;
  try {
    await connectDB();
    const t0 = Date.now();
    // lightweight query for ping (countDocuments is optimized when indexed)
    counts = {
      signals: await Signal.estimatedDocumentCount().catch(() => null),
    };
    dbMs = Date.now() - t0;
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "db error" }, { status: 500 });
  }

  const body = {
    ok: true,
    uptimeMs: Date.now() - started,
    dbMs,
    counts,
    time: new Date().toISOString(),
  };
  const res = NextResponse.json(body);
  res.headers.set("Cache-Control", "public, max-age=0, s-maxage=5");
  return res;
}
