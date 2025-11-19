// POST /api/signups : anonymous email capture (pre-registration interest)
// 한국어: 익명 관심 등록(향후 가입 알림용 이메일 수집)
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodbClient";

export async function POST(req) {
  try {
    const { name, email } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: "name, email 필요" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("citysignal");
    const now = new Date();

    const result = await db.collection("signups").insertOne({ name, email, createdAt: now });

    return NextResponse.json({ ok: true, id: result.insertedId }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "서버 오류" }, { status: 500 });
  }
}
