import { NextResponse } from "next/server";
import path from "path"; // Correct import statement
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  try {
    const data = await req.formData();
    const file = data.get("file");
    if (!file || !file.name) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    const ext = path.extname(file.name);
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Upload error" }, { status: 500 });
  }
}
