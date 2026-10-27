import { MAX_MOVE_PHOTOS, isMoveCategory } from './moveCard'
import { supportsInventory } from './cargoInventory'

/**
 * Όρια φωτογραφιών αποστολής ανά κατηγορία. Μια μετακόμιση χρειάζεται φωτογραφίες από πολλά δωμάτια (έως 50, π.χ. 10 δωμάτια ×
 * 5 φωτογραφίες)· κάθε άλλη αποστολή μένει στις 5. Οι φωτογραφίες μετακόμισης μικραίνουν σε μεγαλύτερη ανάλυση (1280 px), γιατί
 * από αυτές αναγνωρίζονται αντικείμενα· πολύ μικρές εικόνες χάνουν τα μικρά αντικείμενα στο βάθος.
 */
export const DEFAULT_MAX_PHOTOS = 5
export const DEFAULT_PHOTO_MAX_EDGE_PX = 800
export const MOVE_PHOTO_MAX_EDGE_PX = 1280

export const maxPhotosFor = (category: string | null | undefined): number => (isMoveCategory(category) ? MAX_MOVE_PHOTOS : DEFAULT_MAX_PHOTOS)
// Όπου από τις φωτογραφίες αναγνωρίζονται αντικείμενα (κάθε αποστολή εκτός από τους κάδους) μικραίνουν σε 1280 px· οι υπόλοιπες σε 800 px
export const photoMaxEdgeFor = (category: string | null | undefined): number => (isMoveCategory(category) || supportsInventory(category) ? MOVE_PHOTO_MAX_EDGE_PX : DEFAULT_PHOTO_MAX_EDGE_PX)

/** Ανεβάσματα φωτογραφιών ανά ώρα ανά χρήστη: αρκετά για 50 φωτογραφίες μετακόμισης και λίγες επαναλήψεις */
export const photoUploadsPerHourFor = (category: string | null | undefined): number => (isMoveCategory(category) ? 150 : 30)

/** Το πολύ τόσες φωτογραφίες ανά αίτημα ανάλυσης αντικειμένων (ένα δωμάτιο τη φορά, ώστε κάθε αίτημα να είναι σύντομο) */
export const MAX_PHOTOS_PER_ANALYSIS = 12
