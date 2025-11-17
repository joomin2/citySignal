"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SubmitRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/signals/new"); }, [router]);
  return (
    <div className="container">
      <div className="card">
        <h3>이동 중…</h3>
        <p>신규 작성 페이지로 이동합니다.</p>
      </div>
    </div>
  );
}
