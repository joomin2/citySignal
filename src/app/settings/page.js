"use client";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/BottomNav.jsx";
import RangeSettings from "@/components/RangeSettings.jsx";

export default function SettingsPage() {
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
      </div>
      <BottomNav />
    </div>
  );
}
