// Display helpers shared by several screens — same rules as Fortio web
// (app/sender/dashboard/page.tsx, app/shipments/[id]/matches/page.tsx).
import type { Language } from './i18n'

function hashSeed(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

/**
 * A carrier's rating: the real one when the company has it, otherwise a
 * deterministic placeholder (4.00–4.89) so the number stays stable across
 * reloads — the same scheme web uses until real reviews exist.
 */
export function carrierRating(company?: { id?: string; rating?: number; totalTrips?: number } | null, fallbackKey = 'carrier') {
  const real = company?.rating
  if (real && real > 0) return { rating: Number(real), trips: company?.totalTrips || 0 }
  const seed = hashSeed(String(company?.id || fallbackKey))
  return { rating: 4 + (seed % 90) / 100, trips: 5 + (seed % 46) }
}

const WEEKDAYS: Record<Language, Record<string, string>> = {
  el: { MO: 'Δευ', TU: 'Τρι', WE: 'Τετ', TH: 'Πεμ', FR: 'Παρ', SA: 'Σαβ', SU: 'Κυρ' },
  en: { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' },
  fr: { MO: 'Lun', TU: 'Mar', WE: 'Mer', TH: 'Jeu', FR: 'Ven', SA: 'Sam', SU: 'Dim' },
}

const EVERY: Record<Language, (n: number) => string> = {
  el: n => (n === 1 ? 'Κάθε εβδομάδα' : `Κάθε ${n} εβδομάδες`),
  en: n => (n === 1 ? 'Every week' : `Every ${n} weeks`),
  fr: n => (n === 1 ? 'Chaque semaine' : `Toutes les ${n} semaines`),
}

const UNTIL: Record<Language, string> = { el: 'έως', en: 'until', fr: "jusqu'au" }

export function fmtDate(v?: string | Date | null) {
  if (!v) return null
  return new Date(v).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** "Κάθε εβδομάδα · Δευ, Τετ, Παρ έως 13/11/2026" for a recurring route, else null. */
export function recurrenceNote(
  route: { isRecurring?: boolean; recurrence?: { interval?: number; weekdays?: string[] } | null; recurrenceEndDate?: string | null },
  language: Language,
): string | null {
  if (!route.isRecurring || !route.recurrence) return null
  const lang: Language = WEEKDAYS[language] ? language : 'el'
  const days = (route.recurrence.weekdays ?? []).map(d => WEEKDAYS[lang][d] ?? d).join(', ')
  const until = route.recurrenceEndDate ? ` ${UNTIL[lang]} ${fmtDate(route.recurrenceEndDate)}` : ''
  return `${EVERY[lang](route.recurrence.interval ?? 1)}${days ? ` · ${days}` : ''}${until}`
}
