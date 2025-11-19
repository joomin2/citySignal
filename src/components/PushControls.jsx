"use client";
import { useEffect, useMemo, useState } from "react";
// 푸시 제어 UI: 구독 상태/권한 확인 및 안내
// English: minimal UI for push permission and subscription status
import RadiusDial from "./RadiusDial.jsx";

export default function PushControls() {
  const [supported, setSupported] = useState({ sw: false, push: false });
  const [permission, setPermission] = useState("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [endpointTail, setEndpointTail] = useState("");
  const [radiusKm, setRadiusKm] = useState(() => {
    try { return Number(localStorage.getItem("push-radius-km")) || 2; } catch { return 2; }
  });

  const vapid = useMemo(() => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "", []);

  useEffect(() => {
    const sw = "serviceWorker" in navigator;
    const push = "PushManager" in window;
    setSupported({ sw, push });
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
    (async () => {
      try {
        if (!sw || !push) return;
        const reg = await ensureSW();
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setSubscribed(true);
          const ep = sub.endpoint || "";
          setEndpointTail(ep.slice(-12));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    try { localStorage.setItem("push-radius-km", String(radiusKm)); } catch {}
  }, [radiusKm]);

  const onEnable = async () => {
    setBusy(true); setError("");
    try {
      if (!supported.sw || !supported.push) throw new Error("브라우저가 푸시를 지원하지 않습니다.");
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const reg = await ensureSW();
      const key = vapid;
      if (!key) throw new Error("VAPID 공개키가 설정되지 않았습니다.");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
      // 위치는 선택: 있으면 서버에 저장
      const coords = await getCoordsOptional(6000);
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), radiusKm, lat: coords?.lat, lng: coords?.lng })
      });
      setSubscribed(true);
      setEndpointTail((sub.endpoint || "").slice(-12));
    } catch (e) {
      setError(e?.message || String(e));
    } finally { setBusy(false); }
  };

  const onDisable = async () => {
    setBusy(true); setError("");
    try {
      const reg = await ensureSW();
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setSubscribed(false);
      setEndpointTail("");
    } catch (e) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  };

  const onUpdateRadius = async (val) => {
    setRadiusKm(val);
    try {
      const reg = await ensureSW();
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      const coords = await getCoordsOptional(4000);
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), radiusKm: val, lat: coords?.lat, lng: coords?.lng })
      });
    } catch {}
  };

  const onTest = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "테스트 발송 실패");
      }
    } catch (e) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="card">
      <h3>푸시 알림</h3>
      <p className="muted">가까운 새 제보가 등록되면 알려드립니다.</p>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>상태</span>
          <span className={`badge ${subscribed ? 'level-2' : 'level-1'}`}>{subscribed ? '사용중' : '꺼짐'}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>권한</span>
          <span className="chip">{permission}</span>
        </div>
        {endpointTail && <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>엔드포인트</span>
          <span className="chip">…{endpointTail}</span>
        </div>}
        <div style={{ marginTop: 4 }}>
          <RadiusDial value={radiusKm} onChange={(v)=>onUpdateRadius(v)} min={0.5} max={10} step={0.5} />
        </div>
        <div style={{ display:'flex', gap:8, marginTop: 6 }}>
          {!subscribed ? (
            <button className="btn primary" disabled={busy || !supported.sw || !supported.push} onClick={onEnable}>푸시 활성화</button>
          ) : (
            <>
              <button className="btn secondary" disabled={busy} onClick={onTest}>테스트 발송</button>
              <button className="btn ghost" disabled={busy} onClick={onDisable}>비활성화</button>
            </>
          )}
        </div>
        {error && <p className="error" style={{ marginTop: 6 }}>{error}</p>}
      </div>
    </div>
  );
}

async function ensureSW() {
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) reg = await navigator.serviceWorker.register("/sw.js");
  return reg;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function getCoordsOptional(timeout=5000) {
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
