"use client";
import { useEffect, useState } from "react";
import RadiusDial from "./RadiusDial.jsx";

export default function RangeSettings() {
  const [radiusKm, setRadiusKm] = useState(() => {
    try { return Number(localStorage.getItem("push-radius-km")) || 3; } catch { return 3; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try { localStorage.setItem("push-radius-km", String(radiusKm)); } catch {}
  }, [radiusKm]);

  // If user already has a push subscription, propagate radius update silently
  const propagateRadius = async (val) => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      // Optional: include last-known coords to refresh center
      const coords = await getCoordsOptional(3000);
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), radiusKm: val, lat: coords?.lat, lng: coords?.lng })
      });
    } catch {}
  };

  const onChange = async (v) => {
    setError("");
    setRadiusKm(v);
    setBusy(true);
    try { await propagateRadius(v); }
    catch (e) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  };

  return (
    <section className="card" style={{ marginTop: 12 }}>
      <h3>게시물 범위</h3>
      <p className="muted">내 주변에서 볼 반경을 설정하세요.</p>
      <div style={{ marginTop: 8 }}>
        <RadiusDial value={radiusKm} onChange={onChange} min={0.5} max={10} step={0.5} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 8 }}>
        <span className="chip">현재 반경: {radiusKm}km</span>
        {busy && <span className="muted">적용 중…</span>}
      </div>
      {error && <p className="error" style={{ marginTop: 6 }}>{error}</p>}
    </section>
  );
}

function getCoordsOptional(timeout=3000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    const t = setTimeout(()=>resolve(null), timeout);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(t); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { clearTimeout(t); resolve(null); },
      { enableHighAccuracy: true, timeout }
    );
  });
}
