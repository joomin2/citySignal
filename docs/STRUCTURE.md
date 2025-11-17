# Project Structure Overview

Short, developer-focused map of key folders and responsibilities.

- `src/app/`
  - `layout.js`: Global metadata, Providers, and shell layout
  - `page.js`: Home (current location, tips, CTA, bottom nav)
  - `map/page.js`: Kakao map view of nearby signals
  - `signals/page.js`: Nearby feed with test-creation and link to map
  - `signals/new/page.js`: New signal form
  - `signals/[id]/page.js`: Signal detail (votes, comments)
  - `account/page.js`: Profile + push prefs + theme + test push
  - `submit/page.js`: Redirects to `/signals/new` (legacy link support)
  - `api/`
    - `auth/[...nextauth]/route.js`: NextAuth handler (Google + Credentials)
    - `geo/reverse/route.js`: Reverse geocoding (Nominatim + Kakao fallback)
    - `geo/search/route.js`: Text search geocoding
    - `signals/route.js`: GET nearby/by-id, POST create + push fanout
    - (간소화) 투표/댓글 관련 라우트 제거됨
    - `push/subscribe/route.js`: Save/update web push subscriptions
    - `push/test/route.js`: Send test push to current user
    - (간소화) `push/seen` 제거됨 — 클릭 시 상세만 오픈
    - `account/prefs/route.js`: Per-user push thresholds
    - `dev/*`: Diagnostics endpoints

- `src/components/`
  - `BottomNav.js`: Primary tabs (Home, New, Feed, Account)
  - `CurrentLocation.js`: Geolocation + reverse geocoding + zone display
  - `KakaoMap.js`: Kakao JS SDK loader + clustered markers
  - `PushManager.js`: SW + browser subscription + server registration
  - `PushTipsBanner.js`: HTTPS/iOS PWA guidance
  - `ThemeToggle.js`: Light/Dark/System theme toggle
  - `Providers.js`: App-wide context providers

- `src/lib/`
  - `aiSeverity.js`: AI severity classification (OpenAI optional)
  - `mongodb.js` / `mongodbClient.js`: DB connections (Mongoose/native)
  - `webpush.js`: VAPID init and safe send wrapper

- `src/models/`
  - `signal.js`: Signal schema (GeoJSON, zone, score, level)
  - `comment.js`: Comments for signals
  - (간소화) `signalVote.js` 제거
  - `subscription.js`: Push subscription with geo + radius
  - (간소화) `notification.js`, `userPrefs.js` 제거
  - `user.js`: Users (NextAuth)

- `public/`
  - `manifest.json`: PWA manifest
  - `sw.js`: Service worker for web push
  - `icon.png`: App icons (web + Apple)

Notes
- Consider optional route groups for editor clarity:
  - `src/app/(tabs)/{page.js, signals/*, map/page.js}`
  - `src/app/(auth)/{account/page.js, login/page.js}`
  - Route groups do not affect URLs; move when convenient.
- Environment keys: see README or `.env.example` for a quick checklist.
