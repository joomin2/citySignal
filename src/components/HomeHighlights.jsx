"use client";
// 홈 상단 하이라이트 섹션: 주요 분류/빠른 액션 진입
// English: top home section with key categories and quick actions
import Carousel from "./Carousel.jsx";

function Card({ title, icon, desc, href }) {
  return (
    <a href={href} className="no-underline block">
      <div className="rounded-xl border border-zinc-200 bg-white/90 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">{icon}</span>
          <div className="leading-tight">
            <div className="font-semibold text-sm mb-0.5">{title}</div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{desc}</p>
          </div>
        </div>
      </div>
    </a>
  );
}

// Simplified non-image slide to avoid layout shifts or external fetches
function ImageSlide({ label, sub }) {
  return (
    <div className="relative h-24 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-indigo-50 via-violet-50 to-pink-50 dark:from-zinc-800 dark:via-zinc-800 dark:to-zinc-800 flex items-center px-4">
      <div>
        <div className="font-semibold text-sm mb-0.5">{label}</div>
        <div className="text-[11px] text-zinc-600 dark:text-zinc-400">{sub}</div>
      </div>
    </div>
  );
}

export default function HomeHighlights() {
  const slides = [
    <ImageSlide key="hl1" label="빠른 신고" sub="내 위치 기반 위험 제보" />,
    <Card key="new" title="빠른 제보" icon="⚡" desc="현재 위치로 즉시 등록" href="/signals/new" />,
    <Card key="near" title="내 주변 위험" icon="📍" desc="지도 + 반경 3km" href="/map" />,
    <ImageSlide key="hl2" label="실시간 알림" sub="새 위험 푸시 수신" />,
    <Card key="feed" title="정렬 가능한 피드" icon="📰" desc="최신 · 위험도 · 거리" href="/signals" />,
    <Card key="notify" title="푸시 알림" icon="🔔" desc="새 위험 알림 받기" href="/settings" />,
  ];
  return (
    <section className="mb-4">
      <Carousel items={slides} autoplay={6000} />
    </section>
  );
}
