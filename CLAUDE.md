# FortioMobile — Expo Mobile App (Sender-Only)

Expo SDK 56 / React Native mobile application.  
**Scope: SENDER role only.** Carrier and Admin functionality are web-only (see Fortio).

> **Before writing any code**, read the exact versioned Expo docs:
> https://docs.expo.dev/versions/v56.0.0/

---

## 1. Relationship with Fortio (Web Platform)

FortioMobile and Fortio are **two separate Git repositories** that share the **same backend** (Fortio's Next.js API + Supabase/Prisma database).

| Concern | Fortio (web) | FortioMobile |
|---|---|---|
| Repo | `C:\Users\CSKIN\Fortio` | `C:\Users\CSKIN\FortioMobile` |
| Runtime | Next.js 14 (App Router) | Expo SDK 56 / React Native |
| Roles served | SENDER + CARRIER + ADMIN | **SENDER only** |
| Backend/API | Owns it | Consumes it |
| Database schema | Owns it (Prisma) | Read-only consumer |

### Critical separation rules

* **Never modify Fortio files from this repo.** Any shared logic (types, constants, validation rules) must be duplicated in FortioMobile until a shared package is introduced — do not create cross-repo file imports or symlinks.
* **Never alter the Prisma schema or run migrations from this directory.** Schema changes always happen in `C:\Users\CSKIN\Fortio` via `npx prisma migrate dev`.
* **API contract:** FortioMobile calls Fortio's `/api/*` endpoints. Any API change in Fortio must be reflected here, and vice-versa a change here must not require an undocumented API behaviour change in Fortio.
* **Auth:** Authentication is handled by Fortio's NextAuth. FortioMobile stores the session token received from the web API — never implement a parallel auth system.
* **Environment variables:** This app has its own `.env` / `app.config.js`. Fortio's server-side secrets (Stripe secret key, Supabase service key, etc.) must **never** appear in mobile code or be embedded in the app bundle.

---

## 2. Data Model Reference (read-only for mobile)

The canonical data model lives in `C:\Users\CSKIN\Fortio\prisma\schema.prisma`. Relevant entities for the SENDER role:

```
User (role = SENDER)
  └── Shipment[]          ← sender creates/manages
        └── Offer[]       ← carriers respond; sender accepts/rejects
              ├── Message[]   ← sender↔carrier messaging
              └── Payment     ← sender initiates payment after acceptance
User └── Review[]         ← sender leaves review post-delivery
PlaceLocation             ← cached via Fortio's /api/places proxy
```

**Carrier-only entities (out of scope for mobile):** `CarrierProfile`, `Route`, `RouteStop`, `Announcement`.

---

## 3. Mobile Scope — Sender Features Only

FortioMobile implements **only** the following flows:

- **Auth:** Login / Register as SENDER.
- **Shipments:** Create, view, edit, cancel shipments.
- **Offers:** View incoming offers on a shipment, accept / reject.
- **Messages:** Sender↔Carrier messaging thread (per offer).
- **Payments:** Initiate payment for an accepted offer.
- **Reviews:** Leave a review after delivery.
- **Profile:** View / edit sender profile.

**Do not implement** carrier dashboard, route management, announcements, or admin features — these are intentionally web-only.

---

## 4. Architecture & Project Structure

```text
app/                     # Expo Router file-based navigation
  (auth)/                # Login, Register screens
  (tabs)/                # Bottom-tab layout (home, shipments, messages, profile)
  shipments/
    index.tsx            # Shipment list
    new.tsx              # Create shipment
    [id]/
      index.tsx          # Shipment detail
      offers.tsx         # Offers list for shipment
      [offerId]/
        messages.tsx     # Messaging thread
components/              # Shared React Native components
lib/
  api.ts                 # Typed fetch wrappers for Fortio's /api/* endpoints
  auth.ts                # Session token storage (SecureStore)
constants/               # Shared enums/types mirrored from Fortio
```

---

## 5. Dev Commands (PowerShell)

```powershell
npx expo start            # Start dev server (Expo Go or dev build)
npx expo start --tunnel   # Use when on a different network than device
npx expo run:android      # Build & run on Android emulator / device
npx expo run:ios          # Build & run on iOS simulator (Mac only)
npx tsc --noEmit          # Type-check without emitting
```

---

## 6. Session Documentation (MANDATORY — mirrors Fortio policy)

At the end of every session or completed task, create a dated subfolder inside `docs/sessions/` and populate two files:

```
docs/sessions/YYYY-MM-DD-feature-name/
  changes.md   ← what was built / changed
  errors.md    ← problems encountered
```

### `changes.md` must include:
1. Files created or modified (with brief description of each).
2. Features, bug fixes, or UI/navigation changes implemented.
3. The **logic flow** of the main change (why it was structured this way, data flow, decision points).
4. Any API contract changes that affect Fortio.

### `errors.md` must include (one entry per problem):
1. **What went wrong** — the exact error or unexpected behaviour.
2. **Why it happened** — root cause analysis.
3. **How it was resolved** — the fix applied and why it works.

*If no errors occurred during the session, create `errors.md` with a single line: `No errors.`*

---

## 7. Git Checkpoints

Same workflow as Fortio. When asked for a checkpoint (`"φτιάξε checkpoint [name]"`):

```powershell
git add -A
git commit -m "checkpoint: [name]"
git tag "cp-[name]"
git push
git push --tags
```

---

## 8. External Integrations

- **Fortio API base URL:** set via `EXPO_PUBLIC_API_URL` in `.env`.
- **Google Places:** always proxy through Fortio's `/api/places/` — never call Google Places directly from mobile.
- **Stripe:** use `@stripe/stripe-react-native`. Only the **publishable key** (`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`) goes in mobile. Payment intent creation stays server-side in Fortio.
