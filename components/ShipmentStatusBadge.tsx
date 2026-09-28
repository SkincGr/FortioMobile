import React from 'react'
import { Badge } from './ui/Badge'
import type { ShipmentStatus } from '@/lib/api'

const STATUS_MAP: Record<ShipmentStatus, { label: string; variant: any }> = {
  PENDING:           { label: 'Αναμονή',             variant: 'info' },
  REQUEST:           { label: 'Με αιτήματα',         variant: 'info' },
  OFFERED:           { label: 'Ενεργή',              variant: 'success' },
  ACCEPTED:          { label: 'Αποδεκτή',            variant: 'success' },
  LOADED:            { label: 'Φορτωμένο',           variant: 'info' },
  IN_TRANSIT:        { label: 'Σε Μεταφορά',         variant: 'warning' },
  IN_STORE:          { label: 'Στο κατάστημα',       variant: 'warning' },
  DELIVERED:         { label: 'Παραδόθηκε',          variant: 'success' },
  CANCELLED:         { label: 'Ακυρώθηκε',           variant: 'danger' },
  DISPUTED:          { label: 'Σε διαφορά',          variant: 'danger' },
  PARTIAL_DAMAGE:    { label: 'Ζημιά',               variant: 'danger' },
  PARTIAL_DELIVERED: { label: 'Μερική παράδοση',     variant: 'warning' },
  FAIL_DELIVERED:    { label: 'Αποτυχία παράδοσης',  variant: 'danger' },
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const { label, variant } = STATUS_MAP[status] ?? { label: status, variant: 'default' }
  return <Badge label={label} variant={variant} />
}
