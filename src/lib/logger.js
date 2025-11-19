// 단순 구조화 로거 (추후 Winston 등으로 확장 가능)
export function logPushSend({ endpoint, id }, result) {
  const base = {
    type: 'push_send',
    endpoint: endpoint?.slice(0, 32) + '...',
    subId: id || null,
    ok: result.ok,
    gone: !!result.gone,
    error: result.error || null,
    ts: new Date().toISOString(),
  };
  // 현재는 console.log 사용; 이후 Winston 등으로 교체 가능
  if (!result.ok) console.warn('[push]', base);
  else console.log('[push]', base);
}

export function logRateLimit(info) {
  console.warn('[rate-limit]', info);
}