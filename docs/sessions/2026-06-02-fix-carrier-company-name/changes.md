# Fix: Company name shows "Μεταφορέας" in Διαθέσιμα Δρομολόγια

## Files Modified

### Fortio (web API)
- `app/api/shipments/[id]/matches/route.ts` — replaced deprecated `carrier.user.company` Prisma include with `company` and `vehicle` direct includes

### FortioMobile
- `lib/api.ts` — updated `RouteMatch` type: replaced old `carrier: { vehicleType, rating, user: { company } }` with `company?: { name, rating }` and `vehicle?: { type }`
- `app/(tabs)/shipments/matches/[id].tsx` — updated all 3 usages (`RouteCard` + modal) to read `route.company?.name`, `route.company?.rating`, `route.vehicle?.type`

## Root Cause

The Prisma schema was refactored: `Route` now belongs to `Company` directly (`Route.companyId → Company`) and to `Vehicle` (`Route.vehicleId → Vehicle`). The old model had a `CarrierProfile` intermediary where `Route.carrierId → CarrierProfile` and `CarrierProfile.userId → User → Company`. The API and mobile type still referenced the old path `carrier.user.company.name`, so `carrier` was undefined in the response and the fallback `'Μεταφορέας'` was always shown.

## Logic Flow

API: `prisma.route.findMany({ include: { company: { select: { name, rating } }, vehicle: { select: { type } } } })`  
Response: `route.company.name` / `route.company.rating` / `route.vehicle.type`  
Mobile type `RouteMatch`: `company?: { name, rating }`, `vehicle?: { type }`  
Display: `route.company?.name ?? 'Μεταφορέας'`

## API Contract Change

The `/api/shipments/[id]/matches` response now returns:
- `route.company: { name, rating }` instead of `route.carrier.user.company.name`
- `route.vehicle: { type }` instead of `route.carrier.vehicleType`
- `route.carrier` field removed entirely
