"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function BottomNav() {
    const pathname = usePathname();
    const { data: session } = useSession();

    const menus = [
        { name: "홈", path: "/", icon: "🏠" },
        { name: "위험신호 등록", path: "/submit", icon: "⚠️" },
        { name: "피드", path: "/signals", icon: "📢" },
        { name: session ? "내 정보" : "로그인", path: "/account", icon: session ? "👤" : "🔑" },
    ];

    return (
        <nav className="bottom-nav">
            {menus.map((menu) => (
                <Link key={menu.path} href={menu.path}>
                    <div className={`bottom-item ${pathname === menu.path ? "active" : ""}`}>
                        <span className="icon">{menu.icon}</span>
                        <span className="label">{menu.name}</span>
                    </div>
                </Link>
            ))}
        </nav>
    );
}