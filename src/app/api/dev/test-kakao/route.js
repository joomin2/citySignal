import { NextResponse } from "next/server";

// Diagnostic wrapper: hits geo/reverse with debug flag and returns timing + key fields.
// GET /api/dev/test-kakao?lat=..&lng=..
export async function GET(req) {
  const started = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat") || "37.5665"; // Seoul default
    const lng = searchParams.get("lng") || "126.9780";

    const reverseUrl = new URL(req.url);
    reverseUrl.pathname = "/api/geo/reverse";
    reverseUrl.search = `?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&debug=1`;

    const res = await fetch(reverseUrl.toString());
    const json = await res.json();

    const durationMs = Date.now() - started;
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: json?.error || 'reverse failed', durationMs }, { status: res.status || 500 });
    }

    return NextResponse.json({
      ok: true,
      lat: Number(lat),
      lng: Number(lng),
      address: json.address,
      zone: json.zone,
      area: json.area,
      kakaoUsed: json?.debug?.kakaoUsed || false,
      kakaoTried: json?.debug?.kakaoTried || 0,
      sample: json?.debug?.kakaoSample || null,
      needsKakao: json?.debug?.needsKakao || false,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message, durationMs: Date.now() - started }, { status: 500 });
  }
}
