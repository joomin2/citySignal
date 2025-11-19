"use client";
// 페이지: 위험 제보 목록(주변)
// 렌더링: CSR — 지오로케이션과 fetch로 주변 제보 조회
import { useEffect, useState } from "react";
import SignalCard from "@/components/SignalCard.jsx";
import BottomNav from "@/components/BottomNav.jsx";

export default function SignalsListPage() {
  const [list, setList] = useState([]);
  const [coords, setCoords] = useState(null);
  const [err, setErr] = useState("");
  // Dev/test creation states removed for presentation mode
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('latest'); // latest | severity | mixed | distance | sev_distance | recommended
  // 기본을 '전체 보기'로 두어 시드 데이터/글로벌 목록을 바로 노출
  const [nearOnly, setNearOnly] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState(3);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (e) => setErr(e.message || "위치 에러")
    );
  }, []);

  // Load preferred radius from localStorage or session subscription
  useEffect(() => {
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
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    // 초기/옵션 변경 시 첫 페이지 로드
    (async () => {
      try {
        setInitialLoading(true);
        let url;
        if (sort === 'distance') {
          if (!coords) return;
          if (!nearOnly) setNearOnly(true);
          url = `/api/signals?lat=${coords.lat}&lng=${coords.lng}&radiusKm=${radiusKm}&days=7&page=${page}&pageSize=10&sort=distance`;
        } else if (!nearOnly) {
          // 전역 목록 (위치 필요 없음)
          url = `/api/signals?global=1&days=7&page=${page}&pageSize=10&sort=${sort}`;
        } else {
          // 근처 보기인데 아직 위치 못 받았으면 전역 목록 임시 fallback
          if (!coords) {
            url = `/api/signals?global=1&days=7&page=${page}&pageSize=10&sort=${sort}`;
          } else {
            url = `/api/signals?lat=${coords.lat}&lng=${coords.lng}&radiusKm=${radiusKm}&days=7&page=${page}&pageSize=10&sort=${sort}`;
          }
        }
        const res = await fetch(url);
        const js = await res.json();
        if (res.ok) {
          setList(js.items || []);
          setHasNext(Boolean(js.nextPage));
        }
      } catch (e) {
        setErr(e.message || '목록 로드 실패');
      } finally { setInitialLoading(false); }
    })();
  }, [coords, sort, nearOnly, page, radiusKm]);

  // 정렬/필터 바뀌면 페이지를 1로 리셋
  useEffect(() => { setPage(1); }, [sort, nearOnly]);

  // Removed createNearbyTest & seedSamples (demo cleanup)

  return (
    <div className="page">
      <div className="container">
        <div className="hero card" style={{ marginTop: 8 }}>
          <div className="hero-title gradient-text">내 주변 위험 정보</div>
          <div className="hero-sub">가까운 제보를 카드로 모아서 보여드립니다.</div>
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="btn primary" href="/signals/new" style={{ textDecoration: "none" }}>위험 정보 등록</a>
            <a className="btn secondary" href="/map" style={{ textDecoration: "none" }}>지도 보기</a>
          </div>
        </div>

        {err && <p className="error">{err}</p>}

        {/* 정렬/필터 컨트롤 */}
        <div className="card" style={{ display:'grid', gap:10 }}>
          <div className="seg" role="tablist" aria-label="정렬" style={{ display:'flex', flexWrap:'wrap' }}>
            <button className={`seg-btn ${sort==='latest' ? 'active' : ''}`} role="tab" aria-selected={sort==='latest'} onClick={()=>setSort('latest')}>최신순</button>
            <button className={`seg-btn ${sort==='severity' ? 'active' : ''}`} role="tab" aria-selected={sort==='severity'} onClick={()=>setSort('severity')}>위험도순</button>
            <button className={`seg-btn ${sort==='mixed' ? 'active' : ''}`} role="tab" aria-selected={sort==='mixed'} onClick={()=>setSort('mixed')}>혼합(위험·최신)</button>
            <button className={`seg-btn ${sort==='distance' ? 'active' : ''}`} role="tab" aria-selected={sort==='distance'} onClick={()=>setSort('distance')} disabled={!coords}>거리순</button>
            <button className={`seg-btn ${sort==='recommended' ? 'active' : ''}`} role="tab" aria-selected={sort==='recommended'} onClick={()=>setSort('recommended')}>추천순</button>
            <button className={`seg-btn ${sort==='sev_distance' ? 'active' : ''}`} role="tab" aria-selected={sort==='sev_distance'} onClick={()=>setSort('sev_distance')} disabled={!coords}>위험도+거리</button>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600 }}>
              <input type="checkbox" checked={nearOnly} onChange={(e)=>setNearOnly(e.target.checked)} disabled={sort==='distance'} />
              <span>내 주변만 보기</span>
            </label>
            <span className="muted">{nearOnly ? `반경 ${radiusKm}km · 최근 7일` : '전체 · 최근 7일'}</span>
          </div>
        </div>

        {initialLoading ? (
          <div className="fade-in">
            {[0,1,2,3].map((i) => (
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
        ) : (
          list.length ? list.map((s) => <SignalCard key={s._id} signal={s} />) : (
            <section className="card"><p>{nearOnly ? '주변에 최근 제보가 없습니다.' : '표시할 제보가 없습니다.'}</p></section>
          )
        )}

        {/* 페이징 컨트롤 */}
        <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: 8 }}>
          <button className="btn ghost" disabled={page<=1} onClick={() => setPage((p)=>Math.max(1, p-1))}>이전</button>
          <span className="muted">페이지 {page}</span>
          <button className="btn ghost" disabled={!hasNext} onClick={() => setPage((p)=>p+1)}>다음</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <a className="btn ghost" href="/signals/new">위험 정보 등록</a>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
