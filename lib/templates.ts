import { useEffect, useState } from 'react'
import { api } from './api'

export type TemplateRole = 'SENDER' | 'CARRIER' | 'ALL'

export interface MessageTemplate {
  id: string
  title: string
  // Οι κατηγορίες των προτύπων ζουν στη βάση (πεδίο category) και μεγαλώνουν· δεν είναι κλειστό σύνολο
  category: 'OFFER' | 'CLARIFICATION' | 'REQUEST' | 'GENERAL' | (string & {})
  content: string
  icon?: string
  role?: TemplateRole
  /** Θέμα — μόνο στα πρότυπα που έρχονται από το API (email_templates) */
  subject?: string
  /** Κωδικός του κοινού προτύπου από το οποίο προήλθε ένα δικό μου πρότυπο (αντίγραφο) */
  parentId?: string | null
}

export const SENDER_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl_sender_request',
    title: 'Αίτημα Προσφοράς',
    category: 'REQUEST',
    icon: '📋',
    role: 'SENDER',
    content: 'Καλησπέρα, ενδιαφέρομαι για το δρομολόγιό σας ({origin_city} → {dest_city}). Παρακαλώ κάντε μου μια προσφορά για το φορτίο "{shipment_title}".',
  },
  {
    id: 'tpl_sender_availability',
    title: 'Έλεγχος Διαθεσιμότητας',
    category: 'REQUEST',
    icon: '📦',
    role: 'SENDER',
    content: 'Γεια σας! Έχετε διαθέσιμο χώρο στο όχημά σας για το φορτίο "{shipment_title}" στη διαδρομή {origin_city} → {dest_city};',
  },
  {
    id: 'tpl_sender_time_info',
    title: 'Ερώτηση για Ώρα Παραλαβής',
    category: 'CLARIFICATION',
    icon: '❓',
    role: 'SENDER',
    content: 'Καλησπέρα! Ποια είναι η εκτιμώμενη ώρα/ημέρα παραλαβής από {origin_city} και παράδοσης σε {dest_city} για το φορτίο "{shipment_title}";',
  },
  {
    id: 'tpl_sender_accept',
    title: 'Αποδοχή & Συνέχεια',
    category: 'GENERAL',
    icon: '🤝',
    role: 'SENDER',
    content: 'Σας ευχαριστώ για την προσφορά για το φορτίο "{shipment_title}". Συμφωνώ με τους όρους και θα ήθελα να προχωρήσουμε στην εκτέλεση της μεταφοράς.',
  },
  {
    id: 'tpl_sender_discount',
    title: 'Ερώτηση για Καλύτερη Τιμή',
    category: 'OFFER',
    icon: '💰',
    role: 'SENDER',
    content: 'Γεια σας, σχετικά με την προσφορά σας για το φορτίο "{shipment_title}": Υπάρχει δυνατότητα για κάποια καλύτερη τιμή στη διαδρομή {origin_city} → {dest_city};',
  },
]

export const CARRIER_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl_carrier_basic_offer',
    title: 'Βασική Προσφορά',
    category: 'OFFER',
    icon: '🚛',
    role: 'CARRIER',
    content: 'Ενδιαφερόμαστε για τη μεταφορά του φορτίου σας "{shipment_title}" ({origin_city} → {dest_city}). Η τιμή περιλαμβάνει ασφαλή μεταφορά με το όχημά μας.',
  },
  {
    id: 'tpl_carrier_full_service',
    title: 'Πλήρης Μεταφορά (με Εργατικά)',
    category: 'OFFER',
    icon: '📦',
    role: 'CARRIER',
    content: 'Προσφορά για "{shipment_title}": Περιλαμβάνει παραλαβή από τον χώρο σας, ασφαλή φόρτωση, μεταφορά ({origin_city} → {dest_city}) και εκφόρτωση στον προορισμό.',
  },
  {
    id: 'tpl_carrier_floor_clarify',
    title: 'Ερώτηση για Όροφο / Πρόσβαση',
    category: 'CLARIFICATION',
    icon: '❓',
    role: 'CARRIER',
    content: 'Καλησπέρα σας, σχετικά με την αποστολή "{shipment_title}": Υπάρχει ασανσέρ ή πρόκειται για ισόγειο; Επίσης είναι εύκολη η πρόσβαση του οχήματος στο σημείο παραλαβής;',
  },
  {
    id: 'tpl_carrier_pickup_dates',
    title: 'Επιβεβαίωση Ημερομηνιών & Ετοιμότητας',
    category: 'GENERAL',
    icon: '📅',
    role: 'CARRIER',
    content: 'Μπορούμε να εξυπηρετήσουμε άμεσα την αποστολή σας στις ημερομηνίες που επιθυμείτε. Παρακαλώ ενημερώστε μας αν συμφωνείτε ώστε να προχωρήσουμε στον προγραμματισμό.',
  },
  {
    id: 'tpl_carrier_express',
    title: 'Άμεση / Express Αναχώρηση',
    category: 'OFFER',
    icon: '⚡',
    role: 'CARRIER',
    content: 'Το όχημά μας αναχωρεί άμεσα από {origin_city} για {dest_city}. Μπορούμε να παραλάβουμε το "{shipment_title}" εντός της ημέρας.',
  },
]

export const DEFAULT_TEMPLATES: MessageTemplate[] = [...SENDER_TEMPLATES, ...CARRIER_TEMPLATES]

export function getTemplatesForRole(role?: string | null): MessageTemplate[] {
  if (role === 'CARRIER' || role === 'carrier') return CARRIER_TEMPLATES
  if (role === 'SENDER' || role === 'sender') return SENDER_TEMPLATES
  return DEFAULT_TEMPLATES
}

export type TemplateData = Record<string, string | number | null | undefined>

/** Παλιά ονόματα placeholder (τα τοπικά πρότυπα) → κλειδιά του API catalog (email_template_variables) */
const KEY_ALIASES: Record<string, string> = {
  origin_city: 'shipment_origin_city',
  dest_city: 'shipment_dest_city',
}

const DEFAULTS: Record<string, string> = {
  shipment_title: 'Αποστολή',
  shipment_origin_city: 'Αφετηρία',
  shipment_dest_city: 'Προορισμός',
  sender_name: 'Αποστολέα',
  carrier_name: 'Μεταφορέα',
}

/**
 * Αντικαθιστά placeholders με πραγματικά δεδομένα — δέχεται και τα δύο
 * συντακτικά: {{key}} (πρότυπα από το API) και {key} (τα τοπικά, legacy).
 */
export function renderTemplate(templateContent: string, data: TemplateData = {}): string {
  const values: Record<string, string> = {}

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === '') continue
    values[KEY_ALIASES[key] ?? key] = String(value)
  }

  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    if (!values[key]) values[key] = fallback
  }

  for (const [legacy, canonical] of Object.entries(KEY_ALIASES)) {
    if (values[canonical]) values[legacy] = values[canonical]
  }

  return templateContent.replace(
    /\{\{\s*(\w+)\s*\}\}|\{\s*(\w+)\s*\}/g,
    (match, doubleBrace, singleBrace) => values[doubleBrace ?? singleBrace] ?? match
  )
}

/**
 * Πρότυπα από το πραγματικό backend (/api/templates — έτοιμα + δικά μου),
 * ίδια πηγή με τον browser. Δεν προσθέτει δημιουργία/διαγραφή — μόνο ανάγνωση/επιλογή.
 */
export function useMessageTemplates(role?: string | null, category?: string) {
  const [system, setSystem] = useState<MessageTemplate[]>([])
  const [custom, setCustom] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const roleParam = role === 'CARRIER' ? 'CARRIER' : 'SENDER'
    api.get<{ system: MessageTemplate[]; custom: MessageTemplate[] }>(`/api/templates?role=${roleParam}`)
      .then(res => {
        if (!active) return
        const bySystem = category
          ? (res.data?.system ?? []).filter(tpl => tpl.category === category)
          : (res.data?.system ?? [])
        const byCustom = category
          ? (res.data?.custom ?? []).filter(tpl => tpl.category === category)
          : (res.data?.custom ?? [])
        setSystem(bySystem)
        setCustom(byCustom)
      })
      .catch(() => { if (active) { setSystem([]); setCustom([]) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [role, category])

  return { system, custom, all: [...system, ...custom], loading }
}
