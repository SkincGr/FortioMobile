export interface MessageTemplate {
  id: string
  title: string
  category: 'OFFER' | 'CLARIFICATION' | 'REQUEST' | 'GENERAL'
  content: string
  icon?: string
}

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl_basic_offer',
    title: 'Βασική Προσφορά',
    category: 'OFFER',
    icon: '🚛',
    content: 'Ενδιαφερόμαστε για τη μεταφορά του φορτίου σας "{shipment_title}" ({origin_city} → {dest_city}). Η τιμή περιλαμβάνει ασφαλή μεταφορά με το όχημά μας.',
  },
  {
    id: 'tpl_full_service',
    title: 'Πλήρης Μεταφορά (με Εργατικά)',
    category: 'OFFER',
    icon: '📦',
    content: 'Προσφορά για "{shipment_title}": Περιλαμβάνει παραλαβή από τον χώρο σας, ασφαλή φόρτωση, μεταφορά ({origin_city} → {dest_city}) και εκφόρτωση στον προορισμό.',
  },
  {
    id: 'tpl_floor_clarify',
    title: 'Ερώτηση για Όροφο / Πρόσβαση',
    category: 'CLARIFICATION',
    icon: '❓',
    content: 'Καλησπέρα σας, σχετικά με την αποστολή "{shipment_title}": Υπάρχει ασανσέρ ή πρόκειται για ισόγειο; Επίσης είναι εύκολη η πρόσβαση του οχήματος στο σημείο παραλαβής;',
  },
  {
    id: 'tpl_pickup_dates',
    title: 'Επιβεβαίωση Ημερομηνιών',
    category: 'GENERAL',
    icon: '📅',
    content: 'Μπορούμε να εξυπηρετήσουμε άμεσα την αποστολή σας στις ημερομηνίες που επιθυμείτε. Παρακαλώ ενημερώστε μας αν συμφωνείτε ώστε να προχωρήσουμε στον προγραμματισμό.',
  },
  {
    id: 'tpl_offer_request',
    title: 'Αίτημα για Δρομολόγιο',
    category: 'REQUEST',
    icon: '📋',
    content: 'Καλησπέρα, ενδιαφέρομαι για το δρομολόγιό σας ({origin_city} → {dest_city}). Παρακαλώ κάντε μου μια προσφορά για το φορτίο "{shipment_title}".',
  },
]

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
