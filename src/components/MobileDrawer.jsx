"use client";
import { useState, useEffect } from "react";
// 모바일 드로어: 작은 화면에서 부가 메뉴/필터 표시
// English: sliding drawer for secondary navigation/filter controls
import Link from "next/link";
import { House, PlusCircle, ListBullets, MapTrifold, GearSix, X, List } from "phosphor-react";

export default function MobileDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  const Item = ({ href, icon: Icon, label, onClick }) => (
    <Link href={href} className="no-underline" onClick={() => { setOpen(false); onClick?.(); }}>
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-800 transition-colors">
        <Icon size={22} className="text-brand-600" weight="fill" />
        <span className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-100">{label}</span>
      </div>
    </Link>
  );

  return (
    <>
      {/* Floating hamburger */}
      <button
        aria-label="메뉴 열기"
        className="fixed left-4 top-4 z-[70] md:left-6 md:top-6 rounded-2xl bg-white/90 dark:bg-zinc-900/80 border border-zinc-200/70 dark:border-zinc-800 p-2 shadow-cute backdrop-blur-md hover:shadow-md transition"
        onClick={() => setOpen(true)}
      >
        <List size={22} className="text-zinc-700 dark:text-zinc-200" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <aside
        className={`fixed z-[90] top-0 left-0 h-full w-[78%] max-w-[320px] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="사이드 메뉴"
      >
        <div className="pt-[calc(12px+env(safe-area-inset-top,0px))] px-3 pb-3 border-b border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-pink-400 shadow-cute" />
            <span className="font-extrabold tracking-tight text-zinc-800 dark:text-zinc-100">CitySignal</span>
          </div>
          <button aria-label="닫기" className="p-2 rounded-lg hover:bg-zinc-100/80 dark:hover:bg-zinc-800" onClick={() => setOpen(false)}>
            <X size={20} className="text-zinc-600 dark:text-zinc-300" />
          </button>
        </div>

        <nav className="p-3 grid gap-1">
          <Item href="/" icon={House} label="홈" />
          <Item href="/signals/new" icon={PlusCircle} label="제보하기" />
          <Item href="/signals" icon={ListBullets} label="피드" />
          <Item href="/map" icon={MapTrifold} label="지도" />
          <Item href="/settings" icon={GearSix} label="설정" />
        </nav>

        <div className="mt-auto p-3 text-[12px] text-zinc-500">© {new Date().getFullYear()} CitySignal</div>
        <div className="pb-[env(safe-area-inset-bottom,0px)]" />
      </aside>
    </>
  );
}
