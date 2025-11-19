"use client";
// 하단 네비게이션: 주요 뷰로 이동하는 4개 탭
// English: bottom navigation bar with 4 primary tabs
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENUS = [
  { name: "피드", path: "/signals", icon: "📰" },
  { name: "지도", path: "/map", icon: "🗺️" },
  { name: "등록", path: "/signals/new", icon: "➕" },
  { name: "설정", path: "/settings", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (p) => p === "/signals" ? (pathname === p || pathname.startsWith("/signals/")) : pathname === p;
  return (
    <nav className="bottom-nav-ui" aria-label="하단 탐색">
      <div className="bn-inner">
        {MENUS.map(m => {
          const a = isActive(m.path);
          return (
            <Link key={m.path} href={m.path} className="bn-item" aria-current={a ? 'page' : undefined}>
              <div className={`bn-icon ${a ? 'active' : ''}`}>{m.icon}</div>
              <span className={`bn-label ${a ? 'active' : ''}`}>{m.name}</span>
              {a && <span className="bn-dot" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
