"use client";
// 반경 조절 다이얼: km 값 증가/감소 제어
// English: interactive dial to adjust radiusKm value
// Component: RadiusDial (circular value selector)
// Props: value (number), onChange(number), min, max, step
// Implementation: segmented ring you can click/drag to set radius.
import { useCallback, useMemo, useRef, useState } from 'react';

export default function RadiusDial({ value, onChange, min=0.5, max=10, step=0.5, size=140 }) {
  const steps = useMemo(() => Math.round((max - min) / step) + 1, [max, min, step]);
  const percent = (value - min) / (max - min);
  const activeSegments = Math.round(percent * (steps - 1)) + 1;
  const center = size / 2;
  const radius = (size / 2) - 18;
  const segAngle = 270 / steps; // use 270deg arc (-135 to 135)
  const startAngle = -135; // degrees
  const [dragging, setDragging] = useState(false);
  const ref = useRef(null);

  const angleToValue = useCallback((angle) => {
    let a = angle - startAngle;
    if (a < 0) a = 0; if (a > 270) a = 270;
    const ratio = a / 270;
    const raw = min + ratio * (max - min);
    // snap to step
    const snapped = Math.round((raw - min) / step) * step + min;
    const clamped = Math.min(max, Math.max(min, Number(snapped.toFixed(2))));
    return clamped;
  }, [min, max, step]);

  const onPointer = useCallback((e) => {
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180..180 (0 at 3 o'clock)
    // transform angle so -135..135 maps to arc
    // Limit to arc; outside gets clamped
    if (angle < startAngle) angle = startAngle;
    if (angle > startAngle + 270) angle = startAngle + 270;
    const next = angleToValue(angle);
    onChange(next);
  }, [angleToValue, onChange]);

  const handlePointerDown = (e) => { setDragging(true); onPointer(e); };
  const handlePointerMove = (e) => { if (dragging) onPointer(e); };
  const handlePointerUp = () => setDragging(false);

  return (
    <div style={{ display:'grid', placeItems:'center' }}>
      <div
        ref={ref}
        style={{ width:size, height:size, position:'relative', cursor:'pointer', userSelect:'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerUp}
        onPointerUp={handlePointerUp}
        aria-label={`반경 설정 (${value}km)`}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        {/* Segments */}
        <svg width={size} height={size} style={{ position:'absolute', inset:0 }}>
          {Array.from({ length: steps }).map((_, i) => {
            const angle = startAngle + i * segAngle;
            const rad = angle * Math.PI / 180;
            const x = center + radius * Math.cos(rad);
            const y = center + radius * Math.sin(rad);
            const filled = i < activeSegments;
            const nextVal = (min + i * step);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={filled ? 6.2 : 5}
                fill={filled ? 'url(#gradDial)' : 'var(--border)'}
                stroke={filled ? 'rgba(99,102,241,0.55)' : 'var(--border)'}
                strokeWidth={filled ? 1.5 : 1}
                onPointerEnter={(e)=>{ if (dragging){ onChange(nextVal); } }}
                onClick={()=>onChange(nextVal)}
              />
            );
          })}
          <defs>
            <linearGradient id="gradDial" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center value display */}
        <div style={{ position:'absolute', inset:'0', display:'grid', placeItems:'center' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:26, fontWeight:800, background:'linear-gradient(90deg,#6366f1,#ec4899,#8b5cf6)', WebkitBackgroundClip:'text', color:'transparent' }}>{value}<span style={{ fontSize:16 }}>km</span></div>
            <div style={{ fontSize:12, color:'var(--muted)', fontWeight:600 }}>반경</div>
          </div>
        </div>
      </div>
      <div style={{ marginTop:6, fontSize:12, color:'var(--muted)' }}>드래그 또는 클릭하여 조정</div>
    </div>
  );
}