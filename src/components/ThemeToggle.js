"use client";
// 컴포넌트: ThemeToggle (라이트/다크)
// 시스템 모드 제거, 전역 지속(localStorage) + 즉시 DOM 적용
// 다크/라이트 테마 토글
// English: toggle dark/light theme via data-theme attribute
import { useEffect, useState } from "react";

const applyTheme = (mode) => {
  document.documentElement.setAttribute("data-theme", mode);
};

export default function ThemeToggle() {
  const [mode, setMode] = useState("light");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme-mode") : null;
    let initial = saved;
    if (!initial) {
      // 기본값: prefers-color-scheme 다크면 다크 채택
      try { if (window.matchMedia('(prefers-color-scheme: dark)').matches) initial = 'dark'; } catch {}
    }
    if (!initial) initial = 'light';
    setMode(initial);
    applyTheme(initial);
  }, []);

  const onChange = (next) => {
    setMode(next);
    try { localStorage.setItem("theme-mode", next); } catch {}
    applyTheme(next);
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>테마</h3>
      <div style={{ display: "flex", gap: 8 }}>
        <button className={`btn ${mode === "light" ? "primary" : ""}`} onClick={() => onChange("light")}>라이트</button>
        <button className={`btn ${mode === "dark" ? "primary" : ""}`} onClick={() => onChange("dark")}>다크</button>
      </div>
      <p style={{ marginTop: 8, color: "var(--muted)" }}>다크모드는 기기 배터리 절약과 야간 가독성에 유리합니다.</p>
    </div>
  );
}
