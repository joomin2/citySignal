# CitySignal Demo & Recording Checklist

Goal: Run through the core flows and capture a clean demo video in ~5–10 minutes.

## 1) Prereqs
- Ensure `.env.local` is filled:
  - `OPENAI_API_KEY` present
  - `NEXT_PUBLIC_KAKAO_JS_KEY` and `KAKAO_REST_API_KEY` if map/geocoding shown
  - `NEXTAUTH_URL=http://localhost:3000`
- Dependencies installed: `npm install`

## 2) Start services
```powershell
npm run dev
```
- Open http://localhost:3000 in a mobile viewport (DevTools > Toggle device toolbar).

## 3) Quick environment checks (browser)
- OpenAI key present: `/api/dev/env?key=OPENAI_API_KEY` → `present: true`
- Kakao JS key present: `/api/dev/env?key=NEXT_PUBLIC_KAKAO_JS_KEY` (optional)
- Kakao REST key present: `/api/dev/env?key=KAKAO_REST_API_KEY` (optional)

## 4) Seed data (optional)
- POST `/api/dev/seed` with JSON: `{ "lat": 37.5665, "lng": 126.9780, "count": 8 }`
  - Tools: REST Client, Postman, or `curl` from a second terminal:
```powershell
$body = '{"lat":37.5665,"lng":126.9780,"count":8}'
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/dev/seed -ContentType application/json -Body $body
```

## 5) Feature flow (record this)
1. Home
   - Click “위치 허용하기” → 주소/구역 표기 확인 → PushTipsBanner 가이드 노출(환경에 따라)
   - `HomeNearby` 카드 3개 로딩/표시 확인
2. Map
   - Go to `/map` → KakaoMap 로딩, 현재 위치 마커, 인포윈도우 표시
   - 마커 클릭 → 카드형 팝업 열림 확인
3. Signals
   - `/signals` → 리스트/카드 UI, 상세 진입(`/signals/[id]`), 댓글/투표 엔드포인트 접근
4. New Signal (AI)
   - `/signals/new` → 제목/설명 입력 후 저장
   - 설명을 위험도 판단 가능한 문구로 작성(예: “연기와 가스 냄새로 대피 필요”) → 저장 시 AI 추정 반영
   - 또는 AI 단독 확인: `/api/dev/ai-severity?text=불길과 연기가 나요`

## 6) Push (optional)
- `CurrentLocation` 섹션에서 권한 허용 후 `PushManager`가 구독 등록
- 서버에서 샘플 푸시: `/api/push/test` (필요 시 구현 범위 내에서 검증)

## 7) Tests
```powershell
npm run test:run
```
- `src/lib/inferSeverity.test.js` (휴리스틱)과 `src/components/HomeNearby.test.jsx` 통과 확인

## 8) Build smoke test (optional)
```powershell
npm run build
```

## 9) Recording tips (Windows)
- Win+G (Xbox Game Bar) → 화면/앱 창 녹화 시작
- 또는 Snipping Tool → Record (Windows 11)
- 해상도 1280×720 또는 1920×1080, 시스템 사운드 OFF 권장
- 브라우저 DevTools 닫고 모바일 뷰만 촬영, 커서 이동 최소화

## 10) Wrap-up
- 스토리 순서: Home → Map → Signals → New Signal (AI) → Optional Push
- 실패 시 리트라이 컷 편집을 위해 각 섹션 사이에 잠시 멈춤(2–3초)
