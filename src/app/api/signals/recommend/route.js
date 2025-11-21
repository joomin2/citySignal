import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Signal from '@/models/signal';

export async function POST(req) {
  await dbConnect();
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'No signal id' }, { status: 400 });
    const signal = await Signal.findById(id);
    if (!signal) return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    signal.recommendCount = (signal.recommendCount ?? 0) + 1;
    await signal.save();
    return NextResponse.json({ ok: true, recommendCount: signal.recommendCount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
