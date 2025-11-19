// Minimal server component tiles
// 홈 빠른 진입 타일: 핵심 기능 바로가기
// English: quick access tiles for core features
export default function HomeQuickTiles() {
  const base = "flex-1 rounded-xl border border-violet-200/70 dark:border-violet-800/50 bg-white/90 dark:bg-zinc-900/70 px-3 py-2 shadow-sm hover:shadow-md active:scale-[.97] transition no-underline backdrop-blur-sm";
  const item = (href, icon, title, sub) => (
    <a href={href} key={href} className={base}>
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{icon}</span>
        <div className="leading-none">
          <div className="font-semibold text-[13px] tracking-tight">{title}</div>
          <div className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">{sub}</div>
        </div>
      </div>
    </a>
  );
  return (
    <section className="mb-3">
      <div className="flex gap-2 items-stretch w-full">
        {item("/signals/new", "➕", "제보하기", "빠른 등록")}
        {item("/signals", "📰", "피드", "정렬/페이지")}
        {item("/map", "🗺️", "지도", "현재 반경")}
        {item("/settings", "⚙️", "설정", "알림·테마")}
      </div>
    </section>
  );
}
