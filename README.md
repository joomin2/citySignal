# CitySignal

위치 기반 위험/이상 제보, 지도 탐색, AI 위험도 추정, 웹 푸시 알림을 제공하는 Next.js 16 (App Router) 기반 MVP입니다.

## 주요 기능
- 제보 생성/목록/상세 (`/signals`, `/signals/new`, `/signals/[id]`)
- 근처 제보 카드(`HomeNearby`) + 거리/시간 필터
- Kakao 지도: 주변 제보 마커/클러스터 + 현재 위치 팝업(`/map`)
- AI 위험도 추정(OpenAI, 키 없으면 한국어 휴리스틱 폴백)
- 웹 푸시: 구독/테스트/수신 확인(`/api/push/*`)
- 인증: NextAuth (Google OIDC 가능), 세션 기반 버튼

## 기술 스택
- Next.js 16 / React 19 (App Router, Route Handlers)
- MongoDB + Mongoose (GeoJSON 2dsphere)
- Tailwind (v4) / Embla Carousel
- Vitest + Testing Library (jsdom)
- Web Push (VAPID) / Service Worker
- OpenAI Chat Completions (모델: gpt-5.1)

## 환경 변수 (`.env.local`)
| Key | 설명 |
| --- | --- |
| `MONGODB_URI` | MongoDB 연결 문자열 |
| `NEXTAUTH_SECRET` | NextAuth 암호화 시크릿 |
| `NEXTAUTH_URL` | 베이스 URL (예: http://localhost:3000) |
| `GOOGLE_ID` / `GOOGLE_SECRET` | Google OAuth (선택) |
| `OPENAI_API_KEY` | AI 위험도 추정 (없으면 휴리스틱) |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 브라우저 Kakao 지도 SDK |
| `KAKAO_REST_API_KEY` | 역지오코딩 보조(행정구역/법정동 보강) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | 웹 푸시 VAPID 키 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 클라이언트에서 사용되는 공개 키 |

예시: `.env.local.example` 참고 → 복사 후 값 채우기.

## 실행
```powershell
npm install
npm run dev
```
브라우저: http://localhost:3000 (모바일 뷰 추천)

### 빠른 환경 확인
```text
/api/dev/env?key=OPENAI_API_KEY
/api/dev/env?key=NEXT_PUBLIC_KAKAO_JS_KEY
```

### AI 위험도 테스트
```text
/api/dev/ai-severity?text=불길과%20연기가%20나요
```

## 주요 경로 구조
```
src/app
	page.js (홈) / map/page.js / signals/* / api/*
src/components (UI) + index.js (배럴)
src/hooks (공용 훅: useGeolocation, usePushSubscription)
src/lib (AI·DB·Push 로직)
src/models (Mongoose 스키마)
docs (구조/데모 스크립트 등)
```

## 테스트
```powershell
npm run test:run    # 단발 실행
npm test            # 워치
npm run test:ui     # 웹 UI
```
현재 포함 테스트: `inferSeverity.test.js`, `HomeNearby.test.jsx` (추가 훅 테스트 권장).

## 추천 테스트 순서 (기능 검증 가이드)
아래 순서대로 수동/반자동 검증하면 이번 개선사항을 빠르게 확인할 수 있습니다.

1. 의존성 설치
```powershell
npm install
```
	- 새로 추가된 `zod` 확인: `npm ls zod`.
2. 정리 확인
	- `public/` 폴더에 `manifest.json` 하나만 존재하는지 확인.
	- `src/components/` 중복(.js/.jsx) 제거 상태 확인 (`BottomNav.js` 삭제 등).
3. PushTipsBanner 동작
	- 로컬(http://localhost:3000) 접속: HTTPS 경고 없음, iOS 환경이 아니면 기본 알림 권한 배너만 표시.
	- 알림 권한 허용 후 배너가 사라지는지 확인(`Notification.permission`).
	- iOS(시뮬레이터) Safari에서 홈 화면 추가 전/후 표시 변화.
4. 제보 생성 Validation
```powershell
curl -X POST http://localhost:3000/api/signals \
  -H "Content-Type: application/json" \
  -d '{"title":"","lat":37.5,"lng":127.0}'
```
	- 응답: 400 + `title 필요`.
```powershell
curl -X POST http://localhost:3000/api/signals \
  -H "Content-Type: application/json" \
  -d '{"title":"화재 발생","lat":37.5,"lng":127.0,"description":"연기"}'
```
	- 응답: 200 + 생성된 id.
5. Rate Limiting (5분 10회)
```powershell
for /L %i in (1,1,11) do curl -s -o NUL -w "%{http_code}\n" -X POST http://localhost:3000/api/signals -H "Content-Type: application/json" -d "{\"title\":\"t%i\",\"lat\":37.5,\"lng\":127.0}"
```
	- 처음 10회 200, 11번째 429 (`rate limit`).
6. AI 위험도 캐시/타임아웃
	- `.env.local`에서 `OPENAI_API_KEY` 제거 → 휴리스틱 값 반환(예: 화재=4~5 예상).
	- 키 존재 시 동일 텍스트 두 번 POST: 두 번째 로그에서 OpenAI 호출이 캐시 적용(속도 빨라짐)인지 확인.
7. Push 로깅
	- 임시로 `sendPush` 직접 호출(예: invalid endpoint) → 콘솔 `[push]` 로그 출력 + `gone` 여부.
8. GET /api/signals 기본 조회
```powershell
curl "http://localhost:3000/api/signals?lat=37.5&lng=127.0&radiusKm=3&days=3"
```
	- `items` 배열 구조 확인, `level` / `createdAt` 존재.
9. Severity 정렬/커서
```powershell
curl "http://localhost:3000/api/signals?lat=37.5&lng=127.0&radiusKm=3&days=3&sort=severity&limit=5"
```
	- 응답 내 `nextCursor` 사용해 이어서 요청.
10. Distance 정렬
```powershell
curl "http://localhost:3000/api/signals?lat=37.5&lng=127.0&radiusKm=3&days=3&sort=distance&page=1&pageSize=5"
```
	- `nextPage` 증가 확인.

추가 자동 테스트 권장 항목:
- `src/lib/schemas/signal.js` Zod 스키마 단위 테스트 (유효/오류 케이스)
- Rate limiter: 11회 호출 후 reset 시간 비교
- AI 캐시: 동일 텍스트 두 번 호출 시간이 감소했는지 측정 (ms 단위)


## DB 인덱스
- `signals`: 2dsphere(geo), level+createdAt, zone+createdAt, createdAt.
- `push_subscriptions`: 2dsphere(geo), userId+endpoint, active.

## 개선 TODO (프로덕션 준비)
- Rate limiting (역지오코딩/생성 API)
- 입력 검증 고도화(Zod) & 중앙 에러 처리
- 추가 테스트(API 라우트, 푸시 실패 케이스)
- 접근성/ARIA 레이블 및 다크모드 대비
- 로깅/모니터링(Winston/추적)

## 데모 녹화
`docs/DEMO_SCRIPT.md` 참조: Home → Map → Signals → New Signal(AI) → Push.

## 라이선스
내부 프로젝트(MVP); 별도 라이선스 미지정.

---
CitySignal MVP © 2025
