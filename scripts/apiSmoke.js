// scripts/apiSmoke.js
// Simple API smoke tests: run with `npm run smoke:api`
// Prints latency + basic validation for key endpoints.
// Adjust BASE as needed.

const BASE = process.env.CITYSIGNAL_BASE || 'http://localhost:3000';

async function hit(path, { method = 'GET', qs, body } = {}) {
  const url = new URL(path.startsWith('http') ? path : BASE + path);
  if (qs) Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));
  const started = Date.now();
  let ok = false, status = 0, json = null, text = null, error = null;
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    status = res.status;
    text = await res.text();
    try { json = JSON.parse(text); } catch {}
    ok = res.ok;
  } catch (e) { error = e; }
  const ms = Date.now() - started;
  return { url: url.toString(), ms, ok, status, json, text, error };
}

function logResult(label, r, validator) {
  const pass = validator ? validator(r) : r.ok;
  const icon = pass ? '✅' : '❌';
  console.log(`\n${icon} ${label}`);
  console.log(`URL: ${r.url}`);
  console.log(`Status: ${r.status} (${r.ms}ms)`);
  if (r.error) console.log('Error:', r.error.message);
  if (r.json) console.log('JSON:', r.json);
  else console.log('Body:', r.text?.slice(0, 200));
  if (!pass) console.log('Validator failed');
  return pass;
}

async function main() {
  console.log('CitySignal API Smoke Test');
  console.log('Base:', BASE);

  const results = [];

  // 1. DB connectivity
  results.push(logResult('DB test (/api/test-db)', await hit('/api/test-db'), r => r.ok && r.json?.message));

  // 2. Signals listing (may return [] or fallback mocks)
  results.push(logResult('Signals list (/api/signals)', await hit('/api/signals', { qs: { lat: 37.5665, lng: 126.9780, radiusKm: 3, days: 3 } }), r => r.ok));

  // 3. AI severity heuristic or OpenAI usage (dev route)
  results.push(logResult('AI severity (/api/dev/ai-severity)', await hit('/api/dev/ai-severity', { qs: { text: '폭발 위험 있는 가스 누출 발생, 즉시 대피 요망' } }), r => r.ok && (r.json?.severity >= 1)));

  // 4. Reverse geocode
  results.push(logResult('Reverse geocode (/api/geo/reverse)', await hit('/api/geo/reverse', { qs: { lat: 37.5665, lng: 126.9780 } }), r => r.ok));

  // Summary
  const passCount = results.filter(Boolean).length;
  console.log(`\nSummary: ${passCount}/${results.length} passed.`);
  if (passCount !== results.length) {
    process.exitCode = 1;
  }
}

main().catch(e => {
  console.error('Unexpected failure:', e);
  process.exitCode = 1;
});
