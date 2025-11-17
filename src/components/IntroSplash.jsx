"use client";
import { useEffect, useState } from "react";

export default function IntroSplash() {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    try {
      // 1) 접근성: 모션 최소화 설정이면 즉시 패스
      const reduce = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if (reduce) return;
      // 2) 세션 중 1회만 노출
      const seen = sessionStorage.getItem("introSeen") === "1";
      if (seen) return;
      setVisible(true);
      // 1.2초 후 자동 닫힘
      const t = setTimeout(() => close(), 1200);
      return () => clearTimeout(t);
    } catch {}
  }, []);

  const close = () => {
    try { sessionStorage.setItem("introSeen", "1"); } catch {}
    setHiding(true);
    // 애니메이션 종료 후 언마운트
    setTimeout(() => setVisible(false), 400);
  };

  if (!visible) return null;

  return (
    <div className={`intro-splash ${hiding ? "hide" : ""}`} role="dialog" aria-label="CitySignal intro">
      <button className="intro-skip" onClick={close} aria-label="Skip intro">건너뛰기</button>
      <div className="intro-box" onClick={close}>
        <div className="intro-logo" aria-hidden>
          <div className="dot dot-a" />
          <div className="dot dot-b" />
          <div className="pulse" />
        </div>
        <div className="intro-title">CitySignal</div>
        <div className="intro-sub">가까운 위험을 더 빨리</div>
      </div>
    </div>
  );
}
