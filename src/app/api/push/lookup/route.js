/**
 * GET /api/push/lookup
 * Look up a stored subscription by endpoint or id and return last-known geo/zone.
 * Auth: none (endpoint is opaque), returns minimal fields.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import PushSubscription from "@/models/subscription";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");
    const id = searchParams.get("id");
    if (!endpoint && !id) {
      return NextResponse.json({ error: "endpoint 또는 id 필요" }, { status: 400 });
    }

    let doc = null;
    if (endpoint) {
      doc = await PushSubscription.findOne({ endpoint, active: true })
        .select("geo zone radiusKm updatedAt")
        .lean();
    } else if (id) {
      doc = await PushSubscription.findById(id)
        .select("geo zone radiusKm updatedAt")
        .lean();
    }

    if (!doc) return NextResponse.json({ found: false });
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
