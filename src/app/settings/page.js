"use client";
import ThemeToggle from "@/components/ThemeToggle";
import PushControls from "@/components/PushControls.jsx";
import BottomNav from "@/components/BottomNav.jsx";

export default function SettingsPage() {
  return (
    <div className="page">
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
        <PushControls />
        <section className="card" style={{ marginTop: 12 }}>
          <h3>도움말</h3>
          <p className="muted">푸시 테스트는 로그인 후 사용할 수 있습니다.</p>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
