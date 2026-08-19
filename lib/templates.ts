export type TemplateRole = 'SENDER' | 'CARRIER' | 'ALL'

export interface MessageTemplate {
  id: string
  title: string
  category: 'OFFER' | 'CLARIFICATION' | 'REQUEST' | 'GENERAL'
  content: string
  icon?: string
  role?: TemplateRole
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

export function renderTemplate(
  templateContent: string,
  data: {
    shipment_title?: string | null
    origin_city?: string | null
    dest_city?: string | null
    sender_name?: string | null
    carrier_name?: string | null
  }
): string {
  let result = templateContent
  result = result.replace(/\{shipment_title\}/g, data.shipment_title || 'Αποστολή')
  result = result.replace(/\{origin_city\}/g, data.origin_city || 'Αφετηρία')
  result = result.replace(/\{dest_city\}/g, data.dest_city || 'Προορισμός')
  result = result.replace(/\{sender_name\}/g, data.sender_name || 'Αποστολέα')
  result = result.replace(/\{carrier_name\}/g, data.carrier_name || 'Μεταφορέα')
  return result
}
