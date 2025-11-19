# Security & Hardening Notes

## Immediate Improvements
- Input validation: Added basic length & range checks to POST /api/signals. Recommend migrating to Zod schema for uniform error shapes.
- Secret handling: .env* already gitignored; rotate exposed dev keys before production.
- Geo queries: radius, days, limit clamped to reduce abuse.

## Recommended Next Steps
| Area | Action | Notes |
| ---- | ------ | ----- |
| Rate limiting | Add per-IP & per-session limits (e.g. /api/geo/reverse, /api/signals POST) | Upstash Redis / Cloudflare Turnstile optional. |
| Abuse protection | Detect excessive seed/test endpoints usage | Disable dev routes in production (already blocked). |
| Auth scope | Restrict admin-only actions | Introduce role check middleware. |
| Logging | Add structured logs (winston/pino) | Include request id & latency. |
| Monitoring | Health + metrics endpoint | /api/health exists; expand with uptime & db ping. |
| Data validation | Centralize schema (Zod) | Reuse for client-side preflight. |
| CSP/Headers | Add security headers | e.g. Helmet or Next middleware. |
| Push cleanup | Remove inactive subs automatically | Already deactivates on 404/410; add periodic purge job. |
| Index review | Ensure compound indexes cover top queries | Added level+createdAt & zone+createdAt. Periodically run profiler. |
| Dependency updates | Audit vulnerable packages | `npm audit` + schedule. |

## Threat Model (Quick)
- User spam: Mitigated by rate limits & captcha.
- Location fuzzing: Lat/lng range validation done; consider minimum precision.
- Sensitive data leakage: No PII stored beyond user email; avoid logging raw env vars.
- Third-party API quota: Cache or debounce reverse geocode calls per session.

## Checklist Before Production
- [ ] Rotate all development secrets
- [ ] Add rate limiting layer
- [ ] Implement Zod schemas (request + response)
- [ ] Add structured logging
- [ ] Expand tests (API error branches, push failures)
- [ ] CI pipeline with build + test + lint
- [ ] Security headers & CSP
- [ ] Backup & index stats review
