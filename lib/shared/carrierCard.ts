/**
 * Κάρτα του μεταφορέα για υπηρεσίες χωρίς δρομολόγιο — Μετακόμιση ή Κάδοι Απορριμμάτων: δηλώνει την περιοχή
 * εξυπηρέτησης (χωρίς ημερομηνίες). Η ίδια φόρμα και τα ίδια πεδία για κάθε είδος· αλλάζει μόνο ο χαρακτηρισμός.
 * Τίτλος + Περιοχή Εξυπηρέτησης που είναι είτε όλη η χώρα, είτε συγκεκριμένες πόλεις, είτε συγκεκριμένες περιοχές
 * (Περιφέρειες / Νομοί / δικές του). Η χώρα ταυτοποιείται με τον κωδικό του Google (ISO alpha-2), οι πόλεις με το
 * placeId τους, οι περιοχές με το id τους.
 */

/** Είδος κάρτας (CardId) — κάθε είδος αποστολής αντιστοιχεί σε ένα (βλ. cardIdForCategory) */
import { emptyRentalOffer, normalizeRentalOffer, type RentalOffer } from './rentalCard'

export const CARD_IDS = ['MOVE', 'WASTE_BINS', 'VEHICLE_RENTAL'] as const
export type CardId = (typeof CARD_IDS)[number]

/** Κατηγορία αποστολής → είδος κάρτας του μεταφορέα· οι υπόλοιπες κατηγορίες ανήκουν σε δρομολόγιο (null) */
export function cardIdForCategory(category: string | null | undefined): CardId | null {
  if (category === 'HOUSE_MOVE') return 'MOVE'
  if (category === 'WASTE_BINS') return 'WASTE_BINS'
  if (category === 'VEHICLE_RENTAL') return 'VEHICLE_RENTAL'
  return null
}

export const BINS_CATEGORY = 'WASTE_BINS'
/** Ο τίτλος της αποστολής κλειδώνει σε αυτό το κείμενο όταν επιλεγεί η κατηγορία (όπως η μετακόμιση, βλ. MOVE_TITLE) */
export const BINS_TITLE = 'Προμήθεια Κάδου'

/** Κάρτα αποστολέα «Κάδοι Απορριμμάτων»: μόνο Προορισμός, Επιθυμητή Ημερομηνία Παράδοσης και Περίοδος Παράδοσης (δεν έχει αφετηρία) */
export const isBinsCategory = (category: string | null | undefined): boolean => category === BINS_CATEGORY

export const isCardId = (value: unknown): value is CardId => (CARD_IDS as readonly unknown[]).includes(value)

export const MOVE_CARD_SCOPES = ['COUNTRY', 'CITIES', 'AREAS'] as const
export type MoveCardScope = (typeof MOVE_CARD_SCOPES)[number]

/** Χώρες που προσφέρονται στο «Όλη η Χώρα» / φίλτρο περιοχών (κωδικοί Google, το όνομα βγαίνει από τη γλώσσα) */
export const MOVE_CARD_COUNTRIES = [
  'GR', 'CY', 'AL', 'BG', 'MK', 'RS', 'RO', 'TR', 'IT', 'DE', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU', 'AT', 'CH', 'GB', 'IE',
  'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'BA', 'ME', 'XK', 'MD', 'UA', 'LT', 'LV', 'EE', 'MT',
] as const

export const DEFAULT_MOVE_CARD_COUNTRY = 'GR'

/**
 * Χωρητικότητες κάδου απορριμμάτων που προσφέρει ο μεταφορέας (κάρτα WASTE_BINS): χωρητικότητα σε m³ και ενδεικτικές
 * διαστάσεις (Μ × Π × Υ). Το «για τι εργασίες» βγαίνει από το i18n (carrierMoveCard.bin_use_<id>).
 */
export const BIN_SIZES = [
  { id: '3', m3: 3, dimensions: '2,5 × 1,5 × 0,8 m' },
  { id: '4', m3: 4, dimensions: '3 × 1,5 × 0,9 m' },
  { id: '6', m3: 6, dimensions: '3,5 × 1,8 × 1 m' },
  { id: '8', m3: 8, dimensions: '4 × 1,8 × 1,2 m' },
  { id: '10', m3: 10, dimensions: '4,5 × 2 × 1,2 m' },
] as const
export const BIN_SIZE_IDS = BIN_SIZES.map(b => b.id) as [string, ...string[]]
export const binSizeLabel = (id: string) => `${id} m³`

/** Στοιχεία κάδου μιας αποστολής (shipments.card_details): επιθυμητή χωρητικότητα και εκτιμώμενη διάρκεια σε ημέρες — μόνο ό,τι είναι έγκυρο */
export function normalizeBinDetails(raw: unknown): { binSize?: string; durationDays?: number } | null {
  if (!raw || typeof raw !== 'object') return null
  const { binSize, durationDays } = raw as { binSize?: unknown; durationDays?: unknown }
  const out: { binSize?: string; durationDays?: number } = {}
  if (typeof binSize === 'string' && (BIN_SIZE_IDS as readonly string[]).includes(binSize)) out.binSize = binSize
  const days = Number(durationDays)
  if (durationDays !== '' && durationDays != null && Number.isInteger(days) && days >= 1 && days <= 365) out.durationDays = days
  return Object.keys(out).length > 0 ? out : null
}

export type MoveCardCity = { placeId: string; label: string }

export type MoveCardData = {
  cardId: CardId
  title: string
  scope: MoveCardScope | ''
  /** Κωδικός χώρας (Όλη η Χώρα, και φίλτρο των περιοχών) */
  countryCode: string
  cities: MoveCardCity[]
  areaIds: string[]
  /** Χωρητικότητες κάδου (BIN_SIZES) — μόνο για την κάρτα Κάδων Απορριμμάτων */
  binSizes: string[]
  /** Στοιχεία ενοικίασης οχήματος (μόνο για την κάρτα Ενοικίασης Οχήματος) */
  rental: RentalOffer
}

export const emptyMoveCard = (cardId: CardId = 'MOVE'): MoveCardData => ({
  cardId,
  title: '',
  scope: '',
  countryCode: DEFAULT_MOVE_CARD_COUNTRY,
  cities: [],
  areaIds: [],
  binSizes: [],
  rental: emptyRentalOffer(),
})

/** Ποια πεδία λείπουν / είναι άκυρα — κλειδί πεδίου → κλειδί μηνύματος i18n (carrierMoveCard.*) */
export function validateMoveCard(card: MoveCardData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!card.title.trim()) errors.title = 'error_title'
  if (!card.scope) errors.scope = 'error_scope'
  else if (card.scope === 'COUNTRY' && !card.countryCode) errors.country = 'error_country'
  else if (card.scope === 'CITIES' && card.cities.length === 0) errors.cities = 'error_cities'
  else if (card.scope === 'AREAS' && card.areaIds.length === 0) errors.areas = 'error_areas'
  if (card.cardId === 'WASTE_BINS' && card.binSizes.length === 0) errors.binSizes = 'error_bin_sizes'
  if (card.cardId === 'VEHICLE_RENTAL') {
    if (card.rental.vehicleTypes.length === 0) errors.rentalVehicles = 'error_rental_vehicles'
    if (card.rental.driverModes.length === 0) errors.rentalDriver = 'error_rental_driver'
  }
  return errors
}

/** Προσθήκη πόλης χωρίς διπλότυπα (ίδιο placeId) */
export function addCity(cities: MoveCardCity[], city: MoveCardCity): MoveCardCity[] {
  if (!city.placeId || cities.some(c => c.placeId === city.placeId)) return cities
  return [...cities, city]
}

/** Αλλαγή τρόπου εξυπηρέτησης: κρατά μόνο ό,τι ανήκει στον νέο τρόπο */
export function setScope(card: MoveCardData, scope: MoveCardScope): MoveCardData {
  return { ...card, scope, ...(scope !== 'CITIES' ? { cities: [] } : {}), ...(scope !== 'AREAS' ? { areaIds: [] } : {}) }
}

/** Αλλαγή χώρας: οι περιοχές άλλης χώρας δεν ισχύουν πια */
export function setCountry(card: MoveCardData, countryCode: string): MoveCardData {
  return { ...card, countryCode, areaIds: countryCode === card.countryCode ? card.areaIds : [] }
}

/**
 * Τιμές κράτησης θέσης της κάρτας στον πίνακα routes (τα πεδία είναι υποχρεωτικά για τα δρομολόγια): η κάρτα
 * είναι virtual εγγραφή, χωρίς ημερομηνία και χωρητικότητα. Την πραγματική εγγραφή (με ημερομηνία κ.λπ.) τη φτιάχνει
 * το σύστημα ως παιδί (parentRouteId) όταν γίνεται αίτηση ή προσφορά.
 */
export const CARD_PLACEHOLDER_DATE = '2000-01-01T00:00:00.000Z'
export const CARD_PLACEHOLDER_CAPACITY = 0

/**
 * Αναστολή κάρτας: η εγγραφή μένει αλλά δεν ταιριάζει με αποστολές και δεν δέχεται αιτήματα/προσφορές, μέχρι να ενεργοποιηθεί
 * ξανά. Χρησιμοποιείται η υπάρχουσα κατάσταση CANCELLED του πίνακα routes (μια κάρτα δεν «ακυρώνεται» ποτέ αλλιώς), ώστε να μη
 * χρειάζεται νέα τιμή στο enum: όλο το matching ζητά ήδη status ACTIVE.
 */
export const CARD_SUSPENDED_STATUS = 'CANCELLED'
export const isCardSuspended = (status: string | null | undefined): boolean => status === CARD_SUSPENDED_STATUS

/** Κωδικός κάρτας στη λίστα δρομολογίων: πρόθεμα είδους + αριθμός, π.χ. MOVE-000125 */
export const cardCode = (cardId: CardId, routeNumber: string) => `${cardId === 'MOVE' ? 'MOVE' : cardId === 'VEHICLE_RENTAL' ? 'RENT' : 'BINS'}-${routeNumber}`

/** Τα στοιχεία που αποθηκεύονται στο routes.card_details */
export type CardDetails = Pick<MoveCardData, 'title' | 'scope' | 'countryCode' | 'cities' | 'areaIds'> & { binSizes?: string[]; rental?: RentalOffer }

export const toCardDetails = (card: MoveCardData): CardDetails => ({
  title: card.title.trim(),
  scope: card.scope,
  countryCode: card.countryCode,
  cities: card.scope === 'CITIES' ? card.cities : [],
  areaIds: card.scope === 'AREAS' ? card.areaIds : [],
  // Οι χωρητικότητες κάδου υπάρχουν μόνο στην κάρτα Κάδων, με τη σειρά του πίνακα BIN_SIZES και χωρίς διπλότυπα
  ...(card.cardId === 'WASTE_BINS' ? { binSizes: BIN_SIZES.map(b => b.id).filter(id => card.binSizes.includes(id)) } : {}),
  ...(card.cardId === 'VEHICLE_RENTAL' ? { rental: normalizeRentalOffer(card.rental) } : {}),
})
