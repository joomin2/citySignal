"use client";
// 페이지: 위험 정보 등록
// 렌더링: CSR — 폼 입력과 위치 자동입력(지오로케이션)
import { useEffect, useState, useCallback } from "react";

export default function NewSignalPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("road");
  const [tags, setTags] = useState([]); // includes optional img: URL
  const [imgUrl, setImgUrl] = useState("");
  const [severityPreview, setSeverityPreview] = useState(null);
  const [sevLoading, setSevLoading] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [address, setAddress] = useState("");
  const [zoneKey, setZoneKey] = useState("");
  const [zoneSub, setZoneSub] = useState("");
  const [msg, setMsg] = useState("");
  const [busyAuto, setBusyAuto] = useState(false);
  const [geoError, setGeoError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category, lat: Number(lat), lng: Number(lng), address, zone: { key: zoneKey, sub: zoneSub }, tags }),
    });
    const js = await res.json();
    if (res.ok) setMsg("등록되었습니다: " + js.id);
    else setMsg(js.error || "에러");
  };

  // AI severity preview (debounced)
  const debouncedSev = useCallback(() => {
    if (!description.trim()) { setSeverityPreview(null); return; }
    const text = description.slice(0, 600); // limit
    setSevLoading(true);
    fetch(`/api/dev/ai-severity?text=${encodeURIComponent(text)}`)
      .then(r => r.json())
      .then(j => setSeverityPreview(typeof j.severity === 'number' ? j.severity : null))
      .catch(()=>{})
      .finally(()=> setSevLoading(false));
  }, [description]);

  useEffect(() => {
    const t = setTimeout(debouncedSev, 650);
    return () => clearTimeout(t);
  }, [description, debouncedSev]);

  // Sync image URL into tags as img: entry
  useEffect(() => {
    setTags(prev => {
      const rest = prev.filter(t => !t.startsWith('img:'));
      if (!imgUrl.trim()) return rest;
      return [...rest, `img:${imgUrl.trim()}`];
    });
  }, [imgUrl]);

  // Auto geolocation + reverse geocode on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusyAuto(true);
        if (!navigator.geolocation) throw new Error('브라우저 위치 사용 불가');
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });
        if (cancelled) return;
        const la = position.coords.latitude;
        const lo = position.coords.longitude;
        setLat(String(la));
        setLng(String(lo));
        try {
          const r = await fetch(`/api/geo/reverse?lat=${la}&lng=${lo}`);
          const j = await r.json();
          if (r.ok && !cancelled) {
            setAddress(j.address || "");
            setZoneKey(j.zone?.key || "");
            setZoneSub(j.zone?.sub || "");
          }
        } catch {}
      } catch (e) {
        if (!cancelled) setGeoError(e.message || '위치 획득 실패');
      } finally {
        if (!cancelled) setBusyAuto(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page" style={{ paddingBottom: '110px' }}>
      <section className="card">
        <h2 style={{ marginBottom: 8 }} className="gradient-text">위험 정보 등록</h2>
        <p className="muted">현재 위치를 자동으로 채워 드립니다. 위치 권한을 허용하지 않으면 수동 입력 가능합니다.</p>
        {busyAuto && <p className="muted" style={{ marginTop: 6 }}>위치 가져오는 중…</p>}
        {geoError && <p className="error" style={{ marginTop: 6 }}>{geoError}</p>}

        <form onSubmit={submit} style={{ marginTop: 16, display: "grid", gap: 16 }}>
          <div>
            <label className="label">제목 <span style={{ fontWeight:400, opacity:.6 }}>({title.length}/60)</span></label>
            <input className="input" maxLength={60} placeholder="예: 아침 로터리 차량 많음" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="label">설명 <span style={{ fontWeight:400, opacity:.6 }}>({description.length}/1000)</span></label>
            <textarea className="input" placeholder={`상세 내용을 자연스럽게 작성해주세요\n예) 오늘 아침 평소보다 차량 줄이 길어 회전 진입이 지연됩니다.`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={5} />
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6, flexWrap:'wrap' }}>
              {severityPreview != null && <span className={`badge level-${severityPreview}`}>AI 추론 위험도 {severityPreview}단계</span>}
              {sevLoading && <span className="chip" style={{ fontSize:11 }}>추론중…</span>}
              {!sevLoading && severityPreview == null && description.trim() && <span className="chip" style={{ fontSize:11 }}>추론 실패</span>}
            </div>
          </div>
          <div>
            <label className="label">카테고리</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {['road','traffic','safety','environment','weather','noise','infra','crowd'].map(cat => (
                <button type="button" key={cat} onClick={()=>setCategory(cat)} className={`chip ${category===cat?'chip-strong':''}`}>{cat}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">이미지 URL (선택)</label>
            <input className="input" placeholder="https://images.unsplash.com/..." value={imgUrl} onChange={e=>setImgUrl(e.target.value)} />
            {imgUrl.trim() && <div style={{ marginTop:8 }}>
              <img src={imgUrl} alt="미리보기" style={{ width:'100%', maxHeight:220, objectFit:'cover', borderRadius:8, border:'1px solid var(--border)' }} loading="lazy" />
            </div>}
          </div>
          {lat && lng ? (
            <div style={{ display: 'flex', gap: 12, alignItems:'center' }}>
              <span className="chip" style={{ fontWeight:600 }}>lat {lat}</span>
              <span className="chip" style={{ fontWeight:600 }}>lng {lng}</span>
              <span className="chip" style={{ fontWeight:600 }}>자동 위치</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label className="label">위도(lat)</label>
                <input className="input" placeholder="위도" value={lat} onChange={(e) => setLat(e.target.value)} required />
              </div>
              <div>
                <label className="label">경도(lng)</label>
                <input className="input" placeholder="경도" value={lng} onChange={(e) => setLng(e.target.value)} required />
              </div>
            </div>
          )}
          <div>
            <label className="label">주소</label>
            <input className="input" placeholder="예: 아산시 탕정면 갈산리" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          {zoneKey || zoneSub ? (
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {zoneKey && <span className="badge level-2">{zoneKey}</span>}
              {zoneSub && <span className="badge level-2">{zoneSub}</span>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label className="label">그룹 key</label>
                <input className="input" placeholder="예: 아산시 탕정면" value={zoneKey} onChange={(e) => setZoneKey(e.target.value)} />
              </div>
              <div>
                <label className="label">세부</label>
                <input className="input" placeholder="예: 갈산리" value={zoneSub} onChange={(e) => setZoneSub(e.target.value)} />
              </div>
            </div>
          )}
          <div style={{ display:'flex', gap:12, flexDirection:'column', marginTop:4 }}>
            <button className="btn primary" type="submit">등록</button>
            {severityPreview != null && <div className="text-xs" style={{ opacity:.65 }}>AI 추론 위험도는 참고용이며 실제 저장 값은 사용자가 입력한 텍스트를 기반으로 서버에서 다시 계산될 수 있습니다.</div>}
          </div>
        </form>
        {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
      </section>
      <BottomNav />
    </div>
  );
}
