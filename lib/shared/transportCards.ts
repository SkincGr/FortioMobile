import type { YesNo } from './moveCard'
import { rentalSummary } from './rentalCard'

/**
 * Κάρτες αποστολών Αυτοκινήτου και Σκάφους (shipments.card_details, μαζί με τη λίστα αντικειμένων του φορτίου): τα στοιχεία του
 * οχήματος ή του σκάφους και τα στοιχεία της μεταφοράς (σημείο και τρόπος φόρτωσης/εκφόρτωσης). Ό,τι έρχεται από τη φόρμα ή από τη
 * βάση καθαρίζεται εδώ: άγνωστα πεδία και τιμές πετιούνται, τα κείμενα κόβονται.
 */

export const VEHICLE_CLASSES = ['CITY', 'SEDAN', 'SUV', 'VAN', 'TRUCK', 'MOTORCYCLE', 'CLASSIC', 'OTHER'] as const
export const BOAT_TYPES = ['INFLATABLE', 'FIBERGLASS', 'SPEEDBOAT', 'SAILBOAT', 'FISHING', 'JETSKI', 'OTHER'] as const
export const ENGINE_TYPES = ['OUTBOARD', 'INBOARD', 'NONE'] as const
export const LOADING_POINTS = ['STREET', 'WAREHOUSE', 'PORT', 'OTHER'] as const
export const LOADING_METHODS = ['CRANE', 'RAMP', 'OTHER', 'NONE'] as const

export type VehicleDetails = {
  makeModel: string
  year: string
  /** Κατηγορία οχήματος, όταν δεν είναι γνωστές οι διαστάσεις */
  vehicleClass: string
  /** Διαστάσεις σε cm, εφόσον είναι γνωστές */
  length: string
  width: string
  height: string
  weightKg: string
  /** Λειτουργικό και μπορεί να κινηθεί μόνο του */
  operable: YesNo
  /** Όταν δεν είναι λειτουργικό: μπορεί να κυλήσει (ρόδες, τιμόνι και φρένα δουλεύουν) */
  canRoll: YesNo
  hasKeys: YesNo
  /** Έχει ζημιές ή είναι τρακαρισμένο */
  damaged: YesNo
  damageNotes: string
}

export type BoatDetails = {
  boatType: string
  /** Διαστάσεις σε μέτρα· το ύψος όταν μεταφέρεται σε τρέιλερ */
  lengthM: string
  widthM: string
  heightM: string
  weightKg: string
  engineType: string
  /** Η μηχανή παραμένει τοποθετημένη στη μεταφορά */
  engineStays: YesNo
  hasTrailer: YesNo
  /** Το τρέιλερ μεταφέρεται μαζί με το σκάφος */
  trailerGoes: YesNo
  /** Φορτώνεται μαζί με το τρέιλερ και μεταφέρεται στο πλοίο πάνω σε αυτό */
  loadedOnTrailer: YesNo
}

export type TransportDetails = {
  loadingPoint: string
  unloadingPoint: string
  /** Τι υπάρχει για τη φόρτωση/εκφόρτωση: γερανός, ράμπα, άλλο μέσο ή τίποτα */
  loadingMethods: string[]
  /** Ευελιξία της ημερομηνίας: ± τόσες ημέρες γύρω από την επιθυμητή */
  dateFlexDays: string
}

export const emptyVehicle = (): VehicleDetails => ({
  makeModel: '', year: '', vehicleClass: '', length: '', width: '', height: '', weightKg: '',
  operable: '', canRoll: '', hasKeys: '', damaged: '', damageNotes: '',
})
export const emptyBoat = (): BoatDetails => ({
  boatType: '', lengthM: '', widthM: '', heightM: '', weightKg: '', engineType: '', engineStays: '', hasTrailer: '', trailerGoes: '', loadedOnTrailer: '',
})
export const emptyTransport = (): TransportDetails => ({ loadingPoint: '', unloadingPoint: '', loadingMethods: [], dateFlexDays: '' })

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const text = (v: unknown, max: number): string => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '')
const yesNo = (v: unknown): YesNo => (v === 'YES' || v === 'NO' ? v : '')
const pick = (v: unknown, allowed: readonly string[]): string => (typeof v === 'string' && allowed.includes(v) ? v : '')
/** Θετικός αριθμός ως κείμενο (με κόμμα ή τελεία) ή '' */
const positive = (v: unknown, max: number): string => {
  const s = text(v, 12).replace(',', '.')
  const n = Number(s)
  return s !== '' && Number.isFinite(n) && n > 0 && n <= max ? String(n) : ''
}

export function normalizeVehicle(input: unknown): VehicleDetails {
  const d = obj(input)
  const year = text(d.year, 4)
  const operable = yesNo(d.operable)
  const damaged = yesNo(d.damaged)
  return {
    makeModel: text(d.makeModel, 120),
    year: /^(19|20)\d{2}$/.test(year) ? year : '',
    vehicleClass: pick(d.vehicleClass, VEHICLE_CLASSES),
    length: positive(d.length, 2000), width: positive(d.width, 500), height: positive(d.height, 500),
    weightKg: positive(d.weightKg, 100000),
    operable,
    // Η ερώτηση για το κύλισμα ισχύει μόνο αν το όχημα δεν κινείται μόνο του· οι ζημιές μόνο αν έχει δηλωθεί ζημιά
    canRoll: operable === 'NO' ? yesNo(d.canRoll) : '',
    hasKeys: yesNo(d.hasKeys),
    damaged,
    damageNotes: damaged === 'YES' ? text(d.damageNotes, 1000) : '',
  }
}

export function normalizeBoat(input: unknown): BoatDetails {
  const d = obj(input)
  const engineType = pick(d.engineType, ENGINE_TYPES)
  const hasTrailer = yesNo(d.hasTrailer)
  const trailerGoes = hasTrailer === 'YES' ? yesNo(d.trailerGoes) : ''
  return {
    boatType: pick(d.boatType, BOAT_TYPES),
    lengthM: positive(d.lengthM, 200), widthM: positive(d.widthM, 50), heightM: positive(d.heightM, 50),
    weightKg: positive(d.weightKg, 1000000),
    engineType,
    engineStays: engineType && engineType !== 'NONE' ? yesNo(d.engineStays) : '',
    hasTrailer,
    trailerGoes,
    loadedOnTrailer: trailerGoes === 'YES' ? yesNo(d.loadedOnTrailer) : '',
  }
}

export function normalizeTransport(input: unknown): TransportDetails {
  const d = obj(input)
  const methods = Array.isArray(d.loadingMethods) ? d.loadingMethods.filter((m): m is string => typeof m === 'string' && (LOADING_METHODS as readonly string[]).includes(m)) : []
  const flex = Math.floor(Number(text(d.dateFlexDays, 4)))
  return {
    loadingPoint: pick(d.loadingPoint, LOADING_POINTS),
    unloadingPoint: pick(d.unloadingPoint, LOADING_POINTS),
    // «Δεν υπάρχει τίποτα» δεν συνδυάζεται με τα υπόλοιπα
    loadingMethods: [...new Set(methods)].includes('NONE') ? ['NONE'] : [...new Set(methods)],
    dateFlexDays: Number.isFinite(flex) && flex >= 1 && flex <= 365 ? String(flex) : '',
  }
}

const filled = (o: object): boolean => Object.values(o).some(v => (Array.isArray(v) ? v.length > 0 : v !== ''))
export const vehicleFilled = (v: VehicleDetails) => filled(v)
export const boatFilled = (b: BoatDetails) => filled(b)
export const transportFilled = (t: TransportDetails) => filled(t)

/**
 * Οι διαστάσεις (cm) και το βάρος (kg) της αποστολής από την κάρτα του οχήματος ή του σκάφους: τα διαβάζουν οι μεταφορείς και το
 * ταίριασμα όπως σε κάθε φορτίο. Το σκάφος δίνεται σε μέτρα στη φόρμα. Άδεια τιμή = δεν αλλάζει το αντίστοιχο πεδίο.
 */
export function shipmentSizeFromCards(vehicle: VehicleDetails | null, boat: BoatDetails | null): { length?: string; width?: string; height?: string; weight?: string } {
  const cm = (m: string) => (m ? String(Math.round(Number(m) * 1000) / 10) : '')
  const out: { length?: string; width?: string; height?: string; weight?: string } = {}
  const set = (key: 'length' | 'width' | 'height' | 'weight', value: string) => { if (value) out[key] = value }
  if (boat) {
    set('length', cm(boat.lengthM)); set('width', cm(boat.widthM)); set('height', cm(boat.heightM)); set('weight', boat.weightKg)
  } else if (vehicle) {
    set('length', vehicle.length); set('width', vehicle.width); set('height', vehicle.height); set('weight', vehicle.weightKg)
  }
  return out
}

// ── Σύνοψη για προβολή ──────────────────────────────────────────────────────────────────────────────

type T = (key: string) => string
export type TransportSummaryGroup = { title: string; rows: { label: string; value: string }[] }

const yn = (v: YesNo, t: T) => (v === 'YES' ? t('transportCard.yes') : v === 'NO' ? t('transportCard.no') : '')

/** Οι ομάδες γραμμών (τίτλος + ζεύγη ετικέτα/τιμή) που δείχνει η σύνοψη της αποστολής για το αυτοκίνητο, το σκάφος και τη μεταφορά */
export function transportSummary(card: { vehicle?: unknown; boat?: unknown; transport?: unknown; rental?: unknown } | null | undefined, t: T): TransportSummaryGroup[] {
  const groups: TransportSummaryGroup[] = []
  const push = (title: string, rows: { label: string; value: string }[]) => {
    const f = rows.filter(r => r.value)
    if (f.length) groups.push({ title, rows: f })
  }
  const c = obj(card)
  if (c.vehicle) {
    const v = normalizeVehicle(c.vehicle)
    push(t('transportCard.vehicle_title'), [
      { label: t('transportCard.make_model'), value: [v.makeModel, v.year].filter(Boolean).join(' · ') },
      { label: t('transportCard.vehicle_class'), value: v.vehicleClass ? t(`transportCard.vehicle_class_${v.vehicleClass}`) : '' },
      { label: t('transportCard.dimensions_cm'), value: v.length && v.width && v.height ? `${v.length} × ${v.width} × ${v.height} cm` : '' },
      { label: t('transportCard.weight_kg'), value: v.weightKg ? `${v.weightKg} kg` : '' },
      { label: t('transportCard.operable'), value: yn(v.operable, t) },
      { label: t('transportCard.can_roll'), value: yn(v.canRoll, t) },
      { label: t('transportCard.has_keys'), value: yn(v.hasKeys, t) },
      { label: t('transportCard.damaged'), value: [yn(v.damaged, t), v.damageNotes].filter(Boolean).join(' — ') },
    ])
  }
  if (c.boat) {
    const b = normalizeBoat(c.boat)
    const boatDims = [b.lengthM && `${t('transportCard.length')} ${b.lengthM}`, b.widthM && `${t('transportCard.width')} ${b.widthM}`, b.heightM && `${t('transportCard.height')} ${b.heightM}`].filter(Boolean).join(' · ')
    push(t('transportCard.boat_title'), [
      { label: t('transportCard.boat_type'), value: b.boatType ? t(`transportCard.boat_type_${b.boatType}`) : '' },
      { label: t('transportCard.dimensions_m'), value: boatDims ? `${boatDims} m` : '' },
      { label: t('transportCard.weight_kg'), value: b.weightKg ? `${b.weightKg} kg` : '' },
      { label: t('transportCard.engine'), value: b.engineType ? t(`transportCard.engine_${b.engineType}`) : '' },
      { label: t('transportCard.engine_stays'), value: yn(b.engineStays, t) },
      { label: t('transportCard.has_trailer'), value: yn(b.hasTrailer, t) },
      { label: t('transportCard.trailer_goes'), value: yn(b.trailerGoes, t) },
      { label: t('transportCard.loaded_on_trailer'), value: yn(b.loadedOnTrailer, t) },
    ])
  }
  if (c.transport) {
    const tr = normalizeTransport(c.transport)
    push(t('transportCard.transport_title'), [
      { label: t('transportCard.loading_point'), value: tr.loadingPoint ? t(`transportCard.point_${tr.loadingPoint}`) : '' },
      { label: t('transportCard.unloading_point'), value: tr.unloadingPoint ? t(`transportCard.point_${tr.unloadingPoint}`) : '' },
      { label: t('transportCard.loading_methods'), value: tr.loadingMethods.map(m => t(`transportCard.method_${m}`)).join(', ') },
      { label: t('transportCard.date_flex'), value: tr.dateFlexDays ? `± ${tr.dateFlexDays} ${t('transportCard.days')}` : '' },
    ])
  }
  groups.push(...rentalSummary(c, t))
  return groups
}
