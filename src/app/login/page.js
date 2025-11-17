"use client";
// 페이지: 로그인 (이메일/비밀번호 + Google)
// 렌더링: CSR — 폼 상태와 signIn 리다이렉트를 클라이언트에서 처리
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus({ state: "loading", message: "로그인 중…" });
    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: true,
      callbackUrl: "/account",
    });
    if (res?.error) setStatus({ state: "error", message: res.error });
  };

  return (
    <main className="page">
      <header className="header">
        <h1>로그인</h1>
        <Link href="/" className="btn ghost" style={{ textDecoration: "none" }}>홈으로</Link>
      </header>

      <section className="card">
        <form className="form" onSubmit={onSubmit}>
          <div className="field">
            <label className="label" htmlFor="email">이메일</label>
            <input className="input" id="email" name="email" type="email" value={form.email} onChange={onChange} required />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">비밀번호</label>
            <input className="input" id="password" name="password" type="password" value={form.password} onChange={onChange} required />
          </div>
          <button className="btn primary" type="submit" disabled={status.state === "loading"}>로그인</button>
        </form>
        {status.state === "error" && <p className="error">{status.message}</p>}
      </section>

      <section className="card">
        <p className="muted">계정이 없나요?</p>
        <Link className="btn secondary" href="/signup">회원가입</Link>
      </section>
    </main>
  );
}
