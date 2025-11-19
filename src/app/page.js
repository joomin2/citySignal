// 페이지: 홈
// 렌더링: SSR(서버 컴포넌트) — 클라이언트 컴포넌트(AuthButton, CurrentLocation, PushTipsBanner) 합성
// AuthButton 제거 (테스트 간소화)
import CurrentLocation from "@/components/CurrentLocation";
import PushTipsBanner from "@/components/PushTipsBanner";
import HomeNearby from "@/components/HomeNearby.jsx";
import AuthButton from "@/components/AuthButton";
import BottomNav from "@/components/BottomNav.jsx";
import SignalCard from "@/components/SignalCard.jsx";
import { connectDB } from "@/lib/mongodb";
import Signal from "@/models/signal";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";

export default async function HomePage({ searchParams }) {
  // 페이지네이션: ?page=1 (기본 1), 한 페이지 20개
  const pageSize = 20;
  // Next.js 16: searchParams는 Promise일 수 있음 → 안전 처리
  const sp = (searchParams && typeof searchParams.then === 'function') ? await searchParams : (searchParams || {});
  const page = Math.max(1, parseInt(sp?.page || '1', 10) || 1);
  let total = 0;
  let initialSignals = [];
  let hasPrev = page > 1;
  let hasNext = false;
  let userName = null;

  // DB 접근은 안전하게 시도(환경변수 미설정 시에도 홈은 렌더)
  try {
    await connectDB();
    total = await Signal.countDocuments();
    const skip = (page - 1) * pageSize;
    initialSignals = await Signal.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select("title level location createdAt zone")
      .lean();
    // 직렬화 가능한 형태로 변환(ObjectId/Date → string)
    initialSignals = initialSignals.map((s) => ({
      ...s,
      _id: s._id ? String(s._id) : undefined,
      createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : undefined,
    }));
    hasPrev = page > 1;
    hasNext = page * pageSize < total;
  } catch {}

  // 세션 조회 실패해도 무시하고 진행
  try {
    const session = await getServerSession(authOptions);
    userName = session?.user?.name || null;
  } catch {}

  return (
    <div className="page page-colorful">
      <div className="sticky top-0 z-50 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/60 supports-[backdrop-filter]:backdrop-blur">
        <div className="px-4 h-12 flex items-center justify-between">
          <h1 className="text-[17px] font-extrabold text-black dark:text-white tracking-tight">CitySignal</h1>
          <div className="flex items-center gap-3">
            {userName && <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{userName} 님 환영합니다</span>}
            <AuthButton />
          </div>
        </div>
      </div>

      <main className="container" style={{ paddingBottom: '110px' }}>
        <section className="hero-enhanced sparkle fade-in" style={{ marginTop: 14 }}>
          <div className="hero-title">내 주변 위험 정보</div>
          <div className="hero-sub">가까운 제보 또는 최신 제보를 즉시 확인하세요.</div>
          <div className="hero-actions">
            <a href="/signals/new" className="btn primary" style={{ textDecoration: 'none' }}>위험 정보 등록</a>
            <a href="/map" className="btn secondary" style={{ textDecoration: 'none' }}>지도 보기</a>
          </div>
        </section>

        <PushTipsBanner />
        <CurrentLocation />

        {/* 글로벌 최근 제보 (SSR) */}
        <section className="section fade-in">
          <div className="section-title flex items-center justify-between">
            <h2>최근 제보 (전체)</h2>
            <span className="muted text-xs">페이지 {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
          </div>
          {initialSignals?.length ? (
            <div>
              {initialSignals.map(s => <SignalCard key={s._id} signal={s} />)}
            </div>
          ) : (
            <section className="card"><p>등록된 제보가 아직 없습니다.</p></section>
          )}
          {/* 페이지네이션 컨트롤 */}
          <div className="card" style={{ display:'flex', gap:8, justifyContent:'space-between', marginTop:12 }}>
            <a className={`btn ghost ${!hasPrev ? 'disabled pointer-events-none opacity-50' : ''}`} href={hasPrev ? `/?page=${page-1}` : '#'}>이전</a>
            <span className="muted">{total}건 중 {total ? 1 : 0}–{initialSignals.length} 표시</span>
            <a className={`btn ghost ${!hasNext ? 'disabled pointer-events-none opacity-50' : ''}`} href={hasNext ? `/?page=${page+1}` : '#'}>다음</a>
          </div>
        </section>

        {/* 위치 기반 근처 3건 */}
        <section className="section fade-in">
          <div className="section-title">
            <h2>내 주변 제보 (위치 기반)</h2>
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