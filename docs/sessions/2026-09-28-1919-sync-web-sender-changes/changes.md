# Changes — sync of recent Fortio web (sender-side) changes

## Files

- `lib/api.ts` — types: shipment recipient fields, offer `createdAt`, carrier company `id`/`totalTrips`, route `recurrence`/`recurrenceEndDate`/company `id`; `CreateShipmentPayload` now carries the (required) recipient fields.
- `lib/display.ts` (new) — `carrierRating()` (real rating or deterministic 4.00–4.89 placeholder, same scheme as web), `recurrenceNote()` (el/en/fr), `fmtDate()`.
- `lib/i18n.tsx` — new keys (el/en/fr) for cancel, sort, offer counts, request popup, reply, menu items and the shipment-details card.
- `app/(tabs)/shipments/new.tsx` — recipient section (name*, phone*, email) with "Ίδιος με τον Αποστολέα"; step 3 summary lists every field in form order, "-" when empty.
- `app/(tabs)/shipments/[id].tsx` — new "Στοιχεία Αποστολής" card with every shipment field above the offers.
- `app/(tabs)/shipments/matches/[id].tsx` — red-star rating (with placeholder), routes sorted best-rated first, blue recurrence line, shipment summary header, request can't be sent empty.
- `app/(tabs)/index.tsx` — see below.

## Features

- **Create shipment works again.** Fortio's `POST /api/shipments` requires `recipientName` + `recipientPhone` since the recipient rollout; mobile didn't send them, so every create returned 400.
- **Dashboard**
  - Shipments tab: "Ακύρωση" on the title row (right), disabled once an offer is accepted; replaces "Διαγραφή" (the endpoint cancels, it never deleted).
  - Requests tab: "Δείτε Αίτημα" opens the offer popup (request label, sent date, the request text) instead of navigating away.
  - Offers tab: carrier rating on each offer, offer count per shipment, sort by Τιμή / Αξιολόγηση, inline message/conditions removed (they stay in the popup).
  - Offer popup: "Απάντηση" opens the offer's message thread.
  - Burger: "Νέα Αποστολή" and "Πρότυπα Μηνυμάτων & Email" added.

## Logic notes

- Recipient "same as sender": ticking copies the sender profile (`GET /api/sender/profile`), unticking clears the fields — never leaves the sender's data in fields claiming to be the recipient's. While ticked, the fields re-sync when the profile loads (same as web).
- Rating placeholder is keyed on the carrier company id (fallback: carrier email / route id), so it is stable and identical to what web shows for the same carrier.

## Not ported (out of mobile scope or needs a new dependency)

- `/routes` public route search (radius search, "Μόνο Νέα Δρομολόγια", etc.) — route search is web-only per CLAUDE.md.
- Map popup coordinate picker — would need `react-native-maps` (new native dependency); the existing "current location / manual" coordinate entry stays.

## API contract

No Fortio API changes required.

## Follow-up: "Πόλη / Χώρα" everywhere (web commit 68dc074, 26/9)

- `lib/cityDisplay.ts` (new) — `cityWithCountryFrom()` / `fCity()`: same rule as web (`Αθήνα/Ελλάδα`, `Athens/Greece`), country name from the place's `countryShortName` in the app language (el/en/fr); when an endpoint doesn't send the place (archive, some message payloads) it falls back to the country already in the city text.
- `lib/i18n.tsx` — `currentLanguage()` getter so the plain `fCity` helper follows the selected language.
- Replaced the city-only `fCity` (which cut the country off) in dashboard, shipments list, shipment detail, matches, route search, archive, and both message screens; `originPlace`/`destPlace` added to the relevant `lib/api.ts` types and passed at every call site.
