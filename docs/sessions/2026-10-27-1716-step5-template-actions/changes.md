# Changes — Βήμα 5: ενέργειες με πρότυπα

Το παράθυρο προτύπων (`TemplateSendModal`) και οι έξι ροές «μήνυμα και μετά ενέργεια» του πίνακα υπήρχαν ήδη στο `origin/master` (commits `b82b8bf`, `788659e`, 30/9): Αποδοχή (`OFFER_ACCEPTED` → ACCEPTED), Απόρριψη (`OFFER_REJECTBYUSER` → REJECTED), Ακύρωση αιτήματος (`REQUEST_CANCELED` → REJECTED), Διευκρίνηση / καλύτερη τιμή (`OFFER_INFO`), Διευκρινίσεις πριν τη φόρτωση (`OFFER_LOAD_INFO`), Ακύρωση πριν τη φόρτωση (→ CANCELLED). Η σύγκριση με το `app/sender/dashboard/page.tsx` του web έδειξε δύο διαφορές, που διορθώθηκαν εδώ.

## Αρχεία
- `lib/templates.ts` — `TemplateKind` και `templateKindForCategory()` (ίδια με το `lib/templates.ts` του Fortio). Το `useMessageTemplates(role, category, kind)` ζητά `/api/templates?role=…&kind=…` (προεπιλογή `TRANSPORTS`, όπως το `TemplatePickerModal` του web). Το δικό μου αντίγραφο ενός κοινού προτύπου δεν εμφανίζεται δύο φορές.
- `components/TemplateSendModal.tsx` — νέο prop `kind`.
- `app/(tabs)/index.tsx` — οι ροές του πίνακα φορτώνουν τα πρότυπα του είδους της αποστολής. Η «Ακύρωση πριν τη φόρτωση» χρησιμοποιεί `OFFER_CANCEL` για Μετακομίσεις, Κάδους και Ενοικιάσεις και `OFFER_CANCELL_BEFORELOAD` για Μεταφορές.

## Λογική
- Το backend κρατά τα πρότυπα ανά `transport_kind`. Χωρίς `kind`, το `/api/templates` επέστρεφε τα πρότυπα όλων των ειδών μαζί. Έτσι μια μετακόμιση μπορούσε να προεπιλέξει πρότυπο Μεταφορών, και η ακύρωση πριν τη φόρτωση σε μετακόμιση/κάδο δεν έβρισκε κανένα πρότυπο (η κατηγορία της εκεί είναι `OFFER_CANCEL`).
- Οι υπόλοιπες χρήσεις (μηνύματα, matches, αναζήτηση) μένουν στην προεπιλογή Μεταφορών, όπως η σελίδα μηνυμάτων του web. Τα matches περνούν το είδος τους στο βήμα 6.

## Επαλήθευση
- `npx tsc --noEmit`: 0 σφάλματα. Δεν δοκιμάστηκε σε συσκευή.

## API contract
Καμία αλλαγή στο Fortio. Το `/api/templates` δέχεται ήδη `kind` και το token του mobile.
