"use client";
// 컴포넌트: PushTipsBanner (PWA/푸시 안내 배너)
// 렌더링: CSR — 사용자 에이전트, display-mode, HTTPS를 런타임에서 확인
import { useEffect, useMemo, useState } from "react";

export default function PushTipsBanner() {
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);
  const env = useMemo(() => {
    try {
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
      return { isiOS, isStandalone, isSecure };
    } catch {
      return { isiOS: false, isStandalone: false, isSecure: false };
    }
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem("tips-banner-dismissed") === "1") {
        setClosed(true);
        return;
      }
    } catch {}
    if (!env.isSecure) { setVisible(true); return; }
    if (env.isiOS && !env.isStandalone) { setVisible(true); return; }
  }, [env]);

  if (!visible || closed) return null;

  const askPermission = async () => {
    try { await Notification.requestPermission(); } catch {}
  };

  const close = () => {
    setClosed(true);
    try { localStorage.setItem("tips-banner-dismissed", "1"); } catch {}
  };

  return (
    <section className="card" style={{ position:'relative', background: 'linear-gradient(135deg,#fff7ed,#fffbeb)', border: '1px solid #fbbf24' }}>
      <button aria-label="닫기" onClick={close} style={{ position:'absolute', top:8, right:8, background:'transparent', border:0, color:'#92400e', fontSize:16, cursor:'pointer' }}>✕</button>
      {!env.isSecure && (
        <p><b>🔒 HTTPS 필요:</b> ngrok 또는 도메인(https)으로 접속해주세요.</p>
      )}
      {env.isSecure && env.isiOS && !env.isStandalone && (
        <>
          <p><b>📱 iOS 푸시 안내:</b> 사파리 공유 버튼 → 홈 화면에 추가 후 앱에서 푸시를 허용하세요.</p>
          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={askPermission}>알림 권한 요청</button>
          </div>
        </>
      )}
    </section>
  );
}
