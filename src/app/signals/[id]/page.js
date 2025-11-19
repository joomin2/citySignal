"use client";
// 페이지: 위험 제보 상세
// 렌더링: CSR — URL 파라미터를 읽어 단건 제보 조회
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BottomNav from "@/components/BottomNav.jsx";
import Link from "next/link";

export default function SignalDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [sig, setSig] = useState(null);
  const [msg, setMsg] = useState("");
  const [comments, setComments] = useState([]);
  const [cText, setCText] = useState("");
  const [cSending, setCSending] = useState(false);
  const maxLen = 1000;

  useEffect(() => {
    if (!id) return;
    (async () => {
      const sres = await fetch(`/api/signals?by=id&id=${id}`);
      const sl = await sres.json();
      if (!sres.ok) return;
      // 호환: {items:[...]} 또는 {item:{...}} 모두 지원
      const item = Array.isArray(sl.items) ? sl.items[0] : sl.item;
      setSig(item || null);
      // 댓글 불러오기
      try {
        const cres = await fetch(`/api/signals/${id}/comments`);
        const cj = await cres.json();
        if (cj?.items) setComments(cj.items);
      } catch {}
    })();
  }, [id]);

  const vote = async () => setMsg("추천 기능은 비활성화됨");

  const submitComment = async () => {
    if (!cText.trim()) return;
    setCSending(true);
    try {
      const res = await fetch(`/api/signals/${id}/comments`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: cText }) });
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
        <section className="card"><p>불러오는 중…</p></section>
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
                <span className="chip">{sig.location?.address}</span>
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

        {/* 댓글 섹션 */}
        <section className="card" style={{ marginTop:12 }}>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>댓글</h3>
          <div className="flex gap-2 mb-2">
            <textarea
              value={cText}
              onChange={e=>setCText(e.target.value)}
              placeholder="의견을 남겨주세요"
              rows={2}
              style={{ flex:1, resize:'vertical' }}
              maxLength={maxLen}
            />
            <button disabled={cSending || !cText.trim()} onClick={submitComment} className="btn" style={{ alignSelf:'flex-start' }}>{cSending? '등록중…':'등록'}</button>
          </div>
          <div className="mb-3" style={{ textAlign:'right', fontSize:12, opacity:.6 }}>{cText.length}/{maxLen}</div>
          {comments.length === 0 && <p className="text-sm" style={{ opacity:.7 }}>아직 댓글이 없습니다.</p>}
          <ul className="space-y-3" style={{ listStyle:'none', padding:0, margin:0 }}>
            {comments.map(c => (
              <li key={c._id} className="rounded-md bg-zinc-50 dark:bg-zinc-800/50 p-2 border border-zinc-200 dark:border-zinc-700">
                <div style={{ fontSize:12, opacity:.6 }}>{new Date(c.createdAt).toLocaleString()}</div>
                <div style={{ marginTop:4, fontSize:13, lineHeight:'1.3' }}>{c.content}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
