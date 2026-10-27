import type { YesNo } from './moveCard'

/**
 * Κάρτα αποστολής «Ενοικίαση Van / Οχήματος» (shipments.card_details.rental): τι όχημα ζητά ο αποστολέας, για πόσο και πόσα χιλιόμετρα,
 * και αν θέλει και οδηγό. Όλες οι τιμές είναι κωδικοί από κλειστές λίστες (combo boxes)· ό,τι έρχεται από τη φόρμα ή τη βάση
 * καθαρίζεται εδώ — άγνωστες τιμές πετιούνται, τα κείμενα κόβονται.
 */

export const RENTAL_VEHICLE_TYPES = ['SMALL_VAN', 'MEDIUM_VAN', 'LARGE_VAN', 'TRUCK'] as const
export const RENTAL_LENGTHS = ['UP_TO_2', '2_TO_2_5', '2_5_TO_3_2', '3_2_TO_4'] as const
export const RENTAL_WIDTHS = ['UP_TO_1_4', '1_4_TO_1_7', '1_7_TO_2'] as const
export const RENTAL_HEIGHTS = ['UP_TO_1_3', '1_3_TO_1_7', '1_7_TO_2'] as const
export const RENTAL_VOLUMES = ['UP_TO_4', '5_TO_8', '9_TO_12', '13_TO_17'] as const
export const RENTAL_PAYLOADS = ['UP_TO_600', '600_TO_1000', '1000_TO_1500', 'OVER_1500'] as const
export const RENTAL_LICENSES = ['B', 'C'] as const
export const RENTAL_DURATIONS = ['HALF_DAY', 'ONE_DAY', 'TWO_THREE_DAYS', 'ONE_WEEK', 'LONG_TERM'] as const
export const RENTAL_DISTANCES = ['UP_TO_100', '100_TO_300', '300_TO_600', 'OVER_600'] as const
export const RENTAL_DRIVER_MODES = ['WITHOUT_DRIVER', 'WITH_DRIVER'] as const
export const RENTAL_DAILY_HOURS = ['UP_TO_4', '4_TO_8', '8_TO_10', 'OVER_10'] as const

export type RentalDetails = {
  vehicleType: string
  /** Ελάχιστες διαστάσεις χώρου φόρτωσης: ξεχωριστά μήκος/πλάτος/ύψος ή (εναλλακτικά) όγκος */
  length: string
  width: string
  height: string
  volume: string
  payload: string
  licenseCategory: string
  duration: string
  distance: string
  /** Πλήρης ασφαλιστική κάλυψη (π.χ. χωρίς απαλλαγή) */
  fullInsurance: YesNo
  notes: string
  // ── Παροχή οδηγού ──
  driverMode: string
  /** Ζητείται και συνοδηγός (μόνο με οδηγό) */
  coDriver: YesNo
  dailyHours: string
  /** Ο οδηγός/συνοδηγός συμμετέχει στη φόρτωση και εκφόρτωση */
  helpsLoading: YesNo
  /** Διανυκτέρευση του οδηγού εκτός έδρας */
  overnight: YesNo
}

export const emptyRental = (): RentalDetails => ({
  vehicleType: '', length: '', width: '', height: '', volume: '', payload: '', licenseCategory: '', duration: '', distance: '',
  fullInsurance: '', notes: '', driverMode: '', coDriver: '', dailyHours: '', helpsLoading: '', overnight: '',
})

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const yesNo = (v: unknown): YesNo => (v === 'YES' || v === 'NO' ? v : '')
const pick = (v: unknown, allowed: readonly string[]): string => (typeof v === 'string' && allowed.includes(v) ? v : '')

export function normalizeRental(input: unknown): RentalDetails {
  const d = obj(input)
  const driverMode = pick(d.driverMode, RENTAL_DRIVER_MODES)
  const withDriver = driverMode === 'WITH_DRIVER'
  const volume = pick(d.volume, RENTAL_VOLUMES)
  return {
    vehicleType: pick(d.vehicleType, RENTAL_VEHICLE_TYPES),
    // Ο όγκος και οι τρεις διαστάσεις είναι εναλλακτικές: με όγκο δεν κρατιούνται οι διαστάσεις
    length: volume ? '' : pick(d.length, RENTAL_LENGTHS),
    width: volume ? '' : pick(d.width, RENTAL_WIDTHS),
    height: volume ? '' : pick(d.height, RENTAL_HEIGHTS),
    volume,
    payload: pick(d.payload, RENTAL_PAYLOADS),
    // Με οδηγό το δίπλωμα είναι του οδηγού που παρέχεται, όχι του αποστολέα
    licenseCategory: withDriver ? '' : pick(d.licenseCategory, RENTAL_LICENSES),
    duration: pick(d.duration, RENTAL_DURATIONS),
    distance: pick(d.distance, RENTAL_DISTANCES),
    fullInsurance: yesNo(d.fullInsurance),
    notes: typeof d.notes === 'string' ? d.notes.trim().slice(0, 1000) : '',
    driverMode,
    coDriver: withDriver ? yesNo(d.coDriver) : '',
    dailyHours: withDriver ? pick(d.dailyHours, RENTAL_DAILY_HOURS) : '',
    helpsLoading: withDriver ? yesNo(d.helpsLoading) : '',
    overnight: withDriver ? yesNo(d.overnight) : '',
  }
}

export const rentalFilled = (r: RentalDetails): boolean => Object.values(r).some(v => v !== '')

// ── Σύνοψη για προβολή ──────────────────────────────────────────────────────────────────────────────

type T = (key: string) => string
export type RentalSummaryGroup = { title: string; rows: { label: string; value: string }[] }

const yn = (v: YesNo, t: T) => (v === 'YES' ? t('transportCard.yes') : v === 'NO' ? t('transportCard.no') : '')

/** Οι ομάδες γραμμών (τίτλος + ετικέτα/τιμή) της κάρτας ενοικίασης, μόνο για ό,τι συμπληρώθηκε */
export function rentalSummary(card: unknown, t: T): RentalSummaryGroup[] {
  if (!obj(card).rental) return []
  const r = normalizeRental(obj(card).rental)
  const opt = (field: string, value: string) => (value ? t(`rentalCard.${field}_${value}`) : '')
  const dims = [r.length && `${t('rentalCard.length')} ${opt('length', r.length)}`, r.width && `${t('rentalCard.width')} ${opt('width', r.width)}`, r.height && `${t('rentalCard.height')} ${opt('height', r.height)}`]
    .filter(Boolean).join(' · ')
  const groups: RentalSummaryGroup[] = []
  const push = (title: string, rows: { label: string; value: string }[]) => {
    const filledRows = rows.filter(row => row.value)
    if (filledRows.length) groups.push({ title, rows: filledRows })
  }
  push(t('rentalCard.title'), [
    { label: t('rentalCard.vehicle_type'), value: opt('vehicleType', r.vehicleType) },
    { label: t('rentalCard.dimensions'), value: dims },
    { label: t('rentalCard.volume'), value: opt('volume', r.volume) },
    { label: t('rentalCard.payload'), value: opt('payload', r.payload) },
    { label: t('rentalCard.license'), value: opt('licenseCategory', r.licenseCategory) },
    { label: t('rentalCard.duration'), value: opt('duration', r.duration) },
    { label: t('rentalCard.distance'), value: opt('distance', r.distance) },
    { label: t('rentalCard.full_insurance'), value: yn(r.fullInsurance, t) },
    { label: t('rentalCard.notes'), value: r.notes },
  ])
  push(t('rentalCard.driver_title'), [
    { label: t('rentalCard.driver_mode'), value: opt('driverMode', r.driverMode) },
    { label: t('rentalCard.co_driver'), value: yn(r.coDriver, t) },
    { label: t('rentalCard.daily_hours'), value: opt('dailyHours', r.dailyHours) },
    { label: t('rentalCard.helps_loading'), value: yn(r.helpsLoading, t) },
    { label: t('rentalCard.overnight'), value: yn(r.overnight, t) },
  ])
  return groups
}

// ── Κάρτα μεταφορέα «Ενοικίαση Οχήματος» ──────────────────────────────────────────────────────────────
// Ό,τι προσφέρει ο μεταφορέας, με τις ίδιες κλειστές λίστες που διαλέγει ο αποστολέας ώστε να γίνεται ταίριασμα (rentalOfferMatches).

export type RentalOffer = {
  /** Τύποι οχημάτων που νοικιάζει (RENTAL_VEHICLE_TYPES) */
  vehicleTypes: string[]
  /** Με ή χωρίς οδηγό (RENTAL_DRIVER_MODES) */
  driverModes: string[]
  /** Διάρκειες ενοικίασης που δέχεται (RENTAL_DURATIONS) */
  durations: string[]
  /** Μέχρι πόσα χιλιόμετρα επιτρέπει (RENTAL_DISTANCES)· κενό = χωρίς όριο */
  maxDistance: string
  /** Όσα προσφέρει με οδηγό και στην ασφάλιση: YES / NO / '' (δεν δηλώνεται) */
  coDriver: YesNo
  helpsLoading: YesNo
  overnight: YesNo
  fullInsurance: YesNo
}

export const emptyRentalOffer = (): RentalOffer => ({
  vehicleTypes: [], driverModes: [], durations: [], maxDistance: '', coDriver: '', helpsLoading: '', overnight: '', fullInsurance: '',
})

const picks = (v: unknown, allowed: readonly string[]): string[] =>
  Array.isArray(v) ? allowed.filter(a => v.includes(a)) : []

/** Ό,τι έρχεται από τη φόρμα ή τη βάση καθαρίζεται: κλειστές λίστες, χωρίς διπλότυπα, με τη σειρά των λιστών */
export function normalizeRentalOffer(input: unknown): RentalOffer {
  const d = obj(input)
  const driverModes = picks(d.driverModes, RENTAL_DRIVER_MODES)
  const withDriver = driverModes.includes('WITH_DRIVER')
  return {
    vehicleTypes: picks(d.vehicleTypes, RENTAL_VEHICLE_TYPES),
    driverModes,
    durations: picks(d.durations, RENTAL_DURATIONS),
    maxDistance: pick(d.maxDistance, RENTAL_DISTANCES),
    // Οι υπηρεσίες οδηγού έχουν νόημα μόνο αν προσφέρεται και οδηγός
    coDriver: withDriver ? yesNo(d.coDriver) : '',
    helpsLoading: withDriver ? yesNo(d.helpsLoading) : '',
    overnight: withDriver ? yesNo(d.overnight) : '',
    fullInsurance: yesNo(d.fullInsurance),
  }
}

/**
 * Ταιριάζει το αίτημα ενοικίασης του αποστολέα με αυτό που προσφέρει ο μεταφορέας; Ένα κενό στοιχείο σε οποιαδήποτε πλευρά δεν
 * αποκλείει (ο αποστολέας δεν το ζήτησε / ο μεταφορέας δεν το περιορίζει). Αποκλείει μόνο ρητή ασυμφωνία:
 *  • τύπος οχήματος, οδηγός (με/χωρίς), διάρκεια: πρέπει να είναι ανάμεσα σε όσα δέχεται ο μεταφορέας
 *  • χιλιόμετρα: όσα ζητά ο αποστολέας δεν ξεπερνούν το όριο του μεταφορέα
 *  • συνοδηγός, βοήθεια στη φόρτωση, διανυκτέρευση, πλήρης ασφάλιση: αν τα θέλει ο αποστολέας, ο μεταφορέας δεν πρέπει να τα αρνείται ρητά
 */
export function rentalOfferMatches(offerInput: unknown, requestInput: unknown): boolean {
  const offer = normalizeRentalOffer(offerInput)
  const req = normalizeRental(requestInput)
  const oneOf = (list: string[], value: string) => !value || list.length === 0 || list.includes(value)
  if (!oneOf(offer.vehicleTypes, req.vehicleType)) return false
  if (!oneOf(offer.driverModes, req.driverMode)) return false
  if (!oneOf(offer.durations, req.duration)) return false
  if (offer.maxDistance && req.distance && RENTAL_DISTANCES.indexOf(req.distance as never) > RENTAL_DISTANCES.indexOf(offer.maxDistance as never)) return false
  const notRefused = (wanted: YesNo, offered: YesNo) => wanted !== 'YES' || offered !== 'NO'
  return notRefused(req.coDriver, offer.coDriver) && notRefused(req.helpsLoading, offer.helpsLoading)
    && notRefused(req.overnight, offer.overnight) && notRefused(req.fullInsurance, offer.fullInsurance)
}

// ── Εγγραφή αιτήματος στα dashboard του μεταφορέα ──────────────────────────────────────────────────────

/**
 * Οι δύο γραμμές των όρων ενός αιτήματος ενοικίασης στις λίστες του μεταφορέα:
 *  • vehicle: τύπος οχήματος με τις διαστάσεις ή τον όγκο σε παρένθεση
 *  • licenseDuration: κατηγορία διπλώματος (ή «Με οδηγό», αφού τότε το δίπλωμα δεν αφορά τον αποστολέα) και διάρκεια ενοικίασης
 * Μόνο ό,τι έχει συμπληρωθεί· ό,τι λείπει δίνει κενό κείμενο και η γραμμή δεν εμφανίζεται.
 */
export function rentalRecordLines(card: unknown, t: T): { vehicle: string; licenseDuration: string } {
  const r = normalizeRental(obj(card).rental)
  const opt = (field: string, value: string) => (value ? t(`rentalCard.${field}_${value}`) : '')
  const size = r.volume
    ? opt('volume', r.volume)
    : [
        r.length && `${t('rentalCard.length')} ${opt('length', r.length)}`,
        r.width && `${t('rentalCard.width')} ${opt('width', r.width)}`,
        r.height && `${t('rentalCard.height')} ${opt('height', r.height)}`,
      ].filter(Boolean).join(' · ')
  const type = r.vehicleType ? t(`rentalCard.vehicleShort_${r.vehicleType}`) : ''
  const who = r.driverMode === 'WITH_DRIVER' ? t('rentalCard.driverMode_WITH_DRIVER') : r.licenseCategory ? t(`rentalCard.licenseShort_${r.licenseCategory}`) : ''
  return {
    vehicle: type ? (size ? `${type} (${size})` : type) : size,
    licenseDuration: [who, opt('duration', r.duration)].filter(Boolean).join(' - '),
  }
}

/**
 * Ενδεικτικά χαρακτηριστικά ανά τύπο οχήματος, για να ξέρει ο αποστολέας τι διαλέγει (εμφανίζονται κάτω από το combo «Τύπος οχήματος»).
 * Είναι τυπικές τιμές των μοντέλων κάθε κατηγορίας και διαφέρουν ανά μοντέλο· δεν συμμετέχουν στο ταίριασμα.
 * dims = χώρος φόρτωσης μήκος × πλάτος × ύψος σε m, volume σε m³, payload σε kg, license = κατηγορία διπλώματος (RENTAL_LICENSES).
 * preset = οι τιμές των combo που συμπληρώνονται μόλις διαλεγεί ο τύπος: το εύρος που περιέχει το κάτω άκρο των τυπικών τιμών (στο όριο, το
 * πάνω εύρος), δηλαδή ό,τι εξασφαλίζει ο τύπος. Ο όγκος δεν συμπληρώνεται, γιατί είναι εναλλακτική των διαστάσεων. Ο αποστολέας τα αλλάζει ελεύθερα.
 */
export type RentalVehiclePreset = Pick<RentalDetails, 'length' | 'width' | 'height' | 'payload' | 'licenseCategory'>
export const RENTAL_VEHICLE_SPECS: Record<(typeof RENTAL_VEHICLE_TYPES)[number], {
  dims: string; volume: string; payload: string; license: (typeof RENTAL_LICENSES)[number]; preset: RentalVehiclePreset
}> = {
  SMALL_VAN: {
    dims: '1,8–2,3 × 1,2–1,6 × 1,1–1,25', volume: '3–4,5', payload: '600–800', license: 'B',
    preset: { length: 'UP_TO_2', width: 'UP_TO_1_4', height: 'UP_TO_1_3', payload: '600_TO_1000', licenseCategory: 'B' },
  },
  MEDIUM_VAN: {
    dims: '2,6–3,2 × 1,3–1,7 × 1,3–1,4', volume: '5–8,5', payload: '900–1.200', license: 'B',
    preset: { length: '2_5_TO_3_2', width: 'UP_TO_1_4', height: '1_3_TO_1_7', payload: '600_TO_1000', licenseCategory: 'B' },
  },
  LARGE_VAN: {
    dims: '3,2–4,7 × 1,7–1,8 × 1,7–2,1', volume: '9–17', payload: '1.000–1.500', license: 'B',
    preset: { length: '3_2_TO_4', width: '1_7_TO_2', height: '1_7_TO_2', payload: '1000_TO_1500', licenseCategory: 'B' },
  },
  TRUCK: {
    dims: '3,5–4,5 × 2,0–2,1 × 2,0–2,2', volume: '15–20', payload: '1.000–1.500', license: 'B',
    preset: { length: '3_2_TO_4', width: '1_7_TO_2', height: '1_7_TO_2', payload: '1000_TO_1500', licenseCategory: 'B' },
  },
}
