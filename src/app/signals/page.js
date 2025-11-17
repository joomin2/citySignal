"use client";
// 페이지: 위험 제보 목록(주변)
// 렌더링: CSR — 지오로케이션과 fetch로 주변 제보 조회
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav.jsx";
import SignalCard from "@/components/SignalCard.jsx";

export default function SignalsListPage() {
  const [list, setList] = useState([]);
  const [coords, setCoords] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [busySeed, setBusySeed] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('latest'); // latest | severity
  const [nearOnly, setNearOnly] = useState(true);
  const [hasNext, setHasNext] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (e) => setErr(e.message || "위치 에러")
    );
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
          url = `/api/signals?lat=${coords.lat}&lng=${coords.lng}&radiusKm=3&days=7&page=${page}&pageSize=10&sort=distance`;
        } else if (!nearOnly) {
          url = `/api/signals?global=1&days=7&page=${page}&pageSize=10&sort=${sort}`;
        } else {
          if (!coords) return; // 좌표 필요
          url = `/api/signals?lat=${coords.lat}&lng=${coords.lng}&radiusKm=3&days=7&page=${page}&pageSize=10&sort=${sort}`;
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
  }, [coords, sort, nearOnly, page]);

  // 정렬/필터 바뀌면 페이지를 1로 리셋
  useEffect(() => { setPage(1); }, [sort, nearOnly]);

  const createNearbyTest = async () => {
    if (!coords) return;
    setBusy(true);
    try {
      // Reverse to get address + zone keys
      const rev = await fetch(`/api/geo/reverse?lat=${coords.lat}&lng=${coords.lng}`);
      const rj = await rev.json();
      const zone = rj.zone || { key: "", sub: "" };
      const address = rj.address || "";
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "[테스트] 근처 위험 제보",
          description: "웹 테스트용 근처 신고",
          category: "test",
          lat: coords.lat,
          lng: coords.lng,
          address,
          zone,
        }),
      });
      const js = await res.json();
      if (res.ok) {
        // Refresh list (첫 페이지로)
        const url = `/api/signals?lat=${coords.lat}&lng=${coords.lng}&radiusKm=3&days=7&page=1&pageSize=10&sort=${sort}`;
        const fres = await fetch(url);
        const fj = await fres.json();
        if (fres.ok) { setList(fj.items || []); setHasNext(Boolean(fj.nextPage)); setPage(1); }
      } else {
        setErr(js.error || "테스트 생성 실패");
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const seedSamples = async () => {
    if (!coords) return;
    setBusySeed(true);
    try {
      const res = await fetch("/api/dev/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: coords.lat, lng: coords.lng, count: 5 })
      });
      const js = await res.json();
      if (!res.ok) throw new Error(js.error || "seed 실패");
      // refresh list (첫 페이지)
      const url = `/api/signals?lat=${coords.lat}&lng=${coords.lng}&radiusKm=3&days=7&page=1&pageSize=10&sort=${sort}`;
      const fres = await fetch(url);
      const fj = await fres.json();
      if (fres.ok) { setList(fj.items || []); setHasNext(Boolean(fj.nextPage)); setPage(1); }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusySeed(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="hero card" style={{ marginTop: 8 }}>
          <div className="hero-title">내 주변 위험 정보</div>
          <div className="hero-sub">가까운 제보를 카드로 모아서 보여드려요.</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn primary" onClick={createNearbyTest} disabled={!coords || busy}>{busy ? "생성 중…" : "근처에 테스트 신호 생성"}</button>
            <a className="btn secondary" href="/map" style={{ textDecoration: "none" }}>지도 보기</a>
            <button className="btn ghost" onClick={seedSamples} disabled={!coords || busySeed}>{busySeed ? "샘플 추가 중…" : "샘플 5개 추가"}</button>
          </div>
        </div>

        {err && <p className="error">{err}</p>}

        {/* 정렬/필터 컨트롤 */}
        <div className="card" style={{ display:'grid', gap:10 }}>
          <div className="seg" role="tablist" aria-label="정렬">
            <button className={`seg-btn ${sort==='latest' ? 'active' : ''}`} role="tab" aria-selected={sort==='latest'} onClick={()=>setSort('latest')}>최신순</button>
            <button className={`seg-btn ${sort==='severity' ? 'active' : ''}`} role="tab" aria-selected={sort==='severity'} onClick={()=>setSort('severity')}>위험도순</button>
            <button className={`seg-btn ${sort==='distance' ? 'active' : ''}`} role="tab" aria-selected={sort==='distance'} onClick={()=>setSort('distance')} disabled={!coords}>거리순</button>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <label style={{ display:'flex', alignItems:'center', gap:6 }}>
              <input type="checkbox" checked={nearOnly} onChange={(e)=>setNearOnly(e.target.checked)} disabled={sort==='distance'} /> 내 근처만
            </label>
            <span className="muted">반경 3km · 최근 7일</span>
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
        ) : list.map((s) => (
          <SignalCard key={s._id} signal={s} />
        ))}

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
