import { NextResponse } from "next/server";

// Deprecated: user preferences endpoint removed (push uses simple radius-only)
export async function GET() {
  return NextResponse.json({ error: "prefs endpoint deprecated" }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: "prefs endpoint deprecated" }, { status: 410 });
}
