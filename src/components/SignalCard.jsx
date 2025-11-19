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
  const lvl = normalizeLevel(signal?.level);
  const source = signal?.source || 'user';
  const badgeClass = lvl >= 5
    ? 'level-extreme'
    : lvl >= 4
      ? 'level-high'
      : lvl === 3
        ? 'level-medium'
        : lvl === 2
          ? 'level-low'
          : 'level-info';
  const title = signal?.title || signal?.location?.address || '신호';
  const href = `/signals/${signal?._id}`;
  const dist = typeof signal?.dist === 'number' ? signal.dist : null;
  const distLabel = dist == null ? null : (dist >= 1000 ? `${(dist / 1000).toFixed(dist >= 9500 ? 0 : 1)}km` : `${Math.round(dist)}m`);
  const sourceLabel = source === 'seed' ? 'Seed' : source === 'ai' ? 'AI' : 'User';
  // Collect all image tags (img:URL). Limit to 3 for layout.
  const imgTags = Array.isArray(signal.tags)
    ? signal.tags.filter(t => typeof t === 'string' && t.startsWith('img:')).slice(0, 3)
    : [];
  const hasGallery = imgTags.length > 0;
  return (
    <article className={`card signal-card level-${lvl}`}>
      <div className="title-row">
        <Link className="title" href={href}>{title}</Link>
        <div className="flex items-center gap-2">
          <span className={`badge risk ${badgeClass}`}>{`위험도 ${lvl}단계`}</span>
          <span className={`badge source source-${source}`}>{sourceLabel}</span>
        </div>
      </div>
      <div className="meta">
        <span className="chip">{signal?.location?.address || '위치 정보'}</span>
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
