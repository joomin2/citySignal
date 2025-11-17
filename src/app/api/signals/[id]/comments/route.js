import { NextResponse } from "next/server";

// Deprecated: comments feature removed in simplified model
export async function GET() {
  return NextResponse.json({ error: "comments endpoint deprecated" }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: "comments endpoint deprecated" }, { status: 410 });
}
