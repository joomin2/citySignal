import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import Signal from '@/models/signal';

export async function POST(req) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, status } = await req.json();
  if (!id || !['active','resolved'].includes(status)) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const signal = await Signal.findById(id);
  if (!signal) return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
  if (String(signal.userId) !== String(session.user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  signal.status = status;
  await signal.save();
  return NextResponse.json({ ok: true, status } );
}
