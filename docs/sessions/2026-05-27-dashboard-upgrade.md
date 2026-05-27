# 2026-05-27 — Dashboard Upgrade: Burger Menu + Tab Restructure + Announcements Screen

## Files Modified

### Mobile (`C:\Users\CSKIN\FortioMobile`)
- `app/(tabs)/_layout.tsx` — Tab bar changed from 5 tabs to 3; hidden screens still accessible via router
- `app/(tabs)/index.tsx` — Added burger menu (Modal) to header; restructured header; announcement badge now tappable
- `lib/api.ts` — Added `Announcement` type + `announcementsApi.list()`

### Mobile (New)
- `app/(tabs)/announcements.tsx` — New announcements screen (list of active carrier announcements)

## Changes

### 1. Tab bar restructured
- **Before:** Dashboard | Αποστολές | Μηνύματα | Ειδοποιήσεις | Προφίλ (5 tabs)
- **After:** Dashboard | Μηνύματα | Ανακοινώσεις (3 tabs)
- Hidden tabs (shipments, notifications, profile) still accessible via `router.push` from burger menu

### 2. Burger menu (header)
- Added `≡` circular button to top-right of dashboard header
- Opens a right-side slide-in Modal (same as web `SenderNav`)
- Menu items: Dashboard, Προφίλ, Ασφάλεια, Ρυθμίσεις, ─── Αποσύνδεση
- Overlay tap closes the menu

### 3. Header restructured
- Added `FORTIO` logo text to top-left (like web nav)
- Burger `≡` button top-right (circular, matching web style)
- Greeting + name + date remain below
- Announcement badge is now tappable → navigates to Ανακοινώσεις tab

### 4. Announcements screen (new)
- Fetches from `/api/announcements` (public endpoint, no JWT required)
- Displays carrier name, vehicle icon, star rating, title, body, optional CTA
- Pull-to-refresh, empty state with megaphone icon
- staleTime: 60s

### 5. API additions
- `Announcement` type (id, title, body, status, ctaText, priority, carrier, createdAt)
- `announcementsApi.list()` → GET `/api/announcements`
