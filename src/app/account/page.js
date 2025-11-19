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
        <button className="btn danger" onClick={() => signOut({ callbackUrl: "/" })}>로그아웃</button>
      </div>
      {/* Bottom navigation removed as requested */}
      <BottomNav />
    </div>
  );
}

