import { NextResponse } from "next/server";

// Reverse geocode using OpenStreetMap Nominatim (no SDK, rate-limited; fine for dev)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const debug = searchParams.get("debug");
    if (!lat || !lng) {
      return NextResponse.json({ error: "lat,lng 필요" }, { status: 400 });
    }

    const endpoint = new URL("https://nominatim.openstreetmap.org/reverse");
    endpoint.searchParams.set("format", "jsonv2");
    endpoint.searchParams.set("lat", lat);
    endpoint.searchParams.set("lon", lng);
    endpoint.searchParams.set("addressdetails", "1");
    endpoint.searchParams.set("accept-language", "ko");
    // Ask for more granular details and localized names
    endpoint.searchParams.set("namedetails", "1");
    endpoint.searchParams.set("extratags", "1");
    endpoint.searchParams.set("zoom", "18");

    const res = await fetch(endpoint.toString(), {
      headers: {
        "User-Agent": "CitySignal/0.1 (dev@citysignal.local)",
        "Accept": "application/json",
        "Referer": process.env.NEXTAUTH_URL || "http://localhost:3001",
      },
      // Nominatim asks to avoid aggressive caching on reverse lookups
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `reverse geocode 실패: ${text}` }, { status: 502 });
    }

    const data = await res.json();
    const a = data?.address || {};

    // Heuristics to avoid road names being picked as admin units
    const isRoad = (s) => {
      if (!s || typeof s !== "string") return false;
      // Ends with common road suffixes or contains road-number patterns
      return /(로|길|번길|대로)$/u.test(s) || /\d+\s*(로|길|번길)$/u.test(s) || /로\d+번?길?$/u.test(s);
    };

    // 상위 행정구역
    const province = a.state; // 충청남도 등
    const city = a.city || a.town || a.village; // 인천시, 아산시 등
    const district = a.city_district || a.district || a.county; // 서구, ○○군 등

    // 하위 행정구역 후보 추출(동/읍/면/리 판별 시도)
    const koLeaf = /(동|읍|면|리)$/;
    const enLeaf = /(dong|eup|myeon|ri)$/i; // 안전판(영문 표기 대응)
    let subs = [
      a.suburb,
      a.neighbourhood,
      a.quarter,
      a.hamlet,
      a.village,
      a.locality,
      a.residential,
    ]
      .filter(Boolean)
      .filter((s) => !isRoad(s));
    // town이 종종 '탕정면' 같은 케이스로 들어올 수 있으므로 후보에 조건부 포함
    if (a.town && (koLeaf.test(a.town) || enLeaf.test(a.town)) && !isRoad(a.town)) {
      if (!subs.includes(a.town)) subs.push(a.town);
    }

    // Add localized name candidates (e.g., 갈산리) when present
    const koName = data?.namedetails?.["name:ko"] || data?.name;
    if (koName && !isRoad(koName)) subs.push(koName);
    // As a last resort, parse tokens from display_name and pick a token ending with '리'
    const displayTokens = (data?.display_name || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const riFromDisplay = displayTokens.find((t) => /리$/.test(t) && !isRoad(t));
    if (riFromDisplay) subs.push(riFromDisplay);

    // Deduplicate after all pushes
    subs = subs.filter((v, i, a) => a.indexOf(v) === i);

    let dong, eupmyeon, ri;
    for (const s of subs) {
      if (!dong && /동$/.test(s)) dong = s;
      if (!eupmyeon && /(읍|면)$/.test(s)) eupmyeon = s; // 탕정면 등
      if (!ri && /리$/.test(s)) ri = s;
    }
    // 기본값 개선: 동이 없다고 해서 도로명이 들어오지 않도록 필터
    if (!dong && subs.length) {
      const cand = subs.find((s) => s !== eupmyeon && s !== district && s !== city && !isRoad(s));
      if (cand && /(동)$/u.test(cand)) {
        dong = cand;
      }
    }

    // Kakao Local API fallback for legal dong/ri when needed (optional)
    const kakaoKey = process.env.KAKAO_REST_API_KEY;
    const needsKakao = (!ri && !dong) || (dong && isRoad(dong));
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

        // Try center, then small offsets (~30-60m)
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
          const r2 = legal.region_2depth_name; // 시/군/구
          const r3 = legal.region_3depth_name; // 읍/면/동(또는 리일 수도)
          const r4 = legal.region_4depth_name; // 리(존재 시)

          if (!eupmyeon && /(읍|면)$/u.test(r3)) eupmyeon = r3;
          if (!dong && /동$/u.test(r3)) dong = r3;
          if (!ri && ((r4 && /리$/u.test(r4)) || /리$/u.test(r3))) ri = r4 || r3;

          if (r2 && !a.city) a.city = r2;

          if (ri || dong) { kakaoUsed = true; break; }
        }

        // If still missing 'ri', try coord2address which often carries region_4depth_name
        if (!ri) {
          for (const [dx, dy] of deltas) {
            const addrDoc = await fetchKakaoAddr(baseX + dx, baseY + dy);
            if (!addrDoc) continue;
            const addressObj = addrDoc.address || addrDoc.road_address || {};
            const r2n = addressObj.region_2depth_name; // 시/군/구
            const r3n = addressObj.region_3depth_name; // 읍/면/동
            const r4n = addressObj.region_4depth_name; // 리
            if (!eupmyeon && /(읍|면)$/u.test(r3n)) eupmyeon = r3n;
            if (!dong && /동$/u.test(r3n)) dong = r3n;
            if (!ri && /리$/u.test(r4n || "")) ri = r4n;
            if (!ri && /리$/u.test(r3n || "")) ri = r3n; // 일부 응답에서 r3에 '리'가 포함됨
            if (r2n && !a.city) a.city = r2n;
            if (ri) { kakaoUsed = true; break; }
          }
        }
      } catch {
        // ignore fallback errors silently
      }
    }

    // 표기 우선순위: city + district + (eup/myeon) + (dong) + (ri)
    const lineParts = [a.city || city, district, eupmyeon, dong, ri]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);
    let admin = lineParts.join(" ");
    if (!admin) admin = [province, city].filter(Boolean).join(" ");
    if (!admin) admin = data?.display_name || "주소 정보 없음";

    const postcode = a.postcode ? ` (${a.postcode})` : "";
    const address = `${admin}${postcode}`.trim();

    // 영역 버킷 키: city [district]
    const zoneKey = [a.city || city, district].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" ");
    const subZone = [eupmyeon, dong, ri]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(" ") || null;

    // lat/lng echo를 함께 반환하면 클라이언트에서 유용
    const payload = {
      address,
      area: {
        province,
        city,
        district,
        dong: dong || null,
        eupmyeon: eupmyeon || null,
        ri: ri || null,
        postcode: a.postcode || null,
      },
      zone: { key: zoneKey || null, sub: subZone },
      raw: data,
    };

    if (debug === "1") {
      payload.debug = {
        needsKakao,
        kakaoUsed,
        kakaoTried,
        kakaoSample: kakaoLastDoc || null,
      };
    }

    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
