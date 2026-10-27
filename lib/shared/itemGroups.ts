import type { MoveDetails, MoveItem } from './moveCard'
import { CATALOG_BY_ID, ITEM_CATEGORIES, findCatalogItem, type CatalogCategory } from './moveCatalog'

/**
 * Οι κατηγορίες αντικειμένων (έπιπλα, οικιακές συσκευές, κουτιά, ηλεκτρονικά, μικροδέματα, μηχανήματα, τρόφιμα, επικίνδυνα, άλλα)
 * πάνω από τις τρεις αποθηκευμένες λίστες της κάρτας (furniture, appliances, otherItems). Η κατηγορία μιας γραμμής είναι αυτή που
 * της δόθηκε όταν μπήκε (item.category)· για παλιές γραμμές προκύπτει από τον κατάλογο και αλλιώς από τη λίστα στην οποία βρίσκεται.
 */

export type ItemListKey = 'furniture' | 'appliances' | 'otherItems'

/** Σε ποια από τις τρεις λίστες αποθηκεύονται τα αντικείμενα μιας κατηγορίας */
export function storageListOf(category: CatalogCategory): ItemListKey {
  if (category === 'FURNITURE') return 'furniture'
  if (category === 'APPLIANCES' || category === 'ELECTRONICS') return 'appliances'
  return 'otherItems'
}

const DEFAULT_OF_LIST: Record<ItemListKey, CatalogCategory> = { furniture: 'FURNITURE', appliances: 'APPLIANCES', otherItems: 'OTHER' }
const isCategory = (v: unknown): v is CatalogCategory => typeof v === 'string' && (ITEM_CATEGORIES as readonly string[]).includes(v)

/** Η κατηγορία μιας γραμμής: ρητή → του καταλόγου (id) → του καταλόγου (όνομα, μόνο για γραμμές χωρίς id) → της λίστας που βρίσκεται */
export function categoryOfItem(item: MoveItem, list: ItemListKey): CatalogCategory {
  if (isCategory(item.category)) return item.category
  const byId = item.catalogId ? CATALOG_BY_ID.get(item.catalogId) : undefined
  if (byId) return byId.category
  return findCatalogItem(item.name)?.category ?? DEFAULT_OF_LIST[list]
}

/**
 * Ποιες λίστες αντικειμένων φαίνονται όταν ο αποστολέας διαλέξει κατηγορίες αποστολής: κάθε κατηγορία δείχνει τη λίστα της
 * (Έπιπλα → Λίστα Επίπλων, Οικιακές Συσκευές → Λίστα Οικιακών Συσκευών, Κούτες → Κουτιά Συσκευασίας, …, Άλλο → Άλλα Αντικείμενα)
 * και οι υπόλοιπες κρύβονται. Οι κατηγορίες χωρίς λίστα (Όχημα, Σκάφος) δεν δείχνουν τίποτα· αν δεν προκύπτει καμία λίστα,
 * φαίνεται η «Άλλα Αντικείμενα». Λίστα που έχει ήδη αντικείμενα φαίνεται πάντα, για να μη χάνονται όσα έχουν γραφτεί.
 */
export function visibleGroups(selected: readonly string[], details: Pick<MoveDetails, 'furniture' | 'appliances' | 'otherItems'>): CatalogCategory[] {
  const wanted = ITEM_CATEGORIES.filter(c => selected.includes(c))
  const shown = wanted.length > 0 ? wanted : ['OTHER' as CatalogCategory]
  return ITEM_CATEGORIES.filter(c => shown.includes(c) || itemsOfGroup(details, c).length > 0)
}

type Lists = Pick<MoveDetails, 'furniture' | 'appliances' | 'otherItems'>
const LIST_KEYS: ItemListKey[] = ['furniture', 'appliances', 'otherItems']

/** Τα αντικείμενα μιας κατηγορίας από όλες τις λίστες, με τη σειρά που βρίσκονται */
export function itemsOfGroup(details: Lists, group: CatalogCategory): MoveItem[] {
  return LIST_KEYS.flatMap(key => details[key].filter(item => categoryOfItem(item, key) === group))
}

/**
 * Αντικαθιστά τα αντικείμενα μιας κατηγορίας με τη νέα λίστα της (ό,τι άλλαξε ο χρήστης στο πλαίσιό της). Οι υπόλοιπες κατηγορίες
 * μένουν ως έχουν· οι γραμμές της κατηγορίας γράφονται στη λίστα αποθήκευσής της και παίρνουν ρητά την κατηγορία.
 */
export function withGroupItems<D extends Lists>(details: D, group: CatalogCategory, next: readonly MoveItem[]): D {
  const out = { ...details } as D
  for (const key of LIST_KEYS) out[key] = details[key].filter(item => categoryOfItem(item, key) !== group) as D[typeof key]
  const target = storageListOf(group)
  out[target] = [...out[target], ...next.map(item => ({ ...item, category: group }))] as D[typeof target]
  return out
}
