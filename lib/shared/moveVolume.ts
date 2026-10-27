import { CATALOG_BY_ID, findCatalogItem } from './moveCatalog'
import type { VolumeEstimate } from './moveCard'

/**
 * Όγκος (m³) μιας λίστας αντικειμένων μετακόμισης. Καθαρές συναρτήσεις: ο όγκος βγαίνει από τον κατάλογο (lib/moveCatalog.ts) ή
 * από τον όγκο που έχει δηλωθεί ρητά στο αντικείμενο, ποτέ από εικασία — το ίδιο αποτέλεσμα κάθε φορά, ελέγξιμο.
 *
 * Δύο αριθμοί:
 *  • καθαρός όγκος = άθροισμα (ποσότητα × όγκος τεμαχίου)
 *  • όγκος φόρτωσης = καθαρός + ποσοστό για τα κενά ανάμεσα στα αντικείμενα (προεπιλογή 15%)
 */

/** Ποσοστό που προστίθεται στον καθαρό όγκο για τα κενά κατά τη φόρτωση */
export const LOAD_ALLOWANCE_PCT = 15

/** Ό,τι χρειάζεται από ένα αντικείμενο της λίστας για τον υπολογισμό (υποσύνολο του MoveItem) */
export type VolumeItem = { name: string; qty: string; m3?: string; catalogId?: string; source?: string }

export type VolumeResult = {
  netM3: number
  loadM3: number
  allowancePct: number
  /** Ονόματα αντικειμένων χωρίς γνωστό όγκο: δεν μετρήθηκαν στο σύνολο, ο χρήστης πρέπει να τα συμπληρώσει */
  unknown: string[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Θετικός αριθμός από κείμενο (δέχεται υποδιαστολή με κόμμα), αλλιώς null */
function positive(v: string | undefined): number | null {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Όγκος ενός τεμαχίου: πρώτα ο ρητός όγκος του αντικειμένου (π.χ. διόρθωση του χρήστη), μετά ο κατάλογος με id,
 * μετά ο κατάλογος με το όνομα. null όταν δεν είναι γνωστός.
 */
export function unitM3(item: VolumeItem): number | null {
  const explicit = positive(item.m3)
  if (explicit != null) return explicit
  // Το catalogId είναι είσοδος από το μοντέλο ή τον πελάτη: άγνωστο id δεν σπάει τίποτα, ταιριάζει μετά το όνομα
  return (item.catalogId ? CATALOG_BY_ID.get(item.catalogId)?.m3 : undefined) ?? findCatalogItem(item.name)?.m3 ?? null
}

/** Ποσότητα ως θετικός ακέραιος (άκυρη τιμή = 1, όπως στην κάρτα) */
const quantity = (qty: string): number => {
  const n = Math.floor(Number(String(qty).replace(',', '.')))
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export function computeVolume(items: readonly VolumeItem[], allowancePct: number = LOAD_ALLOWANCE_PCT): VolumeResult {
  let net = 0
  const unknown: string[] = []
  for (const item of items) {
    const unit = unitM3(item)
    if (unit == null) { unknown.push(item.name); continue }
    net += unit * quantity(item.qty)
  }
  const pct = Number.isFinite(allowancePct) && allowancePct >= 0 ? allowancePct : LOAD_ALLOWANCE_PCT
  return { netM3: round2(net), loadM3: round2(net * (1 + pct / 100)), allowancePct: pct, unknown }
}

/**
 * Η εκτίμηση όγκου που αποθηκεύεται στην κάρτα, από τις λίστες επίπλων και συσκευών (γραμμές χωρίς όνομα αγνοούνται).
 * null όταν δεν υπάρχει κανένα αντικείμενο με γνωστό όγκο. Μέθοδος AI όταν κάποια γραμμή προήλθε από καταγραφή φωτογραφιών.
 */
export function volumeEstimateOf(
  details: { furniture: readonly VolumeItem[]; appliances: readonly VolumeItem[]; otherItems?: readonly VolumeItem[] },
  now: Date = new Date(),
): VolumeEstimate | null {
  const items = [...details.furniture, ...details.appliances, ...(details.otherItems ?? [])].filter(i => i.name.trim() !== '')
  const r = computeVolume(items)
  if (r.netM3 <= 0) return null
  return {
    netM3: r.netM3, loadM3: r.loadM3, allowancePct: r.allowancePct,
    method: items.some(i => i.source === 'AI') ? 'AI' : 'MANUAL',
    estimatedAt: now.toISOString(),
  }
}
