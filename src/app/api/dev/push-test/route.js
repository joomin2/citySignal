/**
 * POST /api/dev/push-test
 * 개발용: 현재 로그인 사용자의 가장 최근 활성 구독(또는 임의의 활성 구독)에 테스트 푸시 전송
 * Body(optional): { title, body, url, level }
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

    const body = await req.json().catch(() => ({}));
    const title = body?.title || "CitySignal 테스트";
    const msg = body?.body || "푸시 테스트 알림입니다";
    const url = body?.url || "/";
    const level = Number(body?.level) || 2;

    let sub = null;
    if (session) {
      sub = await PushSubscription.findOne({ userId: session.user.id, active: true })
        .sort({ updatedAt: -1 })
        .lean();
    }
    if (!sub) {
      sub = await PushSubscription.findOne({ active: true }).sort({ updatedAt: -1 }).lean();
    }
    if (!sub) return NextResponse.json({ ok: false, error: "no active subscription" }, { status: 404 });

    const payload = {
      title,
      body: msg,
      data: { id: null, l: level, url },
    };
    const r = await sendPush(sub, payload);
    return NextResponse.json({ ok: r.ok, gone: r.gone || false });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message || "server error" }, { status: 500 });
  }
}
