"use client";
// 컴포넌트: Providers (앱 전역 컨텍스트 래퍼)
// 렌더링: CSR — NextAuth SessionProvider로 children을 감쌈
// 글로벌 Provider 모음: 세션/테마 등 상위 컨텍스트 주입
// English: wraps app with SessionProvider and future global contexts
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
