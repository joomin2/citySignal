/**
 * GET /api/push/mylocation
 * Returns the last-known geo/zone for the logged-in user from PushSubscription.
 * If unauthenticated or no subscription with geo exists, returns { found:false }.
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
    if (!session) return NextResponse.json({ found: false }, { status: 200 });

    const doc = await PushSubscription.findOne({ userId: session.user.id, active: true, "geo.coordinates": { $exists: true, $ne: null } })
      .select("geo zone radiusKm updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
    if (!doc) return NextResponse.json({ found: false }, { status: 200 });
    const coords = Array.isArray(doc.geo?.coordinates) ? doc.geo.coordinates : null; // [lng, lat]
    return NextResponse.json({
      found: true,
      lat: coords ? Number(coords[1]) : null,
      lng: coords ? Number(coords[0]) : null,
      zone: doc.zone || null,
      radiusKm: doc.radiusKm || 2,
      updatedAt: doc.updatedAt || null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
