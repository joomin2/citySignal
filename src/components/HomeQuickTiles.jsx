// Minimal server component tiles
export default function HomeQuickTiles() {
  const base = "rounded-xl border border-zinc-200 bg-white p-3 hover:bg-zinc-50 active:bg-zinc-100 transition dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800";
  const item = (href, icon, title, sub) => (
    <a href={href} key={href} className="no-underline">
      <div className={base}>
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">{icon}</span>
          <div className="leading-tight">
            <div className="font-medium text-sm">{title}</div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{sub}</div>
          </div>
        </div>
      </div>
    </a>
  );
  return (
    <section>
      <div className="grid grid-cols-2 gap-2">
        {item("/signals/new", "➕", "제보하기", "빠른 등록")}
        {item("/signals", "📰", "피드", "정렬 · 페이지")}
        {item("/map", "🗺️", "지도", "현재 위치 반경")}
        {item("/settings", "⚙️", "설정", "알림·테마")}
      </div>
    </section>
  );
}
