"use client";
/**
 * KakaoMap component
 * 기능 개요
 * - SDK 로드: NEXT_PUBLIC_KAKAO_JS_KEY로 카카오 지도 SDK를 1회 로드
 * - 지도 초기화: 전달된 center 또는 브라우저 위치(실패 시 서울)로 초기 중심
 * - 마커/클러스터: /api/signals로 주변 제보 조회 → 마커 및 클러스터 생성
 * - 인포윈도우: 마커 클릭 시 카드형 팝업, 현재 위치 팝업, 단일 열림 보장
 * - 하이라이트: highlightId가 오면 해당 마커로 이동 후 팝업 오픈
 * - 정리/최적화: 비동기 취소, 이벤트/리소스 정리, 불필요 재초기화 최소화
 */
import { useEffect, useRef, useState } from "react";

const SDK_URL = (key) => `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=clusterer`;

async function loadKakao(key) {
  if (!key) throw new Error("NEXT_PUBLIC_KAKAO_JS_KEY 환경변수가 필요합니다.");
  if (typeof window === "undefined") return null;
  if (window.kakao && window.kakao.maps) return window.kakao;
  // SDK 스크립트를 동적으로 삽입하고 로드 완료까지 대기
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL(key);
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.kakao;
}

function getBrowserLocation() {
  // 고정밀 옵션으로 현재 위치를 가져오는 Promise 래퍼
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        resolve({ lat: latitude, lng: longitude });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function KakaoMap({ radiusKm = 3, days = 3, center: initialCenter = null, highlightId }) {
  const containerRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 내부 상태 (정리/최적화 목적)
    let markers = [];
    let clusterer = null;
    let map = null;
    let closeOpen = null; // 현재 열린 인포윈도우 닫기 함수
    let kakaoApi = null;
    let clusterClickHandler = null;
    const markerById = new Map();
    const ac = new AbortController();

    (async () => {
      try {
        // [1] SDK 로드
        const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
        const kakao = await loadKakao(kakaoKey);
        kakaoApi = kakao;
        await new Promise((r) => kakao.maps.load(r));

        // [2] 초기 중심 좌표 결정
        let center = initialCenter;
        if (!center) {
          try {
            center = await getBrowserLocation();
          } catch {
            center = { lat: 37.5665, lng: 126.9780 }; // fallback: Seoul City Hall
          }
        }

        // [3] 지도 생성 및 현재 위치 마커/팝업
        if (!containerRef.current) throw new Error("Map container missing");
        map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: 5,
        });

        // current location marker + styled popup
        const myPos = new kakao.maps.LatLng(center.lat, center.lng);
        const myMarker = new kakao.maps.Marker({ map, position: myPos, title: "현재 위치" });
        const myContent = `
          <div class="card signal-card" style="min-width:180px;">
            <div class="title-row"><span class="badge chip-strong">현재 위치</span></div>
            <div class="meta">📍 ${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}</div>
          </div>`;
        const myInfo = new kakao.maps.InfoWindow({ content: myContent });
        kakao.maps.event.addListener(myMarker, "click", () => {
          try { if (closeOpen) closeOpen(); } catch {}
          myInfo.open(map, myMarker);
          closeOpen = () => myInfo.close();
        });

        // [4] 주변 제보 조회 후 마커 + 클러스터 생성 (취소 가능)
        const res = await fetch(`/api/signals?lat=${center.lat}&lng=${center.lng}&radiusKm=${radiusKm}&days=${days}` , { signal: ac.signal });
        const js = await res.json();
        const list = Array.isArray(js) ? js : (js.items || []);

        // 클러스터러 초기화
        clusterer = new kakao.maps.MarkerClusterer({
          map,
          averageCenter: true,
          minLevel: 7,
        });

        const levelNum = (v) => {
          if (v == null) return 1;
          if (typeof v === 'number') return Math.min(5, Math.max(1, v));
          const t = String(v).toLowerCase();
          if (t === 'high') return 4; // 과거 호환
          if (t === 'medium') return 3;
          if (t === 'low') return 2;
          const n = parseInt(t, 10);
          return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 1;
        };

        markers = list.map((s) => {
          const [lng, lat] = s.geo?.coordinates || [s.lng, s.lat];
          const pos = new kakao.maps.LatLng(lat, lng);
          const m = new kakao.maps.Marker({ position: pos });

          const lvl = levelNum(s.level);
          const title = s.title || s.text || s.location || "신호";
          const addr = s.address || s.addr || s.location || "";
          const content = `
            <div class="card signal-card" style="min-width:220px;">
              <div class="title-row">
                <span class="badge level-${lvl}">위험도 ${lvl}단계</span>
              </div>
              <a class="title" href="/signals/${s._id}">${title}</a>
              ${addr ? `<div class="meta">📍 ${addr}</div>` : ``}
              <div class="divider"></div>
              <a class="button button--ghost" href="/signals/${s._id}">자세히 보기</a>
            </div>`;
          const iw = new kakao.maps.InfoWindow({ content });
          // 마커 클릭 시 정보창 오픈
          kakao.maps.event.addListener(m, "click", () => {
            try { if (closeOpen) closeOpen(); } catch {}
            iw.open(map, m);
            closeOpen = () => iw.close();
          });
          markerById.set(String(s._id), { marker: m, infoWindow: iw, pos });
          return m;
        });

        clusterer.addMarkers(markers);

        // [5] 클러스터 클릭 시 간단 확대
        clusterClickHandler = (cluster) => {
          const cpos = cluster.getCenter();
          try { map.setLevel(Math.max(1, map.getLevel() - 1), { anchor: cpos }); } catch {}
        };
        kakao.maps.event.addListener(clusterer, "clusterclick", clusterClickHandler);

        // [6] 특정 id 하이라이트 처리
        if (highlightId && markerById.has(String(highlightId))) {
          const { marker, infoWindow, pos } = markerById.get(String(highlightId));
          try { map.setCenter(pos); } catch {}
          infoWindow.open(map, marker);
          closeOpen = () => infoWindow.close();
        }
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError(e.message || "지도를 불러오지 못했습니다.");
        setLoading(false);
      }
    })();

    return () => {
      // [정리] 요청 취소, 이벤트 제거, 리소스 해제
      try { ac.abort(); } catch {}
      try { if (closeOpen) closeOpen(); } catch {}
      try { if (kakaoApi && clusterer && clusterClickHandler) kakaoApi.maps.event.removeListener(clusterer, "clusterclick", clusterClickHandler); } catch {}
      if (markers) markers.forEach((m) => m.setMap && m.setMap(null));
      if (clusterer) clusterer.clear && clusterer.clear();
    };
  }, [radiusKm, days, initialCenter?.lat, initialCenter?.lng, highlightId]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* [UI] 로딩/에러 표시 */}
      {loading && <div className="container"><p>지도를 불러오는 중…</p></div>}
      {error && <div className="container"><p className="error">{error}</p></div>}
      <div ref={containerRef} style={{ flex: 1, minHeight: 480 }} />
    </div>
  );
}
