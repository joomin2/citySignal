"use client";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/BottomNav.jsx";
import RangeSettings from "@/components/RangeSettings.jsx";

export default function SettingsPage() {
  // 푸시 활성화+테스트 버튼 핸들러
  async function enableAndTestPush() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('브라우저가 푸시를 지원하지 않습니다.');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('알림 권한이 거부되었습니다.');
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) reg = await navigator.serviceWorker.register('/sw.js');
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) throw new Error('VAPID 공개키가 없습니다.');
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) });
      // 위치 정보는 선택적으로 포함
      let coords = null;
      try { coords = await getCoordsOptional(4000); } catch {}
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), lat: coords?.lat, lng: coords?.lng })
      });
      // 테스트 푸시 발송
      const res = await fetch('/api/push/test', { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        throw new Error(j.error || '테스트 푸시 실패');
      }
      alert('푸시 알림이 발송되었습니다. 브라우저 알림을 확인하세요!');
    } catch (e) {
      alert('푸시 활성화/테스트 실패: ' + (e?.message || e));
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
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

  return (
    <div className="page" style={{ paddingBottom: "110px" }}>
      <div className="topbar">
        <div className="bar">
          <h2>설정</h2>
          <span className="muted">맞춤 환경</span>
        </div>
      </div>
      <div className="container">
        <section className="card">
          <h3>앱 정보</h3>
          <p className="muted">CitySignal · 가까운 위험을 더 빨리</p>
        </section>
        <ThemeToggle />
        <RangeSettings />
        {/* 푸시 알림 QA 및 테스트 버튼 제거됨 */}
      </div>
      <BottomNav />
    </div>
  );
}
