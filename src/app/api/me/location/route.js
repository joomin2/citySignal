/**
 * GET /api/me/location
 * Returns last-known location for the signed-in user.
 * Source: most recent active PushSubscription.geo
 * Auth: required
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import PushSubscription from "@/models/subscription";

export async function GET() {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sub = await PushSubscription.findOne({ userId: session.user.id, active: true })
      .sort({ updatedAt: -1 })
      .select("geo zone radiusKm updatedAt")
      .lean();
    if (!sub) return NextResponse.json({ found: false }, { status: 200 });

    const coords = Array.isArray(sub.geo?.coordinates) ? sub.geo.coordinates : null; // [lng, lat]
    return NextResponse.json({
      found: true,
      lat: coords ? Number(coords[1]) : null,
      lng: coords ? Number(coords[0]) : null,
      zone: sub.zone || null,
      radiusKm: sub.radiusKm || 2,
      updatedAt: sub.updatedAt || null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
