"use client";
// 컴포넌트: UserGreeting (사용자 인사말)
// 렌더링: CSR — NextAuth 세션 상태에 의존
import { useSession } from "next-auth/react";

export default function UserGreeting() {
  const { data: session, status } = useSession();
  
  if (status === "loading") return null;
  if (!session) return null;

  // 사용자 이름 또는 이메일 추출
  const userName = session.user?.name || session.user?.email?.split('@')[0] || '사용자';

  return (
    <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-100 dark:border-blue-800">
      <p className="text-sm text-blue-900 dark:text-blue-100">
        <span className="font-medium">안녕하세요, {userName}님!</span> 
        <span className="ml-2 text-blue-600 dark:text-blue-300">오늘도 안전한 하루 되세요 👋</span>
      </p>
    </div>
  );
}
