# Google Profile Images CORB & CORS Proxy Solution

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | google-profile-images-corb-proxy |
| Merge Date | 2025-12-15 |
| Status | Completed |
| Tech Lead | Rocco Platform |
| Team | Rocco + API |
| Primary Repo | hackefeller/hominem |
| PR(s) | See git history around 2025-12-15 |
| Commit Range | See commits referenced in `docs/plans/2025-12-15-google-profile-images-corb-proxy.md` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | Browser CORB/CORS blocked direct Google profile image embedding and Google rate limits caused unstable loads. |
| Outcome | Implemented API-backed image proxy path with domain allowlist and cache headers. |
| Business/User Impact | Profile images now load reliably and external image fetch pressure is greatly reduced. |
| Delivery Shape | Infrastructure fix deployed via app+API route updates. |

A three-layer proxy flow was shipped: React component URL rewrite -> app route proxy -> API image proxy to Google. This moved image delivery to same-origin responses and eliminated browser CORB failures while preserving security boundaries with strict domain validation.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| API image proxy | Added `/api/images/proxy` with URL validation and whitelist. |
| App routing | Added React Router proxy route for image forwarding. |
| UI integration | Updated user avatar image source to use proxy for Google-hosted URLs. |
| Caching/security | Added `Cache-Control`, CORS response headers, and allowlisted domains. |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| General image transformation pipeline | Not needed for CORB/CORS unblock objective. |
| Multi-provider media abstraction | Deferred to future enhancement. |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| Google profile image load reliability | Unstable / blocked | Stable same-origin loading | Achieved |
| CORB/CORS errors | Frequent | Zero in production path | Achieved |
| External image request volume | High | Reduced through caching | Achieved (plan reports ~95% reduction) |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Serve images through API proxy | Direct browser load vs backend proxy | Removes CORB/CORS blockers and centralizes control | Adds server hop |
| Domain allowlist for source URLs | Open proxy vs restricted proxy | Prevents abuse/SSRF class risks | Must maintain allowlist |
| Cache headers on proxied responses | No cache vs short/long cache | Reduces repeated external calls and dev-rate-limit pain | Potential stale images until cache expiry |

### 5.1 Final Architecture

Client components detect Google URLs and request same-origin proxied URLs. The app route forwards request context to API, which validates source domain, fetches image bytes, and returns cacheable image responses.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Proxy endpoint | Added Hono image proxy route with validation and headers | API | done |
| App route forwarding | Added app-level proxy route | Rocco | done |
| Avatar integration | Switched Google image source to proxy helper | Rocco | done |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `apps/api/src/routes/images.ts` | added/updated | Core proxy endpoint |
| `apps/rocco/app/routes/api/images.ts` | added | App forwarding route |
| `apps/rocco/app/routes.ts` | updated | Registered image route |
| `apps/rocco/app/components/user-avatar.tsx` | updated | Proxy URL mapping for Google images |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Runtime traffic-path change only; no DB migration |
| Ordering | API route -> app route -> component integration |
| Safety Controls | Domain allowlist, URL parsing, response header controls |
| Rollback | Revert avatar proxy mapping and route additions |
| Residual Risk | Source domain policy drift if new providers are introduced |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Functional | Avatar image load in app flows | pass | Plan checklist and status |
| Security | Domain whitelist and URL validation | pass | Endpoint implementation notes |
| Performance | Cache behavior and request reduction | pass | Plan reports strong reduction |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| Redis cache layer was optional/future | Moderate | Add server cache later if needed |
| Non-Google sources may need expansion | Low | Extend allowlist + tests when adding providers |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Deploy API and app route/component changes together |
| Dependencies | Google image endpoints, API availability |
| Monitoring | Image proxy error rates, 4xx/5xx, rate-limit responses |
| Incident Response | Disable proxy mapping or revert route changes |
| Rollback Trigger | Elevated image failures or proxy abuse signals |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | ok | No auth model change |
| Data handling impact | ok | Image passthrough only |
| Secrets/config changes | no | No new secrets required |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Browser cross-origin behavior can invalidate direct embed assumptions | Prefer controlled same-origin proxy for sensitive external media |
| Caching is critical for external API-backed assets | Set explicit cache policy in first release |
| Security boundaries must ship with proxy endpoints | Keep strict allowlist and validation mandatory |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| F-001 | Add rate limiting middleware to proxy route if traffic increases | API | P2 | 2026-04-01 | open |
| F-002 | Evaluate Redis cache layer for hot paths | Platform | P3 | 2026-05-01 | open |
