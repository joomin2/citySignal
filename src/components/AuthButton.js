"use client";
// 컴포넌트: AuthButton (로그인/로그아웃 버튼)
// 렌더링: CSR — NextAuth 세션 상태에 의존
import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  if (loading) return <button className="btn ghost" disabled>로딩중…</button>;

  if (!session) {
    return (
      <a className="btn secondary" href="/login">로그인 / 회원가입</a>
    );
  }

  return (
    <button className="btn ghost" onClick={() => signOut({ callbackUrl: "/" })}>로그아웃</button>
  );
}
