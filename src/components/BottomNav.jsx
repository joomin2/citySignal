"use client";
// Minimal bottom tab navigation with 4 items (emoji + labels)
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENUS = [
  { name: "제보하기", path: "/signals/new", icon: "➕" },
  { name: "피드", path: "/signals", icon: "📰" },
  { name: "지도", path: "/map", icon: "🗺️" },
  { name: "설정", path: "/settings", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (path) => {
    if (path === "/") return pathname === "/";
    if (path === "/signals/new") return pathname === "/signals/new";
    if (path === "/signals") return pathname === "/signals" || pathname.startsWith("/signals/");
    return pathname === path;
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-zinc-200 bg-white/95 dark:bg-zinc-900/85 dark:border-zinc-800 backdrop-blur supports-[backdrop-filter]:backdrop-blur md:hidden">
      <div className="max-w-screen-sm mx-auto">
        <div className="grid grid-cols-4 text-xs">
          {MENUS.map((m) => {
            const active = isActive(m.path);
            return (
              <Link key={m.path} href={m.path} className="no-underline">
                <div className={`flex flex-col items-center justify-center h-14 gap-0.5 transition-colors ${active ? "text-brand-600" : "text-zinc-600 dark:text-zinc-400"}`}>
                  <span aria-hidden="true" className="text-base leading-none">{m.icon}</span>
                  <span className="text-[11px] font-medium leading-none">{m.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="pb-[env(safe-area-inset-bottom,0px)]" />
      </div>
    </nav>
  );
}
