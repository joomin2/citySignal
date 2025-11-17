"use client";
import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus({ state: "loading", message: "제출 중…" });
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "제출 실패");
      setStatus({ state: "success", message: "가입 완료! 이제 로그인하세요." });
      setForm({ name: "", email: "", password: "" });
    } catch (err) {
      setStatus({ state: "error", message: err.message || "에러가 발생했습니다" });
    }
  };

  return (
    <main className="page">
      <header className="header">
        <h1>회원가입</h1>
        <Link href="/" className="btn ghost" style={{ textDecoration: "none" }}>홈으로</Link>
      </header>

      <section className="card">
        <p className="muted">이메일로 회원가입 할 수 있어요.</p>
        <form className="form" onSubmit={onSubmit}>
          <div className="field">
            <label className="label" htmlFor="name">이름</label>
            <input className="input" id="name" name="name" value={form.name} onChange={onChange} placeholder="홍길동" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="email">이메일</label>
            <input className="input" id="email" name="email" type="email" value={form.email} onChange={onChange} placeholder="you@example.com" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">비밀번호</label>
            <input className="input" id="password" name="password" type="password" value={form.password} onChange={onChange} placeholder="8자 이상" required />
          </div>
          <button className="btn primary" type="submit" disabled={status.state === "loading"}>제출</button>
        </form>
        {status.state === "success" && <p className="success">{status.message}</p>}
        {status.state === "error" && <p className="error">{status.message}</p>}
      </section>

      <section className="card">
        <p className="muted">이미 계정이 있나요?</p>
        <Link className="btn secondary" href="/login">이메일로 로그인</Link>
      </section>
    </main>
  );
}
