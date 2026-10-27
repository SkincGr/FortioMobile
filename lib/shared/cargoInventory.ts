import { isBinsCategory } from './carrierCard'
import { CATALOG_BY_ID, CATALOG_DIMS_CM, findCatalogItem } from './moveCatalog'
import { computeVolume } from './moveVolume'
import { normalizeRental, rentalFilled, type RentalDetails } from './rentalCard'
import { isMoveCategory, normalizeMoveDetails, type MoveDetails, type MoveItem } from './moveCard'
import {
  boatFilled, normalizeBoat, normalizeTransport, normalizeVehicle, transportFilled, vehicleFilled,
  type BoatDetails, type TransportDetails, type VehicleDetails,
} from './transportCards'

/**
 * Καταγραφή αντικειμένων για αποστολές φορτίου (οτιδήποτε εκτός από Μετακόμιση και Κάδους): η λίστα αντικειμένων δεν αποθηκεύεται
 * ως κάρτα, αλλά ενημερώνει τα πεδία της ίδιας της αποστολής — περιγραφή, όγκο (m³) και, όταν είναι δυνατόν, διαστάσεις.
 */

/** Η καταγραφή αντικειμένων από φωτογραφίες υπάρχει για κάθε αποστολή εκτός από τους Κάδους και το Αυτοκίνητο/Σκάφος (έχουν δική τους φόρμα) */
export const supportsInventory = (category: string | null | undefined): boolean =>
  !!category && !isBinsCategory(category) && category !== 'VEHICLE' && category !== 'BOAT' && category !== 'VEHICLE_RENTAL'

/** Υπάρχει καταγραφή αντικειμένων όταν έστω μία από τις επιλεγμένες κατηγορίες την υποστηρίζει */
export const anySupportsInventory = (categories: readonly string[]): boolean => categories.some(supportsInventory)

/** Η γραμμή της περιγραφής που γράφει η εφαρμογή ξεκινά πάντα με αυτό το σύμβολο (ίδιο σε κάθε γλώσσα), ώστε να αντικαθίσταται και να μη διπλασιάζεται */
export const ITEMS_LINE_MARK = '📦'

const qtyOf = (item: MoveItem) => Math.max(1, Math.floor(Number(String(item.qty).replace(',', '.'))) || 1)

/** «2 × Καναπές 2θέσιος, 12 × Καρέκλα» */
export function describeItems(items: readonly MoveItem[]): string {
  const named = items.filter(i => i.name.trim() !== '')
  return named.map(i => (qtyOf(i) > 1 ? `${qtyOf(i)} × ${i.name.trim()}` : i.name.trim())).join(', ')
}

/**
 * Βάζει τη λίστα στην περιγραφή ως μία γραμμή «📦 …» στο τέλος. Ό,τι έγραψε ο χρήστης μένει όπως είναι· μια προηγούμενη γραμμή της
 * εφαρμογής αντικαθίσταται. Χωρίς αντικείμενα η γραμμή αφαιρείται.
 */
export function applyItemsToDescription(description: string, items: readonly MoveItem[]): string {
  const kept = description.split(/\r?\n/).filter(line => !line.startsWith(ITEMS_LINE_MARK))
  while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop()
  const list = describeItems(items)
  const lines = list ? [...kept, `${ITEMS_LINE_MARK} ${list}`] : kept
  return lines.join('\n')
}

export type CargoUpdate = {
  description: string
  /** m³ ως κείμενο, όπως τα πεδία της φόρμας· null όταν κανένα αντικείμενο δεν έχει γνωστό όγκο */
  volume: string | null
  /** kg: Σ ποσότητα × βάρος των αντικειμένων που έχουν βάρος· null όταν κανένα δεν έχει */
  weight: string | null
  /** cm, μόνο όταν η λίστα είναι ένα μοναδικό τεμάχιο με γνωστές διαστάσεις· αλλιώς null (δεν υπάρχουν διαστάσεις για ένα σύνολο) */
  dimensions: { length: string; width: string; height: string } | null
}

/**
 * Τι αλλάζει στην αποστολή από τη λίστα αντικειμένων:
 *  • περιγραφή: προστίθεται (ή ανανεώνεται) η γραμμή «📦 …»
 *  • όγκος: ο καθαρός όγκος της λίστας, πάντα από τον πίνακα των αντικειμένων — ποτέ από το γινόμενο των διαστάσεων
 *  • βάρος: το άθροισμα των βαρών που έγραψε ο χρήστης στα αντικείμενα
 *  • διαστάσεις: μόνο στην περίπτωση του μοναδικού τεμαχίου με γνωστές διαστάσεις· δεν επηρεάζουν τον όγκο
 */
export function cargoUpdateFromItems(items: readonly MoveItem[], description: string): CargoUpdate {
  const named = items.filter(i => i.name.trim() !== '')
  const text = applyItemsToDescription(description, named)
  const volume = computeVolume(named)

  const single = named.length === 1 && qtyOf(named[0]) === 1 ? named[0] : null
  const catalog = single ? ((single.catalogId ? CATALOG_BY_ID.get(single.catalogId) : undefined) ?? findCatalogItem(single.name)) : null
  const own = single?.length && single.width && single.height ? ([single.length, single.width, single.height].map(Number) as [number, number, number]) : undefined
  const dims = own ?? (catalog && !single?.m3 ? CATALOG_DIMS_CM[catalog.id] : undefined)
  const netVolume = volume.netM3 > 0 ? String(volume.netM3) : null
  const kg = named.reduce((sum, i) => sum + qtyOf(i) * (Number(String(i.weight ?? '').replace(',', '.')) > 0 ? Number(String(i.weight).replace(',', '.')) : 0), 0)
  const weight = kg > 0 ? String(Math.round(kg * 100) / 100) : null
  if (dims) {
    const [l, w, h] = dims
    return { description: text, volume: netVolume, weight, dimensions: { length: String(l), width: String(w), height: String(h) } }
  }
  return { description: text, volume: netVolume, weight, dimensions: null }
}

/**
 * Η «κάρτα» μιας αποστολής φορτίου: μόνο η λίστα αντικειμένων που καταγράφηκε και ποιες φωτογραφίες έχουν ήδη αναλυθεί (ώστε η επόμενη
 * ανάλυση να αφορά μόνο τις νέες). Χωρίς δωμάτια — στο φορτίο δεν υπάρχουν. null όταν δεν υπάρχει τίποτα να κρατηθεί.
 */
export type CargoCard = Pick<MoveDetails, 'furniture' | 'appliances' | 'otherItems' | 'analyzedPhotoIds' | 'aiEnabled'> & {
  /** Στοιχεία αυτοκινήτου / σκάφους και στοιχεία μεταφοράς, μόνο όταν έχουν συμπληρωθεί */
  vehicle?: VehicleDetails
  boat?: BoatDetails
  transport?: TransportDetails
  /** Στοιχεία ενοικίασης οχήματος (και παροχής οδηγού), μόνο όταν έχει επιλεγεί η Ενοικίαση Van / Οχήματος */
  rental?: RentalDetails
}

/**
 * Η κάρτα φορτίου: λίστα αντικειμένων + (όταν έχουν επιλεγεί Αυτοκίνητο ή Σκάφος) τα στοιχεία τους και της μεταφοράς. Με `categories`
 * κρατιέται μόνο ό,τι αντιστοιχεί στις επιλεγμένες κατηγορίες· χωρίς αυτές καθαρίζεται μόνο το περιεχόμενο.
 */
export function normalizeCargoCard(input: unknown, categories?: readonly string[]): CargoCard | null {
  const d = normalizeMoveDetails(input)
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const strip = (items: MoveItem[]): MoveItem[] => items.map(item => { const copy = { ...item }; delete copy.room; return copy })
  const items = categories ? anySupportsInventory(categories) : true
  const card: CargoCard = items
    ? { furniture: strip(d.furniture), appliances: strip(d.appliances), otherItems: strip(d.otherItems), analyzedPhotoIds: d.analyzedPhotoIds, aiEnabled: d.aiEnabled }
    : { furniture: [], appliances: [], otherItems: [], analyzedPhotoIds: [], aiEnabled: false }
  const vehicle = !categories || categories.includes('VEHICLE') ? normalizeVehicle(raw.vehicle) : null
  const boat = !categories || categories.includes('BOAT') ? normalizeBoat(raw.boat) : null
  const transport = !categories || categories.includes('VEHICLE') || categories.includes('BOAT') ? normalizeTransport(raw.transport) : null
  if (vehicle && vehicleFilled(vehicle)) card.vehicle = vehicle
  if (boat && boatFilled(boat)) card.boat = boat
  if (transport && transportFilled(transport)) card.transport = transport
  const rental = !categories || categories.includes('VEHICLE_RENTAL') ? normalizeRental(raw.rental) : null
  if (rental && rentalFilled(rental)) card.rental = rental
  const empty = card.furniture.length + card.appliances.length + card.otherItems.length + card.analyzedPhotoIds.length === 0 && !card.aiEnabled
  return empty && !card.vehicle && !card.boat && !card.transport && !card.rental ? null : card
}

/** Η «κάρτα φορτίου» ισχύει για κάθε κατηγορία εκτός από τη μετακόμιση και τους κάδους (που έχουν δική τους κάρτα) */
export const cargoCardApplies = (category: string | null | undefined): boolean => !!category && !isBinsCategory(category) && !isMoveCategory(category)
