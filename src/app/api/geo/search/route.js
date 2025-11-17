/**
 * GET /api/geo/search
 * Nominatim 기반의 지오코딩(주소→좌표) 후, 필요 시 카카오 API로 동/리 보정
 * Query: q (검색어), debug=1 (선택)
 * 렌더링: 서버(Route Handler)
 */
import { NextResponse } from "next/server";
import { formatFromNominatim } from "../_utils/format";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const debug = searchParams.get("debug");
    if (!q) return NextResponse.json({ error: "q 필요" }, { status: 400 });

    const endpoint = new URL("https://nominatim.openstreetmap.org/search");
    endpoint.searchParams.set("format", "jsonv2");
    endpoint.searchParams.set("q", q);
    endpoint.searchParams.set("limit", "1");
    endpoint.searchParams.set("addressdetails", "1");
    endpoint.searchParams.set("namedetails", "1");
    endpoint.searchParams.set("extratags", "1");
    endpoint.searchParams.set("accept-language", "ko");

    const res = await fetch(endpoint.toString(), {
      headers: {
        "User-Agent": "CitySignal/0.1 (dev@citysignal.local)",
        "Accept": "application/json",
        "Referer": process.env.NEXTAUTH_URL || "http://localhost:3001",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `search 실패: ${text}` }, { status: 502 });
    }

    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      return NextResponse.json({ error: "결과 없음" }, { status: 404 });
    }

    const first = list[0];
    let formatted = formatFromNominatim(first);
    const lat = Number(first.lat);
    const lng = Number(first.lon);

    const isRoad = (s) => {
      if (!s || typeof s !== "string") return false;
      return /(로|길|번길|대로)$/u.test(s) || /\d+\s*(로|길|번길)$/u.test(s) || /로\d+번?길?$/u.test(s);
    };

    const kakaoKey = process.env.KAKAO_REST_API_KEY;
    const needsKakao = (!formatted?.area?.ri && !formatted?.area?.dong) ||
      (formatted?.area?.dong && isRoad(formatted.area.dong));
    let kakaoUsed = false;
    let kakaoTried = 0;
    let kakaoLastDoc = null;
    if (kakaoKey && (needsKakao || debug === "1")) {
      try {
        const fetchKakao = async (x, y) => {
          const kakaoUrl = new URL("https://dapi.kakao.com/v2/local/geo/coord2regioncode.json");
          kakaoUrl.searchParams.set("x", String(x));
          kakaoUrl.searchParams.set("y", String(y));
          const kres = await fetch(kakaoUrl.toString(), {
            headers: { Authorization: `KakaoAK ${kakaoKey}` },
            cache: "no-store",
          });
          kakaoTried++;
          if (!kres.ok) return null;
          const kjson = await kres.json();
          const docs = Array.isArray(kjson?.documents) ? kjson.documents : [];
          return docs.find((d) => d.region_type === "B") || docs[0] || null;
        };
        const fetchKakaoAddr = async (x, y) => {
          const url = new URL("https://dapi.kakao.com/v2/local/geo/coord2address.json");
          url.searchParams.set("x", String(x));
          url.searchParams.set("y", String(y));
          const r = await fetch(url.toString(), {
            headers: { Authorization: `KakaoAK ${kakaoKey}` },
            cache: "no-store",
          });
          if (!r.ok) return null;
          const j = await r.json();
          const doc = Array.isArray(j?.documents) ? j.documents[0] : null;
          return doc || null;
        };

        const baseX = Number(lng);
        const baseY = Number(lat);
        const deltas = [
          [0, 0],
          [0.0003, 0],
          [-0.0003, 0],
          [0, 0.0003],
          [0, -0.0003],
          [0.00025, 0.00025],
          [-0.00025, -0.00025],
        ];

        for (const [dx, dy] of deltas) {
          const legal = await fetchKakao(baseX + dx, baseY + dy);
          if (!legal) continue;
          kakaoLastDoc = legal;
          const r2 = legal.region_2depth_name;
          const r3 = legal.region_3depth_name;
          const r4 = legal.region_4depth_name;

          const eupmyeon = /(읍|면)$/u.test(r3) ? r3 : formatted.area.eupmyeon;
          const dong = /동$/u.test(r3) ? r3 : formatted.area.dong;
          const ri = r4 && /리$/u.test(r4) ? r4 : (formatted.area.ri || (/리$/u.test(r3) ? r3 : null));

          const dedup = (arr) => arr.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
          const line = dedup([r2 || formatted.area.city, formatted.area.district, eupmyeon, dong, ri]).join(" ");
          const address = `${line}${formatted.area.postcode ? ` (${formatted.area.postcode})` : ""}`.trim();
          const zoneKey = dedup([r2 || formatted.area.city, formatted.area.district]).join(" ");
          const subZone = dedup([eupmyeon, dong, ri]).join(" ") || null;

          formatted = {
            ...formatted,
            address: address || formatted.address,
            area: {
              ...formatted.area,
              city: r2 || formatted.area.city,
              eupmyeon: eupmyeon || null,
              dong: dong || null,
              ri: ri || null,
            },
            zone: { key: zoneKey || null, sub: subZone },
          };

          if (ri || dong) { kakaoUsed = true; break; }
        }

        if (!formatted?.area?.ri) {
          for (const [dx, dy] of deltas) {
            const addrDoc = await fetchKakaoAddr(baseX + dx, baseY + dy);
            if (!addrDoc) continue;
            const addressObj = addrDoc.address || addrDoc.road_address || {};
            const r2n = addressObj.region_2depth_name;
            const r3n = addressObj.region_3depth_name;
            const r4n = addressObj.region_4depth_name;

            const eupmyeon = /(읍|면)$/u.test(r3n) ? r3n : formatted.area.eupmyeon;
            const dong = /동$/u.test(r3n) ? r3n : formatted.area.dong;
            const ri = /리$/u.test(r4n || "") ? r4n : (/리$/u.test(r3n || "") ? r3n : formatted.area.ri);

            const dedup = (arr) => arr.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
            const line = dedup([r2n || formatted.area.city, formatted.area.district, eupmyeon, dong, ri]).join(" ");
            const address = `${line}${formatted.area.postcode ? ` (${formatted.area.postcode})` : ""}`.trim();
            const zoneKey = dedup([r2n || formatted.area.city, formatted.area.district]).join(" ");
            const subZone = dedup([eupmyeon, dong, ri]).join(" ") || null;

            formatted = {
              ...formatted,
              address: address || formatted.address,
              area: {
                ...formatted.area,
                city: r2n || formatted.area.city,
                eupmyeon: eupmyeon || null,
                dong: dong || null,
                ri: ri || null,
              },
              zone: { key: zoneKey || null, sub: subZone },
            };

            if (ri) { kakaoUsed = true; break; }
          }
        }
      } catch {}
    }

    const payload = { ...formatted, lat, lng, raw: first };
    if (debug === "1") {
      payload.debug = { needsKakao, kakaoUsed, kakaoTried, kakaoSample: kakaoLastDoc || null };
    }
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
