# Σφάλματα Session — 2026-06-04

## 1. Μηνύματα button δεν εμφανιζόταν (mobile matches)

**Τι πήγε λάθος**: Ο χρήστης έλεγε ότι το κουμπί δεν φαίνεται, ενώ υπήρχε ήδη στον κώδικα.

**Γιατί**: Σύγχυση μεταξύ Fortio web app και FortioMobile — ο χρήστης αναφερόταν στο mobile ενώ γινόταν επεξεργασία στο web.

**Λύση**: Ξαναδιαβάστηκε η εντολή, εντοπίστηκε το σωστό αρχείο mobile `app/(tabs)/shipments/matches/[id].tsx` και προστέθηκε εκεί.

---

## 2. Λανθασμένος count μηνυμάτων (0 αντί 4)

**Τι πήγε λάθος**: Η σελίδα matches έδειχνε 0 μηνύματα ενώ υπήρχαν 4.

**Γιατί**: Η αρχική fix (προσθήκη `offerId: null` στο directCounts) εξαίρεσε messages που είχαν ΚΑΙ routeId ΚΑΙ offerId. Το offerCounts τα χανε επίσης αν το offer είχε `routeId=null`.

**Λύση**: 
- `directCounts`: messages με `routeId IN finalRouteIds` (χωρίς φίλτρο offerId) για κάθε message με routeId στο ίδιο
- `offerCounts`: offer.messages WHERE `message.routeId IS NULL` (αποφυγή double-count)

---

## 3. Παραβίαση κανόνα read-only για Fortio

**Τι πήγε λάθος**: Έγιναν επεξεργασίες σε αρχεία του Fortio (`app/api/shipments/[id]/matches/route.ts`, `app/shipments/[id]/matches/page.tsx`) παρόλο που τα mobile projects δεν πρέπει να τροποποιούν το Fortio.

**Γιατί**: Ο κανόνας δεν υπήρχε ακόμα στο CLAUDE.md στην αρχή της session.

**Λύση**: Προστέθηκε ο κανόνας στο CLAUDE.md και στη memory. Οι απαιτούμενες αλλαγές στο Fortio περιγράφηκαν ως οδηγίες προς τον χρήστη.

---

## 4. Profile personal — "Αδύνατη η φόρτωση στοιχείων"

**Τι πήγε λάθος**: Η σελίδα Προσωπικά Στοιχεία εμφάνιζε σφάλμα κατά τη φόρτωση.

**Γιατί**: Το `/api/sender/profile` endpoint χρησιμοποιεί μόνο `getServerSession` (web NextAuth) και δεν αναγνωρίζει το mobile JWT Bearer token.

**Λύση**: Ο χρήστης χρειάζεται να προσθέσει `getMobileUserId` + JWT support στο Fortio endpoint (οδηγίες δόθηκαν).

---

## 5. TypeScript errors στο MessageRow (onNew prop)

**Τι πήγε λάθος**: `Cannot find name 'setText'` κτλ. — το `onNew` handler αναφερόταν σε state setters του parent μέσα στο child component.

**Γιατί**: Το `onPress={() => { setText(''); ... }}` γράφτηκε μέσα στο `MessageRow` αλλά τα `setText`, `setSubject`, `setReplyMsgType` ανήκουν στον parent.

**Λύση**: Προστέθηκε `onNew: () => void` prop στο `MessageRow` και ο handler ορίζεται στον parent που έχει πρόσβαση στα state setters.
