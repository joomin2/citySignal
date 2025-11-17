"use client";
// 페이지: 위험 정보 등록
// 렌더링: CSR — 폼 입력과 위치 자동입력(지오로케이션)
import { useState } from "react";
import BottomNav from "@/components/BottomNav.jsx";

export default function NewSignalPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("road");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [address, setAddress] = useState("");
  const [zoneKey, setZoneKey] = useState("");
  const [zoneSub, setZoneSub] = useState("");
  const [msg, setMsg] = useState("");
  const [busyAuto, setBusyAuto] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category, lat: Number(lat), lng: Number(lng), address, zone: { key: zoneKey, sub: zoneSub } }),
    });
    const js = await res.json();
    if (res.ok) setMsg("등록되었습니다: " + js.id);
    else setMsg(js.error || "에러");
  };

  const fillFromLocation = async () => {
    try {
      setBusyAuto(true);
      await new Promise((res, rej) => {
        if (!navigator.geolocation) return rej(new Error("위치 사용 불가"));
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 });
      }).then(async (pos) => {
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        setLat(String(la));
        setLng(String(lo));
        const r = await fetch(`/api/geo/reverse?lat=${la}&lng=${lo}`);
        const j = await r.json();
        if (r.ok) {
          setAddress(j.address || "");
          setZoneKey(j.zone?.key || "");
          setZoneSub(j.zone?.sub || "");
        }
      });
    } catch (e) {
      setMsg(e.message || "자동입력 실패");
    } finally {
      setBusyAuto(false);
    }
  };

  return (
    <div className="page">
      <section className="card">
        <h2 style={{ marginBottom: 8 }}>위험 정보 등록</h2>
        <p className="muted">현재 위치에서 바로 입력하거나, 주소/좌표를 수동으로 입력할 수 있어요.</p>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn secondary" onClick={fillFromLocation} disabled={busyAuto}>{busyAuto ? "자동입력 중…" : "현재 위치로 자동입력"}</button>
        </div>

        <form onSubmit={submit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div>
            <label className="label">제목</label>
            <input className="input" placeholder="예: 수상한 차량 목격" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="label">설명</label>
            <textarea className="input" placeholder="상세 내용을 적어주세요" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="label">카테고리</label>
            <input className="input" placeholder="예: safety, road, noise" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
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
          <div>
            <label className="label">주소</label>
            <input className="input" placeholder="예: 아산시 탕정면 갈산리" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
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
          <div style={{ marginTop: 4 }}>
            <button className="btn primary" type="submit">등록</button>
          </div>
        </form>
        {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
      </section>
      <BottomNav />
    </div>
  );
}
