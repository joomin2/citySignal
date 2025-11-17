# src Folder Guide

This document summarizes the roles of folders and files under `src/`, plus whether each page/component runs on the server (SSR) or client (CSR).

## Folders

- `src/app/`: Next.js App Router. Server components by default; client pages/components use `"use client"`.
  - `app/api/`: Route handlers (server). All code runs on the server.
  - `app/(pages)`: UI routes (pages). Server by default; client when explicitly marked.
- `src/components/`: Reusable UI components. Client components when they use hooks, browser APIs, or NextAuth session.
- `src/lib/`: Server-side utilities (DB, web push, AI severity). Do not import from the client.
- `src/models/`: Mongoose schemas/models. Server-only.

## App Pages (UI)

- `app/layout.js`: Root layout (SSR). Wraps `body` with `Providers` (client) for NextAuth session context.
- `app/page.js`: Home (SSR). Composes client components: `AuthButton`, `CurrentLocation`, `PushTipsBanner`, and `BottomNav`.
- `app/login/page.js`: Login (CSR). Credentials form and Google sign-in.
- `app/account/page.js`: Account (CSR). Shows user session, theme toggle, test push, and logout.
- `app/map/page.js`: Map (CSR). KakaoMap with markers/cluster; unified `BottomNav`.
- `app/signals/page.js`: Signals list (CSR). Geolocation + fetch nearby signals.
- `app/signals/new/page.js`: New signal (CSR). Create form, optional geolocation autofill.
- `app/signals/[id]/page.js`: Signal detail (CSR). Fetch and display one signal.

## API Routes (Server)

- `app/api/auth/[...nextauth]/route.js`: NextAuth providers (Google + Credentials), JWT sessions, optional Mongo adapter.
- `app/api/geo/reverse/route.js`: Reverse geocoding (Nominatim primary, Kakao fallback). Returns address + zone keys.
- `app/api/geo/search/route.js`: Forward geocoding (Nominatim + Kakao refinement).
- `app/api/signals/route.js`: GET (nearby or by-id), POST (create + AI severity + radius-only push fanout).
- `app/api/push/subscribe/route.js`: Save/update Web Push subscription with optional location/zone/radius.
- `app/api/push/test/route.js`: Send a test notification to current user's subscriptions.
- `app/api/dev/seed/route.js`: Dev-only seed for nearby sample signals.

## Components (mostly CSR)

- `components/Providers.js` (CSR): SessionProvider wrapper.
- `components/AuthButton.js` (CSR): Login/logout button based on session.
- `components/BottomNav.js` (CSR): Bottom tab nav; highlights active route.
- `components/CurrentLocation.js` (CSR): Geolocation + reverse geocode + registers push.
- `components/KakaoMap.js` (CSR): Loads Kakao JS SDK, shows markers/cluster from `/api/signals`.
- `components/PushManager.js` (CSR): Registers SW, requests permission, posts push subscription.
- `components/PushTipsBanner.js` (CSR): Surface HTTPS/iOS PWA hints; optional permission prompt.
- `components/ThemeToggle.js` (CSR): Light/dark/system theme toggle with localStorage.

## Server Libraries (server-only)

- `lib/mongodb.js`: Shared Mongoose connection helper.
- `lib/mongodbClient.js`: Raw Mongo client for NextAuth adapter (optional).
- `lib/webpush.js`: Lazy-load `web-push`, initialize VAPID, send notifications.
- `lib/aiSeverity.js`: Infer severity via OpenAI (fallback heuristic).

## Models (server-only)

- `models/signal.js`: Incident signal with GeoJSON point, severity `level` (1–5), optional zone.
- `models/subscription.js`: Web Push subscription per user with location and radius.
- `models/user.js`: App-level user profile (separate from NextAuth internal `users`).

## Rendering Rules (Quick Reference)

- SSR (server): All `app/api/**` route handlers, `app/layout.js`, and pages without `"use client"`.
- CSR (client): Any file with `"use client"` at the top; typically interactive pages/components using hooks or browser APIs.

## Notes

- Client files must keep the `"use client"` directive as the first statement.
- Server utilities (`lib/**`, `models/**`) should not be imported into client components.
- Environment keys: MongoDB, NextAuth, VAPID, Kakao JS/REST, optional OpenAI.
