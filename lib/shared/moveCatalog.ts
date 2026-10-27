/**
 * Κατάλογος αντικειμένων μετακόμισης με τυπικό όγκο ανά τεμάχιο (m³, όγκος μεταφοράς: το περιέχον ορθογώνιο του αντικειμένου,
 * όχι ο όγκος του υλικού του). Ο όγκος μιας μετακόμισης βγαίνει από εδώ και όχι από εικασία του μοντέλου — το σύνολο είναι
 * ελέγξιμο και ίδιο κάθε φορά (βλ. lib/moveVolume.ts).
 *
 * ΠΡΟΣΟΧΗ: οι όγκοι είναι αρχικές εκτιμήσεις από συνηθισμένες διαστάσεις, ΟΧΙ μετρημένες τιμές μεταφορέα. Πρέπει να ελεγχθούν και
 * να διορθωθούν με βάση ό,τι χρησιμοποιούν οι μεταφορείς. Το σχήμα (id, ονόματα, συνώνυμα, κατηγορία, m3) είναι το ίδιο με αυτό που
 * θα έχει ο πίνακας της βάσης όταν ο κατάλογος γίνει δυναμικός, ώστε η μετάβαση να μη θέλει αλλαγή στον κώδικα που τον διαβάζει.
 */

/**
 * Οι κατηγορίες αντικειμένων — ίδιες με τις κατηγορίες αποστολής του αποστολέα (shipments.categories), ώστε να συνδεθούν αργότερα:
 * έπιπλα, οικιακές συσκευές, κουτιά συσκευασίας, ηλεκτρονικά, μικροδέματα, μηχανήματα, τρόφιμα, επικίνδυνα φορτία και άλλα.
 */
export const ITEM_CATEGORIES = ['FURNITURE', 'APPLIANCES', 'BOXES', 'ELECTRONICS', 'SMALL_PACKAGE', 'MACHINERY', 'FOOD', 'HAZARDOUS', 'OTHER'] as const
export type CatalogCategory = (typeof ITEM_CATEGORIES)[number]

export type CatalogItem = {
  id: string
  /** Όνομα προβολής (ελληνικά) */
  name: string
  /** Άλλες ονομασίες με τις οποίες αναγνωρίζεται το αντικείμενο (ελληνικά και αγγλικά) */
  aliases: string[]
  category: CatalogCategory
  /** Τυπικός όγκος ανά τεμάχιο, m³ */
  m3: number
}

const item = (id: string, name: string, category: CatalogCategory, m3: number, aliases: string[] = []): CatalogItem => ({ id, name, category, m3, aliases })

/** Τα κουτιά μετακόμισης με τη σειρά του πίνακα της φόρμας (κατηγορία «Κουτιά Μετακόμισης») */
export const MOVING_BOX_IDS = ['box_small', 'box_medium', 'box_large', 'box_xlarge', 'wardrobe_box', 'box_fragile'] as const

export const MOVE_CATALOG: CatalogItem[] = [
  // Σαλόνι / καθιστικό
  item('sofa_2', 'Καναπές 2θέσιος', 'FURNITURE', 1.2, ['διθέσιος καναπές', '2-seater sofa', 'loveseat']),
  item('sofa_3', 'Καναπές 3θέσιος', 'FURNITURE', 1.6, ['τριθέσιος καναπές', '3-seater sofa', 'sofa', 'καναπές']),
  item('sofa_corner', 'Καναπές γωνιακός', 'FURNITURE', 2.8, ['γωνιακός καναπές', 'corner sofa', 'sectional sofa']),
  item('armchair', 'Πολυθρόνα', 'FURNITURE', 0.6, ['armchair', 'πολυθρονα']),
  item('coffee_table', 'Τραπεζάκι σαλονιού', 'FURNITURE', 0.3, ['coffee table', 'τραπεζάκι']),
  item('side_table', 'Βοηθητικό τραπεζάκι', 'FURNITURE', 0.1, ['side table']),
  item('tv_stand', 'Έπιπλο τηλεόρασης', 'FURNITURE', 0.4, ['tv stand', 'τραπεζάκι τηλεόρασης', 'βάση τηλεόρασης']),
  item('bookcase', 'Βιβλιοθήκη', 'FURNITURE', 0.7, ['bookcase', 'bookshelf', 'ραφιέρα']),
  item('display_cabinet', 'Βιτρίνα', 'FURNITURE', 1, ['display cabinet', 'μπουφές βιτρίνα']),
  item('sideboard', 'Μπουφές', 'FURNITURE', 1, ['sideboard', 'buffet']),
  item('hall_console', 'Κονσόλα εισόδου', 'FURNITURE', 0.3, ['console table', 'κονσόλα']),
  item('shoe_rack', 'Παπουτσοθήκη', 'FURNITURE', 0.3, ['shoe rack', 'shoe cabinet']),
  item('mirror', 'Καθρέφτης', 'FURNITURE', 0.1, ['mirror', 'καθρέπτης']),
  item('carpet_rolled', 'Χαλί (τυλιγμένο)', 'FURNITURE', 0.3, ['χαλί', 'carpet', 'rug']),
  // Τραπεζαρία / γραφείο
  item('dining_table', 'Τραπέζι τραπεζαρίας', 'FURNITURE', 1, ['dining table', 'τραπεζαρία']),
  item('dining_chair', 'Καρέκλα', 'FURNITURE', 0.15, ['chair', 'dining chair', 'καρέκλα τραπεζαρίας']),
  item('bar_stool', 'Σκαμπό μπαρ', 'FURNITURE', 0.1, ['bar stool', 'σκαμπό']),
  item('desk', 'Γραφείο', 'FURNITURE', 0.9, ['desk', 'writing desk']),
  item('office_chair', 'Καρέκλα γραφείου', 'FURNITURE', 0.3, ['office chair', 'πολυθρόνα γραφείου']),
  // Υπνοδωμάτιο
  item('bed_single', 'Κρεβάτι μονό', 'FURNITURE', 1, ['single bed', 'μονό κρεβάτι']),
  item('bed_double', 'Κρεβάτι διπλό', 'FURNITURE', 1.8, ['double bed', 'διπλό κρεβάτι', 'queen bed', 'king bed']),
  item('kids_bed', 'Παιδικό κρεβάτι', 'FURNITURE', 0.8, ['kids bed', 'children bed']),
  item('crib', 'Παιδική κούνια', 'FURNITURE', 0.7, ['crib', 'cot', 'κούνια']),
  item('mattress_single', 'Στρώμα μονό', 'FURNITURE', 0.4, ['single mattress']),
  item('mattress_double', 'Στρώμα διπλό', 'FURNITURE', 0.7, ['double mattress', 'στρώμα', 'mattress']),
  item('bedside_table', 'Κομοδίνο', 'FURNITURE', 0.15, ['bedside table', 'nightstand']),
  item('wardrobe_2', 'Ντουλάπα 2φυλλη', 'FURNITURE', 1.3, ['ντουλάπα δίφυλλη', '2-door wardrobe', 'ντουλάπα', 'wardrobe']),
  item('wardrobe_3', 'Ντουλάπα 3φυλλη', 'FURNITURE', 2, ['ντουλάπα τρίφυλλη', '3-door wardrobe']),
  item('wardrobe_4', 'Ντουλάπα 4φυλλη', 'FURNITURE', 2.6, ['ντουλάπα τετράφυλλη', '4-door wardrobe']),
  item('chest_of_drawers', 'Συρταριέρα', 'FURNITURE', 0.7, ['chest of drawers', 'dresser', 'σιφονιέρα']),
  // Συσκευές
  item('fridge', 'Ψυγείο', 'APPLIANCES', 0.8, ['refrigerator', 'fridge', 'ψυγείο μονό']),
  item('fridge_double', 'Ψυγείο ντουλάπα (διπλό)', 'APPLIANCES', 1.4, ['side by side fridge', 'american fridge', 'ψυγείο ντουλάπα']),
  item('freezer', 'Καταψύκτης', 'APPLIANCES', 0.6, ['freezer', 'κατάψυξη']),
  item('washing_machine', 'Πλυντήριο ρούχων', 'APPLIANCES', 0.35, ['washing machine', 'washer', 'πλυντήριο']),
  item('dryer', 'Στεγνωτήριο', 'APPLIANCES', 0.35, ['dryer', 'tumble dryer']),
  item('dishwasher', 'Πλυντήριο πιάτων', 'APPLIANCES', 0.35, ['dishwasher']),
  item('cooker', 'Κουζίνα (εστίες και φούρνος)', 'APPLIANCES', 0.5, ['cooker', 'stove', 'range', 'κουζίνα υγραερίου', 'κουζίνα']),
  item('oven', 'Φούρνος', 'APPLIANCES', 0.25, ['oven', 'φούρνος εντοιχισμού']),
  item('microwave', 'Φούρνος μικροκυμάτων', 'APPLIANCES', 0.08, ['microwave', 'μικροκύματα']),
  item('ac_unit', 'Κλιματιστικό (μονάδα)', 'APPLIANCES', 0.25, ['air conditioner', 'ac unit', 'κλιματιστικό']),
  item('vacuum', 'Ηλεκτρική σκούπα', 'APPLIANCES', 0.05, ['vacuum cleaner', 'σκούπα']),
  // Ηλεκτρονικά
  item('tv', 'Τηλεόραση (έως 55")', 'ELECTRONICS', 0.15, ['tv', 'television', 'τηλεόραση']),
  item('tv_large', 'Τηλεόραση μεγάλη (πάνω από 55")', 'ELECTRONICS', 0.25, ['large tv', 'big tv']),
  item('pc_desktop', 'Υπολογιστής (κουτί)', 'ELECTRONICS', 0.05, ['desktop computer', 'pc', 'υπολογιστής']),
  item('monitor', 'Οθόνη υπολογιστή', 'ELECTRONICS', 0.07, ['computer monitor', 'monitor', 'οθόνη']),
  item('laptop', 'Φορητός υπολογιστής', 'ELECTRONICS', 0.008, ['laptop', 'notebook', 'λάπτοπ']),
  item('printer', 'Εκτυπωτής', 'ELECTRONICS', 0.04, ['printer']),
  item('hifi', 'Στερεοφωνικό / ηχεία', 'ELECTRONICS', 0.08, ['stereo', 'stereo / speakers', 'hi-fi', 'speakers', 'στερεοφωνικό', 'ηχεία']),
  item('console', 'Παιχνιδομηχανή', 'ELECTRONICS', 0.02, ['game console', 'console', 'playstation']),
  // Μικροδέματα
  item('parcel_small', 'Δέμα μικρό', 'SMALL_PACKAGE', 0.02, ['small parcel', 'small package', 'δέμα']),
  item('parcel_medium', 'Δέμα μεσαίο', 'SMALL_PACKAGE', 0.06, ['medium parcel', 'medium package']),
  item('parcel_large', 'Δέμα μεγάλο', 'SMALL_PACKAGE', 0.12, ['large parcel', 'large package']),
  item('backpack', 'Σακίδιο', 'SMALL_PACKAGE', 0.04, ['backpack', 'bag', 'σακίδιο πλάτης']),
  // Μηχανήματα
  item('machine_small', 'Μηχάνημα μικρό', 'MACHINERY', 0.5, ['small machine', 'μηχάνημα']),
  item('machine_medium', 'Μηχάνημα μεσαίο', 'MACHINERY', 2, ['medium machine']),
  item('machine_large', 'Μηχάνημα μεγάλο', 'MACHINERY', 4.5, ['large machine']),
  item('generator', 'Γεννήτρια', 'MACHINERY', 0.4, ['generator', 'ηλεκτρογεννήτρια']),
  item('compressor', 'Αεροσυμπιεστής', 'MACHINERY', 0.3, ['air compressor', 'compressor', 'κομπρεσέρ']),
  // Τρόφιμα
  item('food_crate', 'Κιβώτιο τροφίμων', 'FOOD', 0.05, ['food crate', 'food box', 'τελάρο']),
  item('food_pallet', 'Παλέτα τροφίμων', 'FOOD', 1.2, ['food pallet']),
  item('food_cooler', 'Φορητό ψυγείο', 'FOOD', 0.06, ['cooler', 'cool box', 'ψυκτικό']),
  item('food_barrel', 'Βαρέλι τροφίμων', 'FOOD', 0.25, ['food barrel', 'βαρέλι κρασιού']),
  // Επικίνδυνα φορτία
  item('hazmat_drum', 'Βαρέλι 200 L', 'HAZARDOUS', 0.3, ['200 l drum', 'drum', 'βαρέλι']),
  item('hazmat_canister', 'Δοχείο 20 L', 'HAZARDOUS', 0.03, ['20 l canister', 'canister', 'μπιτόνι']),
  item('gas_cylinder', 'Φιάλη αερίου', 'HAZARDOUS', 0.07, ['gas cylinder', 'gas bottle', 'φιάλη υγραερίου']),
  item('hazmat_pallet', 'Παλέτα επικίνδυνων υλικών', 'HAZARDOUS', 1.2, ['hazardous pallet', 'hazmat pallet']),
  item('battery_industrial', 'Μπαταρία βιομηχανική', 'HAZARDOUS', 0.04, ['industrial battery', 'battery', 'μπαταρία']),
  // Κουτιά μετακόμισης (ο πίνακας «Κουτιά Μετακόμισης» της φόρμας: MOVING_BOX_IDS) και βαλίτσες
  item('box_small', 'Κούτα μικρή', 'BOXES', 0.036, ['small box', 'κούτα']),
  item('box_medium', 'Κούτα μεσαία', 'BOXES', 0.061, ['medium box', 'moving box']),
  item('box_large', 'Κούτα μεγάλη', 'BOXES', 0.096, ['large box', 'big box']),
  item('box_xlarge', 'Κούτα πολύ μεγάλη', 'BOXES', 0.15, ['extra large box', 'xl box']),
  item('wardrobe_box', 'Κούτα ντουλάπα (για κρεμαστά ρούχα)', 'BOXES', 0.25, ['wardrobe box', 'garment box']),
  item('box_fragile', 'Κούτα για εύθραυστα αντικείμενα', 'BOXES', 0.08, ['fragile box', 'κούτα εύθραυστων']),
  item('suitcase', 'Βαλίτσα', 'OTHER', 0.15, ['suitcase', 'luggage']),
  // Άλλα
  item('plant_small', 'Φυτό μικρό', 'OTHER', 0.05, ['small plant', 'γλάστρα μικρή']),
  item('plant_large', 'Φυτό μεγάλο', 'OTHER', 0.2, ['large plant', 'γλάστρα μεγάλη']),
  item('bicycle', 'Ποδήλατο', 'OTHER', 0.5, ['bicycle', 'bike']),
  item('treadmill', 'Διάδρομος γυμναστικής', 'OTHER', 1, ['treadmill']),
  item('piano_upright', 'Πιάνο όρθιο', 'OTHER', 1.2, ['upright piano', 'πιάνο']),
  item('safe', 'Χρηματοκιβώτιο', 'OTHER', 0.3, ['safe']),
  item('bbq', 'Ψησταριά / μπάρμπεκιου', 'OTHER', 0.5, ['barbecue', 'bbq', 'grill']),
  item('garden_table', 'Τραπέζι κήπου', 'OTHER', 0.8, ['garden table', 'outdoor table']),
  item('garden_chair', 'Καρέκλα κήπου', 'OTHER', 0.1, ['garden chair', 'outdoor chair']),
]

export const CATALOG_BY_ID: ReadonlyMap<string, CatalogItem> = new Map(MOVE_CATALOG.map(c => [c.id, c]))

/**
 * Κανονική μορφή ονόματος για σύγκριση: μικρά γράμματα, χωρίς τόνους και διαλυτικά, ς = σ, χωρίς διπλά κενά και σημεία
 * στίξης. «Καναπές 3θέσιος», «ΚΑΝΑΠΕΣ  3θεσιος» και «καναπες 3θέσιος.» είναι το ίδιο όνομα.
 */
export function normalizeItemName(name: string): string {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(/["'.,;:()/\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Αναζήτηση ονόματος → id: πρώτα το κύριο όνομα, μετά τα συνώνυμα (ακριβής αντιστοίχιση μετά την κανονικοποίηση) */
export function buildNameIndex(catalog: readonly CatalogItem[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const c of catalog) index.set(normalizeItemName(c.name), c.id)
  for (const c of catalog) for (const alias of c.aliases) {
    const key = normalizeItemName(alias)
    if (!index.has(key)) index.set(key, c.id)
  }
  return index
}

const DEFAULT_NAME_INDEX = buildNameIndex(MOVE_CATALOG)

/** Η «ρίζα» ενός αντικειμένου: η πρώτη λέξη του ονόματος (Καναπές, Κρεβάτι, Ψυγείο…) */
export const catalogRoot = (item: CatalogItem): string => item.name.split(' ')[0]

/**
 * Οι υποκατηγορίες ενός αντικειμένου: τα είδη της ίδιας κατηγορίας με την ίδια πρώτη λέξη (Καναπές 2θέσιος / 3θέσιος / γωνιακός).
 * Άδεια λίστα όταν το είδος δεν έχει υποκατηγορίες. Τα κουτιά μετακόμισης έχουν δικό τους πίνακα και δεν μετράνε.
 */
export function catalogVariants(item: CatalogItem, catalog: readonly CatalogItem[] = MOVE_CATALOG): CatalogItem[] {
  if (item.category === 'BOXES') return []
  const root = catalogRoot(item)
  const same = catalog.filter(c => c.category === item.category && catalogRoot(c) === root)
  return same.length > 1 ? same : []
}

/** Το αντικείμενο του καταλόγου που ταιριάζει σε ένα όνομα (κύριο όνομα ή συνώνυμο), ή null */
export function findCatalogItem(name: string, index: Map<string, string> = DEFAULT_NAME_INDEX, catalog: ReadonlyMap<string, CatalogItem> = CATALOG_BY_ID): CatalogItem | null {
  const id = index.get(normalizeItemName(name))
  return id ? catalog.get(id) ?? null : null
}

/**
 * Τυπικές διαστάσεις (μήκος × πλάτος × ύψος, σε cm) των ειδών του καταλόγου — περίγραμμα του αντικειμένου όπως μεταφέρεται, όχι
 * ακριβή μέτρηση. Χρησιμοποιούνται όταν μια αποστολή φορτίου έχει ένα μόνο αντικείμενο, για να συμπληρωθούν οι διαστάσεις της.
 * Το γινόμενο κάθε τριάδας πρέπει να βγαίνει κοντά στον όγκο m3 του ίδιου είδους (ελέγχεται στα tests).
 */
export const CATALOG_DIMS_CM: Readonly<Record<string, readonly [number, number, number]>> = {
  sofa_2: [160, 90, 85], sofa_3: [200, 90, 90], sofa_corner: [250, 150, 75], armchair: [90, 85, 80],
  coffee_table: [110, 60, 45], side_table: [50, 50, 40], tv_stand: [150, 45, 55], bookcase: [100, 35, 200],
  display_cabinet: [100, 45, 220], sideboard: [180, 50, 110], hall_console: [110, 35, 78], shoe_rack: [80, 35, 110],
  mirror: [80, 10, 125], carpet_rolled: [250, 35, 35], dining_table: [160, 90, 75], dining_chair: [45, 50, 90],
  bar_stool: [40, 40, 70], desk: [150, 70, 85], office_chair: [60, 60, 85], bed_single: [200, 95, 50],
  bed_double: [200, 160, 56], kids_bed: [170, 85, 55], crib: [130, 70, 80], mattress_single: [190, 90, 22],
  mattress_double: [190, 140, 26], bedside_table: [45, 40, 75], wardrobe_2: [100, 60, 215], wardrobe_3: [150, 60, 220],
  wardrobe_4: [200, 60, 215], chest_of_drawers: [120, 50, 115],
  fridge: [60, 65, 190], fridge_double: [95, 75, 195], freezer: [60, 65, 155], washing_machine: [60, 60, 95],
  dryer: [60, 60, 95], dishwasher: [60, 60, 90], cooker: [60, 60, 90], oven: [60, 60, 60], microwave: [50, 40, 30],
  tv: [125, 15, 75], tv_large: [145, 20, 90], ac_unit: [85, 35, 70], vacuum: [40, 30, 30],
  pc_desktop: [45, 20, 50], monitor: [60, 20, 45], laptop: [38, 27, 5], printer: [45, 40, 30], hifi: [60, 40, 40], console: [40, 30, 15],
  parcel_small: [30, 25, 25], parcel_medium: [50, 40, 30], parcel_large: [60, 50, 40], backpack: [35, 25, 45],
  machine_small: [100, 70, 70], machine_medium: [150, 120, 110], machine_large: [220, 160, 130], generator: [90, 60, 70], compressor: [80, 40, 90],
  food_crate: [50, 35, 30], food_pallet: [120, 100, 100], food_cooler: [55, 35, 35], food_barrel: [60, 60, 70],
  hazmat_drum: [60, 60, 88], hazmat_canister: [30, 25, 40], gas_cylinder: [35, 35, 75], hazmat_pallet: [120, 100, 100], battery_industrial: [50, 25, 35],
  box_small: [40, 30, 30], box_medium: [50, 35, 35], box_large: [60, 40, 40], box_xlarge: [60, 50, 50], wardrobe_box: [50, 50, 100],
  box_fragile: [50, 40, 40], suitcase: [75, 50, 40],
  plant_small: [30, 30, 55], plant_large: [40, 40, 130], bicycle: [170, 55, 60], treadmill: [160, 80, 80],
  piano_upright: [150, 60, 125], safe: [60, 50, 100], bbq: [100, 60, 90], garden_table: [140, 80, 75], garden_chair: [55, 20, 90],
}
