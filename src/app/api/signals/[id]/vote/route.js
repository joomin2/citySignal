import { NextResponse } from "next/server";
// 투표 기능 비활성화: 엔드포인트 제거
export async function POST() {
  return NextResponse.json({ error: "vote disabled" }, { status: 410 });
}
