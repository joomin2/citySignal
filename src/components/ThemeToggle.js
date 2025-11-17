"use client";
// 컴포넌트: ThemeToggle (라이트/다크/시스템)
// 렌더링: CSR — DOM data-theme 속성과 localStorage 제어
import { useEffect, useState } from "react";

const applyTheme = (mode) => {
  if (mode === "system") {
    document.documentElement.removeAttribute("data-theme");
    return;
  }
  document.documentElement.setAttribute("data-theme", mode);
};

export default function ThemeToggle() {
  const [mode, setMode] = useState("system");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme-mode") : null;
    const initial = saved || "system";
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
        <button className={`btn ${mode === "system" ? "primary" : ""}`} onClick={() => onChange("system")}>시스템</button>
      </div>
      <p style={{ marginTop: 8, color: "var(--muted)" }}>다크모드는 기기 배터리 절약과 야간 가독성에 유리합니다.</p>
    </div>
  );
}
