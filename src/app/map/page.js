"use client";
// 페이지: 지도
// 렌더링: CSR(클라이언트 컴포넌트) — 브라우저 API와 카카오 JS SDK 사용
import Link from "next/link";
import KakaoMap from "@/components/KakaoMap";
import BottomNav from "@/components/BottomNav.jsx";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function MapPage() {
  const search = useSearchParams();
  const lat = search?.get("lat");
  const lng = search?.get("lng");
  const id = search?.get("id");
  const centerFromUrl = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
  const [radiusKm, setRadiusKm] = useState(3);
  const [center, setCenter] = useState(centerFromUrl);
  const [followMe, setFollowMe] = useState(false);

  useEffect(() => {
    // Prefer user-set radius from localStorage; fallback to session subscription radius
    try {
      const ls = Number(localStorage.getItem("push-radius-km"));
      if (ls && Number.isFinite(ls)) setRadiusKm(ls);
    } catch {}
    (async () => {
      try {
        const r = await fetch("/api/me/location", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          const rk = Number(j?.radiusKm);
          if (rk && Number.isFinite(rk)) setRadiusKm(rk);
          // URL에 center 없고 세션에 위치가 있으면 초기 중심 설정
          if (!centerFromUrl && j?.lat && j?.lng) {
            setCenter({ lat: Number(j.lat), lng: Number(j.lng) });
          }
        }
      } catch {}
    })();
  }, []);

  const goMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };
  return (
    <div className="app-shell map-page" style={{ paddingBottom: '110px' }}>
      {/* 상단 유리감(글래스) 톱바 */}
      <header className="topbar">
        <div className="bar">
          <h2 className="map-title">지도 보기</h2>
          <div className="flex items-center gap-3">
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
              <input type="checkbox" checked={followMe} onChange={(e)=>{ const v = e.target.checked; setFollowMe(v); if (v) goMyLocation(); }} />
              <span>내 위치로 이동</span>
            </label>
            <span className="muted" style={{ fontSize:12 }}>반경 {radiusKm}km</span>
            <Link href="/signals" className="btn secondary no-underline">피드</Link>
          </div>
        </div>
      </header>
      <main className="map-main">
        <KakaoMap radiusKm={radiusKm} days={3} center={center} highlightId={id || undefined} />
      </main>
      <BottomNav />
    </div>
  );
}
