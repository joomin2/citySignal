import { NextResponse } from "next/server";

// Deprecated endpoint: voting is disabled in simplified model
export async function POST() {
  return NextResponse.json({ error: "vote endpoint deprecated" }, { status: 410 });
}
