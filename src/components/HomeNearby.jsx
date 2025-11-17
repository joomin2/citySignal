"use client";
// 컴포넌트: HomeNearby (홈 최근/주변 제보 카드 3개)
// 렌더링: CSR — 지오로케이션 후 /api/signals를 조회하여 카드로 표시
import { useEffect, useRef, useState } from "react";
import SignalCard from "@/components/SignalCard.jsx";

export default function HomeNearby() {
  const [coords, setCoords] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    // [기능] 현재 위치 가져오기 (권한 거부/오류 시 로딩 중단)
    navigator.geolocation?.getCurrentPosition(
      (pos) => { if (!mountedRef.current) return; setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      (e) => { if (!mountedRef.current) return; setErr(e.message || "위치 에러"); setLoading(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!coords) return;
    const ac = new AbortController();
    // [기능] 주변 제보 조회 (상위 3개)
    (async () => {
      try {
        setLoading(true);
        const url = `/api/signals?lat=${coords.lat}&lng=${coords.lng}&radiusKm=3&days=3`;
        const res = await fetch(url, { signal: ac.signal });
        const js = await res.json();
        if (!mountedRef.current) return;
        if (res.ok) setList((js.items || []).slice(0, 3));
      } catch (e) {
        if (!mountedRef.current || e?.name === 'AbortError') return;
        setErr(e.message || "불러오기 실패");
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [coords]);

  // [기능] 로딩/에러/빈 목록 처리
  if (loading) return (
    <div className="fade-in">
      {[0,1,2].map((i) => (
        <section key={i} className="card" style={{ padding: 14 }}>
          <div className="signal-card">
            <div className="title-row" style={{ gap: 10 }}>
              <span className="skeleton badge" />
              <span style={{ flex: 1 }} />
            </div>
            <div className="skeleton title" />
            <div className="skeleton meta" />
          </div>
        </section>
      ))}
    </div>
  );

  if (err) return (
    <section className="card">
      <p className="error">{err}</p>
    </section>
  );

  if (!list.length) return (
    <section className="card">
      <p>주변에 최근 제보가 없습니다.</p>
    </section>
  );

  return (
    <div>
      {list.map((s) => (
        <SignalCard key={s._id} signal={s} />
      ))}
    </div>
  );
}
