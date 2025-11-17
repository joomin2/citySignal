"use client";
// 컴포넌트: SignalCard (위험 제보 카드)
// 렌더링: CSR — 라우팅 링크와 배지/주소 칩을 카드 형식으로 표시
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
  const badgeClass = `${lvl >= 4 ? "level-high" : lvl === 3 ? "level-medium" : "level-low"} level-${lvl}`;
  const title = signal?.title || signal?.location?.address || "신호";
  const href = `/signals/${signal?._id}`;
  const dist = typeof signal?.dist === 'number' ? signal.dist : null;
  const distLabel = dist == null ? null : (dist >= 1000 ? `${(dist/1000).toFixed(dist>=9500?0:1)}km` : `${Math.round(dist)}m`);
  return (
    <article className="card signal-card">
      <div className="title-row">
        <Link className="title" href={href}>{title}</Link>
        <span className={`badge ${badgeClass}`}>{`위험도 ${lvl}단계`}</span>
      </div>
      <div className="meta">
        <span className="chip">{signal?.location?.address || "위치 정보"}</span>
        {distLabel && <span className="chip chip-strong">{distLabel}</span>}
      </div>
    </article>
  );
}
