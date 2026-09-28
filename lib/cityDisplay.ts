// "Πόλη/Χώρα" display — same rule as Fortio web's lib/cityDisplay.ts, plus a
// fallback for endpoints that don't return the place object: the country
// already embedded in the stored city text ("Αθήνα / Ελλάδα").
import { currentLanguage, type Language } from './i18n'

type CountryNames = { el: string; en: string; fr: string }

const COUNTRY_NAMES: Record<string, CountryNames> = {
  GR: { el: 'Ελλάδα', en: 'Greece', fr: 'Grèce' },
  DE: { el: 'Γερμανία', en: 'Germany', fr: 'Allemagne' },
  FR: { el: 'Γαλλία', en: 'France', fr: 'France' },
  ES: { el: 'Ισπανία', en: 'Spain', fr: 'Espagne' },
  IT: { el: 'Ιταλία', en: 'Italy', fr: 'Italie' },
  GB: { el: 'Ηνωμένο Βασίλειο', en: 'United Kingdom', fr: 'Royaume-Uni' },
  NL: { el: 'Ολλανδία', en: 'Netherlands', fr: 'Pays-Bas' },
  BE: { el: 'Βέλγιο', en: 'Belgium', fr: 'Belgique' },
  BG: { el: 'Βουλγαρία', en: 'Bulgaria', fr: 'Bulgarie' },
  RO: { el: 'Ρουμανία', en: 'Romania', fr: 'Roumanie' },
  TR: { el: 'Τουρκία', en: 'Turkey', fr: 'Turquie' },
  AL: { el: 'Αλβανία', en: 'Albania', fr: 'Albanie' },
  MK: { el: 'Βόρεια Μακεδονία', en: 'North Macedonia', fr: 'Macédoine du Nord' },
  CY: { el: 'Κύπρος', en: 'Cyprus', fr: 'Chypre' },
  AT: { el: 'Αυστρία', en: 'Austria', fr: 'Autriche' },
  CH: { el: 'Ελβετία', en: 'Switzerland', fr: 'Suisse' },
  PL: { el: 'Πολωνία', en: 'Poland', fr: 'Pologne' },
  CZ: { el: 'Τσεχία', en: 'Czechia', fr: 'Tchéquie' },
  SE: { el: 'Σουηδία', en: 'Sweden', fr: 'Suède' },
  US: { el: 'ΗΠΑ', en: 'United States', fr: 'États-Unis' },
  CA: { el: 'Καναδάς', en: 'Canada', fr: 'Canada' },
  CN: { el: 'Κίνα', en: 'China', fr: 'Chine' },
}

type Place = { name?: string | null; countryShortName?: string | null } | null | undefined

function lang(language: Language): keyof CountryNames {
  return language === 'en' || language === 'fr' ? language : 'el'
}

/** Stored city text (always Greek) for el; Google's English place name otherwise — each the other's fallback. */
function placeCity(raw: string | null | undefined, place: Place, language: Language): string | null {
  const stored = raw?.split(' / ')[0] || raw || null
  const geocoded = place?.name || null
  return lang(language) === 'el' ? (stored || geocoded) : (geocoded || stored)
}

/** "Τρίπολη/Ελλάδα" — city plus, when known, its country in the app's language. */
export function cityWithCountryFrom(raw: string | null | undefined, place: Place, language: Language): string {
  const city = placeCity(raw, place, language) || '—'
  const code = place?.countryShortName?.toUpperCase()
  const country = (code && COUNTRY_NAMES[code]?.[lang(language)])
    || (raw?.includes(' / ') ? raw.split(' / ').slice(1).join(' / ') : null)
  return country ? `${city}/${country}` : city
}

/** Same, in the app's current language — the drop-in for screens' old city-only `fCity`. */
export function fCity(raw?: string | null, place?: Place): string {
  if (!raw && !place?.name) return '—'
  return cityWithCountryFrom(raw, place, currentLanguage())
}
