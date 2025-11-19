"use client";
import { useState, useEffect } from "react";
// 현재 위치 탐지 후 부모 콜백 제공
// English: acquire geolocation once and pass to parent
import PushManager from "./PushManager";
import { useGeolocation } from "@/hooks/useGeolocation";

export default function CurrentLocation() {
  const { status: geoStatus, error: geoError, coords, getLocation } = useGeolocation();
  const [status, setStatus] = useState("idle"); // idle | fetching | ready | error
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [area, setArea] = useState(null);

  useEffect(() => {
    if (geoStatus === 'ready' && coords) {
      (async () => {
        setStatus('fetching');
        try {
          const url = `/api/geo/reverse?lat=${coords.lat}&lng=${coords.lng}`;
          const res = await fetch(url);
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || '역지오코딩 실패');
          setAddress(data.address || '주소를 찾지 못했습니다');
          setArea(data.area || null);
          if (typeof window !== 'undefined') {
            window.__lastZoneKey = data?.zone?.key || '';
            window.__lastSubZone = data?.zone?.sub || '';
          }
          setStatus('ready');
        } catch (e) {
          setError(e.message);
          setStatus('error');
        }
      })();
    }
  }, [geoStatus, coords]);

  const notReady = status !== "ready";
  return (
    <section className="card card-primary" style={notReady ? { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } : {}}>
      <p className="badge" style={notReady ? { marginBottom: 10 } : {}}>📍 현재 위치</p>
      {status === "ready" ? (
        <>
          <h2 style={{ textAlign: 'center' }}>{address}</h2>
          {coords && (
            <p className="muted">lat {coords.lat.toFixed(5)}, lng {coords.lng.toFixed(5)}</p>
          )}
          {area && (area.eupmyeon || area.dong || area.ri) && (
            <p className="muted" style={{ marginTop: 6 }}>
              세부: {[area.eupmyeon, area.dong, area.ri].filter(Boolean).join(" · ")}
            </p>
          )}
          {address && (
            <p className="muted" style={{ marginTop: 6 }}>
              {`그룹: ${
                (typeof window !== 'undefined' && window.__lastZoneKey) || ''
              } ${
                (typeof window !== 'undefined' && window.__lastSubZone) ? '· ' + window.__lastSubZone : ''
              }`}
            </p>
          )}
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="btn" onClick={getLocation}>다시 가져오기</button>
          </div>
          <PushManager
            zone={{ key: (typeof window !== 'undefined' && window.__lastZoneKey) || '', sub: (typeof window !== 'undefined' && window.__lastSubZone) || '' }}
            lat={coords?.lat}
            lng={coords?.lng}
          />
        </>
      ) : (
        <>
          <h2 style={{ fontSize: '1.5rem', letterSpacing: '.3px', background: 'linear-gradient(90deg,#6366f1,#ec4899,#8b5cf6,#10b981)', WebkitBackgroundClip: 'text', color: 'transparent', fontWeight: 800 }}>위치 권한을 허용해주세요</h2>
          <p style={{ maxWidth: 320 }}>주변 정보를 받으려면 위치 접근이 필요합니다</p>
          <div style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={getLocation} disabled={geoStatus === "locating" || status === "fetching"} style={{ minWidth: 180 }}>
              {geoStatus === "locating" ? "위치 확인 중…" : status === "fetching" ? "주소 찾는 중…" : "위치 허용하기"}
            </button>
          </div>
          {(status === "error" || geoStatus === 'error') && <p className="error" style={{ marginTop: 8 }}>{error || geoError}</p>}
        </>
      )}
    </section>
  );
}
