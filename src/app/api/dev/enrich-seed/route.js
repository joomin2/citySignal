import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import Signal from "@/models/signal";

/**
 * GET /api/dev/enrich-seed
 * 시드(source='seed') 문서의 설명/태그를 사람이 읽기 좋은 확장 버전으로 갱신
 * 안전장치: ENABLE_DEV_SEED != '0' & production 차단
 * 업데이트 규칙:
 *  - 이미 길이 220자 이상인 description은 건너뜀
 *  - tags 내 기존 img: 유지 + 1개 추가 가능(중복 제외)
 */
export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'disabled in production' }, { status: 403 });
    }
    if (process.env.ENABLE_DEV_SEED === '0') {
      return NextResponse.json({ error: 'seed enrich disabled' }, { status: 403 });
    }
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const seeds = await Signal.find({ source: 'seed' }).select('_id description tags title').lean();
    const updates = [];
    for (const s of seeds) {
      const desc = s.description || '';
      if (desc.length >= 220) continue; // 이미 충분히 확장됨
      const extended = desc + '\n\n추가 참고: 주변 통행 상황을 조금 더 관찰했을 때 큰 위험 징후는 없지만 초기 반응이 늦을 수 있으니 서행과 주변 확인을 권장드립니다.';
      const tags = Array.isArray(s.tags) ? [...s.tags] : [];
      const hasSecond = tags.filter(t => t.startsWith('img:')).length >= 2;
      if (!hasSecond) {
        // 예비 이미지 URL (Unsplash placeholder)
        const fallback = 'img:https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80';
        if (!tags.includes(fallback)) tags.push(fallback);
      }
      updates.push({ id: s._id, update: { description: extended, tags } });
    }
    for (const u of updates) {
      await Signal.updateOne({ _id: u.id }, u.update);
    }
    return NextResponse.json({ ok: true, processed: seeds.length, updated: updates.length });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'enrich failed' }, { status: 500 });
  }
}