/**
 * «Η Διεύθυνσή μου» στη φόρμα αποστολής: συμπληρώνει την αφετηρία ή τον προορισμό με τη διεύθυνση του προφίλ του
 * αποστολέα (πόλη + διεύθυνση, και τα δύο με placeId του Google). Δεν μπορεί να είναι και τα δύο η διεύθυνσή του.
 */
export type ProfileAddress = { city: string; cityPlaceId: string; address: string; addressPlaceId: string }
export type AddressSide = 'origin' | 'dest'

type AddressFields = { city: string; cityPlaceId: string; address: string; addressPlaceId: string }

/** Το προφίλ έχει πλήρη διεύθυνση από το Google (πόλη και διεύθυνση με placeId); */
export const hasProfileAddress = (p: ProfileAddress | null | undefined): p is ProfileAddress =>
  !!p && !!p.city && !!p.cityPlaceId && !!p.address && !!p.addressPlaceId

/** Η διεύθυνση της φόρμας είναι η διεύθυνση του προφίλ (ίδια πόλη και ίδια διεύθυνση, με placeId) */
export const isMyAddress = (fields: AddressFields, p: ProfileAddress | null | undefined): boolean =>
  hasProfileAddress(p) && fields.cityPlaceId === p.cityPlaceId && fields.addressPlaceId === p.addressPlaceId

/** Τα πεδία της φόρμας (originCity…/destCity…) για μία πλευρά, από τη φόρμα */
export function sideFields(form: Record<string, any>, side: AddressSide): AddressFields {
  return {
    city: form[`${side}City`] ?? '', cityPlaceId: form[`${side}CityPlaceId`] ?? '',
    address: form[`${side}Address`] ?? '', addressPlaceId: form[`${side}AddressPlaceId`] ?? '',
  }
}

/**
 * Ανάθεση / καθάρισμα της διεύθυνσης μιας πλευράς. Συντεταγμένες (από τον επιλογέα χάρτη) καθαρίζουν, γιατί ανήκαν στην
 * προηγούμενη διεύθυνση.
 */
export function applyMyAddress<F extends Record<string, any>>(form: F, side: AddressSide, profile: ProfileAddress | null, on: boolean): F {
  const value = on && hasProfileAddress(profile) ? profile : { city: '', cityPlaceId: '', address: '', addressPlaceId: '' }
  return {
    ...form,
    [`${side}City`]: value.city, [`${side}CityPlaceId`]: value.cityPlaceId,
    [`${side}Address`]: value.address, [`${side}AddressPlaceId`]: value.addressPlaceId,
    [`${side}Lat`]: '', [`${side}Lng`]: '',
  }
}

/** Μπορεί να πατηθεί το checkbox μιας πλευράς; Όχι αν το προφίλ δεν έχει διεύθυνση ή η άλλη πλευρά είναι ήδη «η διεύθυνσή μου» */
export function canUseMyAddress(form: Record<string, any>, side: AddressSide, profile: ProfileAddress | null | undefined): boolean {
  if (!hasProfileAddress(profile)) return false
  const other: AddressSide = side === 'origin' ? 'dest' : 'origin'
  return !isMyAddress(sideFields(form, other), profile)
}
