"use client";
// 페이지: 내 정보
// 렌더링: CSR — NextAuth 세션을 읽고 클라이언트 전용 동작 수행
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/BottomNav.jsx";

export default function AccountPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="container">
        <p>로딩 중…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container">
        <h2>로그인이 필요합니다</h2>
        <p>Google 계정으로 간편하게 로그인하세요.</p>
        <button className="btn primary" onClick={() => signIn("google", { callbackUrl: "/account" })}>Google로 로그인</button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <h2>내 정보</h2>
        <div className="card">
          <p><strong>이름:</strong> {session.user?.name}</p>
          <p><strong>이메일:</strong> {session.user?.email}</p>
        </div>
        <ThemeToggle />
        <TestPush />
        <button className="btn danger" onClick={() => signOut({ callbackUrl: "/" })}>로그아웃</button>
      </div>
      {/* Bottom navigation removed as requested */}
      <BottomNav />
    </div>
  );
}

function TestPush() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const js = await res.json();
      setMsg(res.ok ? `발송: ${js.results?.length || 0}건` : (js.error || "에러"));
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>푸시 테스트</h3>
      <button className="btn" onClick={run} disabled={loading}>{loading ? "발송 중…" : "내 기기로 테스트 발송"}</button>
      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
