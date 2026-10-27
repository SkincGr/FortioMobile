# FortioMobile — Expo Mobile App (Sender-Only)

Expo SDK 57 / React Native 0.86 mobile application.  
**Scope: SENDER role only.** Carrier and Admin functionality are web-only (see Fortio).

> **Before writing any code**, read the exact versioned Expo docs:
> https://docs.expo.dev/versions/v57.0.0/

---

## 1. Relationship with Fortio (Web Platform)

FortioMobile and Fortio are **two separate Git repositories** that share the **same backend** (Fortio's Next.js API + Supabase/Prisma database). They are sibling folders: `…\Fortio` and `…\FortioMobile` (on the current machine under `C:\Users\SkinCGr\Desktop\GitHubRep\`; older docs say `C:\Users\CSKIN\`, which was another machine).

| Concern | Fortio (web) | FortioMobile |
|---|---|---|
| Repo | `..\Fortio` (branch per feature, `main`) | `..\FortioMobile` (`master`) |
| Runtime | Next.js (App Router) | Expo SDK 57 / React Native 0.86 |
| Roles served | SENDER + CARRIER + ADMIN | **SENDER only** |
| Backend/API | Owns it | Consumes it |
| Database schema | Owns it (Prisma) | Read-only consumer |

### Critical separation rules

* **NEVER edit files in the Fortio repo from a mobile session.** All code changes here happen in FortioMobile. Fortio files may only be **read** — to understand API contracts, data models, or business logic.
* **Never alter the Prisma schema or run migrations from this directory.** Schema changes always happen in Fortio via `npx prisma migrate dev`.
* **API contract:** FortioMobile calls Fortio's `/api/*` endpoints. When a mobile change needs a backend change, write it in the session's `changes.md` (section «API contract»: endpoint, what must change, why). The user then applies it in a Fortio session.
* **Auth:** Fortio's `/api/auth/mobile/login` issues a 30-day Bearer token (SENDER accounts only — anything else gets 403). Every sender endpoint resolves it with `getApiUser`. A password change revokes all tokens and returns a fresh one for the calling device (`/api/change-password` → `token`); the app stores it. Never implement a parallel auth system.
* **Environment / secrets:** server-side secrets (Supabase service key, Google server key, etc.) must **never** appear in mobile code or the app bundle.

---

## 2. Data Model Reference (read-only for mobile)

The canonical data model lives in `Fortio\prisma\schema.prisma`. Relevant entities for the SENDER role:

```
User (role = SENDER, optionally companyId + companyRole for a company sender)
  └── Shipment[]          ← sender creates/manages (category + categories, cardDetails for the category's card)
        ├── ShipmentPhoto[]  ← photos (per room for a move)
        └── Offer[]       ← carriers respond; sender accepts / rejects / cancels before loading
              ├── Message[]   ← sender↔carrier messaging
              └── Review      ← sender reviews the carrier after delivery
Message                   ← attached to an Offer, or to a Shipment + Route pair (first contact before any offer)
Route ── RouteStop        ← carrier routes and carrier cards (Move / Bins / Rental); the sender only reads/requests them
PlaceLocation             ← Google place cache (googlePlaceId is the key), via Fortio's /api/places proxy
```

There is **no** `CarrierProfile` model (a carrier is a `User` with `role: CARRIER`) and **no payment integration** — the `Payment` model exists but nothing writes to it.

---

## 3. Mobile Scope — Sender Features

- **Auth:** login (username or email), register as individual or company sender, forgot password, change password.
- **Shipments:** create / edit / cancel with the web's form: 15 categories (multi-select), cards for Move, Bins, Vehicle, Boat, Rental, item lists, photos (per room for moves), automatic item recording from photos.
- **Dashboard:** tabs (shipments, requests, offers, to transport, in transit), template-driven actions (accept, reject, cancel request, clarification, info / cancel before loading).
- **Matches:** carrier routes and carrier cards for a shipment, requests, hide / restore cards; route search for a shipment; public route search.
- **Messages:** threads per offer and first contact per shipment + route, with templates.
- **Archive:** completed shipments and carrier reviews.
- **Templates:** ready-made and personal templates per kind (Routes / Move / Bins / Rentals).
- **Profile:** sender details, language (el / en / fr), theme, auto-translate, help (support@fortio.gr).
- **Announcements and Notifications:** kept in the mobile app (decision 27/10/2026), even though the web sender menu has no equivalent.

**Web-only (do not implement here):** carrier and admin features, company details and company users / access (decision 27/10/2026).

---

## 4. Architecture & Project Structure

```text
app/                       # Expo Router file-based navigation
  (auth)/                  # login, register, forgot-password
  (tabs)/                  # bottom tabs: index (dashboard), messages, announcements, profile
    shipments/             # index, [id] (detail + offers), new (create/edit form), matches/[id], route-search/[id]
    shipments-archive.tsx  # archive + reviews
    routes-search.tsx      # public route search
    templates.tsx          # message templates
    notifications.tsx, profile-personal.tsx, profile-password.tsx
components/
  shipment-form/           # cards of the shipment form (move, cargo items, vehicle/boat, rental, photos, AI analysis)
  TemplateSendModal.tsx    # template picker used by the dashboard actions
  PlacesInput.tsx          # Google place autocomplete through /api/places
lib/
  api.ts                   # typed axios wrappers for Fortio's /api/* endpoints
  auth.tsx                 # AuthProvider (token + user in SecureStore, sender-only guard)
  i18n.tsx                 # app strings (el / en / fr)
  formStrings.ts           # shipment-form strings: the web's i18n sections verbatim (same keys) + French
  shared/                  # verbatim copies of Fortio's pure lib/ modules used by the form (see its README)
  templates.ts, photos.ts, display.ts, cityDisplay.ts, storage.ts, theme.tsx
constants/                 # colors, API base URL (constants/config.ts)
```

`lib/shared/*` and the el/en part of `lib/formStrings.ts` are copied from Fortio. Never edit them here; re-copy them when Fortio changes.

---

## 5. Dev Commands (PowerShell)

```powershell
npx expo start            # Start dev server (Expo Go or dev build) — also generates expo-env.d.ts
npx expo start --tunnel   # Use when on a different network than device
npx expo run:android      # Build & run on Android emulator / device
npx expo run:ios          # Build & run on iOS simulator (Mac only)
npx tsc --noEmit          # Type-check (needs expo-env.d.ts, created by expo start)
npx expo export --platform android   # Check that the JS bundle builds
```

---

## 6. Session Documentation (MANDATORY — mirrors Fortio policy)

At the end of every session or completed task, create a dated subfolder inside `docs/sessions/` and populate **three** files:

```
docs/sessions/YYYY-MM-DD-HHmm-feature-name/
  commands.md  ← all instructions / requests given by the user during the session
  changes.md   ← what was built / changed
  errors.md    ← problems encountered
```

> Folder name format: `YYYY-MM-DD-HHmm-feature-name` (date + time + short description).  
> Example: `2026-06-04-1430-dashboard-redesign`

### `commands.md` must include:
A numbered list of **every instruction or request** the user gave during the session, in order. Write each one as a short summary (one line), preserving the original intent.

### `changes.md` must include:
1. Files created or modified (with brief description of each).
2. Features, bug fixes, or UI/navigation changes implemented.
3. The **logic flow** of the main change (why it was structured this way, data flow, decision points).
4. Any API contract changes that affect Fortio (section «API contract» — see §1).

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

- **Fortio API base URL:** `API_BASE_URL` in `constants/config.ts` (production URL; a commented local-dev URL is next to it).
- **Google Places:** always through Fortio's `/api/places` — never call Google directly from mobile.
- **Photos:** `expo-image-picker` (camera / gallery) and `expo-image-manipulator` (resize to 800 or 1280 px, JPEG) before `POST /api/shipments/:id/photos` (max 4 MB).
- **Payments:** there is no payment integration (removed from Fortio on purpose). Do not add Stripe or any payment flow.
