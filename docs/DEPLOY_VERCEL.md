# Vercel Deployment Guide

## 1. 프로젝트 임포트
1. GitHub에서 리포지토리(`citySignal`) 공개 또는 권한 허용.
2. Vercel > Add New… > Project > Import Git Repository.
3. Framework 자동 감지(Next.js). buildCommand `npm run build`, output 자동 `.next`.

## 2. 환경 변수 설정 (Project Settings > Environment Variables)
| KEY | PROD | PREVIEW | DESCRIPTION |
|-----|------|---------|-------------|
| MONGODB_URI | ✅ | ✅ | Atlas/Cluster connection string |
| NEXTAUTH_SECRET | ✅ | ✅ | 랜덤 32+ chars secret (rotate) |
| NEXTAUTH_URL | ✅ | ✅ | Production URL (e.g. https://citysignal.vercel.app) |
| OPENAI_API_KEY | ✅ | ✅ | AI 위험도 추정 (Preview에도 동일) |
| NEXT_PUBLIC_KAKAO_JS_KEY | ✅ | ✅ | Kakao JS SDK (public) |
| KAKAO_REST_API_KEY | ✅ | ✅ | Kakao REST (reverse geocode fallback) |
| VAPID_PUBLIC_KEY | ✅ | ✅ | Web push VAPID public |
| VAPID_PRIVATE_KEY | ✅ | ❌ | Prefer only Production; optional for preview |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | ✅ | ✅ | Same as public key |

권장: Preview와 Production 분리. 민감키(Private VAPID)는 Preview 불필요하면 비움.

## 3. 브랜치 전략
- `master` → Production
- 기타 브랜치/PR → Preview Deploy 자동 생성
- 머지 시 Production 재빌드

## 4. 빌드/배포 흐름
1. git push (브랜치) → Vercel Hook 활성
2. Install deps → `npm run build` → Output upload → URL 생성
3. Preview 확인 후 merge

## 5. Post-Deploy 체크리스트
| 항목 | 경로 | 기대 동작 |
|------|------|-----------|
| 홈 위치 허용 | `/` | 주소/구역 출력, 근처 카드 로딩 후 표시 |
| 지도 | `/map` | 현재 위치 마커+인포윈도우, 주변 마커 표시 |
| 제보 생성 | `/signals/new` | 저장 후 목록/상세 level 반영 |
| AI 테스트 | `/api/dev/ai-severity?text=불길과%20연기가%20나요` | Production에서 403 (dev 전용) |
| PWA SW | `/sw.js` | 200, 캐시 헤더 적용 |
| Manifest | `/manifest.json` | PWA 메타 출력 |
| Push 구독 | 홈 위치 허용 후 Application 탭에서 Subscription 생성 |

## 6. 로그 및 에러 확인
- Vercel Project > Deployments > 해당 배포 선택 > Functions / Logs 탭
- 오류 발생 시 재배포(“Redeploy”) 또는 수정 후 push

## 7. 보안 권장
- 모든 키 Rotate 주기 설정 (OpenAI / NEXTAUTH_SECRET / VAPID)
- `/api/dev/*`는 production에서 403 정상 여부 확인
- 추후 Middleware로 rate limiting 추가 계획

## 8. 수동 재배포
- 환경 변수 수정 후 “Save” → “Redeploy” 클릭 (또는 임의 커밋 push)

## 9. 로컬 프로덕션 검증 (선택)
```powershell
npm run build
npm start   # http://localhost:3000
```

## 10. 문제 해결 Quick Tips
| 증상 | 원인 | 해결 |
|------|------|------|
| Kakao 지도 빈 화면 | NEXT_PUBLIC_KAKAO_JS_KEY 누락 | Vercel env 추가 후 redeploy |
| 푸시 구독 실패 | VAPID_PUBLIC_KEY 미설정 | 키 재생성 후 env 갱신 |
| AI 항상 휴리스틱 | OPENAI_API_KEY 누락/잘못됨 | env 키 교체 후 redeploy |
| dev 엔드포인트 노출 | NODE_ENV=development 배포 | Vercel 환경 Production 설정 확인 |

---
배포 완료 후 태그: `git tag v0.1.0-mvp && git push --tags`
