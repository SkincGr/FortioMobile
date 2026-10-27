# lib/shared — αντίγραφα από το Fortio

Τα αρχεία αυτού του φακέλου είναι **αυτούσια αντίγραφα** του `Fortio/lib/` (καθαρό TypeScript, χωρίς React ή Next.js):
`shipmentCategories`, `cargoInventory`, `transportCards`, `rentalCard`, `myAddress`, `carrierCard`, `moveCard`,
`moveVolume`, `photoLimits`, `moveInventoryMerge`, `moveCatalog`, `itemGroups`.

Η φόρμα αποστολής του mobile τα χρησιμοποιεί ώστε οι κανόνες (πολλαπλή επιλογή κατηγοριών, κάρτες Μετακόμισης / Κάδων /
Οχήματος / Σκάφους / Ενοικίασης, κατάλογος αντικειμένων, εκτίμηση όγκου, όρια φωτογραφιών, σώμα αιτήματος) να είναι οι ίδιοι
με του web και του backend, που τα επικυρώνει με τα ίδια αρχεία.

- Πηγή της αλήθειας είναι το Fortio. Μην τα αλλάζεις εδώ· όταν αλλάξουν στο Fortio, αντιγράφονται ξανά ολόκληρα.
- Τα κείμενα που χρειάζονται (`t('moveCard.…')` κ.λπ.) είναι στο `lib/formStrings.ts`, με τα ίδια κλειδιά με το web.
- Αντιγράφηκαν από το Fortio στις 27/10/2026 (branch `Add_Metakomisi`, commit `36a7b41`).
