# Errors

## 1. TypeScript error after initial fix

**What went wrong:** After removing `carrier` from `RouteMatch` type, a remaining reference to `modalRoute.carrier?.vehicleType` on line 259 of `matches/[id].tsx` caused a TS2339 error.

**Why:** Missed one occurrence inside the request modal template.

**How resolved:** Updated that line to `modalRoute.vehicle?.type` — caught by `npx tsc --noEmit` and fixed immediately.
