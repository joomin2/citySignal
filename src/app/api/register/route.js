// POST /api/register : create user account (email/password basic flow)
// 한국어: 이메일/패스워드 기반 신규 사용자 등록
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AppUser from "@/models/user";

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "name, email, password 필요" }, { status: 400 });
    }

    await connectDB();

    const exists = await AppUser.findOne({ email });
    if (exists) {
      return NextResponse.json({ error: "이미 존재하는 이메일입니다." }, { status: 409 });
    }

    const { hash } = await import("bcryptjs");
    const passwordHash = await hash(password, 10);

    const user = await AppUser.create({ name, email, passwordHash });

    return NextResponse.json({ ok: true, id: String(user._id) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "서버 오류" }, { status: 500 });
  }
}
