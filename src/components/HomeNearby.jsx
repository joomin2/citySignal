"use client";
// 컴포넌트: HomeNearby (홈 최근/주변 제보 카드 3개)
// 렌더링: CSR — 지오로케이션 후 /api/signals를 조회하여 카드로 표시
import { useEffect, useRef, useState } from "react";
import SignalCard from "@/components/SignalCard.jsx";
import { useGeolocation } from "@/hooks/useGeolocation";

export default function HomeNearby() {
  const { coords, status, error: geoError, getLocation } = useGeolocation({ enableHighAccuracy: true, timeout: 8000 });
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const requestedRef = useRef(false);

  // 위치 요청은 최초 1회만 수행(StrictMode 중복 마운트 방지)
  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    getLocation();
  }, [getLocation]);

  // 단일 fetch 보장: 좌표 문자열이 변화할 때만 조회
  const lastKeyRef = useRef(null);
  useEffect(() => {
    if (!coords) return;
    const key = `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
    if (lastKeyRef.current === key) return; // 동일 좌표면 재요청 방지
    lastKeyRef.current = key;
    const ac = new AbortController();
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
        console.error(e);
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

  if (status === 'error') return (
    <section className="card">
      <p className="error">{geoError || '위치 에러'}</p>
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
