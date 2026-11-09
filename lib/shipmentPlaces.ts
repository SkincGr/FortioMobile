// Η γραμμή τοποθεσίας μιας αποστολής — ίδιο με το lib/shipmentPlaces.ts του Fortio (web):
//  • μετακόμιση → «Ερμού 2, Αθήνα → Καποδιστρίου 13, Κηφισιά» (πλήρεις διευθύνσεις όταν υπάρχουν)
//  • κάδος → «Διεύθυνση παράδοσης - Ημερομηνία παράδοσης (Ημέρες ενοικίασης)»
//  • άλλες κατηγορίες → «πόλη/χώρα → πόλη/χώρα»
import { fCity } from './cityDisplay'
import { normalizeBinDetails } from './shared/carrierCard'
import { currentLanguage } from './i18n'

type Place = { name?: string | null; countryShortName?: string | null } | null | undefined
export type ShipmentLike = {
  category?: string | null
  originCity?: string | null
  originPlace?: Place
  originAddress?: string | null
  destCity?: string | null
  destPlace?: Place
  destAddress?: string | null
  desiredDelivery?: string | null
  cardDetails?: unknown
} | null | undefined

export function shipmentPlaces(s: ShipmentLike, fmtDate: (d: string) => string): string {
  const en = currentLanguage() === 'en'
  if (s?.category === 'WASTE_BINS') {
    const where = s.destAddress?.trim() || fCity(s.destCity, s.destPlace)
    const days = normalizeBinDetails(s.cardDetails)?.durationDays
    const rental = days ? `(${days} ${en ? 'days' : 'μέρες'})` : ''
    const when = [s.desiredDelivery ? fmtDate(s.desiredDelivery) : '', rental].filter(Boolean).join(' ')
    return [where, when].filter(Boolean).join(' - ')
  }
  const isMove = s?.category === 'HOUSE_MOVE'
  const from = (isMove && s?.originAddress?.trim()) || fCity(s?.originCity, s?.originPlace)
  const to = (isMove && s?.destAddress?.trim()) || fCity(s?.destCity, s?.destPlace)
  return `${from} → ${to}`
}
