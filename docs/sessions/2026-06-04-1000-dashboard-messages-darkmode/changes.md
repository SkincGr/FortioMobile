# Αλλαγές Session — 2026-06-04

## Αρχεία που τροποποιήθηκαν

### Mobile (FortioMobile)

| Αρχείο | Περιγραφή |
|---|---|
| `app/(tabs)/index.tsx` | Dashboard — πλήρης redesign: dark mode, tab labels, offer layouts, modals, AWAITING statuses |
| `app/(tabs)/shipments/index.tsx` | Dark mode rewrite |
| `app/(tabs)/shipments/[id].tsx` | Dark mode styles + dark modal |
| `app/(tabs)/shipments/matches/[id].tsx` | Κουμπί Μηνύματα + plain message modal + sendPlainMessage |
| `app/(tabs)/messages/index.tsx` | Πλήρης rewrite — ταυτίζεται με web (shipment chips, kind filter, thread loading, MessageRow, reply footer) |
| `app/(tabs)/messages/[offerId].tsx` | Rewrite — ThreadPanel style, route header, subject input, Διαβάστηκε/Απάντηση/Νέο |
| `app/(tabs)/announcements.tsx` | Dark mode rewrite |
| `app/(tabs)/notifications.tsx` | Dark mode rewrite |
| `app/(tabs)/profile.tsx` | Dark mode, αφαίρεση useTheme, προσθήκη Προσωπικά Στοιχεία + Αλλαγή Password links |
| `app/(tabs)/profile-personal.tsx` | **ΝΕΟ** — Προσωπικά στοιχεία (GET/PATCH /api/sender/profile) |
| `app/(tabs)/profile-password.tsx` | **ΝΕΟ** — Αλλαγή password (POST /api/change-password) |
| `app/(auth)/login.tsx` | Dark mode rewrite + eye icon για password |
| `app/(auth)/register.tsx` | Dark mode rewrite + eye icons |
| `app/(auth)/forgot-password.tsx` | Dark mode |
| `lib/api.ts` | RouteMatch.messageCount, SenderProfile type, profileApi.get/update/changePassword, messagesApi.sendPlainMessage |
| `CLAUDE.md` | Κανόνας read-only Fortio + session docs με ώρα + commands.md |
| `components/ui/LoadingScreen.tsx` | Dark (#0a0a0a + amber spinner) |
| `components/ui/Badge.tsx` | Dark mode variants |
| `components/ui/Button.tsx` | Amber primary + dark secondary |

### Fortio (read-only — μόνο περιγραφή αλλαγών που πρέπει να γίνουν χειρωνακτικά)

| Αρχείο | Αλλαγή που απαιτείται |
|---|---|
| `app/api/sender/profile/route.ts` | Προσθήκη getMobileUserId + mobile JWT auth στο GET + PATCH |
| `app/api/shipments/[id]/matches/route.ts` | Διόρθωση message counting: directCounts με offerId=null + offerCounts με routeId filter |

---

## Features / Bug Fixes

### Dashboard
- **Tab labels**: "Αποστολές" → "Αποστολές προς Διεκπεραίωση"
- **Tab 2 Αιτήμ. Προσφορών**: Κουμπί "Δείτε Αίτημα →" → shipment detail
- **Tab 3 Προσφορές Μεταφ.**: Πλήρες layout (carrier + price + status + route + stops + message + conditions), AWAITING_SENDER/CARRIER statuses, modal Προβολή Προσφοράς
- **Tab 4 Πρός Μεταφορά**: Ίδιο layout με Tab 3
- **Tab 5 Μεταφέρονται**: Ίδιο layout + Μηνύματα button + route status badge
- **Dark mode**: Πλήρης μετάβαση (#0a0a0a, amber #F59E0B, rgba whites)
- **Offer Detail Modal**: Dark (#111 background)

### Matches Screen
- Κουμπί [Μηνύματα] με badge — count=0 ανοίγει popup, count>0 → messages center
- Διόρθωση double-counting στο Fortio API

### Messages Center
- Ταυτίζεται πλήρως με το web: shipment chips, kind filter (Μηνύματα/Προσφορές), unread toggle
- MessageRow: outgoing (μπλε) vs incoming (πράσινο), route info, subject bold, read badge, Διαβάστηκε/Απάντηση/Νέο
- Reply footer: Subject input + textarea + Απάντηση + Ακύρωση
- "Νέο": focus subject input | "Ακύρωση": scroll chips στο επιλεγμένο
- Counts: total messages (όχι unread) για filter badges

### Profile
- Νέα σελίδα Προσωπικά Στοιχεία (name, email, username, phone, vatNumber, country, city, address)
- Νέα σελίδα Αλλαγή Password (current + new + confirm, eye icons, validation)

---

## Logic Flow

### Messages center thread loading
1. Φόρτωση όλων conversations από `/api/messages`
2. Grouping by shipment → chips row
3. Filter by kind (isDirect vs isOffer) → visible conversations
4. loadThreads(visible): παράλληλο fetch για κάθε conversation → flat messages array
5. Unread filter εφαρμόζεται στο flat array
6. Reply: POST με offerId ή shipmentId+routeId ανάλογα με τον τύπο conversation

### Message count fix (matches)
- directCounts: messages με routeId IN finalRouteIds AND offerId=null (plain messages χωρίς offer)
- offerCounts: offers με shipmentId + routeId IN finalRouteIds → _count.messages (offer messages με routeId=null στο message)
- Αποφυγή double-count: τα δύο sets είναι αμοιβαία αποκλειστικά

---

## API Contract Changes

- **Mobile → Fortio**: `/api/sender/profile` GET/PATCH χρειάζεται mobile JWT support
- **Mobile → Fortio**: `/api/change-password` POST χρειάζεται mobile JWT support
- **Νέο mobile endpoint**: `messagesApi.sendPlainMessage({ shipmentId, routeId, content })` → POST /api/messages με messageType:1
