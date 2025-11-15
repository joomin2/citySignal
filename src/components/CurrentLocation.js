"use client";
import { useState } from "react";

export default function CurrentLocation() {
  const [status, setStatus] = useState("idle"); // idle | locating | fetching | ready | error
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [area, setArea] = useState(null);

  const getLocation = () => {
    setError("");
    setStatus("locating");
    if (!("geolocation" in navigator)) {
      setError("이 브라우저는 위치 서비스를 지원하지 않습니다.");
      setStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setStatus("fetching");
        try {
          const url = `/api/geo/reverse?lat=${latitude}&lng=${longitude}`;
          const res = await fetch(url);
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "역지오코딩 실패");
          setAddress(data.address || "주소를 찾지 못했습니다");
          setArea(data.area || null);
          if (typeof window !== 'undefined') {
            window.__lastZoneKey = data?.zone?.key || '';
            window.__lastSubZone = data?.zone?.sub || '';
          }
          setStatus("ready");
        } catch (e) {
          setError(e.message);
          setStatus("error");
        }
      },
      (err) => {
        setError(err.message || "위치 권한이 거부되었습니다.");
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <section className="card card-primary">
      <p className="badge">📍 현재 위치</p>
      {status === "ready" ? (
        <>
          <h2>{address}</h2>
          {coords && (
            <p className="muted">lat {coords.lat.toFixed(5)}, lng {coords.lng.toFixed(5)}</p>
          )}
          {/* 세부 행정구역 표기: 읍/면 · 동 · 리 모두 표시 */}
          {area && (area.eupmyeon || area.dong || area.ri) && (
            <p className="muted" style={{ marginTop: 6 }}>
              세부: {[area.eupmyeon, area.dong, area.ri].filter(Boolean).join(" · ")}
            </p>
          )}
          {/* 그룹 키 보조 표기: 시/구(군) 범위 + 세부 동/읍/면 */}
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
        </>
      ) : (
        <>
          <h2>위치 권한을 허용해주세요</h2>
          <p>주변 정보를 받으려면 위치 접근이 필요합니다</p>
          <button className="btn primary" onClick={getLocation} disabled={status === "locating" || status === "fetching"}>
            {status === "locating" ? "위치 확인 중…" : status === "fetching" ? "주소 찾는 중…" : "위치 허용하기"}
          </button>
          {status === "error" && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
        </>
      )}
    </section>
  );
}
