# 2026-05-27 — Matches Screen Fixes & Dashboard Button Upgrade

## Files Modified

### Mobile (`C:\Users\CSKIN\FortioMobile`)
- `app/(tabs)/index.tsx` — Dashboard: batch match-count fetch, new button with count badge, new styles
- `app/(tabs)/shipments/matches/[id].tsx` — Matches screen: hide breadcrumb header, rename title, fix offer detection
- `lib/api.ts` — Added `routeId` field to `Offer` type, added `matchCountsApi.getBatch()`

### Web (`C:\Users\CSKIN\Fortio`)
- `app/api/shipments/match-counts/route.ts` — Added JWT Bearer auth support for mobile clients

## Changes

### 1. Button renamed + count badge (Dashboard)
- "Δες Δρομολόγια" → "Εμφ. Δρομολογίων"
- Batch-fetches match counts for all active shipments via `POST /api/shipments/match-counts` (60s stale time)
- Button states match web app:
  - Loading: greyed button with `…`
  - No matches: greyed disabled with `0`
  - Has matches: amber button with count circle (tappable → matches page)

### 2. Matches screen title
- "Ταιριαστά Δρομολόγια" → "Διαθέσιμα Δρομολόγια"

### 3. Breadcrumb header removed
- Added `<Stack.Screen options={{ headerShown: false }} />` — eliminates the `← matches/[id]` Expo Router default header

### 4. Offer detection logic fixed (critical bug)
- Was: `offer.route?.id` — always `undefined` because the API doesn't include `id` inside the nested `route` object
- Now: `offer.routeId` — uses the direct top-level field that the API does return
- Result: routes that already have a pending/accepted offer now correctly show "Στάλθηκε" instead of "Αίτημα Προσφοράς"

### 5. Web match-counts API — JWT Bearer auth
- Added same JWT `jwtVerify` pattern as other mobile-compatible endpoints so mobile clients can call this endpoint
