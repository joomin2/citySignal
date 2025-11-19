/**
 * POST /api/dev/seed-comments
 * 개발용: 최근 시드/사용자 게시물 일부에 예시 댓글을 몇 개씩 추가
 * Auth: none (dev only). Protect in production if needed.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Signal from "@/models/signal";
import Comment from "@/models/comment";

const SAMPLES = [
  "현장 지나왔는데, 표시해주신 위치가 정확했어요. 감사합니다!",
  "방금도 차량이 좀 빠르게 지나가요. 야간에는 더 조심하세요.",
  "관리 요청 접수됐다고 들었어요. 해결되면 업데이트 부탁드려요.",
  "근처 주민입니다. 우회로 이용하면 조금 더 안전합니다.",
  "비 올 때 미끄러우니 속도 줄이세요. 안전운전!",
];

export async function POST() {
  try {
    await connectDB();
    // 최근 게시물 5개(시드/사용자 구분 없이), 가장 최신 순
    const targets = await Signal.find({}).sort({ createdAt: -1 }).limit(5).select("_id").lean();
    if (!targets.length) return NextResponse.json({ ok: true, created: 0 });
    let created = 0;
    for (const t of targets) {
      const howMany = 2 + Math.floor(Math.random() * 2); // 2~3개
      for (let i = 0; i < howMany; i++) {
        const content = SAMPLES[(i + created) % SAMPLES.length];
        await Comment.create({ signalId: t._id, userId: null, content });
        created++;
      }
    }
    return NextResponse.json({ ok: true, created, targets: targets.map(x => String(x._id)) });
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
