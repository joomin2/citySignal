// GET /api/dev/seed-signals : insert initial batch of seed signals (dev only)
// 한국어: 초기 시드 제보 다량 삽입(개발 편의용)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import Signal from "@/models/signal";
import { inferSeverityFromText } from "@/lib/aiSeverity";

// GET /api/dev/seed-signals
// One-time seeding of demo signals. Requires auth + ENABLE_DEV_SEED != '0'.
export async function GET() {
  try {
    if (process.env.ENABLE_DEV_SEED === '0') {
      return NextResponse.json({ ok: false, error: 'seed disabled' }, { status: 403 });
    }
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const existing = await Signal.countDocuments();
    if (existing > 0) {
      return NextResponse.json({ ok: false, message: 'already seeded', count: existing });
    }

    const userId = session.user.id; // use current user as owner
    const samples = [
      // 중심 좌표 대략: 탕정면 일대 (36.81 ~ 36.83 / 127.03 ~ 127.08)
      {
        title: '아침 로터리 진입 차량 많음',
        description: '오늘 아침 평소보다 차량 줄이 길어 회전 진입이 1~2회 신호 더 걸립니다. 급차선 변경 주의해주세요.',
        category: 'traffic',
        lat: 36.8192,
        lng: 127.0578,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        level: 3,
        tags: ['traffic','rush','img:https://images.unsplash.com/photo-1533636722234-26d03f6c2552?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '소형 공사장에서 흙먼지 조금 납니다',
        description: '임시 펜스 안 토사 정리 중이라 바람 불 때 미세먼지 약하게 날립니다. 마스크 쓰면 편해요.',
        category: 'environment',
        lat: 36.8234,
        lng: 127.0612,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        tags: ['dust','construction','img:https://images.unsplash.com/photo-1581091215367-8ee91b15a3b9?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '횡단보도 한쪽 물 고여 있어요',
        description: '비 그친 뒤 배수가 덜 되어 발판 한쪽에 물웅덩이 남아 있습니다. 밤에는 잘 안 보여 미끄럼 주의.',
        category: 'road',
        lat: 36.8179,
        lng: 127.0533,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        tags: ['puddle','pedestrian','img:https://images.unsplash.com/photo-1504880486461-1ee9f17a0fb8?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '강풍에 상가 간판 조금 흔들립니다',
        description: '아침부터 돌풍이 간헐적으로 지나가는데 세게 부는 순간 하단 고정 너트 부분이 살짝 들썩이는 모습이 보였습니다. 바로 떨어질 것 같지는 않지만 하루 종일 바람 예보가 있어 오후 전에 한번 점검해 주시면 지나가는 사람들도 안심할 것 같습니다. 지나갈 때는 바로 아래 정차하지 않는 편이 좋아 보여요.',
        category: 'infra',
        lat: 36.8281,
        lng: 127.0489,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        tags: ['wind','sign','주의','img:https://images.unsplash.com/photo-1601944179068-cd02752ed67f?auto=format&fit=crop&w=800&q=80','img:https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '새벽 그늘진 구간 살얼음 조금 남음',
        description: '해 뜨기 직전 기온이 떨어지면서 저지대 그늘진 코너 구간 표면이 살짝 얼어 유리막처럼 반짝였습니다. 8시 이후 햇볕 드는 부분부터 빠르게 녹고 있어 대규모 결빙은 아니지만, 처음 지나가는 차량이 급하게 회전하면 미끄러질 수 있겠습니다. 가능하면 첫 통행 시간대에는 속도를 조금만 더 줄여 주세요.',
        category: 'weather',
        lat: 36.8256,
        lng: 127.0584,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        tags: ['ice','morning','속도감속','img:https://images.unsplash.com/photo-1518081461904-9ac05b68d0af?auto=format&fit=crop&w=800&q=80','img:https://images.unsplash.com/photo-1518893494014-95b4f8d27378?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '농로 작은 포트홀 두 군데 발견',
        description: '비가 여러 번 내린 뒤 아랫쪽 농로에서 지름 20cm 안쪽 얕은 포트홀이 두 군데 생겼습니다. 깊지는 않아 차량 손상 위험은 낮지만 바퀴가 지나갈 때 덜컹거려서 초행 운전자는 놀랄 수 있어요. 해 질 무렵에는 어두워 잘 안 보여 진입 시 속도를 조금 줄이면 좋겠습니다.',
        category: 'road',
        lat: 36.8310,
        lng: 127.0655,
        address: '충청남도 아산시 영인면',
        zone: { key: '충청남도 아산시', sub: '영인면' },
        tags: ['pothole','rural','저속','img:https://images.unsplash.com/photo-1529078155058-5d716f45d604?auto=format&fit=crop&w=800&q=80','img:https://images.unsplash.com/photo-1477414348463-c0eb7f1359b6?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '퇴비 살포 후 옅은 냄새 남아있어요',
        description: '어제 오후 늦게 퇴비를 살짝 뿌린 뒤라 완전히 익지 않은 흙비료 특유의 냄새가 밭 가장자리에서 간간히 납니다. 바람이 도로 쪽으로 불면 순간적으로 진하게 느껴졌다가 곧 약해집니다. 냄새에 예민하신 분들은 산책 동선 조금 우회하시거나 마스크 착용을 권장드려요. 심한 악취 수준은 아닙니다.',
        category: 'environment',
        lat: 36.8144,
        lng: 127.0702,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        tags: ['smell','farm','마스크추천','img:https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80','img:https://images.unsplash.com/photo-1602428294503-1c7d9d6d8f54?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '주차장 출구 좌측 자재 적치로 시야 좁음',
        description: '간이 공사 후 남은 목재와 박스가 주차장 출구 바로 왼쪽 모서리에 무릎 높이 정도로 쌓여 있습니다. 차량이 바로 나올 때 인도에서 다가오는 보행자가 가려져서 초반에 잘 안 보여 0.5m 정도 더 앞으로 나와야 시야가 확보됩니다. 아이들이 뛰어오는 경우 갑작스럽게 마주칠 수 있으니 서행 후 정차 확인 권장합니다.',
        category: 'safety',
        lat: 36.8129,
        lng: 127.0497,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        level: 2,
        tags: ['visibility','parking','서행','img:https://images.unsplash.com/photo-1561131989-b1a4d1b3152f?auto=format&fit=crop&w=800&q=80','img:https://images.unsplash.com/photo-1516110833967-5781abd3a36e?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '등교 시간 버스 승강장 살짝 붐빕니다',
        description: '학생들 줄 서며 뒤쪽 인도 살짝 좁아짐. 급한 분들은 한 블록 앞 정류장 이용도 괜찮아요.',
        category: 'crowd',
        lat: 36.8218,
        lng: 127.0445,
        address: '충청남도 아산시 배방읍',
        zone: { key: '충청남도 아산시', sub: '배방읍' },
        level: 3,
        tags: ['crowd','bus','img:https://images.unsplash.com/photo-1496568816309-51d7c20e14b2?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '교차로 진로 화살표 많이 탈색됨',
        description: '빗물과 마모로 중앙 차선 화살표 흐릿해져 처음 온 운전자는 헷갈릴 수 있습니다.',
        category: 'infra',
        lat: 36.8163,
        lng: 127.0591,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        tags: ['roadmark','paint','img:https://images.unsplash.com/photo-1505236731987-28030026d77d?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '농로 일부 결빙, 미끄러짐 한 건 봄',
        description: '해 뜨기 직전 얕은 얼음 위 지나던 소형차가 살짝 미끄러졌습니다. 오전 9시 이후 거의 녹습니다.',
        category: 'weather',
        lat: 36.8295,
        lng: 127.0542,
        address: '충청남도 아산시 음봉면',
        zone: { key: '충청남도 아산시', sub: '음봉면' },
        level: 4,
        tags: ['ice','rural','img:https://images.unsplash.com/photo-1518893494014-95b4f8d27378?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '야외 행사 음악 조금 크게 들림',
        description: '점심 전 리허설 중이라 볼륨 높습니다. 오후 본 행사는 볼륨 조정 예정이라 안내 받았습니다.',
        category: 'noise',
        lat: 36.8227,
        lng: 127.0660,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        tags: ['music','event','img:https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '기차 지날 때 저층 건물 아주 약한 진동',
        description: '새벽 통과 구간에서 3~4초간 진동 느껴졌지만 구조적 위험은 없어 보입니다.',
        category: 'infra',
        lat: 36.8188,
        lng: 127.0639,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        tags: ['train','vibration','img:https://images.unsplash.com/photo-1509125471300-324b63b6060e?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '비닐 소각 후 잔여 냄새 조금 남아있음',
        description: '어제 저녁 소각된 자리 주변에 옅은 탄 냄새. 바람 방향 바뀌면 빠르게 사라집니다.',
        category: 'safety',
        lat: 36.8264,
        lng: 127.0418,
        address: '충청남도 아산시 배방읍',
        zone: { key: '충청남도 아산시', sub: '배방읍' },
        level: 3,
        tags: ['smoke','smallfire','img:https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '교량 구간 순간 측풍, 이륜차 살짝 흔들림',
        description: '짧은 돌풍이 간헐적으로 불어 헬멧 쓰고 속도만 조금 줄이면 문제 없었습니다.',
        category: 'weather',
        lat: 36.8301,
        lng: 127.0493,
        address: '충청남도 아산시 음봉면',
        zone: { key: '충청남도 아산시', sub: '음봉면' },
        tags: ['wind','bridge','img:https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '비닐하우스 옆 흙먼지 살짝 날림',
        description: '건조한 구간이라 오후 바람에 흙먼지가 잠깐 뜹니다. 눈 조금 따가울 수 있어요.',
        category: 'environment',
        lat: 36.8171,
        lng: 127.0684,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        tags: ['dust','greenhouse','img:https://images.unsplash.com/photo-1524594081293-190a2fe0baae?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '농수로 난간 한쪽 휘어져 있음',
        description: '전체적으로는 튼튼하나 한 구간이 안쪽으로 조금 휘었습니다. 어린이 접근 시 주의 표지 필요해 보입니다.',
        category: 'infra',
        lat: 36.8332,
        lng: 127.0588,
        address: '충청남도 아산시 영인면',
        zone: { key: '충청남도 아산시', sub: '영인면' },
        tags: ['railing','canal','img:https://images.unsplash.com/photo-1516110833967-5781abd3a36e?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '저녁 시간대 비료 냄새 조금 더 강해짐',
        description: '해 지고 기온 내려가니 낮보다 냄새 오래 머뭅니다. 창문 닫아두면 크게 거슬리지 않습니다.',
        category: 'environment',
        lat: 36.8119,
        lng: 127.0626,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        level: 5,
        tags: ['smell','evening','img:https://images.unsplash.com/photo-1602428294503-1c7d9d6d8f54?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '빗물 배수관 물 빠짐 좀 느립니다',
        description: '막힘은 아닌데 유속이 둔해서 비 많이 오면 웅덩이 생길 수 있어 보입니다.',
        category: 'infra',
        lat: 36.8240,
        lng: 127.0522,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        tags: ['drain','water','img:https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=800&q=80']
      },
      {
        title: '도로 가장자리 공구 몇 개 임시로 놓여 있음',
        description: '드릴, 콘 등 모서리에 모여 있어 주간엔 잘 보이지만 야간엔 반사표시 부족합니다.',
        category: 'safety',
        lat: 36.8207,
        lng: 127.0671,
        address: '충청남도 아산시 탕정면',
        zone: { key: '충청남도 아산시', sub: '탕정면' },
        level: 2,
        tags: ['tools','roadside','img:https://images.unsplash.com/photo-1581091870627-3b5f06a0b5b3?auto=format&fit=crop&w=800&q=80']
      },
    ];

    // Prepare docs with AI/heuristic severity where not provided.
    const docs = [];
    for (const s of samples) {
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

    const inserted = await Signal.insertMany(docs);
    return NextResponse.json({ ok: true, inserted: inserted.map(d => d._id), count: inserted.length });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message || 'seed failed' }, { status: 500 });
  }
}
