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
 * --------------------------------------------------------------
 * English summary
 * - Loads Kakao Maps SDK once using NEXT_PUBLIC_KAKAO_JS_KEY
 * - Initializes map with provided center or browser geolocation (fallback Seoul)
 * - Fetches nearby signals → builds markers + clusterer
 * - Single open InfoWindow policy (current location + markers)
 * - highlightId triggers focus + popup open
 * - Cleanup: abort pending fetch, remove events, release markers/cluster
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
    script.onload = () => {
      // 도메인 미등록 / 키 오류 시 kakao.maps 미정의 가능
      if (!window.kakao || !window.kakao.maps) {
        reject(new Error("카카오 SDK 로드 실패 (도메인 미등록 또는 키 오류). Kakao Developers > 플랫폼 > Web 도메인 등록 확인"));
      } else {
        resolve();
      }
    };
    script.onerror = () => {
      reject(new Error("카카오 SDK 네트워크 오류: dapi.kakao.com 접근 실패 (확인: 인터넷, 광고/스크립트 차단, VPN)"));
    };
    document.head.appendChild(script);
  });
  return window.kakao;
}

// Try to derive center from existing push subscription endpoint (no permission prompt)
async function getCenterFromPushToken() {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  try {
    // Register SW silently if not present; registration itself doesn't prompt
    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await reg.pushManager.getSubscription();
    if (!sub || !sub.endpoint) return null;
    const ep = encodeURIComponent(sub.endpoint);
    const res = await fetch(`/api/push/lookup?endpoint=${ep}`, { cache: "no-store" });
    if (!res.ok) return null;
    const j = await res.json();
    if (j && j.found && j.lat != null && j.lng != null) {
      return { lat: Number(j.lat), lng: Number(j.lng) };
    }
    return null;
  } catch {
    return null;
  }
}

// Try to derive center from the logged-in user's last-known location (session-based)
async function getCenterFromSession() {
  try {
    const r = await fetch("/api/me/location", { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    if (j && j.found && j.lat != null && j.lng != null) {
      return { lat: Number(j.lat), lng: Number(j.lng) };
    }
    return null;
  } catch {
    return null;
  }
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
  const [topSignals, setTopSignals] = useState([]); // legacy top3 (unused when summary is enabled)
  const [summary, setSummary] = useState(null); // { area, count, maxLevel }

  useEffect(() => {
    // 내부 상태 (정리/최적화 목적)
    let markers = [];
    let clusterer = null;
    let map = null;
    let closeOpen = null; // 현재 열린 인포윈도우 닫기 함수
    let kakaoApi = null;
    let clusterClickHandler = null;
    let idleHandler = null;
    let debounceTimer = null;
    const markerById = new Map();
    const ac = new AbortController();
    let mounted = true;
    const markerImageCache = {};

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
          // 1) 세션 기반 최근 위치(권한 요청 없음)
          center = await getCenterFromSession();
          // 2) 푸시 토큰 기반 최근 위치(권한 요청 없음)
          if (!center) center = await getCenterFromPushToken();
          // 3) 브라우저 권한 요청(최후수단)
          if (!center) {
            try { center = await getBrowserLocation(); }
            catch { center = { lat: 37.5665, lng: 126.9780 }; }
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
        const myPinSvg = encodeURIComponent(`
          <svg xmlns='http://www.w3.org/2000/svg' width='44' height='56' viewBox='0 0 44 56'>
            <defs>
              <filter id='shadow' x='-50%' y='-50%' width='200%' height='200%'>
                <feDropShadow dx='0' dy='2' stdDeviation='2' flood-color='rgba(0,0,0,0.25)'/>
              </filter>
              <linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stop-color='#3b82f6'/>
                <stop offset='100%' stop-color='#1d4ed8'/>
              </linearGradient>
            </defs>
            <path d='M22 54c8-12 20-18 20-30A20 20 0 1 0 2 24c0 12 12 18 20 30z' fill='url(#g)' filter='url(#shadow)'/>
            <circle cx='22' cy='22' r='8' fill='white'/>
          </svg>`);
        const myImg = new kakao.maps.MarkerImage(`data:image/svg+xml,${myPinSvg}`, new kakao.maps.Size(44,56), { offset: new kakao.maps.Point(22, 54) });
        const myMarker = new kakao.maps.Marker({ map, position: myPos, title: "현재 위치", image: myImg });
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

        // [4] 클러스터러 초기화 + 미려한 스타일
        clusterer = new kakao.maps.MarkerClusterer({
          map,
          averageCenter: true,
          minLevel: 7,
          styles: [{
            width: '44px', height: '44px',
            background: 'rgba(16,24,40,0.85)',
            color: '#fff',
            borderRadius: '22px',
            border: '2px solid rgba(255,255,255,0.9)',
            textAlign: 'center',
            fontWeight: '700',
            lineHeight: '44px',
            boxShadow: '0 6px 16px rgba(0,0,0,0.25)'
          }]
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

        const markerImageForLevel = (lvl) => {
          if (markerImageCache[lvl]) return markerImageCache[lvl];
          const colors = { 1: '#10b981', 2: '#84cc16', 3: '#f59e0b', 4: '#ef4444', 5: '#7f1d1d' };
          const fill = colors[lvl] || '#6366f1';
          const size = lvl >= 4 ? 48 : lvl === 3 ? 44 : 40;
          const r = Math.floor(size/2) - 5;
          const cx = Math.floor(size/2), cy = Math.floor(size/2);
          const svg = encodeURIComponent(`
            <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>
              <defs>
                <filter id='d' x='-50%' y='-50%' width='200%' height='200%'>
                  <feDropShadow dx='0' dy='3' stdDeviation='3' flood-color='rgba(0,0,0,0.35)'/>
                </filter>
              </defs>
              <circle cx='${cx}' cy='${cy}' r='${r}' fill='${fill}' stroke='white' stroke-width='3' filter='url(#d)'/>
              <text x='${cx}' y='${cy+6}' font-size='${Math.floor(size/2.4)}' font-weight='700' text-anchor='middle' fill='white'>${lvl}</text>
            </svg>`);
          const imgSrc = `data:image/svg+xml,${svg}`;
          const imageSize = new kakao.maps.Size(size, size);
          const imageOption = { offset: new kakao.maps.Point(Math.floor(size/2), Math.floor(size/2)) };
          const mi = new kakao.maps.MarkerImage(imgSrc, imageSize, imageOption);
          markerImageCache[lvl] = mi;
          return mi;
        };

        const buildMarkers = (list) => {
          // clean previous markers
          try { if (markers) markers.forEach((m) => m.setMap && m.setMap(null)); } catch {}
          markers = [];
          markerById.clear();

          // Top 3 overlay compute
          try {
            const sortedTop = [...list]
              .map(it => ({
                _id: it._id,
                title: it.title || it.text || it.location || '신호',
                level: it.level,
                createdAt: it.createdAt || it.timestamp || 0,
              }))
              .sort((a,b) => {
                const lvA = Number(a.level) || 1;
                const lvB = Number(b.level) || 1;
                if (lvB !== lvA) return lvB - lvA;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              })
              .slice(0,3);
            setTopSignals(sortedTop);
          } catch {}

          markers = list.map((s) => {
            const [lng, lat] = s.geo?.coordinates || [s.lng, s.lat];
            const pos = new kakao.maps.LatLng(lat, lng);
            const lvl = levelNum(s.level);
            const markerImage = markerImageForLevel(lvl);
            const m = new kakao.maps.Marker({ position: pos, image: markerImage });

            const title = s.title || s.text || s.location || "신호";
            const addr = s.address || s.addr || s.location || "";
            kakao.maps.event.addListener(m, "click", () => {
              try { window.location.href = `/signals/${s._id}`; } catch {}
            });
            const content = `
              <div class="card signal-card" style="min-width:200px;">
                <div class="title-row"><span class="badge level-${lvl}">위험도 ${lvl}단계</span></div>
                <div class="title" style="font-weight:600;">${title}</div>
                ${addr ? `<div class=\"meta\">📍 ${addr}</div>` : ``}
              </div>`;
            const iw = new kakao.maps.InfoWindow({ content });
            kakao.maps.event.addListener(m, "mouseover", () => { try { iw.open(map, m); } catch {} });
            kakao.maps.event.addListener(m, "mouseout", () => { try { iw.close(); } catch {} });
            markerById.set(String(s._id), { marker: m, infoWindow: iw, pos });
            return m;
          });

          // cluster
          try { clusterer.clear(); } catch {}
          clusterer.addMarkers(markers);
        };

        // initial fetch + markers
        const doFetch = async (cLat, cLng) => {
          const r = await fetch(`/api/signals?lat=${cLat}&lng=${cLng}&radiusKm=${radiusKm}&days=${days}`, { signal: ac.signal });
          let arr = [];
          try {
            if (!r.ok) {
              // API 실패 시 마커 없이 진행 (지도/오버레이만 유지)
              arr = [];
            } else {
              const j = await r.json();
              arr = Array.isArray(j) ? j : (j.items || []);
            }
          } catch { arr = []; }
          buildMarkers(arr);
          // compute summary: area name from reverse geocode, count, highest severity
          try {
            const rev = await fetch(`/api/geo/reverse?lat=${cLat}&lng=${cLng}`);
            const revJ = await rev.json();
            const area = revJ?.zone?.key || revJ?.address || '현재 위치 주변';
            const count = arr.length;
            let maxLevel = 0; for (const it of arr) { const lv = Number(it.level)||0; if (lv > maxLevel) maxLevel = lv; }
            setSummary({ area, count, maxLevel });
          } catch {}
          // auto-fit
          try {
            if (arr.length > 0) {
              const bounds = new kakao.maps.LatLngBounds();
              bounds.extend(new kakao.maps.LatLng(cLat, cLng));
              markers.forEach((mk) => bounds.extend(mk.getPosition()));
              map.setBounds(bounds);
            }
          } catch {}
        };

        await doFetch(center.lat, center.lng);

        // [5-1] 초기 화면에 마커가 보이도록 자동 맞춤
        try {
          if (markers.length > 0) {
            const bounds = new kakao.maps.LatLngBounds();
            markers.forEach((mk) => { try { bounds.extend(mk.getPosition()); } catch {} });
            // 현재 위치도 포함
            try { bounds.extend(new kakao.maps.LatLng(center.lat, center.lng)); } catch {}
            map.setBounds(bounds);
          }
        } catch {}

        // [5] 클러스터 클릭 시 간단 확대
        clusterClickHandler = (cluster) => {
          const cpos = cluster.getCenter();
          try { map.setLevel(Math.max(1, map.getLevel() - 1), { anchor: cpos }); } catch {}
        };
        kakao.maps.event.addListener(clusterer, "clusterclick", clusterClickHandler);

        // [5-2] 뷰포트 이동/확대 시 디바운스 재조회
        idleHandler = () => {
          try { if (debounceTimer) clearTimeout(debounceTimer); } catch {}
          debounceTimer = setTimeout(() => {
            try {
              const centerLL = map.getCenter();
              const cLat = centerLL.getLat();
              const cLng = centerLL.getLng();
              doFetch(cLat, cLng);
            } catch {}
          }, 400);
        };
        kakao.maps.event.addListener(map, 'idle', idleHandler);

        // [6] 특정 id 하이라이트 처리
        if (highlightId && markerById.has(String(highlightId))) {
          const { marker, infoWindow, pos } = markerById.get(String(highlightId));
          try { map.setCenter(pos); } catch {}
          infoWindow.open(map, marker);
          closeOpen = () => infoWindow.close();
        }
        if (mounted) setLoading(false);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setError(e.message || "지도를 불러오지 못했습니다.");
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      // [정리] 요청 취소, 이벤트 제거, 리소스 해제
      try { ac.abort(); } catch {}
      try { if (closeOpen) closeOpen(); } catch {}
      try { if (kakaoApi && clusterer && clusterClickHandler) kakaoApi.maps.event.removeListener(clusterer, "clusterclick", clusterClickHandler); } catch {}
      try { if (kakaoApi && map && idleHandler) kakaoApi.maps.event.removeListener(map, 'idle', idleHandler); } catch {}
      try { if (debounceTimer) clearTimeout(debounceTimer); } catch {}
      if (markers) markers.forEach((m) => m.setMap && m.setMap(null));
      if (clusterer) clusterer.clear && clusterer.clear();
    };
  }, [radiusKm, days, initialCenter?.lat, initialCenter?.lng, highlightId]);

  // 레이아웃 시프트 방지: 고정 높이 래퍼 + 오버레이 메시지
  const isMissingKey = error.includes('NEXT_PUBLIC_KAKAO_JS_KEY');
  return (
    <div className="relative w-full" style={{ minHeight: 480 }}>
      <div ref={containerRef} className="absolute inset-0" />
      {loading && !error && (
        <div className="absolute inset-0 grid place-items-center bg-white/60 dark:bg-zinc-900/50 backdrop-blur-sm">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">지도를 불러오는 중…</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="rounded-xl border border-red-300/60 bg-red-50 dark:bg-red-900/30 px-4 py-3 max-w-md text-center shadow-sm">
            {isMissingKey ? (
              <p className="text-red-700 dark:text-red-200 text-sm">
                <b>카카오 JS 키 필요</b><br />
                .env.local에 <code>NEXT_PUBLIC_KAKAO_JS_KEY</code> 추가 후 서버 재시작하세요.<br />
                Kakao Developers → 앱 만들기 → JavaScript 키 복사.
              </p>
            ) : (
              <p className="text-red-700 dark:text-red-200 text-sm">{error}</p>
            )}
          </div>
        </div>
      )}
      {/* 상단 3줄 요약: 지역 / 총 개수 / 최고 위험도 */}
      {summary && !loading && !error && (
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
          <div className="rounded-md shadow-sm px-3 py-1 text-sm font-medium backdrop-blur bg-white/70 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/50" style={{ minWidth: 220 }}>
            지역: <span className="font-semibold">{summary.area}</span>
          </div>
          <div className="rounded-md shadow-sm px-3 py-1 text-sm font-medium backdrop-blur bg-white/70 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/50" style={{ minWidth: 220 }}>
            총 개수: <span className="font-semibold">{summary.count}</span>
          </div>
          <div className="rounded-md shadow-sm px-3 py-1 text-sm font-medium backdrop-blur bg-white/70 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center gap-2" style={{ minWidth: 220 }}>
            최고 위험도: <span className="inline-block px-2 py-0.5 rounded text-white text-xs font-semibold" style={{ background: '#ef4444' }}>Lv{summary.maxLevel || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
}
