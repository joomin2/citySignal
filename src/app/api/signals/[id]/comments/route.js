import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import Comment from "@/models/comment";

// GET /api/signals/[id]/comments : list comments for a signal
// POST /api/signals/[id]/comments : add a comment (auth required)
// 한국어: 특정 제보의 댓글 조회/작성 엔드포인트

export async function GET(req, { params }) {
  try {
    await connectDB();
    const signalId = params?.id;
    if (!signalId) return NextResponse.json({ error: "id 필요" }, { status: 400 });
    const list = await Comment.find({ signalId }).sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({ ok: true, items: list });
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const signalId = params?.id;
    if (!signalId) return NextResponse.json({ error: "id 필요" }, { status: 400 });
    const { content } = await req.json();
    if (!content || !content.trim()) return NextResponse.json({ error: "content 필요" }, { status: 400 });
    if (content.length > 1000) return NextResponse.json({ error: "최대 1000자" }, { status: 400 });
    const doc = await Comment.create({ signalId, userId: session.user.id, content: content.trim() });
    return NextResponse.json({ ok: true, id: String(doc._id), item: { _id: doc._id, content: doc.content, userId: doc.userId, createdAt: doc.createdAt } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
