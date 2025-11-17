"use client";
// 페이지: 지도
// 렌더링: CSR(클라이언트 컴포넌트) — 브라우저 API와 카카오 JS SDK 사용
import Link from "next/link";
import KakaoMap from "@/components/KakaoMap";
import BottomNav from "@/components/BottomNav.jsx";
import { useSearchParams } from "next/navigation";

export default function MapPage() {
  const search = useSearchParams();
  const lat = search?.get("lat");
  const lng = search?.get("lng");
  const id = search?.get("id");
  const center = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
  return (
    <div className="app-shell">
      {/* 상단 유리감(글래스) 톱바 */}
      <div className="topbar">
        <div className="bar">
          <h2>지도 보기</h2>
          <Link href="/signals" className="btn secondary" style={{ textDecoration: "none" }}>피드</Link>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <KakaoMap radiusKm={3} days={3} center={center} highlightId={id || undefined} />
      </div>
      <BottomNav />
    </div>
  );
}
