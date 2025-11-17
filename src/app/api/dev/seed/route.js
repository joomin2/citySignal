/**
 * POST /api/dev/seed
 * 개발 전용: 지정 좌표 주변에 무작위 샘플 제보 다건 삽입
 * 인증: 불필요(프로덕션에서는 차단)
 * 렌더링: 서버(Route Handler)
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Signal from "@/models/signal";

export async function POST(req) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const lat = Number(body.lat ?? 37.5665);
    const lng = Number(body.lng ?? 126.9780);
    const count = Math.min(Number(body.count ?? 5), 50);

    const titles = [
      "의심스러운 차량 목격",
      "가로등 고장 구간",
      "소음 및 다툼 발생",
      "빈집 주변 이상 징후",
      "야간 취약 구간 안내",
      "화재 위험 냄새",
    ];

    // 1(정보)~5(긴급) 분포: 5는 낮은 확률, 4/3은 보통, 1/2은 자주
    const pickLevel = () => {
      const r = Math.random();
      if (r < 0.05) return 5; // 5%
      if (r < 0.20) return 4; // 15%
      if (r < 0.55) return 3; // 35%
      if (r < 0.85) return 2; // 30%
      return 1;              // 15%
    };

    const docs = Array.from({ length: count }).map((_, i) => {
      const dx = (Math.random() - 0.5) * 0.004; // ~ +- 200m
      const dy = (Math.random() - 0.5) * 0.004;
      const lvl = pickLevel();
      const title = titles[(Math.random() * titles.length) | 0];
      const score = Math.floor(Math.random() * 6);
      return {
        title: `[샘플] ${title}`,
        description: "개발용 샘플 데이터",
        level: lvl,
        category: "sample",
        location: { lat: lat + dy, lng: lng + dx, address: null },
        geo: { type: "Point", coordinates: [lng + dx, lat + dy] },
        zone: null,
        score,
        status: "active",
      };
    });

    const result = await Signal.insertMany(docs);
    return NextResponse.json({ ok: true, created: result.length });
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
