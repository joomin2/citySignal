// GET /api/dev/seed-signals-extra : append additional seed dataset (dev only)
// 한국어: 추가 시드 제보 20건 삽입(기존 제목 중복시 건너뜀)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import Signal from "@/models/signal";
import { inferSeverityFromText } from "@/lib/aiSeverity";

// GET /api/dev/seed-signals-extra
// 추가 시드: 기존 시드 이후 아산시 탕정면 및 인근 20개 더 삽입 (title 중복은 건너뜀)
export async function GET(req) {
  try {
    if (process.env.ENABLE_DEV_SEED === '0') {
      return NextResponse.json({ ok: false, error: 'seed disabled' }, { status: 403 });
    }
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const userId = session.user.id;

    const samples = [
      { title: '저녁 교차로 차량 대기 길어졌어요', description: '퇴근 시간대부터 신호 주기가 살짝 길어진 탓인지 평소 두 줄이던 대기가 세 줄 가까이 느껴집니다. 급정차나 경적은 없고 움직임은 꾸준해 체감 스트레스는 낮지만 처음 오는 분들은 “막혔다”고 느낄 수 있습니다. 한 사이클 더 여유 있게 생각하면 답답함이 덜합니다.', category: 'traffic', lat: 36.8232, lng: 127.0571, address: '충청남도 아산시 탕정면', zone: { key: '충청남도 아산시', sub: '탕정면' }, tags: ['traffic','rush','신호대기','img:https://images.unsplash.com/photo-1533636722234-26d03f6c2552?auto=format&fit=crop&w=800&q=80','img:https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=800&q=80'] },
      { title: '안개 낀 농로 시야 조금 짧습니다', description: '이른 오전 저지대 농로에 옅은 습기 안개가 깔려서 200m 지나면 윤곽이 흐릿합니다. 상향등을 과하게 쓰면 난반사로 오히려 시야가 더 흐려져 속도만 안정적으로 낮추는 편이 낫습니다. 9시 무렵에는 대부분 걷혀 시야가 정상으로 돌아옵니다.', category: 'weather', lat: 36.8248, lng: 127.0617, address: '충청남도 아산시 탕정면', zone: { key: '충청남도 아산시', sub: '탕정면' }, tags: ['fog','visibility','서행권장','img:https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80'] },
      { title: '비 온 뒤 비포장 길 진흙 있어서 미끄러워요', description: '소형차 바퀴 살짝 헛돕니다. 서행 추천합니다.', category: 'road', lat: 36.8197, lng: 127.0643, address: '충청남도 아산시 탕정면', zone: { key: '충청남도 아산시', sub: '탕정면' }, level: 3, tags: ['mud','unpaved','img:https://images.unsplash.com/photo-1501862700950-18382cd41497?auto=format&fit=crop&w=800&q=80'] },
      { title: '야간 공구 정리 소리 조금 납니다', description: '금속 부딪히는 소리 몇 차례 있었지만 길지는 않았습니다.', category: 'noise', lat: 36.8175, lng: 127.0689, address: '충청남도 아산시 탕정면', zone: { key: '충청남도 아산시', sub: '탕정면' }, tags: ['metal','night','img:https://images.unsplash.com/photo-1532635240-8febc658e47a?auto=format&fit=crop&w=800&q=80'] },
      { title: '쓰레기 수거 조금 늦어 포대 몇 개 남음', description: '악취 심하지 않고 곧 치울 예정이라 들었습니다.', category: 'environment', lat: 36.8291, lng: 127.0465, address: '충청남도 아산시 배방읍', zone: { key: '충청남도 아산시', sub: '배방읍' }, tags: ['trash','delay','img:https://images.unsplash.com/photo-1505196295920-05db1a6a281b?auto=format&fit=crop&w=800&q=80'] },
      { title: '교량 표면 잔금 있지만 구조 위험은 낮아 보여요', description: '표면 균열 여러 개 있으나 깊지 않습니다.', category: 'infra', lat: 36.8334, lng: 127.0519, address: '충청남도 아산시 음봉면', zone: { key: '충청남도 아산시', sub: '음봉면' }, tags: ['bridge','crack','img:https://images.unsplash.com/photo-1517957811804-4e9e43b9a4ee?auto=format&fit=crop&w=800&q=80'] },
      { title: '최근 또 같은 자리 물웅덩이 생겼어요', description: '배수가 더디니 큰비 오면 재확인 필요합니다.', category: 'road', lat: 36.8226, lng: 127.0552, address: '충청남도 아산시 탕정면', zone: { key: '충청남도 아산시', sub: '탕정면' }, tags: ['puddle','repeat','img:https://images.unsplash.com/photo-1474557157379-8aa74a6ef541?auto=format&fit=crop&w=800&q=80'] },
      { title: '밤 10시 넘어 공사 소음 조금 들립니다', description: '지속되면 민원 나올 수 있어 보입니다.', category: 'noise', lat: 36.8268, lng: 127.0432, address: '충청남도 아산시 배방읍', zone: { key: '충청남도 아산시', sub: '배방읍' }, level: 2, tags: ['construction','night','img:https://images.unsplash.com/photo-1580674280839-af6a273907c1?auto=format&fit=crop&w=800&q=80'] },
      { title: '상가 간판 LED 약하게 깜박여요', description: '눈 조금 피로할 수 있어 교체 필요해 보입니다.', category: 'infra', lat: 36.8182, lng: 127.0604, address: '충청남도 아산시 탕정면', zone: { key: '충청남도 아산시', sub: '탕정면' }, tags: ['sign','led','img:https://images.unsplash.com/photo-1603570419989-5f8a7946affd?auto=format&fit=crop&w=800&q=80'] },
      { title: '저녁에 농작물 소각 냄새 조금 납니다', description: '연기 옅어서 시야 영향은 거의 없습니다.', category: 'environment', lat: 36.8156, lng: 127.0667, address: '충청남도 아산시 탕정면', zone: { key: '충청남도 아산시', sub: '탕정면' }, level: 2, tags: ['smoke','burn','img:https://images.unsplash.com/photo-1580674280839-af6a273907c1?auto=format&fit=crop&w=800&q=80'] },
      { title: '새벽 그늘진 구간 얼음 아직 조금 남음', description: '해 뜨면 빠르게 녹을 것 같습니다.', category: 'weather', lat: 36.8323, lng: 127.0568, address: '충청남도 아산시 영인면', zone: { key: '충청남도 아산시', sub: '영인면' }, level: 3, tags: ['ice','morning','img:https://images.unsplash.com/photo-1518081461904-9ac05b68d0af?auto=format&fit=crop&w=800&q=80'] },
      { title: '편도 통제 작업 중 신호수 안 보여요', description: '차량 서행하면 충돌 위험은 낮아 보입니다.', category: 'safety', lat: 36.8203, lng: 127.0479, address: '충청남도 아산시 배방읍', zone: { key: '충청남도 아산시', sub: '배방읍' }, level: 3, tags: ['control','lane','img:https://images.unsplash.com/photo-1603573355717-22c9b5dcaa95?auto=format&fit=crop&w=800&q=80'] },
      { title: '비탈면에서 소량 토사가 내려왔습니다', description: '삽으로 금방 치울 수 있는 정도입니다.', category: 'safety', lat: 36.8239, lng: 127.0683, address: '충청남도 아산시 탕정면', zone: { key: '충청남도 아산시', sub: '탕정면' }, tags: ['soil','slope','img:https://images.unsplash.com/photo-1477414348463-c0eb7f1359b6?auto=format&fit=crop&w=800&q=80'] },
      { title: '통신 케이블 한 줄 아래로 늘어져 있어요', description: '보행 동선 크게 방해하진 않습니다.', category: 'infra', lat: 36.8173, lng: 127.0516, address: '충청남도 아산시 탕정면', zone: { key: '충청남도 아산시', sub: '탕정면' }, tags: ['cable','droop','img:https://images.unsplash.com/photo-1516110833967-5781abd3a36e?auto=format&fit=crop&w=800&q=80'] },
      { title: '보도에 반려동물 배설물 몇 개 남아있어요', description: '15m 구간에 3개 정도 보여서 주의 필요합니다.', category: 'environment', lat: 36.8259, lng: 127.0596, address: '충청남도 아산시 탕정면', zone: { key: '충청남도 아산시', sub: '탕정면' }, tags: ['pet','waste','img:https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'] },
      { title: '농수로 물 흐름 조금 느려 냄새 날 수 있어요', description: '아직 악취는 심하지 않습니다.', category: 'environment', lat: 36.8195, lng: 127.0621, address: '충청남도 아산시 탕정면', zone: { key: '충청남도 아산시', sub: '탕정면' }, tags: ['canal','flow','img:https://images.unsplash.com/photo-1516110833967-5781abd3a36e?auto=format&fit=crop&w=800&q=80'] },
      { title: '임시 가드레일 한쪽 볼트 빠져 있습니다', description: '차도 진입 위험은 낮지만 조여주면 좋겠습니다.', category: 'infra', lat: 36.8287, lng: 127.0507, address: '충청남도 아산시 음봉면', zone: { key: '충청남도 아산시', sub: '음봉면' }, tags: ['guardrail','bolt','img:https://images.unsplash.com/photo-1517957811804-4e9e43b9a4ee?auto=format&fit=crop&w=800&q=80'] },
      { title: '가로등 4개 중 1개 불 안 들어와요', description: '밤길 약간 어둡지만 크게 위험하진 않습니다.', category: 'infra', lat: 36.8211, lng: 127.0635, address: '충청남도 아산시 탕정면', zone: { key: '충청남도 아산시', sub: '탕정면' }, tags: ['streetlight','dark','img:https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80'] },
      { title: '농기계 도로 많이 지나가 속도 조금 느립니다', description: '출퇴근 차량이랑 섞여 흐름 둔해졌습니다.', category: 'traffic', lat: 36.8304, lng: 127.0481, address: '충청남도 아산시 음봉면', zone: { key: '충청남도 아산시', sub: '음봉면' }, level: 2, tags: ['tractor','slow','img:https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=800&q=80'] },
      { title: '재활용함에 일반 쓰레기 조금 섞여 있습니다', description: '분리 수거 표시 더 크면 좋겠습니다.', category: 'environment', lat: 36.8164, lng: 127.0582, address: '충청남도 아산시 탕정면', zone: { key: '충청남도 아산시', sub: '탕정면' }, tags: ['recycle','waste','img:https://images.unsplash.com/photo-1505196295920-05db1a6a281b?auto=format&fit=crop&w=800&q=80'] },
    ];

    const existingTitles = new Set(
      (await Signal.find({ title: { $in: samples.map(s => s.title) } }).select('title').lean()).map(d => d.title)
    );

    const docs = [];
    for (const s of samples) {
      if (existingTitles.has(s.title)) continue; // 중복 건너뜀
      const lvl = Number.isFinite(Number(s.level)) ? Number(s.level) : await inferSeverityFromText(`${s.title}\n${s.description || ''}`);
      docs.push({
        userId,
        title: s.title.trim(),
        description: s.description.trim(),
        level: lvl,
        category: s.category,
        location: { lat: s.lat, lng: s.lng, address: s.address },
        geo: { type: 'Point', coordinates: [s.lng, s.lat] },
        zone: s.zone,
        status: 'active',
        source: 'seed',
      });
    }

    if (!docs.length) {
      return NextResponse.json({ ok: false, message: 'no new inserts (all titles existed)' });
    }
    const inserted = await Signal.insertMany(docs);
    return NextResponse.json({ ok: true, appended: inserted.length, ids: inserted.map(d=>d._id) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message || 'seed extra failed' }, { status: 500 });
  }
}
