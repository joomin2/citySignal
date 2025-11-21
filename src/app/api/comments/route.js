// /api/comments
// GET: list comments for a signal (threaded or flat)
// POST: create comment or reply
// Query params:
//   signalId (required for GET)
//   mode=thread | flat (default: thread groups by parentId)
// POST body:
//   { signalId, content, parentId? }
// Depth limited to 5.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import Comment from '@/models/comment';
import Signal from '@/models/signal';

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const signalId = searchParams.get('signalId');
    if (!signalId) return NextResponse.json({ error: 'signalId required' }, { status: 400 });
    const mode = (searchParams.get('mode') || 'thread').toLowerCase();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 100), 1), 500);
    // Fetch all comments for signal limited by latest first
    const list = await Comment.find({ signalId }).sort({ createdAt: 1 }).limit(limit).lean();
    if (mode === 'flat') {
      return NextResponse.json({ items: list });
    }
    // Thread mode: group by parentId; root comments first, each with children array
    const byParent = new Map();
    list.forEach(c => {
      const p = c.parentId ? String(c.parentId) : 'root';
      if (!byParent.has(p)) byParent.set(p, []);
      byParent.get(p).push(c);
    });
    const roots = byParent.get('root') || [];
    const build = (node) => {
      const id = String(node._id);
      const children = (byParent.get(id) || []).map(build);
      return { ...node, children };
    };
    const threaded = roots.map(build);
    return NextResponse.json({ items: threaded, count: list.length });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(()=>({}));
    const { signalId, content, parentId } = body;
    if (!signalId || !content || !String(content).trim()) {
      return NextResponse.json({ error: 'signalId and content required' }, { status: 400 });
    }
    // Validate signal exists
    const sig = await Signal.findById(signalId).select('_id').lean();
    if (!sig) return NextResponse.json({ error: 'signal not found' }, { status: 404 });
    let ancestors = [];
    let depth = 0;
    if (parentId) {
      const parent = await Comment.findById(parentId).select('ancestors depth').lean();
      if (!parent) return NextResponse.json({ error: 'parent not found' }, { status: 404 });
      depth = (parent.depth || 0) + 1;
      if (depth > 5) return NextResponse.json({ error: 'max depth 5' }, { status: 400 });
      ancestors = [...(parent.ancestors || []), parentId];
    }
    const doc = await Comment.create({
      signalId,
      userId: session.user.id,
      content: String(content).trim(),
      parentId: parentId || null,
      depth,
      ancestors,
    });
    return NextResponse.json({ ok: true, id: doc._id });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'server error' }, { status: 500 });
  }
}
