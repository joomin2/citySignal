/**
 * POST /api/push/subscribe
 * 웹 푸시 구독 저장/갱신(선택: 위치/구역/반경 포함)
 * 인증: 필요(NextAuth)
 * 렌더링: 서버(Route Handler)
 * ----------------------------------------------------
 * English summary
 * - Persist or update web push subscription (optional geo/zone/radius)
 * - Requires auth (NextAuth session)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import PushSubscription from "@/models/subscription";

export async function POST(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { subscription, zone, lat, lng, radiusKm } = body || {};
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const doc = await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        geo: lat && lng ? { type: "Point", coordinates: [Number(lng), Number(lat)] } : undefined,
        zone: zone || undefined,
        radiusKm: radiusKm ? Number(radiusKm) : undefined,
        active: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).select('_id');

    return NextResponse.json({ ok: true, id: String(doc._id) });
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
