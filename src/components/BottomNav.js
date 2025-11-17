"use client";
// 컴포넌트: BottomNav (하단 탭 내비게이션)
// 렌더링: CSR — 세션과 경로 상태로 활성 탭 표시

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { House, Plus, ListBullets, MapTrifold, GearSix } from "phosphor-react";

function Icon({ name, active }) {
    const common = { size: 24, className: active ? "text-brand-600" : "text-zinc-500" };
  switch (name) {
    case 'home': return <House {...common} weight={active ? "fill" : "regular"} />;
        case 'new': return <Plus {...common} weight={active ? "bold" : "regular"} />;
    case 'feed': return <ListBullets {...common} weight={active ? "fill" : "regular"} />;
    case 'map': return <MapTrifold {...common} weight={active ? "fill" : "regular"} />;
    case 'settings': return <GearSix {...common} weight={active ? "fill" : "regular"} />;
    default: return null;
  }
}

function CuteIcon({ name, active }) {
    const bg = {
        home: "from-sky-300 to-cyan-400",
        feed: "from-amber-300 to-rose-400",
        map: "from-emerald-300 to-teal-400",
        settings: "from-violet-300 to-fuchsia-400",
        new: "from-brand-500 to-pink-400",
    }[name] || "from-zinc-200 to-zinc-300";

    const emoji = {
        home: "🏠",
        feed: "📰",
        map: "🗺️",
        settings: "⚙️",
        new: "➕",
    }[name] || "✨";

    return (
        <div className={`h-9 w-9 rounded-full grid place-items-center bg-gradient-to-br ${bg} shadow-cute text-[18px] ${active ? "scale-105" : "opacity-90"} transition-transform`}> {emoji} </div>
    );
}

export default function BottomNav() {
    const pathname = usePathname();
    const { data: session } = useSession();

    const menus = [
        { name: "홈", path: "/", icon: "home" },
        { name: "등록", path: "/signals/new", icon: "new" },
        { name: "피드", path: "/signals", icon: "feed" },
        { name: "지도", path: "/map", icon: "map" },
        { name: "설정", path: "/settings", icon: "settings" },
    ];

    const isActive = (path) => {
        if (path === "/") return pathname === "/";
        if (path === "/signals/new") return pathname === "/signals/new";
        if (path === "/signals") return pathname === "/signals" || pathname.startsWith("/signals/");
        if (path === "/map") return pathname === "/map";
        if (path === "/account") return pathname === "/account" || pathname.startsWith("/account/");
        return pathname === path;
    };

                const items = menus.filter(m => m.icon !== 'new');
                const left = items.slice(0, 2);
                const right = items.slice(2);
                const renderItem = (menu) => {
                    const active = isActive(menu.path);
                    return (
                        <Link key={menu.path} href={menu.path} className="no-underline">
                            <div className={`${active ? "text-brand-700" : "text-zinc-600 dark:text-zinc-400"} flex flex-col items-center justify-center py-1 rounded-xl transition-all hover:-translate-y-0.5 relative`}> 
                                <CuteIcon name={menu.icon} active={active} />
                                <span className="text-[11px] leading-none mt-1 font-semibold">{menu.name}</span>
                                {active && (<span className="absolute -top-1.5 h-2 w-2 rounded-full bg-brand-500/90" />)}
                            </div>
                        </Link>
                    );
                };

                return (
                    <nav className="md:hidden fixed bottom-3 inset-x-4 z-50 rounded-3xl border border-zinc-200/60 bg-white/85 backdrop-blur-md shadow-cute dark:bg-zinc-900/70 dark:border-zinc-800">
                        <div className="relative">
                            {/* bar content */}
                            <div className="grid grid-cols-4 gap-1 px-3 py-2">
                                {left.map(renderItem)}
                                {right.map(renderItem)}
                            </div>

                            {/* floating center action */}
                            <Link href="/signals/new" className="no-underline">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full border border-pink-300/60 shadow-cute bg-gradient-to-br from-brand-500 to-pink-400 text-white grid place-items-center hover:opacity-95 active:scale-95 transition-transform">
                                    <span className="text-[26px]">➕</span>
                                </div>
                            </Link>
                        </div>
                        <div className="pt-5 pb-[env(safe-area-inset-bottom,0px)]" />
                    </nav>
                );
}