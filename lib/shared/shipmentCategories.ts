/**
 * Κατηγορίες αποστολής με πολλαπλή επιλογή. Ο αποστολέας διαλέγει μία ή περισσότερες κατηγορίες (shipments.categories)·
 * η «κύρια» κατηγορία (shipments.category) είναι η πρώτη που διάλεξε και είναι αυτή που διαβάζουν το ταίριασμα με μεταφορείς,
 * τα ευρετήρια και οι κάρτες. Η Μετακόμιση Οικίας, οι Κάδοι, το Αυτοκίνητο και το Σκάφος έχουν δική τους κάρτα και ροή, γι' αυτό δεν συνδυάζονται με άλλες.
 */

/** Τι κάρτα κρατά η αποστολή ανάλογα με τις κατηγορίες της: μετακόμιση, κάδοι ή φορτίο (λίστα αντικειμένων, αυτοκίνητο, σκάφος) */
export function cardKindOf(categories: readonly string[]): 'MOVE' | 'BINS' | 'CARGO' {
  if (categories.includes('HOUSE_MOVE')) return 'MOVE'
  if (categories.includes('WASTE_BINS')) return 'BINS'
  return 'CARGO'
}

/** Οι κατηγορίες που επιλέγονται μόνες τους (δική τους κάρτα και ροή) */
export const EXCLUSIVE_CATEGORIES: readonly string[] = ['HOUSE_MOVE', 'WASTE_BINS', 'VEHICLE', 'BOAT', 'VEHICLE_RENTAL']

/** Οι κατηγορίες της φόρμας του αποστολέα με τη σειρά που εμφανίζονται (η παλιά «Ταχυμεταφορές» δεν προσφέρεται πια) */
export const FORM_CATEGORY_ORDER = [
  'FURNITURE', 'APPLIANCES', 'ELECTRONICS', 'BOXES', 'SMALL_PACKAGE',
  'HOUSE_MOVE', 'VEHICLE_RENTAL', 'WASTE_BINS',
  'MACHINERY', 'FOOD', 'HAZARDOUS',
  'VEHICLE', 'BOAT',
  'OTHER',
] as const

/**
 * Πατώντας μια κατηγορία: αν είναι ήδη επιλεγμένη φεύγει, αλλιώς προστίθεται. Η Μετακόμιση, οι Κάδοι, το Αυτοκίνητο και το Σκάφος αντικαθιστούν τις υπόλοιπες,
 * και όταν διαλέγεται άλλη κατηγορία φεύγουν.
 */
export function toggleCategory(current: readonly string[], id: string): string[] {
  if (current.includes(id)) return current.filter(c => c !== id)
  if (EXCLUSIVE_CATEGORIES.includes(id)) return [id]
  return [...current.filter(c => !EXCLUSIVE_CATEGORIES.includes(c)), id]
}

/**
 * Ό,τι έρχεται από τη φόρμα γίνεται έγκυρο ζευγάρι: η λίστα χωρίς διπλότυπα και κενά, η Μετακόμιση/Κάδοι μόνες τους, και η κύρια
 * κατηγορία = η πρώτη της λίστας. Χωρίς λίστα (παλιός πελάτης, π.χ. η εφαρμογή κινητού) η λίστα είναι η μοναδική κύρια κατηγορία.
 */
export function normalizeCategories(primary: string | null | undefined, list: readonly string[] | null | undefined): { category: string | null; categories: string[] } {
  const clean = [...new Set((list ?? []).filter(c => typeof c === 'string' && c !== ''))]
  const all = clean.length > 0 ? clean : primary ? [primary] : []
  const exclusive = all.find(c => EXCLUSIVE_CATEGORIES.includes(c))
  const categories = exclusive ? [exclusive] : all
  return { category: categories[0] ?? null, categories }
}
