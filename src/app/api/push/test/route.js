/**
 * POST /api/push/test
 * 현재 사용자에 대해 활성화된 구독으로 테스트 푸시 발송
 * 인증: 필요(NextAuth)
 * 렌더링: 서버(Route Handler)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import PushSubscription from "@/models/subscription";
import { sendPush } from "@/lib/webpush";

export async function POST(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const subs = await PushSubscription.find({ userId: session.user.id, active: true })
      .select('endpoint keys')
      .limit(10)
      .lean();
    if (subs.length === 0) return NextResponse.json({ error: "no subscription" }, { status: 404 });

    const settled = await Promise.allSettled(
      subs.map(async (sub) => {
        const r = await sendPush(sub, { title: "CitySignal 테스트", body: "푸시 구독이 정상입니다." });
        if (r.gone && sub._id) await PushSubscription.updateOne({ _id: sub._id }, { $set: { active: false } });
        return { id: sub._id ? String(sub._id) : undefined, ok: r.ok, gone: r.gone || false };
      })
    );
    const results = settled.map((s) => (s.status === 'fulfilled' ? s.value : { ok: false, error: String(s.reason) }));
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
