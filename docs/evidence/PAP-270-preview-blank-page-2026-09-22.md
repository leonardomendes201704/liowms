# PAP-270 — Preview blank page (2026-09-22)

| Field | Value |
| --- | --- |
| **Preview** | https://preview.insta-ads.online/liowms/login |
| **Reporter** | PAP-260 |
| **Fix** | `apps/web/src/shell-nav-icons.tsx` |

## Root cause

PAP-266 shell nav introduced `faArrowDownToBracket` from `@fortawesome/free-solid-svg-icons`, but that export **does not exist** in the pinned FA package (v6 free solid set).

`App.tsx` statically imports all route modules (including `AppShellPage` → `ShellHybridNav` → `shell-nav-icons.tsx`). The failed ES module import aborts the entire client bundle, so **every route** (including `/login`) renders a blank `#root`.

Browser symptom: white screen, console error like missing export from `@fortawesome/free-solid-svg-icons`.

## Fix

Replace inbound rail icon with `faDownload` (valid export, inbound/receive semantics).

## Smoke (post-fix)

1. Hard refresh https://preview.insta-ads.online/liowms/login — login form visible (IBM Plex, email/password).
2. DevTools Network: `GET /liowms/src/shell-nav-icons.tsx` references `faDownload`, not `faArrowDownToBracket`.
3. `GET /liowms/health` → **200**, `installed:true`.
4. `GET /liowms/api/v1/auth/me` without cookie → **401** `AUTH_SESSION_REQUIRED` (API proxy OK).

## Tests

```bash
npm test -w @liowms/web -- --run src/components/shell-hybrid-nav.test.tsx src/ui-icons-font-awesome-policy.test.ts
```
