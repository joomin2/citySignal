import { NextResponse } from "next/server";

// Dev-only: check if an env var is loaded (does not reveal full value)
export async function GET(req) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "disabled in production" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") || "KAKAO_REST_API_KEY";
    const val = process.env[key];
    const masked = val ? `${val.slice(0, 4)}...${val.slice(-4)}` : null;
    return NextResponse.json({
      key,
      present: !!val,
      masked,
      length: val ? val.length : 0,
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
