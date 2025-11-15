import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AppUser from "@/models/user";

export async function GET() {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "disabled in production" }, { status: 403 });
    }

    await connectDB();
    const users = await AppUser.find({}, { name: 1, email: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const count = await AppUser.countDocuments();
    return NextResponse.json({ count, users });
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
