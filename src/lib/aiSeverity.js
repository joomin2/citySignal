// lib/aiSeverity
// 서버 전용 헬퍼: 텍스트에서 1–5단계 위험도를 추론(OpenAI 사용 가능 시),
// 미사용 시 한국어 키워드 기반 휴리스틱으로 대체합니다.

export async function inferSeverityFromText(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  const safeDefault = heuristicSeverity5(text);
  if (!apiKey) return safeDefault;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a safety triage classifier. Return only one of: 1, 2, 3, 4, 5.\n1=info, 2=caution, 3=watch, 4=danger, 5=critical. Consider imminent threat to life, weapons, active violence, fire/explosion, gas leak, structural collapse, kidnapping/sexual assault, multi-vehicle crash. Short text only: a single digit with no explanation.",
          },
          { role: "user", content: String(text).slice(0, 2000) },
        ],
        temperature: 0,
        max_tokens: 3,
      }),
    });
    if (!res.ok) return safeDefault;
    const json = await res.json();
    const out = (json?.choices?.[0]?.message?.content || "").trim();
    const n = parseInt(out, 10);
    if (Number.isInteger(n) && n >= 1 && n <= 5) return n;
    return safeDefault;
  } catch {
    return safeDefault;
  }
}

function heuristicSeverity5(text) {
  const t = (text || "").toLowerCase();
  const urgent = /(긴급|즉시|대피|도와줘|help|sos)/;
  const lethal = /(불|화재|폭발|가스|질식|유독|유해물질|총|흉기|칼|자상|출혈|사망|의식불명|심정지|붕괴|침수 심각|대형사고|연기)/;
  const violent = /(강도|폭행|성폭행|성추행|납치|감금|협박|스토킹)/;
  const danger = /(가스누출|누전|감전|대형|균열|기둥|무너질|붕괴 징후|큰 충돌|다중 추돌|역주행)/;
  const watch = /(사고|충돌|교통사고|접촉사고|부상|피해|위험|화상|침수|산사태|싱크홀|실종|분실|야간 취약|빈집 이상|수상한)/;
  const minor = /(가로등|노면 파손|공사|소음|악취|불편|통제|차단)/;

  if (lethal.test(t) || violent.test(t) || (danger.test(t) && urgent.test(t))) return 5; // 긴급
  if (danger.test(t) || (watch.test(t) && urgent.test(t))) return 4; // 위험
  if (watch.test(t)) return 3; // 경계
  if (minor.test(t) || /수상한 (사람|차량)/.test(t)) return 2; // 주의
  return 1; // 정보
}
