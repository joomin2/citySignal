"use client";
// 컴포넌트: Providers (앱 전역 컨텍스트 래퍼)
// 렌더링: CSR — NextAuth SessionProvider로 children을 감쌈
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
