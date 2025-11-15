// Utility to normalize Nominatim response into Korean-style admin address

const isRoad = (s) => /(번길|대로|로|길)$/u.test(s || "");

export function formatFromNominatim(data) {
  const a = data?.address || {};

  const province = a.state || null;
  const city = a.city || a.town || a.village || null; // 시/군/자치시
  const district = a.city_district || a.district || a.county || null; // 구/군

  const koLeaf = /(동|읍|면|리)$/u;
  const enLeaf = /(dong|eup|myeon|ri)$/iu;

  const subs = [
    a.suburb,
    a.neighbourhood,
    a.quarter,
    a.hamlet,
    a.village,
    a.locality,
    a.residential,
  ].filter(Boolean);

  if (a.town && (koLeaf.test(a.town) || enLeaf.test(a.town))) {
    if (!subs.includes(a.town)) subs.push(a.town);
  }

  const koName = data?.namedetails?.["name:ko"] || data?.name;
  if (koName) subs.push(koName);

  const displayTokens = (data?.display_name || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const riFromDisplay = displayTokens.find((t) => /리$/u.test(t));
  if (riFromDisplay) subs.push(riFromDisplay);

  let dong = null;
  let eupmyeon = null;
  let ri = null;

  for (const s of subs) {
    if (!dong && /동$/u.test(s)) dong = s;
    if (!eupmyeon && /(읍|면)$/u.test(s)) eupmyeon = s;
    if (!ri && /리$/u.test(s)) ri = s;
  }

  const pick = (re) =>
    subs.find(
      (s) =>
        re.test(s) &&
        !isRoad(s) &&
        s !== eupmyeon &&
        s !== district &&
        s !== city
    );

  if (!dong) dong = pick(/동$/u) || null;
  if (!ri) ri = pick(/리$/u) || null;
  if (!eupmyeon) eupmyeon = pick(/(읍|면)$/u) || null;

  const dedup = (arr) => arr.filter(Boolean).filter((v, i, a2) => a2.indexOf(v) === i);

  const lineParts = dedup([city, district, eupmyeon, dong, ri]);
  let admin = lineParts.join(" ");
  if (!admin) admin = dedup([province, city]).join(" ") || data?.display_name || "주소 정보 없음";

  const postcode = a.postcode ? ` (${a.postcode})` : "";
  const address = `${admin}${postcode}`.trim();

  const zoneKey = dedup([city, district]).join(" ");
  const subZone = dedup([eupmyeon, dong, ri]).join(" ") || null;

  return {
    address,
    area: {
      province: province || null,
      city: city || null,
      district: district || null,
      dong: dong || null,
      eupmyeon: eupmyeon || null,
      ri: ri || null,
      postcode: a.postcode || null,
    },
    zone: { key: zoneKey || null, sub: subZone },
  };
}
