// 간단한 메모리 기반 레이트 리미터 (프로세스 단위, 재배포/재시작 시 초기화)
// 사용 예: const { allowed, remaining } = checkRateLimit({ key, limit: 10, windowMs: 60000 });
const g = globalThis;
g._rateBuckets = g._rateBuckets || new Map();

export function checkRateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  const bucket = g._rateBuckets.get(key) || [];
  // 윈도우 내부에 속한 타임스탬프만 필터링
  const fresh = bucket.filter(ts => now - ts < windowMs);
  if (fresh.length >= limit) {
    g._rateBuckets.set(key, fresh); // 초과: 가장 오래된 타임스탬프 기준으로 남은 시간 계산
    return { allowed: false, remaining: 0, resetIn: windowMs - (now - fresh[0]) };
  }
  fresh.push(now);
  g._rateBuckets.set(key, fresh);
  return { allowed: true, remaining: Math.max(0, limit - fresh.length), resetIn: windowMs - (now - fresh[0]) };
}

export function clientIp(req) {
  try {
    const xf = req.headers.get('x-forwarded-for');
    if (xf) return xf.split(',')[0].trim();
    return req.headers.get('x-real-ip') || 'unknown';
  } catch {
    return 'unknown';
  }
}