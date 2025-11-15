"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  if (loading) return <button className="btn" disabled>로딩중…</button>;

  if (!session) {
    return (
      <div style={{ display: "flex", gap: "8px" }}>
        <a className="btn primary" href="/login">로그인 / 회원가입</a>
        <Link className="btn button--ghost" href="/signup">회원가입</Link>
      </div>
    );
  }

  return (
    <button className="btn danger" onClick={() => signOut({ callbackUrl: "/" })}>로그아웃</button>
  );
}
