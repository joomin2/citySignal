import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
    try {
        await connectDB(); //db 연결
        return NextResponse.json({ message: "DB 연결 성공" });
    } catch (error) {
        const payload = { message: "DB 연결 실패" };
        if (process.env.NODE_ENV !== 'production') {
            payload.error = error?.message;
            if (error?.code) payload.code = error.code;
        }
        return NextResponse.json(payload, { status: 500 });
    };

}