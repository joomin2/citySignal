"use client";
// 컴포넌트: PushTipsBanner (PWA/푸시 안내/권한 상태 배너)
// 기능:
//  - HTTPS 미지원 경고
//  - iOS: 홈 화면 추가(standalone) 필요 안내
//  - 알림 권한 상태별 분기(default/granted/denied)
//  - 사용자가 닫으면 localStorage 키로 영구 숨김
// 푸시 사용 팁 배너: 권한/구독 여부에 따라 안내 문구 노출
// English: banner with contextual tips for enabling push notifications
import { useEffect, useMemo, useState } from "react";

const DISMISS_KEY = "push_tips_dismissed";

function detectEnv() {
  try {
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || (window.navigator).standalone;
    const isSecure = location.protocol === "https:" || location.hostname === "localhost";
    const permission = typeof Notification !== "undefined" ? Notification.permission : "default";
    const canRequest = typeof Notification !== "undefined" && permission === "default";
    return { isiOS, isStandalone, isSecure, permission, canRequest };
  } catch {
    return { isiOS: false, isStandalone: false, isSecure: false, permission: "default", canRequest: false };
  }
}

export default function PushTipsBanner() {
  const [env, setEnv] = useState(() => detectEnv());
  const [closed, setClosed] = useState(false);
  const [show, setShow] = useState(false);

  // 최초 환경 및 권한 변화 감지(사용자가 권한을 허용하면 자동 숨김)
  useEffect(() => {
    const update = () => setEnv(detectEnv());
    update();
    let int = setInterval(update, 4000); // 간단 폴링(권한 변경 감지)
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") {
        setClosed(true);
        return;
      }
    } catch {}
    // 표시 조건: (1) HTTPS 아님 OR (2) iOS PWA 미설치 OR (3) 알림 권한 default
    if (!env.isSecure || (env.isiOS && !env.isStandalone) || env.permission === "default") {
      setShow(true);
    }
  }, [env]);

  // 권한 허용/이미 허용/거부 + 닫힘 처리
  const onRequest = async () => {
    try {
      await Notification.requestPermission();
      setEnv(detectEnv());
    } catch {}
  };
  const onClose = () => {
    setClosed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  };

  // 숨김 조건
  if (closed) return null;
  if (!show) return null;
  if (env.permission === "granted" && env.isSecure && (!env.isiOS || env.isStandalone)) return null; // 모든 요구 만족시 숨김

  return (
    <section
      className="relative rounded-xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/10 dark:to-amber-800/10 px-4 py-3 shadow-sm text-sm text-amber-900 dark:text-amber-200"
      role="status"
      aria-live="polite"
    >
      <button
        aria-label="배너 닫기"
        onClick={onClose}
        className="absolute top-2 right-2 h-6 w-6 grid place-items-center rounded-full text-amber-700 hover:bg-amber-200/50 dark:text-amber-300 dark:hover:bg-amber-700/30 transition"
      >
        ✕
      </button>
      <div className="space-y-1">
        {!env.isSecure && (
          <p><b>🔒 HTTPS 필요:</b> 푸시/알림 권한을 위해 https 도메인 또는 localhost 로 접속하세요.</p>
        )}
        {env.isSecure && env.isiOS && !env.isStandalone && (
          <p><b>📱 iOS 설치 안내:</b> Safari 공유 버튼 → "홈 화면에 추가" 후 앱에서 알림을 허용해야 푸시가 동작합니다.</p>
        )}
        {env.permission === "denied" && (
          <p><b>🚫 알림 거부됨:</b> 설정 &gt; 알림에서 권한을 다시 허용해야 합니다.</p>
        )}
        {env.permission === "default" && env.canRequest && (
          <div>
            <p className="mb-1"><b>🔔 알림 권한:</b> 위험 제보 푸시를 받으려면 허용해주세요.</p>
            <button
              onClick={onRequest}
              className="inline-flex items-center gap-1 rounded-md bg-amber-600 text-white text-xs font-medium px-3 py-1.5 shadow hover:bg-amber-500 active:scale-[.98] transition"
            >
              권한 요청
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
