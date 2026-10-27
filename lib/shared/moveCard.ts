/**
 * Κάρτα «Μετακόμιση Οικίας/Γραφείου»: τα επιπλέον στοιχεία μιας αποστολής της κατηγορίας HOUSE_MOVE.
 * Αποθηκεύονται ως JSON στη στήλη `shipments.card_details` και φαίνονται στον μεταφορέα μαζί με την αποστολή
 * (δεν περιέχουν διεύθυνση ή στοιχεία προσώπου — μόνο ό,τι χρειάζεται για να δοθεί τιμή).
 *
 * Καθαρές συναρτήσεις και σταθερές: τις μοιράζονται η φόρμα, το σχήμα επικύρωσης του API και οι οθόνες προβολής.
 */

export const MOVE_CATEGORY = 'HOUSE_MOVE'
/** Ο τίτλος της αποστολής κλειδώνει σε αυτό το κείμενο όταν επιλεγεί η κατηγορία */
export const MOVE_TITLE = 'Μετακόμιση Οικίας/Γραφείου'

export const isMoveCategory = (category: string | null | undefined): boolean => category === MOVE_CATEGORY

/** Όροφοι: Υπόγειο, Ισόγειο, Ημιώροφος, 1–10, πάνω από 10 */
export const FLOORS = ['B', '0', 'M', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'HIGH'] as const
/** Τύπος οικίας: Πολυκατοικία, Μεζονέτα, Μονοκατοικία */
export const HOME_TYPES = ['APARTMENT', 'MAISONETTE', 'HOUSE'] as const
export const LIFT_OBSTACLES = ['TREES', 'CABLES', 'AWNINGS'] as const
export const SPECIAL_ITEMS_HOME = ['PIANO', 'SAFE', 'ARTWORK', 'ANTIQUES', 'HEAVY_BULKY', 'FRAGILE', 'PLANTS'] as const
export const SPECIAL_ITEMS_OFFICE = ['IT_EQUIPMENT', 'COPIERS', 'ARCHIVES', 'PARTITIONS'] as const
export const SPECIAL_ITEMS = [...SPECIAL_ITEMS_HOME, ...SPECIAL_ITEMS_OFFICE] as const
export const MOVE_SERVICES = ['PACKING', 'UNPACKING', 'DISASSEMBLY', 'ASSEMBLY', 'DISCONNECT', 'CONNECT', 'STORAGE', 'DISPOSAL'] as const

/** '' = δεν δηλώθηκε */
export type YesNo = '' | 'YES' | 'NO'

export type MoveAddress = {
  homeType: string
  /** Αριθμός ορόφων της οικίας */
  floorsCount: string
  floor: string
  elevator: YesNo
  /** Τι χωράει το ασανσέρ */
  elevatorFits: string
  stairsWidthCm: string
  stairsTurns: string
  /** Δυνατότητα ανυψωτικού */
  lift: YesNo
  liftFacade: boolean
  liftBalcony: boolean
  /** Πρόσβαση από ιδιωτική αυλή */
  liftPrivateYard: boolean
  liftObstacles: string[]
  liftNotes: string
  /** Στάθμευση φορτηγού: απόσταση από την είσοδο σε μέτρα */
  parkingDistanceM: string
  parkingNarrowStreet: boolean
  parkingPedestrian: boolean
}

import { ITEM_CATEGORIES } from './moveCatalog'

export type MoveItem = {
  name: string
  qty: string
  /** Όγκος ανά τεμάχιο σε m³, όταν έχει δηλωθεί ρητά (διόρθωση του χρήστη ή εκτίμηση για είδος εκτός καταλόγου) */
  m3?: string
  /** Διαστάσεις ανά τεμάχιο σε cm (Μ × Π × Υ) που έγραψε ο χρήστης· όταν είναι και οι τρεις, ο όγκος m3 προκύπτει από αυτές */
  length?: string
  width?: string
  height?: string
  /** Βάρος ανά τεμάχιο σε kg, όπως το έγραψε ο χρήστης */
  weight?: string
  /** Το αντικείμενο του καταλόγου (lib/moveCatalog.ts) με το οποίο αντιστοιχίστηκε */
  catalogId?: string
  /** Από πού προήλθε η γραμμή: καταγραφή από φωτογραφίες (AI) ή χειροκίνητη */
  source?: 'AI' | 'USER'
  /** Το δωμάτιο στο οποίο βρέθηκε (όνομα που έδωσε ο αποστολέας) */
  room?: string
  /** Η κατηγορία αντικειμένων στην οποία ανήκει η γραμμή (lib/itemGroups.ts)· όπου λείπει, προκύπτει από τον κατάλογο */
  category?: string
}

/** Εκτίμηση όγκου της μετακόμισης: από τη λίστα αντικειμένων (lib/moveVolume.ts) */
export type VolumeEstimate = {
  /** Καθαρός όγκος σε m³ */
  netM3: number
  /** Όγκος φόρτωσης σε m³ (καθαρός + ποσοστό για τα κενά) */
  loadM3: number
  allowancePct: number
  /** AI = από φωτογραφίες και επιβεβαιωμένο από τον αποστολέα, MANUAL = από χειροκίνητη λίστα */
  method: 'AI' | 'MANUAL'
  /** ISO ώρα της εκτίμησης */
  estimatedAt: string
}

/** Το πολύ τόσες φωτογραφίες ανά αποστολή μετακόμισης μπορούν να αντιστοιχιστούν σε δωμάτια */
export const MAX_MOVE_PHOTOS = 50

export type MoveDetails = {
  origin: MoveAddress
  dest: MoveAddress
  /** Τετραγωνικά και δωμάτια του χώρου από τον οποίο γίνεται η μετακόμιση */
  squareMeters: string
  rooms: string
  furniture: MoveItem[]
  appliances: MoveItem[]
  /** Άλλα αντικείμενα: κούτες, βαλίτσες, φυτά, ποδήλατα και ό,τι δεν είναι έπιπλο ή συσκευή */
  otherItems: MoveItem[]
  specialItems: string[]
  /** Για γραφεία */
  workstations: string
  specialNotes: string
  services: string[]
  /** Άλλες πληροφορίες (ελεύθερο κείμενο) */
  otherInfo: string
  /** photoId → όνομα δωματίου: σε ποιο δωμάτιο ανήκει κάθε φωτογραφία της αποστολής */
  photoRooms: Record<string, string>
  /** Οι φωτογραφίες που έχουν ήδη αναλυθεί από το AI: μια νέα ανάλυση αφορά μόνο όσες δεν είναι εδώ */
  analyzedPhotoIds: string[]
  /** Ο διακόπτης «Θέλω αυτόματη καταγραφή αντικειμένων από τις φωτογραφίες»: κρατά ό,τι διάλεξε ο χρήστης. Σε νέα αποστολή είναι πάντα false */
  aiEnabled: boolean
  volumeEstimate: VolumeEstimate | null
}

export const emptyMoveAddress = (): MoveAddress => ({
  homeType: '', floorsCount: '', floor: '', elevator: '', elevatorFits: '', stairsWidthCm: '', stairsTurns: '',
  lift: '', liftFacade: false, liftBalcony: false, liftPrivateYard: false, liftObstacles: [], liftNotes: '',
  parkingDistanceM: '', parkingNarrowStreet: false, parkingPedestrian: false,
})

export const emptyMoveDetails = (): MoveDetails => ({
  origin: emptyMoveAddress(), dest: emptyMoveAddress(),
  squareMeters: '', rooms: '',
  furniture: [], appliances: [], otherItems: [], specialItems: [], workstations: '', specialNotes: '', services: [], otherInfo: '',
  photoRooms: {}, analyzedPhotoIds: [], aiEnabled: false, volumeEstimate: null,
})

/** Έχει συμπληρωθεί κάτι στα στοιχεία του χώρου; (αλλιώς το πλαίσιο της φόρμας μπορεί να μείνει κλειστό) */
export const moveAddressFilled = (a: MoveAddress): boolean => JSON.stringify(a) !== JSON.stringify(emptyMoveAddress())

const text = (v: unknown, max = 500): string => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '')
const yesNo = (v: unknown): YesNo => (v === 'YES' || v === 'NO' ? v : '')
const pickList = (v: unknown, allowed: readonly string[]): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && allowed.includes(x)))] : []
/** Μη αρνητικός αριθμός ως κείμενο ('' αν δεν είναι έγκυρος) */
const numberText = (v: unknown): string => {
  const s = text(v, 12).replace(',', '.')
  if (s === '') return ''
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? String(n) : ''
}

function addressFrom(v: unknown): MoveAddress {
  const a = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  const floor = text(a.floor, 5)
  const homeType = text(a.homeType, 20)
  return {
    homeType: (HOME_TYPES as readonly string[]).includes(homeType) ? homeType : '',
    floorsCount: numberText(a.floorsCount),
    floor: (FLOORS as readonly string[]).includes(floor) ? floor : '',
    elevator: yesNo(a.elevator),
    elevatorFits: text(a.elevatorFits, 300),
    stairsWidthCm: numberText(a.stairsWidthCm),
    stairsTurns: text(a.stairsTurns, 300),
    lift: yesNo(a.lift),
    liftFacade: a.liftFacade === true,
    liftBalcony: a.liftBalcony === true,
    liftPrivateYard: a.liftPrivateYard === true,
    liftObstacles: pickList(a.liftObstacles, LIFT_OBSTACLES),
    liftNotes: text(a.liftNotes, 300),
    parkingDistanceM: numberText(a.parkingDistanceM),
    parkingNarrowStreet: a.parkingNarrowStreet === true,
    parkingPedestrian: a.parkingPedestrian === true,
  }
}

/** Θετικός αριθμός ως κείμενο ('' αν δεν είναι έγκυρος ή είναι μηδέν) */
const positiveText = (v: unknown): string => {
  const s = numberText(v)
  return s !== '' && Number(s) > 0 ? s : ''
}

function photoRoomsFrom(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, string> = {}
  for (const [photoId, room] of Object.entries(v as Record<string, unknown>).slice(0, MAX_MOVE_PHOTOS)) {
    const name = text(room, 60)
    if (photoId.length > 0 && photoId.length <= 60 && name) out[photoId] = name
  }
  return out
}

function photoIdsFrom(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 60))].slice(0, MAX_MOVE_PHOTOS)
}

function volumeEstimateFrom(v: unknown): VolumeEstimate | null {
  if (!v || typeof v !== 'object') return null
  const e = v as Record<string, unknown>
  const net = Number(e.netM3), load = Number(e.loadM3), pct = Number(e.allowancePct)
  if (![net, load, pct].every(n => Number.isFinite(n) && n >= 0) || load < net) return null
  const at = typeof e.estimatedAt === 'string' ? new Date(e.estimatedAt) : null
  return {
    netM3: Math.round(net * 100) / 100,
    loadM3: Math.round(load * 100) / 100,
    allowancePct: Math.round(pct * 10) / 10,
    method: e.method === 'AI' ? 'AI' : 'MANUAL',
    estimatedAt: at && !Number.isNaN(at.getTime()) ? at.toISOString() : '',
  }
}

/** Όγκος σε m³ από διαστάσεις σε cm (Μ × Π × Υ)· undefined όταν λείπει κάποια διάσταση ή δεν είναι θετική */
export function m3FromDims(length: unknown, width: unknown, height: unknown): string | undefined {
  const [l, w, h] = [length, width, height].map(x => Number(String(x ?? '').trim().replace(',', '.')))
  if (![l, w, h].every(n => Number.isFinite(n) && n > 0)) return undefined
  return String(Math.max(0.0001, Math.round((l * w * h) / 1e6 * 10000) / 10000))
}

function itemsFrom(v: unknown): MoveItem[] {
  if (!Array.isArray(v)) return []
  const out: MoveItem[] = []
  for (const row of v.slice(0, 100)) {
    const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>
    const name = text(r.name, 120)
    if (!name) continue
    const qty = numberText(r.qty)
    const [length, width, height] = [r.length, r.width, r.height].map(positiveText)
    // Όταν υπάρχουν και οι τρεις διαστάσεις, ο όγκος του τεμαχίου είναι το γινόμενό τους
    const m3 = m3FromDims(length, width, height) ?? positiveText(r.m3)
    const weight = positiveText(r.weight)
    const catalogId = text(r.catalogId, 60)
    const room = text(r.room, 60)
    const category = (ITEM_CATEGORIES as readonly string[]).includes(String(r.category)) ? String(r.category) : ''
    out.push({
      name,
      qty: qty === '' || Number(qty) < 1 ? '1' : String(Math.floor(Number(qty))),
      ...(m3 ? { m3 } : {}),
      ...(length ? { length } : {}),
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      ...(weight ? { weight } : {}),
      ...(catalogId ? { catalogId } : {}),
      ...(r.source === 'AI' || r.source === 'USER' ? { source: r.source as 'AI' | 'USER' } : {}),
      ...(room ? { room } : {}),
      ...(category ? { category } : {}),
    })
  }
  return out
}

/**
 * Ό,τι έρχεται από τη φόρμα ή από τη βάση γίνεται έγκυρη κάρτα: άγνωστα πεδία και τιμές πετιούνται, τα κείμενα
 * κόβονται, οι κενές γραμμές των λιστών φεύγουν. Χρησιμοποιείται πριν την αποθήκευση και στο διάβασμα.
 */
export function normalizeMoveDetails(input: unknown): MoveDetails {
  const d = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  return {
    origin: addressFrom(d.origin),
    dest: addressFrom(d.dest),
    squareMeters: numberText(d.squareMeters),
    rooms: numberText(d.rooms),
    furniture: itemsFrom(d.furniture),
    appliances: itemsFrom(d.appliances),
    otherItems: itemsFrom(d.otherItems),
    specialItems: pickList(d.specialItems, SPECIAL_ITEMS),
    workstations: numberText(d.workstations),
    specialNotes: text(d.specialNotes, 1000),
    services: pickList(d.services, MOVE_SERVICES),
    otherInfo: text(d.otherInfo, 2000),
    photoRooms: photoRoomsFrom(d.photoRooms),
    analyzedPhotoIds: photoIdsFrom(d.analyzedPhotoIds),
    // Παλιές κάρτες δεν έχουν τη δήλωση: αν είχε γίνει ανάλυση, ο διακόπτης θεωρείται επιλεγμένος
    aiEnabled: typeof d.aiEnabled === 'boolean' ? d.aiEnabled : photoIdsFrom(d.analyzedPhotoIds).length > 0,
    volumeEstimate: volumeEstimateFrom(d.volumeEstimate),
  }
}

/** Προσθέτει ένα είδος στη λίστα· αν υπάρχει ήδη (ίδιο όνομα), αυξάνει την ποσότητα */
export function addMoveItem(list: MoveItem[], name: string, room = ''): MoveItem[] {
  const clean = name.trim()
  if (!clean) return list
  // Ίδιο όνομα ΚΑΙ ίδιο δωμάτιο: αύξηση ποσότητας· σε άλλο δωμάτιο είναι ξεχωριστή γραμμή
  const index = list.findIndex(i => i.name.trim().toLowerCase() === clean.toLowerCase() && (i.room ?? '') === room)
  if (index === -1) return [...list, { name: clean, qty: '1', ...(room ? { room } : {}) }]
  return list.map((item, i) => (i === index ? { ...item, qty: String((Number(item.qty) || 0) + 1) } : item))
}

// ── Σύνοψη για προβολή ──────────────────────────────────────────────────────────────────────────────

export type MoveSummaryGroup = { title: string; rows: { label: string; value: string }[] }

type T = (key: string) => string

function addressRows(a: MoveAddress, t: T): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = []
  const add = (label: string, value: string) => { if (value) rows.push({ label, value }) }
  const yn = (v: YesNo) => (v === 'YES' ? t('moveCard.yes') : v === 'NO' ? t('moveCard.no') : '')

  add(t('moveCard.home_type'), [
    a.homeType ? t(`moveCard.home_${a.homeType}`) : '',
    a.floorsCount ? `${a.floorsCount} ${t('moveCard.floors_short')}` : '',
  ].filter(Boolean).join(' · '))
  add(t('moveCard.floor'), a.floor ? t(`moveCard.floor_${a.floor}`) : '')
  add(t('moveCard.elevator'), [yn(a.elevator), a.elevator === 'YES' ? a.elevatorFits : ''].filter(Boolean).join(' · '))
  add(t('moveCard.stairs'), [
    a.stairsWidthCm ? `${t('moveCard.stairs_width')} ${a.stairsWidthCm} cm` : '',
    a.stairsTurns,
  ].filter(Boolean).join(' · '))
  add(t('moveCard.lift'), [
    yn(a.lift),
    a.liftFacade ? t('moveCard.lift_facade') : '',
    a.liftBalcony ? t('moveCard.lift_balcony') : '',
    a.liftPrivateYard ? t('moveCard.lift_yard') : '',
    a.liftObstacles.length ? `${t('moveCard.lift_obstacles')}: ${a.liftObstacles.map(o => t(`moveCard.obstacle_${o}`)).join(', ')}` : '',
    a.liftNotes,
  ].filter(Boolean).join(' · '))
  add(t('moveCard.parking'), [
    a.parkingDistanceM ? `${a.parkingDistanceM} m ${t('moveCard.parking_from_entrance')}` : '',
    a.parkingNarrowStreet ? t('moveCard.parking_narrow') : '',
    a.parkingPedestrian ? t('moveCard.parking_pedestrian') : '',
  ].filter(Boolean).join(' · '))
  return rows
}

const itemList = (items: MoveItem[]) => items.map(i => (Number(i.qty) > 1 ? `${i.qty} × ${i.name}` : i.name)).join(', ')

/** Τα συμπληρωμένα στοιχεία της κάρτας, σε ομάδες, έτοιμα για εμφάνιση (οι κενές ομάδες παραλείπονται) */
export function moveSummary(input: unknown, t: T): MoveSummaryGroup[] {
  const d = normalizeMoveDetails(input)
  const groups: MoveSummaryGroup[] = []
  const push = (title: string, rows: { label: string; value: string }[]) => {
    const filled = rows.filter(r => r.value)
    if (filled.length) groups.push({ title, rows: filled })
  }

  push(t('moveCard.origin_title'), [
    { label: t('moveCard.square_meters'), value: d.squareMeters ? `${d.squareMeters} m²` : '' },
    { label: t('moveCard.rooms'), value: d.rooms },
    ...addressRows(d.origin, t),
  ])
  push(t('moveCard.dest_title'), addressRows(d.dest, t))
  push(t('moveCard.items_title'), [
    { label: t('moveCard.furniture'), value: itemList(d.furniture) },
    { label: t('moveCard.appliances'), value: itemList(d.appliances) },
    { label: t('moveCard.other_items'), value: itemList(d.otherItems) },
    { label: t('moveCard.volume_title'), value: d.volumeEstimate ? `~${d.volumeEstimate.loadM3} m³` : '' },
    { label: t('moveCard.special'), value: d.specialItems.map(s => t(`moveCard.special_${s}`)).join(', ') },
    { label: t('moveCard.workstations'), value: d.workstations },
    { label: t('moveCard.special_notes'), value: d.specialNotes },
  ])
  push(t('moveCard.services'), [
    { label: t('moveCard.services'), value: d.services.map(s => t(`moveCard.service_${s}`)).join(', ') },
  ])
  push(t('moveCard.other_info'), [{ label: t('moveCard.other_info'), value: d.otherInfo }])
  return groups
}
