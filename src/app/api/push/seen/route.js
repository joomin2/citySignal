import { NextResponse } from "next/server";

// Deprecated: notification seen endpoint removed with simplified model
export async function POST() {
  return NextResponse.json({ error: "seen endpoint deprecated" }, { status: 410 });
}
