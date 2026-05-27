import React from 'react'
import { Badge } from './ui/Badge'
import type { ShipmentStatus } from '@/lib/api'

const STATUS_MAP: Record<ShipmentStatus, { label: string; variant: any }> = {
  PENDING:    { label: 'Αναμονή',    variant: 'info' },
  OFFERED:    { label: 'Ενεργή', variant: 'success' },
  ACCEPTED:   { label: 'Αποδεκτή',   variant: 'success' },
  LOADED:     { label: 'Φορτωμένο',  variant: 'info' },
  IN_TRANSIT: { label: 'Σε Μεταφορά', variant: 'warning' },
  DELIVERED:  { label: 'Παραδόθηκε', variant: 'success' },
  CANCELLED:  { label: 'Ακυρώθηκε', variant: 'danger' },
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const { label, variant } = STATUS_MAP[status] ?? { label: status, variant: 'default' }
  return <Badge label={label} variant={variant} />
}
