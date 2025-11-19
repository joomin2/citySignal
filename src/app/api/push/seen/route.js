// POST /api/push/seen : client acknowledges receipt of a push notification
// 한국어: 클라이언트가 특정 푸시 알림 수신/확인했음을 서버에 표시 (현재 사용 중지)
import { NextResponse } from "next/server";

// Deprecated: notification seen endpoint removed with simplified model
// 한국어: 단순화된 모델로 인해 더 이상 사용되지 않는 엔드포인트
export async function POST() {
  return NextResponse.json({ error: "seen endpoint deprecated" }, { status: 410 });
}
