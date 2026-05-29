# Changes — 2026-05-30 New Dashboard Tabs

## Files Modified
- `app/(tabs)/index.tsx` — complete rewrite of the sender dashboard

## Features Implemented

### 1. New 5-tab navigation (replaces old 3-tab)
| Key | Label | Content |
|---|---|---|
| `shipments` | Αποστολές | Active shipments (PENDING / OFFERED) |
| `offer_requests` | Αιτημ. Προσφορών | Offers with status REQUEST (sender sent to carrier) |
| `carrier_offers` | Προσφορές Μεταφ. | Offers with status PENDING (carrier made to sender) |
| `to_transport` | Πρός Μεταφορά | Shipments with ACCEPTED / LOADED status |
| `in_transit` | Μεταφέρονται | Shipments with IN_TRANSIT / DELIVERED + completedShipments |

Tab bar is a horizontal `ScrollView` so all 5 tabs fit without crowding.

### 2. OfferGroupCard component (new)
Used for `offer_requests` and `carrier_offers` tabs. Structure:
- **Route header**: bus icon + route number + origin→dest + carrier name + departure date
- **Shipment info**: category icon + title + status badge + price (carrier_offer only)
- **Actions**: Μηνύματα button + Αποδοχή/Απόρριψη buttons (carrier_offer mode only)

Navigates to `/(tabs)/messages/[offerId]` for messaging.

### 3. ShipmentCard updated (Αποστολές tab)
Old layout → New layout:
- Row A: [Επεξεργασία] [Διαγραφή]  (Μηνύματα removed from this row)
- Row B: [Δρομολόγια •n] [Μηνύματα •n]  ("Εμφάνιση Δρομολογίων" → "Δρομολόγια", Μηνύματα moved here)
- Row C: [Αιτήματα •n] [Προσφορές •n] [Επιλέχτηκε] (labels only, not interactive)
  - Αιτήματα count = offers with status REQUEST
  - Προσφορές count = offers with status PENDING
  - Επιλέχτηκε = visible only when an ACCEPTED offer exists

### 4. [Εξοδος] button in header
Added to the left of the burger button. Calls `logout()` directly (no modal). Styled as a pill button with icon.

### 5. Accept/Reject mutations added
`acceptMut` and `rejectMut` using `offersApi.accept/reject` with confirmation dialogs.

## Logic Flow
Data flows from `/api/dashboard/sender` → `data.shipments[]` (each with `offers[]`).  
- `offerRequestItems` and `carrierOfferItems` are flat arrays derived by iterating all shipments and filtering offers by status.
- The FlatList renders either `OfferGroupCard` (offer views) or `ShipmentCard` (shipment views) based on `isOfferView` flag.
- Query invalidation uses `['dashboard']` prefix to catch all sort variants.

## API Contract
No changes to API endpoints. Relies on existing offer `status` values: `REQUEST`, `PENDING`, `ACCEPTED`.
