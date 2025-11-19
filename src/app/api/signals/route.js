/**
 * /api/signals
 * GET  — Nearby or by-id signal listing (radiusKm, days)
 * POST — Create signal, infer AI severity, fanout push to subscribers
 * ------------------------------------------------------------------
 * 한국어 요약
 * GET  - 좌표 기준 반경/최근일 필터로 제보 목록 조회 (또는 id 단건)
 * POST - 새 제보 생성 후 AI로 위험도 추론, 구독자에게 푸시 전송
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import Signal from "@/models/signal";
import PushSubscription from "@/models/subscription";
import { sendPush } from "@/lib/webpush";
import { inferSeverityFromText } from "@/lib/aiSeverity";
import { parseSignalCreate } from "@/lib/schemas/signal";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// GET: 지정 좌표 주변의 최근 제보 조회 (반경+일수 필터)
export async function GET(req) {
  try {
    // DB 연결 시도. 실패하거나 SAFE_MODE면 목데이터로 대응하여 지도 마커가 비지 않게 함.
    let dbReady = true;
    try {
      if (process.env.SAFE_MODE === '1') throw new Error('safe mode');
      await connectDB();
    } catch {
      dbReady = false;
    }
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
    let lat = Number(searchParams.get("lat"));
    let lng = Number(searchParams.get("lng"));
    let radiusKm = Number(searchParams.get("radiusKm") || 3);
    let days = Number(searchParams.get("days") || 3);
    let limit = Number(searchParams.get("limit") || 10);
    // distance sort 전용 페이지 파라미터(옵션)
    let page = Number(searchParams.get("page") || 1);
    let pageSize = Number(searchParams.get("pageSize") || limit || 10);
    const cursor = searchParams.get("cursor"); // format: "<ms>,<id>"
    const sort = (searchParams.get("sort") || "latest").toLowerCase(); // latest | severity | mixed | sev_distance | distance | recommended
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
      if (!dbReady) {
        // 세이프모드에서는 중심 좌표가 없어도 서울시청 근방을 기본값으로 사용
        lat = 37.5665; lng = 126.9780;
      } else {
        return NextResponse.json({ error: "lat,lng 필요(또는 global=1)" }, { status: 400 });
      }
    }

    const toRadians = (km) => Number(km) / 6378.1; // 지구 반지름 기준(km)
    const radians = toRadians(radiusKm);

    // 거리순: $geoNear + page 기반 페이지네이션(안정 커서가 어려워 별도 분기)
    if (sort === "distance" || sort === 'sev_distance') {
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
        // sev_distance: 위험도 먼저, 그 다음 거리 / 기본 distance: 거리 우선
        { $sort: sort === 'sev_distance' ? { level: -1, dist: 1, createdAt: -1, _id: -1 } : { dist: 1, createdAt: -1, _id: -1 } },
        { $skip: skip },
        { $limit: pageSize + 1 },
        { $project: { title: 1, description: 1, level: 1, location: 1, geo: 1, createdAt: 1, zone: 1, dist: 1, source: 1 } },
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
    if (sort === "severity") sortSpec = { level: -1, createdAt: -1, _id: -1 };
    if (sort === 'mixed') sortSpec = { level: -1, createdAt: -1, _id: -1 }; // 혼합: 위험도 우선 후 최신

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
    let usePaged = (req.nextUrl && (new URL(req.url)).searchParams.has("page")) || (new URL(req.url)).searchParams.has("pageSize");
    let nextCursor = null;
    let nextPageVal = null;
    let items = [];
    // If 'recommended' sort is requested but no page params provided, fallback to paged mode
    if (sort === 'recommended' && !usePaged) {
      usePaged = true;
      page = 1;
      pageSize = limit || 10;
    }

    if (!dbReady) {
      // Fallback: 현실감 있는 목데이터 생성(반경 내 균일 분포, 카테고리/레벨/설명/시간 가중치)
      const R_EARTH_KM = 6378.1;
      const cosLat = Math.cos((lat * Math.PI) / 180);
      const toDegLat = (km) => km / 111; // 위도 1도 ≈ 111km
      const toDegLng = (km) => (cosLat === 0 ? 0 : km / (111 * cosLat));

      const presets = [
        { title: '화재 의심', level: 5, desc: ['불꽃과 연기 관측', '사이렌 소리와 연기 발생', '주택가 화재 신고 다수'], source: 'ai' },
        { title: '폭행/소란', level: 4, desc: ['큰 소리 다툼', '주변 상점 피해 우려', '경찰 출동 요청 발생'], source: 'user' },
        { title: '교통사고', level: 4, desc: ['차량 2대 충돌', '경미한 부상자 발생', '차량 정체 심함'], source: 'user' },
        { title: '도난/절도 의심', level: 3, desc: ['자전거 도난 신고', '상점 절도 시도', '수상한 배회자'], source: 'user' },
        { title: '수상한 인물', level: 2, desc: ['주택가 배회', '사진 촬영 반복', '창문 너머 관찰 정황'], source: 'user' },
        { title: '낙상/추락 위험', level: 2, desc: ['공사장 가림막 파손', '보행자 주의 필요', '안전표지 미비'], source: 'seed' },
      ];
      const roads = ['세종대로', '종로', '충무로', '퇴계로', '을지로', '한강대로', '올림픽로', '강남대로', '테헤란로', '도산대로', '양재대로', '방배로'];
      const nearbyCount = Math.floor(6 + Math.random() * 6); // 6~11개
      const nowMs = Date.now();

      const randBetween = (a, b) => a + Math.random() * (b - a);
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

      const items = Array.from({ length: nearbyCount }).map((_, i) => {
        // 균일 원판 분포: r = R*sqrt(u), theta=2πv
        const rKm = radiusKm * Math.sqrt(Math.random());
        const theta = randBetween(0, Math.PI * 2);
        const dLat = toDegLat(rKm * Math.cos(theta));
        const dLng = toDegLng(rKm * Math.sin(theta));
        const plat = lat + dLat;
        const plng = lng + dLng;

        const p = pick(presets);
        const road = pick(roads);
        const maybeGil = Math.random() < 0.6 ? ` ${Math.floor(1 + Math.random() * 30)}길` : '';
        const addr = `${road}${maybeGil} ${Math.floor(1 + Math.random() * 200)}`;

        const ageMin = Math.floor(randBetween(0, days * 24 * 60));
        const createdAt = new Date(nowMs - ageMin * 60000);
        const rel = ageMin < 60 ? `${ageMin}분 전` : `${Math.floor(ageMin / 60)}시간 전`;
        const desc = `${pick(p.desc)} · ${rel}`;
        const baseScore = p.level * 20;
        const freshnessPenalty = Math.floor(ageMin / 10);
        const score = Math.max(0, baseScore - freshnessPenalty + Math.floor(Math.random() * 8));

        return {
          _id: `mock-${nowMs}-${i}`,
          title: p.title,
          description: desc,
          level: p.level,
          location: { lat: plat, lng: plng, address: addr },
          geo: { type: 'Point', coordinates: [plng, plat] },
          createdAt: createdAt.toISOString(),
          zone: null,
          source: p.source,
          score,
        };
      });
      return NextResponse.json({ items, nextCursor: null, nextPage: null, page: 1 });
    }

    if (usePaged) {
      const skip = (page - 1) * (pageSize || limit);
      const pageLimit = pageSize || limit;
      // sortSpec override for recommended
      const effectiveSort = sort === 'recommended' ? { score: -1, createdAt: -1, _id: -1 } : sortSpec;
      const list = await Signal.find({ ...base })
        .select("title description level location geo createdAt zone source score")
        .sort(effectiveSort)
        .skip(skip)
        .limit(pageLimit + 1)
        .lean();
      nextPageVal = list.length > pageLimit ? page + 1 : null;
      items = list.slice(0, pageLimit);
    } else {
      const list = await Signal.find({ ...base, ...cursorFilter })
        .select("title description level location geo createdAt zone source score")
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

    // Rate limit: 10 creates / 5 minutes per IP
    const ip = clientIp(req);
    const rl = checkRateLimit({ key: `sig:create:${ip}`, limit: 10, windowMs: 5 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "rate limit", retryAfterMs: rl.resetIn }, { status: 429 });
    }

    const raw = await req.json();
    const parsed = parseSignalCreate(raw);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.errors.join(', ') }, { status: 400 });
    }
    const { title, description, category, lat, lng, address, zone, level } = parsed.data;
    const severity = Number.isFinite(Number(level)) ? Number(level) : await inferSeverityFromText(`${title}\n${description || ''}`);
    const doc = await Signal.create({
      userId: session.user.id,
      title: title.trim(),
      description: description ? description.trim() : '',
      level: Number(severity),
      category: category ? category.trim() : null,
      location: { lat, lng, address: address ? address.trim() : null },
      geo: { type: 'Point', coordinates: [lng, lat] },
      zone: zone || null,
      source: 'user',
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
