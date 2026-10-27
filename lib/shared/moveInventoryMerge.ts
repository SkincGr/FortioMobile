import type { MoveDetails, MoveItem } from './moveCard'
import { MAX_MOVE_PHOTOS } from './moveCard'
import { CATALOG_BY_ID, findCatalogItem, normalizeItemName } from './moveCatalog'
import { unitM3 } from './moveVolume'
import { MAX_PHOTOS_PER_ANALYSIS } from './photoLimits'

/**
 * Καθαρές συναρτήσεις του πελάτη για την καταγραφή αντικειμένων από φωτογραφίες: ποιες φωτογραφίες αναλύονται (μόνο όσες δεν
 * έχουν αναλυθεί ακόμα, ένα δωμάτιο τη φορά) και πώς μπαίνει το αποτέλεσμα στη λίστα της κάρτας.
 */

export type AnalysisBatch = { room: string; photoIds: string[] }

/**
 * Οι αναλύσεις που χρειάζονται τώρα: οι φωτογραφίες που δεν έχουν αναλυθεί, ομαδοποιημένες ανά δωμάτιο με τη σειρά που
 * εμφανίζονται, σε κομμάτια των MAX_PHOTOS_PER_ANALYSIS. Φωτογραφία χωρίς δωμάτιο έχει δωμάτιο ''.
 */
export function planAnalysis(
  photos: readonly { id: string }[],
  details: Pick<MoveDetails, 'photoRooms' | 'analyzedPhotoIds'>,
): AnalysisBatch[] {
  const done = new Set(details.analyzedPhotoIds)
  const byRoom = new Map<string, string[]>()
  for (const photo of photos) {
    if (done.has(photo.id)) continue
    const room = details.photoRooms[photo.id] ?? ''
    byRoom.set(room, [...(byRoom.get(room) ?? []), photo.id])
  }
  const batches: AnalysisBatch[] = []
  for (const [room, ids] of byRoom) {
    for (let i = 0; i < ids.length; i += MAX_PHOTOS_PER_ANALYSIS) batches.push({ room, photoIds: ids.slice(i, i + MAX_PHOTOS_PER_ANALYSIS) })
  }
  return batches
}

type ItemLists = Pick<MoveDetails, 'furniture' | 'appliances'> & { otherItems?: MoveItem[] }

/**
 * Αφαιρεί τα αντικείμενα που έβαλε η αυτόματη ανάλυση (source «AI»)· όσα έγραψε ο χρήστης μένουν. Με `room` μόνο του δωματίου αυτού
 * ('' = χωρίς δωμάτιο), αλλιώς όλων.
 */
export function dropAiItems<D extends ItemLists>(details: D, room?: string): D {
  const keep = (list: MoveItem[]) => list.filter(i => !(i.source === 'AI' && (room === undefined || (i.room ?? '') === room)))
  return { ...details, furniture: keep(details.furniture), appliances: keep(details.appliances), otherItems: keep(details.otherItems ?? []) }
}

/**
 * Επανάληψη της ανάλυσης: όλες οι φωτογραφίες ξανά, σαν να μην είχε αναλυθεί καμία, και τα αντικείμενα της προηγούμενης ανάλυσης
 * αντικαθίστανται από τα νέα. Επιστρέφει την κάρτα όπως τη βλέπει το μοντέλο — χωρίς τη σήμανση των αναλυμένων φωτογραφιών και χωρίς
 * τα παλιά αντικείμενα της ανάλυσης, ώστε να επιστρέψει ολόκληρη τη λίστα και όχι μόνο ό,τι «λείπει» (τα χειροκίνητα μένουν και
 * στέλνονται ως «ήδη καταγεγραμμένα») — και τις αναλύσεις που χρειάζονται. Η κάρτα του χρήστη δεν αλλάζει εδώ: τα παλιά αντικείμενα
 * ενός δωματίου φεύγουν μόνο όταν πετύχει η νέα ανάλυση εκείνου του δωματίου.
 */
export function planRepeat<D extends Pick<MoveDetails, 'photoRooms' | 'analyzedPhotoIds'> & ItemLists>(
  photos: readonly { id: string }[], details: D,
): { base: D; batches: AnalysisBatch[] } {
  const base = { ...dropAiItems(details), analyzedPhotoIds: [] as string[] }
  return { base, batches: planAnalysis(photos, base) }
}

/** Τα αντικείμενα που είναι ήδη στη λίστα για ένα δωμάτιο, όπως τα περιμένει το endpoint */
export function existingForRoom(details: Pick<MoveDetails, 'furniture' | 'appliances'> & { otherItems?: readonly MoveItem[] }, room: string): { name: string; qty: number; catalogId?: string }[] {
  return [...details.furniture, ...details.appliances, ...(details.otherItems ?? [])]
    .filter(i => (i.room ?? '') === room && i.name.trim() !== '')
    .slice(0, 100)
    .map(i => ({ name: i.name.trim(), qty: Math.max(1, Math.floor(Number(i.qty)) || 1), ...(i.catalogId ? { catalogId: i.catalogId } : {}) }))
}

const rowKey = (i: MoveItem) => `${i.room ?? ''}|${i.catalogId ?? `other:${normalizeItemName(i.name)}:${i.m3 ?? ''}`}`

/** Προσθέτει γραμμές στη λίστα: ίδιο είδος στο ίδιο δωμάτιο αυξάνει την ποσότητα της υπάρχουσας γραμμής */
function addItems(list: readonly MoveItem[], added: readonly MoveItem[]): MoveItem[] {
  const out = list.map(i => ({ ...i }))
  for (const item of added) {
    const same = out.find(i => rowKey(i) === rowKey(item))
    if (same) same.qty = String((Math.floor(Number(same.qty)) || 1) + (Math.floor(Number(item.qty)) || 1))
    else out.push({ ...item })
  }
  return out
}

/** Το αποτέλεσμα μιας ανάλυσης μέσα στην κάρτα: νέα αντικείμενα, και οι φωτογραφίες σημειώνονται ως αναλυμένες */
export function mergeAnalysis(
  details: MoveDetails,
  result: { furniture: readonly MoveItem[]; appliances: readonly MoveItem[]; otherItems?: readonly MoveItem[]; analyzedPhotoIds: readonly string[] },
): MoveDetails {
  return {
    ...details,
    furniture: addItems(details.furniture, result.furniture),
    appliances: addItems(details.appliances, result.appliances),
    otherItems: addItems(details.otherItems ?? [], result.otherItems ?? []),
    analyzedPhotoIds: [...new Set([...details.analyzedPhotoIds, ...result.analyzedPhotoIds])].slice(0, MAX_MOVE_PHOTOS),
  }
}

// -- δωμάτια και συνολική εικόνα --------------------------------------------------------------------------------

/** Τα δωμάτια της κάρτας: όσα έχουν αντικείμενα, και όσα έχουν φωτογραφίες, με τη σειρά που εμφανίζονται (χωρίς το κενό δωμάτιο) */
export function roomsOfDetails(details: Pick<MoveDetails, 'furniture' | 'appliances' | 'photoRooms'> & { otherItems?: readonly MoveItem[] }): string[] {
  const rooms: string[] = []
  const add = (room: string | undefined) => { const r = (room ?? '').trim(); if (r && !rooms.includes(r)) rooms.push(r) }
  for (const item of [...details.furniture, ...details.appliances, ...(details.otherItems ?? [])]) add(item.room)
  for (const room of Object.values(details.photoRooms)) add(room)
  return rooms
}

export type OverviewRow = {
  key: string
  name: string
  qty: number
  /** Όγκος ανά τεμάχιο (m³), null όταν δεν είναι γνωστός */
  unitM3: number | null
  /** qty × unitM3, null όταν ο όγκος δεν είναι γνωστός */
  totalM3: number | null
  /** Πόσα τεμάχια ανά δωμάτιο ('' = χωρίς δωμάτιο) */
  rooms: { room: string; qty: number }[]
}

const qtyOf = (item: MoveItem) => Math.max(1, Math.floor(Number(String(item.qty).replace(',', '.'))) || 1)
const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Συνολική εικόνα: τα ίδια αντικείμενα από όλα τα δωμάτια σε μία γραμμή, με συνολικά τεμάχια και όγκο, και πόσα είναι σε κάθε
 * δωμάτιο. Ίδιο είδος = ίδιο id καταλόγου (ή ίδιο όνομα του καταλόγου)· είδος εκτός καταλόγου ταυτίζεται με ίδιο όνομα και ίδιο όγκο.
 * Πρώτα όσα καταλαμβάνουν περισσότερο όγκο.
 */
export function overviewOf(details: Pick<MoveDetails, 'furniture' | 'appliances'> & { otherItems?: readonly MoveItem[] }): { rows: OverviewRow[]; totalQty: number } {
  const rows = new Map<string, OverviewRow>()
  for (const item of [...details.furniture, ...details.appliances, ...(details.otherItems ?? [])]) {
    if (item.name.trim() === '') continue
    const catalog = (item.catalogId ? CATALOG_BY_ID.get(item.catalogId) : undefined) ?? findCatalogItem(item.name)
    // Όγκος που διόρθωσε ο χρήστης (διαφορετικός από τον κατάλογο) κρατά τη γραμμή ξεχωριστή
    const key = catalog ? `${catalog.id}${item.m3 ? `:${item.m3}` : ''}` : `other:${normalizeItemName(item.name)}:${item.m3 ?? ''}`
    const qty = qtyOf(item)
    const unit = unitM3(item)
    const room = (item.room ?? '').trim()
    let row = rows.get(key)
    if (!row) {
      row = { key, name: catalog ? catalog.name : item.name.trim(), qty: 0, unitM3: unit, totalM3: unit == null ? null : 0, rooms: [] }
      rows.set(key, row)
    }
    row.qty += qty
    if (row.totalM3 != null && unit != null) row.totalM3 = round2(row.totalM3 + unit * qty)
    const inRoom = row.rooms.find(r => r.room === room)
    if (inRoom) inRoom.qty += qty
    else row.rooms.push({ room, qty })
  }
  const list = [...rows.values()].sort((a, b) => (b.totalM3 ?? -1) - (a.totalM3 ?? -1) || a.name.localeCompare(b.name, 'el'))
  return { rows: list, totalQty: list.reduce((n, r) => n + r.qty, 0) }
}
