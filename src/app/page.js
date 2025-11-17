// 페이지: 홈
// 렌더링: SSR(서버 컴포넌트) — 클라이언트 컴포넌트(AuthButton, CurrentLocation, PushTipsBanner) 합성
import AuthButton from "@/components/AuthButton";
import CurrentLocation from "@/components/CurrentLocation";
import PushTipsBanner from "@/components/PushTipsBanner";
import HomeNearby from "@/components/HomeNearby.jsx";
import HomeQuickTiles from "@/components/HomeQuickTiles.jsx";
import BottomNav from "@/components/BottomNav.jsx";

export default function HomePage() {
  // 홈의 최근 제보는 카드형식으로 실제 데이터 렌더 — HomeNearby 사용

  return (
    <div className="page">
      <div className="sticky top-0 z-40 bg-white/70 dark:bg-zinc-900/70 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-bold">CitySignal</h1>
            <p className="text-xs text-zinc-500">내 주변 위험을 빠르게</p>
          </div>
          <AuthButton />
        </div>
      </div>

      <main className="container">
        <PushTipsBanner />
        <CurrentLocation />

        <HomeQuickTiles />

        {/* Nearby */}
        <section className="section fade-in">
          <div className="section-title">
            <h2>주변 위험 제보</h2>
          </div>
          <HomeNearby />
        </section>

        <section className="card tip">
          <p><strong>💡 팁:</strong> 앱을 홈 화면에 추가하면 더 빠르게 접속할 수 있습니다!</p>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}