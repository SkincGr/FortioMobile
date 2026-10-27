# Changes — Χάρτης για συντεταγμένες (συμπλήρωμα του βήματος 4)

Στη φόρμα αποστολής, οι «Συντεταγμένες Παραλαβής» και «Συντεταγμένες Παράδοσης» έχουν πλέον το κουμπί «📍 Βρες στον χάρτη», όπως το `MapPickerModal` του web. Μένουν και οι δύο παλιοί τρόποι: τρέχουσα τοποθεσία και χειροκίνητη εισαγωγή.

## Αρχεία
- `components/shipment-form/MapPickerModal.tsx` (νέο) — χάρτης σε πλήρη οθόνη:
  - Ο δείκτης μπαίνει με πάτημα στον χάρτη και μετακινείται με σύρσιμο.
  - Η αναζήτηση πόλης ή περιοχής μετακινεί μόνο τον χάρτη.
  - «📍 Η θέση μου» βάζει τον δείκτη στη θέση της συσκευής.
  - Το κουμπί «Χρήση θέσης (lat, lng)» είναι ενεργό μόνο όταν υπάρχει δείκτης.
- `app/(tabs)/shipments/new.tsx` — κουμπί «Βρες στον χάρτη» σε κάθε ομάδα συντεταγμένων. Ένα κοινό παράθυρο χάρτη για παραλαβή και παράδοση. Η επιλογή γράφει lat/lng με 6 δεκαδικά, όπως το web.
- `app.config.js` (νέο) — παίρνει το `app.json` όπως είναι και προσθέτει το plugin `react-native-maps` με κλειδί Android από τη μεταβλητή `GOOGLE_MAPS_ANDROID_API_KEY`.
- `lib/formStrings.ts` — κείμενα `mobile.map_*` (el/en/fr, ίδια με το web).
- `CLAUDE.md` — ενότητα για τους χάρτες και το κλειδί Android.
- `package.json` / `package-lock.json` — `react-native-maps` 1.27.2 (`npx expo install`).

## Λογική
- **Πού ανοίγει ο χάρτης:** αν υπάρχουν ήδη συντεταγμένες, ανοίγει πάνω τους με zoom γειτονιάς. Αλλιώς στη διεύθυνση και την πόλη της πλευράς. Αλλιώς στην Ελλάδα, όπως το web που ξεκινά σε zoom χώρας.
- **Κεντράρισμα χωρίς κλειδί Google:** το web κεντράρει με το place id μέσω του Google Places JS. Το `/api/places` του Fortio δεν επιστρέφει συντεταγμένες, και ένα κλειδί Places μέσα στην εφαρμογή θα ήταν εκτεθειμένο. Γι' αυτό το mobile κεντράρει με τον geocoder της συσκευής (`Location.geocodeAsync` του `expo-location`), πάνω στο κείμενο «διεύθυνση, πόλη». Η ακριβής θέση είναι έτσι κι αλλιώς ό,τι διαλέξει ο χρήστης πάνω στον χάρτη.
- **Το `key` του `MapView`:** το `initialRegion` διαβάζεται μόνο στο mount. Ένα νέο κέντρο (νέο άνοιγμα ή αποτέλεσμα geocode) δημιουργεί νέο χάρτη. Οι μετακινήσεις μέσα στον χάρτη γίνονται με `animateToRegion` και δεν τον ξαναφτιάχνουν.

## Ρύθμιση που χρειάζεται για build Android
Το `react-native-maps` στο Android χρησιμοποιεί πάντα Google Maps. Στο Expo Go ο χάρτης δουλεύει χωρίς κλειδί. Σε APK / store build χρειάζεται κλειδί **Maps SDK for Android**:
1. Google Cloud Console: ενεργοποίηση «Maps SDK for Android» και νέο API key, περιορισμένο σε Android apps με package `com.skincgr.FortioMobile` και το SHA-1 του πιστοποιητικού υπογραφής (`eas credentials`).
2. `eas env:create --name GOOGLE_MAPS_ANDROID_API_KEY --value <key>` (ή τοπικά ως μεταβλητή περιβάλλοντος πριν το build).

Τα δύο κλειδιά του Fortio (browser με referrer, server με API/IP) δεν δουλεύουν σε εφαρμογή Android. Στο iOS ο χάρτης είναι Apple Maps και δεν θέλει κλειδί.

## Επαλήθευση
- `npx tsc --noEmit`: 0 σφάλματα.
- `npx expo config`: το plugin φορτώνεται, και με τη μεταβλητή περνά το `androidGoogleMapsApiKey`.
- `npx expo export --platform android`: το bundle χτίζεται.
- `npx expo-doctor`: δύο έλεγχοι αποτυγχάνουν, και οι δύο υπήρχαν πριν. Το `@expo/config-plugins` μπήκε σκόπιμα στην αναβάθμιση σε SDK 57. Οι διαφορές patch αφορούν τα `expo`, `expo-constants`, `expo-linking`, `expo-location` και `expo-router`.
- Δεν δοκιμάστηκε σε συσκευή.

## API contract
Καμία αλλαγή στο Fortio. Μια μελλοντική βελτίωση θα ήταν το `/api/places?placeId=…` να επιστρέφει και `lat`/`lng`. Τότε ο χάρτης θα κεντράρει στο place id όπως το web, χωρίς geocoder συσκευής. Δεν είναι απαραίτητο.
