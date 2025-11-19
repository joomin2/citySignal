// GET /api/dev/nextauth-users : list NextAuth users (dev only)
// 한국어: NextAuth로 저장된 사용자 계정 목록 조회(개발 환경 전용)
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodbClient";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("citysignal");
    const users = await db.collection("users").countDocuments();
    const accounts = await db.collection("accounts").countDocuments();
    const sessions = await db.collection("sessions").countDocuments();
    return NextResponse.json({ ok: true, users, accounts, sessions });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}
