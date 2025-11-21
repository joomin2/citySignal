// POST /api/dev/seed-comments
// 개발 전용: 샘플 사용자 + 신호 + 댓글/대댓글 시드
// Body 옵션: {
//   users: 3, signals: 2, rootPerSignal: 3, repliesPerRoot: 2
// }
// 이미 존재하면 중복 생성 최소화. production 차단.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AppUser from '@/models/user';
import Signal from '@/models/signal';
import Comment from '@/models/comment';

function randPick(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

export async function POST(req) { // Removing duplicate POST function
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    await connectDB();
    // 최근 게시물 5개(시드/사용자 구분 없이), 가장 최신 순
    const signals = await Signal.find({}).sort({ createdAt: -1 }).limit(5).lean();
    // 샘플 사용자 확보 (없으면 생성)
    let users = await AppUser.find().limit(5).lean();
    if (users.length < 5) {
      const names = ['철수','영희','민준','서연','지후'];
      const docs = Array.from({ length: 5-users.length }).map((_,i)=>({
        name: names[i],
        email: `sample${Date.now()}_${i}@local.dev`,
        role: 'user'
      }));
      const inserted = await AppUser.insertMany(docs);
      users = [...users, ...inserted.map(d=>d.toObject())];
    }
    // 댓글/대댓글 예시
    const exampleTexts = [
      '현장 지나왔는데, 표시해주신 위치가 정확했어요. 감사합니다!',
      '방금도 차량이 좀 빠르게 지나가요. 야간에는 더 조심하세요.',
      '관리 요청 접수됐다고 들었어요. 해결되면 업데이트 부탁드려요.',
      '근처 주민입니다. 우회로 이용하면 조금 더 안전합니다.',
      '비 올 때 미끄러우니 속도 줄이세요. 안전운전!',
    ];
    const exampleReplies = [
      [
        '저도 현장 확인했어요. 정말 정확합니다!',
        '정보 공유 감사합니다!'
      ],
      [
        '야간에 특히 위험하니 조심하세요.'
      ],
      [],
      [
        '우회로 정보 고마워요!'
      ],
      [],
    ];
    let created = 0;
    for (const sig of signals) {
      for (let i = 0; i < exampleTexts.length; i++) {
        const root = await Comment.create({
          signalId: sig._id,
          userId: users[i % users.length]._id,
          content: exampleTexts[i],
          depth: 0,
          ancestors: []
        });
        created++;
        for (let j = 0; j < exampleReplies[i].length; j++) {
          await Comment.create({
            signalId: sig._id,
            userId: users[(i+j+1) % users.length]._id,
            content: exampleReplies[i][j],
            parentId: root._id,
            depth: 1,
            ancestors: [root._id]
          });
          created++;
        }
      }
    }
    return NextResponse.json({ ok: true, signals: signals.length, commentsCreated: created });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'server error' }, { status: 500 });
  }
}
