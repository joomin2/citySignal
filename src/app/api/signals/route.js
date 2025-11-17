/**
 * /api/signals
 * GET  — Nearby or by-id signal listing (radiusKm, days)
 * POST — Create signal, infer AI severity, fanout push to subscribers
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import Signal from "@/models/signal";
import PushSubscription from "@/models/subscription";
import { sendPush } from "@/lib/webpush";
import { inferSeverityFromText } from "@/lib/aiSeverity";

// GET: 지정 좌표 주변의 최근 제보 조회 (반경+일수 필터)
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const by = searchParams.get("by");
    if (by === "id") {
      // 단건 조회: id로 직접 조회
      const id = searchParams.get("id");
      const one = await Signal.findById(id).select("title description level location geo createdAt zone").lean();
      const res = NextResponse.json({ item: one });
      res.headers.set("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=120");
      return res;
    }
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    let radiusKm = Number(searchParams.get("radiusKm") || 3);
    let days = Number(searchParams.get("days") || 3);
    let limit = Number(searchParams.get("limit") || 10);
    // distance sort 전용 페이지 파라미터(옵션)
    let page = Number(searchParams.get("page") || 1);
    let pageSize = Number(searchParams.get("pageSize") || limit || 10);
    const cursor = searchParams.get("cursor"); // format: "<ms>,<id>"
    const sort = (searchParams.get("sort") || "latest").toLowerCase(); // latest | severity
    const global = searchParams.get("global") === "1";
    // 입력 파라미터 클램프(과도한 질의 방지)
    if (!Number.isFinite(radiusKm)) radiusKm = 3;
    if (!Number.isFinite(days)) days = 3;
    radiusKm = Math.min(Math.max(radiusKm, 0.1), 10); // 100m~10km
    days = Math.min(Math.max(days, 1), 30);           // 1~30일
    limit = Math.min(Math.max(limit, 1), 50);         // 1~50건
    page = Math.max(Number.isFinite(page) ? Math.floor(page) : 1, 1);
    pageSize = Math.min(Math.max(pageSize, 1), 50);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    if (!global && (Number.isNaN(lat) || Number.isNaN(lng))) {
      return NextResponse.json({ error: "lat,lng 필요(또는 global=1)" }, { status: 400 });
    }

    const toRadians = (km) => Number(km) / 6378.1; // 지구 반지름 기준(km)
    const radians = toRadians(radiusKm);

    // 거리순: $geoNear + page 기반 페이지네이션(안정 커서가 어려워 별도 분기)
    if (sort === "distance") {
      if (global) {
        return NextResponse.json({ error: "distance 정렬은 내 근처만 보기에서만 지원" }, { status: 400 });
      }
      const meters = (km) => Number(km) * 1000;
      const skip = (page - 1) * pageSize;
      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "dist",
            maxDistance: meters(radiusKm),
            spherical: true,
          },
        },
        { $match: { createdAt: { $gte: since }, status: { $ne: "resolved" } } },
        { $sort: { dist: 1, createdAt: -1, _id: -1 } },
        { $skip: skip },
        { $limit: pageSize + 1 },
        { $project: { title: 1, description: 1, level: 1, location: 1, geo: 1, createdAt: 1, zone: 1, dist: 1 } },
      ];
      const agg = await Signal.aggregate(pipeline);
      const hasMore = agg.length > pageSize;
      const items = agg.slice(0, pageSize);
      const res = NextResponse.json({ items, nextPage: hasMore ? page + 1 : null });
      res.headers.set("Cache-Control", "public, max-age=0, s-maxage=20, stale-while-revalidate=60");
      return res;
    }
    const base = {
      createdAt: { $gte: since },
      status: { $ne: "resolved" },
      ...(global ? {} : {
        geo: { $geoWithin: { $centerSphere: [[lng, lat], radians] } }
      }),
    };
    // 커서 파싱: "<ms>,<id>"
    let cursorFilter = {};
    let sortSpec = { createdAt: -1, _id: -1 };
    if (sort === "severity") {
      sortSpec = { level: -1, createdAt: -1, _id: -1 };
    }

    if (cursor) {
      try {
        if (sort === "severity") {
          const [lvlStr, msStr, idStr] = String(cursor).split(",");
          const lvl = Number(lvlStr);
          const ms = Number(msStr);
          const ts = new Date(ms);
          const { Types } = await import("mongoose");
          const oid = new Types.ObjectId(idStr);
          cursorFilter = {
            $or: [
              { level: { $lt: lvl } },
              { level: lvl, $or: [ { createdAt: { $lt: ts } }, { createdAt: ts, _id: { $lt: oid } } ] },
            ],
          };
        } else {
          const [msStr, idStr] = String(cursor).split(",");
          const ms = Number(msStr);
          const ts = new Date(ms);
          const { Types } = await import("mongoose");
          const oid = new Types.ObjectId(idStr);
          cursorFilter = { $or: [ { createdAt: { $lt: ts } }, { createdAt: ts, _id: { $lt: oid } } ] };
        }
      } catch {}
    }

    // 커서 기반(기본) 또는 페이지 기반(page/pageSize 제공 시) 페이징
    const usePaged = (req.nextUrl && (new URL(req.url)).searchParams.has("page")) || (new URL(req.url)).searchParams.has("pageSize");
    let nextCursor = null;
    let nextPageVal = null;
    let items = [];
    if (usePaged) {
      const skip = (page - 1) * (pageSize || limit);
      const pageLimit = pageSize || limit;
      const list = await Signal.find({ ...base })
        .select("title description level location geo createdAt zone")
        .sort(sortSpec)
        .skip(skip)
        .limit(pageLimit + 1)
        .lean();
      nextPageVal = list.length > pageLimit ? page + 1 : null;
      items = list.slice(0, pageLimit);
    } else {
      const list = await Signal.find({ ...base, ...cursorFilter })
        .select("title description level location geo createdAt zone")
        .sort(sortSpec)
        .limit(limit + 1)
        .lean();
      if (list.length > limit) {
        const last = list[limit - 1];
        if (sort === "severity") {
          nextCursor = `${Number(last.level || 0)},${new Date(last.createdAt).getTime()},${String(last._id)}`;
        } else {
          nextCursor = `${new Date(last.createdAt).getTime()},${String(last._id)}`;
        }
      }
      items = list.slice(0, limit);
    }

    const res = NextResponse.json({ items, nextCursor, nextPage: nextPageVal, page: usePaged ? page : undefined });
    res.headers.set("Cache-Control", "public, max-age=0, s-maxage=20, stale-while-revalidate=60");
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}

// POST: 제보 생성 후, 주변 구독자에게 알림 발송(반경 기반)
export async function POST(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, description, category, lat, lng, address, zone, level } = body || {};
    if (!title || lat == null || lng == null) {
      return NextResponse.json({ error: "title, lat, lng 필요" }, { status: 400 });
    }

    // 1) 1–5단계 위험도: 요청에 level이 있으면 우선 사용(테스트/시드 최적화)
    const severity = Number.isFinite(Number(level)) ? Number(level) : await inferSeverityFromText(`${title}\n${description || ""}`);

    // 2) DB 저장 (GeoJSON 포인트 포함)
    const doc = await Signal.create({
      userId: session.user.id,
      title,
      description,
      level: Number(severity),
      category,
      location: { lat: Number(lat), lng: Number(lng), address: address || null },
      geo: { type: "Point", coordinates: [Number(lng), Number(lat)] },
      zone: zone || null,
    });

    // 3) 반경 기반으로 근접 구독자 후보 조회 후 알림 전송
    const meters = (km) => Number(km) * 1000;
    const candidates = await PushSubscription.find({ active: true }).find({
      geo: {
        $near: {
          $geometry: { type: "Point", coordinates: doc.geo.coordinates },
          $maxDistance: meters(5),
        },
      },
    })
      .select("endpoint keys geo radiusKm active")
      .limit(500)
      .lean();

    const payload = {
      t: doc.title,
      b: doc.description || "",
      l: Number(doc.level) || 1,
      a: doc.location?.address || "",
      z: doc.zone?.key || "",
      id: String(doc._id),
      at: new Date(doc.createdAt || Date.now()).toISOString(),
    };

    // 동시성 제어(최대 10개 동시 전송)
    const limit = 10;
    const chunks = (arr, size) => arr.reduce((acc, _, i) => (i % size ? acc : acc.concat([arr.slice(i, i + size)])), []);
    const results = [];
    for (const group of chunks(candidates, limit)) {
      // 각 그룹을 병렬 처리
      const settled = await Promise.allSettled(group.map(async (sub) => {
        // 구독자 반경 계산
        const maxMeters = sub.radiusKm ? meters(sub.radiusKm) : meters(5);
        let inRadius = true;
        if (sub.geo?.coordinates) {
          const [slng, slat] = sub.geo.coordinates;
          const R = 6371000;
          const toRad = (d) => (d * Math.PI) / 180;
          const dLat = toRad(Number(lat) - slat);
          const dLon = toRad(Number(lng) - slng);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(slat)) * Math.cos(toRad(Number(lat))) * Math.sin(dLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const d = R * c;
          inRadius = d <= maxMeters;
        }
        if (!inRadius) return { id: sub._id, ok: false, skipped: true };
        const r = await sendPush(sub, { title: payload.t, body: `위험도 ${payload.l}단계 · ${payload.a}`, data: payload });
        if (r.gone) await PushSubscription.updateOne({ _id: sub._id }, { $set: { active: false } });
        return { id: sub._id, ok: r.ok, gone: r.gone || false };
      }));
      for (const s of settled) {
        if (s.status === "fulfilled") results.push(s.value);
        else results.push({ ok: false, error: s.reason?.message || String(s.reason) });
      }
    }

    return NextResponse.json({ ok: true, id: doc._id, notified: results });
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
