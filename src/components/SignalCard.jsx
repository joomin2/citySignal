"use client";
// 컴포넌트: SignalCard (위험 제보 카드)
// 렌더링: CSR — 라우팅 링크와 배지/주소 칩을 카드 형식으로 표시
// 개별 제보 카드: 위험도/출처/주소 등 표시
// English: single signal card showing severity, source badge, location
import Link from "next/link";

function normalizeLevel(v) {
  if (v == null) return 1;
  if (typeof v === "number") return Math.min(5, Math.max(1, v));
  const t = String(v).toLowerCase();
  if (t === "high") return 4; // 과거 호환
  if (t === "medium") return 3;
  if (t === "low") return 2;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 1;
}

export default function SignalCard({ signal }) {
    function handleRecommend(e) {
      e.stopPropagation();
      alert("추천 기능은 준비 중입니다.");
    }
  const lvl = normalizeLevel(signal?.level);
  const source = signal?.source || 'user';
  const badgeClass = `level-${lvl}`;
  const title = signal?.title || signal?.location?.address || '신호';
  const href = `/signals/${signal?._id}`;
  const dist = typeof signal?.dist === 'number' ? signal.dist : null;
  const distLabel = dist == null ? null : (dist >= 1000 ? `${(dist / 1000).toFixed(dist >= 9500 ? 0 : 1)}km` : `${Math.round(dist)}m`);
  const sourceLabel = source === 'seed' ? 'Seed' : source === 'ai' ? 'AI' : 'User';
  const imgTags = Array.isArray(signal.tags)
    ? signal.tags.filter(t => typeof t === 'string' && t.startsWith('img:')).slice(0, 3)
    : [];
  const hasGallery = imgTags.length > 0;
  // 작성자 이름 마스킹
  function maskName(name, email) {
    if (name && typeof name === 'string' && name.trim()) {
      const n = name.trim();
      return n.length > 1 ? n[0] + '**' : n[0] + '**';
    }
    // 이메일 마스킹: joominuniv@gmail.com → j**
    if (email && typeof email === 'string') {
      const id = email.split('@')[0];
      return id.length > 1 ? id[0] + '**' : id[0] + '**';
    }
    return 'U**';
  }
  // signal.name: 닉네임, signal.email: 이메일
  const author = maskName(signal.name, signal.email);
  // 주소 + 동(읍/면/동/리) 표시
    // 주소 포맷: 시 면 리 (우편번호)
    let address = signal?.location?.address || '';
    let postal = '';
    // 주소에서 우편번호 추출 (예: '아산시 매곡리 (31464)')
    if (address && address.match(/\(\d{5}\)/)) {
      postal = address.match(/\((\d{5})\)/)[1];
      address = address.replace(/\s*\(\d{5}\)/, '');
    }
    // zone/sub 정보 별도 칩으로 표시
  return (
    <article className={`card signal-card level-${lvl}`}>
      <div className="title-row">
        <Link className="title" href={href}>{title}</Link>
        <div className="flex items-center gap-2">
          <span className={`badge risk ${badgeClass}`}>{`위험도 ${lvl}단계`}</span>
          <span className={`badge source source-${source}`}>{sourceLabel}</span>
          {/* 작성자 이름 표시 */}
          <span className="badge author" style={{ background:'#eee', color:'#555', fontWeight:500 }}>{author}</span>
        </div>
      </div>
      <div className="meta" style={{marginTop:8}}>
        <span className="chip" style={{marginLeft:4}}>{address || '위치 정보'}</span>
        {postal && <span className="chip chip-strong">{postal}</span>}
        {signal?.zone?.key && <span className="badge level-2">{signal.zone.key}</span>}
        {signal?.zone?.sub && <span className="badge level-2">{signal.zone.sub}</span>}
        {distLabel && <span className="chip chip-strong">{distLabel}</span>}
        {hasGallery && (
          <div className={`mt-2 grid gap-2 ${imgTags.length === 1 ? '' : 'grid-cols-2'}`}>
            {imgTags.map((tag, i) => {
              const url = tag.slice(4);
              return (
                <div key={tag + i} className="rounded-md overflow-hidden">
                  <img src={url} alt={title + ' 이미지 ' + (i+1)} loading="lazy" style={{ width:'100%', display:'block', objectFit:'cover', maxHeight: imgTags.length === 1 ? 200 : 140 }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
