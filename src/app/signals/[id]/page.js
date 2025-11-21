
"use client";
// ...existing code...
import React from 'react';
import { notFound } from 'next/navigation';
import SignalCard from '@/components/SignalCard';

async function fetchComments(signalId) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/comments?signalId=${signalId}`);
  const { items } = await res.json();
  return items || [];
}

function getExampleComments(signalId) {
  // 예시 댓글 5개, 임시 사용자
  const users = [
    { name: '철수', id: 'user1' },
    { name: '영희', id: 'user2' },
    { name: '민준', id: 'user3' },
    { name: '서연', id: 'user4' },
    { name: '지후', id: 'user5' },
  ];
  const texts = [
    '현장 지나왔는데, 표시해주신 위치가 정확했어요. 감사합니다!',
    '방금도 차량이 좀 빠르게 지나가요. 야간에는 더 조심하세요.',
    '관리 요청 접수됐다고 들었어요. 해결되면 업데이트 부탁드려요.',
    '근처 주민입니다. 우회로 이용하면 조금 더 안전합니다.',
    '비 올 때 미끄러우니 속도 줄이세요. 안전운전!',
  ];
  // 대댓글 예시
  const replies = [
    [
      { user: users[1], content: '저도 현장 확인했어요. 정말 정확합니다!', createdAt: new Date(Date.now() - 3500*1000).toISOString() },
      { user: users[2], content: '정보 공유 감사합니다!', createdAt: new Date(Date.now() - 3400*1000).toISOString() },
    ],
    [
      { user: users[3], content: '야간에 특히 위험하니 조심하세요.', createdAt: new Date(Date.now() - 3300*1000).toISOString() },
    ],
    [],
    [
      { user: users[0], content: '우회로 정보 고마워요!', createdAt: new Date(Date.now() - 3200*1000).toISOString() },
    ],
    [],
  ];
  return texts.map((text, i) => ({
    _id: `ex-${signalId}-${i}`,
    user: users[i % users.length],
    content: text,
    createdAt: new Date(Date.now() - (i+1)*3600*1000).toISOString(),
    replies: replies[i].map((r, j) => ({
      _id: `ex-${signalId}-${i}-r${j}`,
      user: r.user,
      content: r.content,
      createdAt: r.createdAt,
    }))
  }));
}


// ...기존 코드 유지...
// 페이지: 위험 제보 상세
// 렌더링: CSR — URL 파라미터를 읽어 단건 제보 조회
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import BottomNav from "@/components/BottomNav.jsx";
import Link from "next/link";

export default function SignalDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const [sig, setSig] = useState(null);
  const [id, setId] = useState(null);
  const [msg, setMsg] = useState("");
  const [comments, setComments] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [cText, setCText] = useState("");
  const [cSending, setCSending] = useState(false);
  const maxLen = 1000;

  useEffect(() => {
    const paramId = params?.id;
    if (!paramId) return;
    (async () => {
      const sres = await fetch(`/api/signals?by=id&id=${paramId}`);
      const sl = await sres.json();
      if (!sres.ok) return;
      // 호환: {items:[...]} 또는 {item:{...}} 모두 지원
      const item = Array.isArray(sl.items) ? sl.items[0] : sl.item;
      setSig(item || null);
      setId(item?._id || paramId);
      // 댓글 불러오기
      try {
        const cres = await fetch(`/api/signals/${item?._id || paramId}/comments`);
        const cj = await cres.json();
        if (cj?.items) {
          setComments(cj.items);
          // 작성자 이름 매핑
          const ids = Array.from(new Set(cj.items.map(c=>c.userId)));
          if (ids.length) {
            const ures = await fetch(`/api/users?ids=${ids.join(",")}`);
            const uj = await ures.json();
            if (uj?.items) {
              const map = {};
              uj.items.forEach(u => { map[u._id] = u.name; });
              setUserMap(map);
            }
          }
        }
      } catch {}
    })();
  }, [params]);

  // 추천 기능 완전 제거

  const submitComment = async () => {
    if (!cText.trim()) return;
    if (!sig || !sig._id) {
      alert('신호 정보가 로딩되지 않았습니다.');
      return;
    }
    setCSending(true);
    try {
      const res = await fetch(`/api/signals/${sig._id}/comments`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: cText }) });
      const js = await res.json();
      if (res.ok && js?.item) {
        setComments([js.item, ...comments]);
        setCText("");
      } else {
        alert(js.error || '댓글 등록 실패');
      }
    } catch (e) {
      alert('댓글 등록 오류');
    } finally {
      setCSending(false);
    }
  };

  if (!sig) return (
    <div className="page">
      {/* 상단 유리감 톱바 */}
      <div className="topbar">
        <div className="bar">
          <Link href="/signals" className="btn secondary" style={{ textDecoration: "none" }}>← 피드</Link>
          <span style={{ opacity:.6, fontSize:12 }}>불러오는 중…</span>
        </div>
      </div>
      <div className="container">
        <section className="card">
          <p>불러오는 중…</p>
          {session && session.user && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#666' }}>
              <b>로그인 세션 정보</b><br />
              이름: {session.user.name || '이름 없음'}<br />
              이메일: {session.user.email || '이메일 없음'}
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  );

  const normalizeLevel = (v) => {
    if (v == null) return 1;
    if (typeof v === 'number') return Math.min(5, Math.max(1, v));
    const t = String(v).toLowerCase();
    if (t === 'high') return 4;
    if (t === 'medium') return 3;
    if (t === 'low') return 2;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 1;
  };
  const lvl = normalizeLevel(sig.level);
  const badgeClass = `${lvl >= 4 ? "level-high" : lvl === 3 ? "level-medium" : "level-low"} level-${lvl}`;

  const onShare = async () => {
    try {
      const shareData = {
        title: sig.title || "CitySignal",
        text: `${sig.title || "위험 제보"} · 위험도 ${lvl}단계`,
        url: typeof window !== 'undefined' ? window.location.href : `/signals/${sig._id}`,
      };
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        alert("링크가 복사되었습니다");
      }
    } catch {}
  };
  const mapHref = sig?.location?.lat && sig?.location?.lng
    ? `/map?lat=${encodeURIComponent(sig.location.lat)}&lng=${encodeURIComponent(sig.location.lng)}&id=${encodeURIComponent(String(sig._id))}`
    : `/map?id=${encodeURIComponent(String(sig._id))}`;
  return (
    <div className="page">
      {/* 상단 유리감 톱바 */}
      <div className="topbar">
        <div className="bar">
          <Link href="/signals" className="btn secondary" style={{ textDecoration: "none" }}>← 피드</Link>
          <div style={{ display:'flex', gap:8 }}>
            <Link href={mapHref} className="btn secondary" style={{ textDecoration: "none", padding: '.6rem .9rem' }}>지도에서 보기</Link>
            <button className="btn ghost" onClick={onShare} style={{ padding: '.6rem .9rem' }}>공유</button>
          </div>
        </div>
      </div>

      {/* 히어로 카드: 제목/레벨/주소 요약 */}
      <div className="container">
        <div className="hero card" style={{ marginTop: 8 }}>
          <div className="title-row" style={{ alignItems:'flex-start' }}>
            <div>
              <div className="hero-title" style={{ fontSize: '1.35rem' }}>{sig.title}</div>
              <div className="meta" style={{ marginTop: 6 }}>
                <span className="chip">{sig.location?.address}{sig.zone?.sub ? ` (${sig.zone.sub})` : ''}</span>
              </div>
            </div>
            <span className={`badge ${badgeClass}`}>{`위험도 ${lvl}단계`}</span>
          </div>
        </div>

        {/* 상세 설명 + 이미지 갤러리 (모든 img:) */}
        <section className="card">
          <p style={{ whiteSpace:'pre-line', lineHeight:'1.5' }}>{sig.description || "설명 없음"}</p>
          {Array.isArray(sig.tags) && sig.tags.filter(t=>t.startsWith('img:')).length > 0 && (
            <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))' }}>
              {sig.tags.filter(t=>t.startsWith('img:')).slice(0,6).map((tag,i)=> {
                const url = tag.slice(4);
                return (
                  <div key={tag+i} className="rounded-md overflow-hidden">
                    <img src={url} alt={sig.title + ' 이미지 ' + (i+1)} loading="lazy" style={{ width:'100%', height:120, objectFit:'cover', display:'block' }} />
                  </div>
                );
              })}
            </div>
          )}
          {msg && <>
            <div className="divider" />
            <p className="error">{msg}</p>
          </>}
        </section>

        {/* 댓글 기능 제거됨 */}
      </div>
      <BottomNav />
    </div>
  );
}
