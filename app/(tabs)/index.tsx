import React, { useState, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  FlatList, StyleSheet, Modal, Pressable, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { dashboardApi, matchCountsApi, shipmentsApi, offersApi, Shipment, Offer, ShipmentStatus } from '@/lib/api'
import { ShipmentStatusBadge } from '@/components/ShipmentStatusBadge'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Colors } from '@/constants/colors'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<string, string> = {
  FURNITURE: '🛋️', HOUSE_MOVE: '🏠', SMALL_PACKAGE: '📦', COURIER: '🛵',
  ELECTRONICS: '💻', VEHICLE: '🚗', MACHINERY: '⚙️', BOAT: '⛵',
  FOOD: '🥩', HAZARDOUS: '⚠️', OTHER: '🗃️',
}

const SORT_OPTIONS = [
  { id: 'date_desc',   label: 'Νεότερα πρώτα' },
  { id: 'date_asc',    label: 'Παλαιότερα πρώτα' },
  { id: 'offers_desc', label: 'Περισσότερες προσφορές' },
] as const
type SortKey = typeof SORT_OPTIONS[number]['id']

type Filter = 'shipments' | 'offer_requests' | 'carrier_offers' | 'to_transport' | 'in_transit'

const SHIPMENTS_STATUSES: ShipmentStatus[]    = ['PENDING', 'OFFERED']
const TO_TRANSPORT_STATUSES: ShipmentStatus[] = ['ACCEPTED', 'LOADED']
const IN_TRANSIT_STATUSES: ShipmentStatus[]   = ['IN_TRANSIT', 'DELIVERED']

type OfferGroup = { shipment: Shipment; offers: Offer[] }

function isCarrierUser(role?: string | null) {
  const normalized = String(role ?? '').toUpperCase()
  return normalized === 'CARRIER' || normalized.includes('TRANSPORT')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRoad(distKm?: number | null, durMin?: number | null) {
  if (!distKm && !durMin) return null
  const dist = distKm ? `${distKm} km` : null
  if (!durMin) return dist
  const h = Math.floor(durMin / 60)
  const m = durMin % 60
  const dur = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  return dist ? `${dist} · ${dur}` : dur
}

function fCity(raw?: string | null) {
  if (!raw) return '—'
  return raw.split(' / ')[0]
}

// ─── OfferRow (single offer inside a group) ──────────────────────────────────

function OfferRow({ offer, mode, onAccept, onReject }: {
  offer: Offer
  mode: 'request' | 'carrier_offer'
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
}) {
  const msgCount      = offer._count?.messages ?? 0
  const carrierName   = offer.carrier?.carrierProfile?.companyName
    ?? offer.carrier?.name ?? '—'
  const routeOrigin   = offer.route?.originCity ?? '—'
  const routeDest     = offer.route?.destCity ?? '—'
  const routeNum      = offer.route?.routeNumber ? `#${offer.route.routeNumber}` : null
  const departureDate = offer.route?.departureDate

  return (
    <View style={styles.offerRow}>
      {/* Route info */}
      <View style={styles.routeHeader}>
        <View style={styles.row}>
          <Ionicons name="bus-outline" size={13} color={Colors.primary} />
          {routeNum && <Text style={styles.routeNum}>{routeNum} · </Text>}
          <Text style={[styles.routeCity, { flex: 1 }]} numberOfLines={1}>
            {fCity(routeOrigin)} → {fCity(routeDest)}
          </Text>
        </View>
        <View style={[styles.row, { marginTop: 2, marginLeft: 21 }]}>
          <Ionicons name="business-outline" size={11} color={Colors.textMuted} />
          <Text style={[styles.sub, { flexShrink: 1 }]}>{carrierName}</Text>
          {departureDate && (
            <>
              <Text style={styles.sub}> · </Text>
              <Text style={styles.sub}>{new Date(departureDate).toLocaleDateString('el-GR')}</Text>
            </>
          )}
        </View>
      </View>

      {/* Price + actions */}
      <View style={[styles.actionsRow, { marginTop: 8 }]}>
        {mode === 'carrier_offer' && offer.price !== undefined && (
          <View style={[styles.actionBtn, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="cash-outline" size={12} color="#16A34A" />
            <Text style={[styles.actionBtnEditText, { color: '#16A34A' }]}>€{offer.price}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, msgCount > 0 ? styles.actionBtnAmber : styles.actionBtnOff]}
          activeOpacity={0.8}
          onPress={() => router.push(`/(tabs)/messages/${offer.id}?returnTo=${encodeURIComponent('/(tabs)')}` as any)}
        >
          <Text style={msgCount > 0 ? styles.actionBtnAmberText : styles.actionBtnOffText}>✉️ Μηνύματα</Text>
          <View style={msgCount > 0 ? styles.btnBadge : styles.btnBadgeOff}>
            <Text style={msgCount > 0 ? styles.btnBadgeText : styles.btnBadgeOffText}>{msgCount}</Text>
          </View>
        </TouchableOpacity>
        {mode === 'carrier_offer' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#DCFCE7' }]}
              activeOpacity={0.8}
              onPress={() => onAccept?.(offer.id)}
            >
              <Ionicons name="checkmark-outline" size={12} color="#166534" />
              <Text style={[styles.actionBtnEditText, { color: '#166534' }]}>Αποδοχή</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              activeOpacity={0.8}
              onPress={() => onReject?.(offer.id)}
            >
              <Ionicons name="close-outline" size={12} color="#EF4444" />
              <Text style={styles.actionBtnDangerText}>Απόρριψη</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

// ─── OfferGroupSection (shipment header + offer rows) ─────────────────────────

function OfferGroupSection({ group, mode, onAccept, onReject }: {
  group: OfferGroup
  mode: 'request' | 'carrier_offer'
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
}) {
  const { colors } = useTheme()
  const { shipment, offers } = group
  const roadInfo = formatRoad(shipment.roadDistanceKm, shipment.roadDurationMinutes)

  return (
    <View style={[styles.groupSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Shipment header */}
      <View style={styles.groupShipmentHeader}>
        <View style={styles.row}>
          <Text style={styles.catIcon}>{CATEGORY_ICON[shipment.category] ?? '📦'}</Text>
          <Text style={[styles.title, { flex: 1 }]} numberOfLines={1}>{shipment.title}</Text>
          <ShipmentStatusBadge status={shipment.status} />
        </View>
        <View style={[styles.row, { marginTop: 4, marginLeft: 32 }]}>
          <Ionicons name="navigate-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.sub} numberOfLines={1}>
            {fCity(shipment.originCity)} → {fCity(shipment.destCity)}
            {roadInfo ? ` (${roadInfo})` : ''}
          </Text>
        </View>
      </View>

      {/* Offer rows */}
      {offers.map(offer => (
        <OfferRow
          key={offer.id}
          offer={offer}
          mode={mode}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}
    </View>
  )
}

// ─── Shipment card ────────────────────────────────────────────────────────────

function ShipmentCard({ item, filter, matchCount, matchCountsLoading, onDelete }: {
  item: Shipment
  filter: Filter
  matchCount?: number
  matchCountsLoading?: boolean
  onDelete?: (id: string, offerCount: number) => void
}) {
  const { colors } = useTheme()
  const icon       = CATEGORY_ICON[item.category] ?? '📦'
  const roadInfo   = formatRoad(item.roadDistanceKm, item.roadDurationMinutes)
  const offerCount = item._count?.offers ?? 0
  const msgCount   = (item.offers ?? []).reduce((s, o) => s + (o._count?.messages ?? 0), 0)
    + (item._count?.messages ?? 0)

  const requestCount      = (item.offers ?? []).filter(o => o.status === 'REQUEST').length
  const pendingOfferCount = (item.offers ?? []).filter(o => o.status === 'PENDING').length
  const hasAccepted       = (item.offers ?? []).some(o => o.status === 'ACCEPTED')

  const acceptedOffer = (item.offers ?? []).find(o => ['ACCEPTED', 'COMPLETED'].includes(o.status))
  const carrierName   = acceptedOffer?.carrier?.carrierProfile?.companyName
    ?? acceptedOffer?.carrier?.name ?? null
  const deliveryDate  = acceptedOffer?.deliveryDate
    ?? acceptedOffer?.route?.estimatedArrival ?? null

  const isTransitView = filter === 'to_transport' || filter === 'in_transit'

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Row 1: icon + title + status */}
      <View style={styles.row}>
        <Text style={styles.catIcon}>{icon}</Text>
        <Text style={[styles.title, { flex: 1 }]} numberOfLines={1}>{item.title}</Text>
        <ShipmentStatusBadge status={item.status} />
      </View>

      {/* Row 2: route */}
      <View style={[styles.row, { marginTop: 4, marginLeft: 32 }]}>
        <Ionicons name="navigate-outline" size={12} color={Colors.textMuted} />
        <Text style={styles.sub} numberOfLines={1}>
          {fCity(item.originCity)} → {fCity(item.destCity)}
          {roadInfo ? ` (${roadInfo})` : ''}
        </Text>
      </View>

      {/* Status labels (only in Αποστολές tab) */}
      {filter === 'shipments' && (
        <View style={[styles.actionsRow, { gap: 4, marginTop: 6, marginLeft: 32 }]}>
          <View style={styles.statusLabel}>
            <Text style={styles.statusLabelText}>Αιτήματα</Text>
            <View style={styles.statusLabelBadge}>
              <Text style={styles.statusLabelBadgeText}>{requestCount}</Text>
            </View>
          </View>
          <View style={styles.statusLabel}>
            <Text style={styles.statusLabelText}>Προσφορές</Text>
            <View style={styles.statusLabelBadge}>
              <Text style={styles.statusLabelBadgeText}>{pendingOfferCount}</Text>
            </View>
          </View>
          {hasAccepted && (
            <View style={[styles.statusLabel, styles.statusLabelAccepted]}>
              <Ionicons name="checkmark-circle-outline" size={11} color="#166534" />
              <Text style={[styles.statusLabelText, { color: '#166534' }]}>Επιλέχτηκε</Text>
            </View>
          )}
        </View>
      )}

      {/* Transit views: carrier + delivery */}
      {isTransitView && carrierName && (
        <View style={[styles.infoBox, { marginTop: 8 }]}>
          <View style={styles.row}>
            <Ionicons name="business-outline" size={13} color={Colors.primary} />
            <Text style={[styles.sub, { color: Colors.textPrimary, fontWeight: '600' }]}>{carrierName}</Text>
          </View>
          {deliveryDate && (
            <View style={[styles.row, { marginTop: 3 }]}>
              <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.sub}>
                Παράδοση: {new Date(deliveryDate).toLocaleDateString('el-GR')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Shipments filter: action buttons */}
      {filter === 'shipments' && (
        <View style={styles.actionsCol}>
          {/* Row A: Επεξεργασία + Διαγραφή */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnEdit]}
              activeOpacity={0.7}
              onPress={e => { e.stopPropagation?.(); router.push(`/(tabs)/shipments/new?editId=${item.id}&returnTo=${encodeURIComponent('/(tabs)')}` as any) }}
            >
              <Text style={styles.actionBtnEditText}>Επεξεργασία</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              activeOpacity={0.7}
              onPress={e => { e.stopPropagation?.(); onDelete?.(item.id, offerCount) }}
            >
              <Ionicons name="trash-outline" size={11} color="#EF4444" />
              <Text style={styles.actionBtnDangerText}>Διαγραφή</Text>
            </TouchableOpacity>
          </View>

          {/* Row B: Δρομολόγια + Μηνύματα */}
          <View style={styles.actionsRow}>
            {(matchCountsLoading || matchCount === undefined) ? (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOff]} activeOpacity={1} onPress={e => e.stopPropagation?.()}>
                <Text style={styles.actionBtnOffText}>Δρομολόγια</Text>
                <View style={styles.btnBadgeOff}><Text style={styles.btnBadgeOffText}>…</Text></View>
              </TouchableOpacity>
            ) : matchCount === 0 ? (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOff]} activeOpacity={1} onPress={e => e.stopPropagation?.()}>
                <Text style={styles.actionBtnOffText}>Δρομολόγια</Text>
                <View style={styles.btnBadgeOff}><Text style={styles.btnBadgeOffText}>0</Text></View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnAmber]}
                activeOpacity={0.8}
                onPress={e => { e.stopPropagation?.(); router.push(`/(tabs)/shipments/matches/${item.id}?title=${encodeURIComponent(item.title)}&returnTo=${encodeURIComponent('/(tabs)')}` as any) }}
              >
                <Text style={styles.actionBtnAmberText}>Δρομολόγια</Text>
                <View style={styles.btnBadge}><Text style={styles.btnBadgeText}>{matchCount}</Text></View>
              </TouchableOpacity>
            )}

            {msgCount > 0 ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnAmber]}
                activeOpacity={0.8}
                onPress={e => { e.stopPropagation?.(); router.push(`/(tabs)/messages?shipmentId=${item.id}&returnTo=${encodeURIComponent('/(tabs)')}` as any) }}
              >
                <Text style={styles.actionBtnAmberText}>✉️ Μηνύματα</Text>
                <View style={styles.btnBadge}><Text style={styles.btnBadgeText}>{msgCount}</Text></View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOff]} activeOpacity={1} onPress={e => e.stopPropagation?.()}>
                <Text style={styles.actionBtnOffText}>✉️ Μηνύματα</Text>
                <View style={styles.btnBadgeOff}><Text style={styles.btnBadgeOffText}>0</Text></View>
              </TouchableOpacity>
            )}
          </View>


        </View>
      )}

      {/* Transit date */}
      {isTransitView && (
        <Text style={[styles.sub, { marginTop: 4, marginLeft: 32 }]}>
          {new Date(item.createdAt).toLocaleDateString('el-GR')}
          {item.maxBudget ? `  ·  €${item.maxBudget}` : ''}
        </Text>
      )}
    </View>
  )
}

// ─── Sort picker ──────────────────────────────────────────────────────────────

function SortPicker({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false)
  const current = SORT_OPTIONS.find(o => o.id === value)!

  return (
    <View style={{ position: 'relative', zIndex: 10 }}>
      <TouchableOpacity onPress={() => setOpen(o => !o)} style={styles.sortBtn} activeOpacity={0.8}>
        <Ionicons name="swap-vertical-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.sortText}>{current.label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={Colors.textMuted} />
      </TouchableOpacity>

      {open && (
        <View style={styles.sortDropdown}>
          {SORT_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.id}
              onPress={() => { onChange(o.id); setOpen(false) }}
              style={[styles.sortOption, o.id === value && styles.sortOptionActive]}
            >
              <Text style={[styles.sortOptionText, o.id === value && { color: Colors.primary, fontWeight: '700' }]}>
                {o.label}
              </Text>
              {o.id === value && <Ionicons name="checkmark" size={14} color={Colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { user, logout } = useAuth()
  const { colors } = useTheme()
  const { t } = useI18n()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('shipments')
  const [sortBy, setSortBy] = useState<SortKey>('date_desc')
  const [burgerOpen, setBurgerOpen] = useState(false)

  const deleteMut = useMutation({
    mutationFn: (id: string) => shipmentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
    onError: (e: any) => Alert.alert('Σφάλμα', e?.response?.data?.error || 'Αποτυχία διαγραφής.'),
  })

  const acceptMut = useMutation({
    mutationFn: (offerId: string) => offersApi.accept(offerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
    onError: (e: any) => Alert.alert('Σφάλμα', e?.response?.data?.error || 'Αποτυχία αποδοχής.'),
  })

  const rejectMut = useMutation({
    mutationFn: (offerId: string) => offersApi.reject(offerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
    onError: (e: any) => Alert.alert('Σφάλμα', e?.response?.data?.error || 'Αποτυχία απόρριψης.'),
  })

  function handleDelete(id: string, offerCount: number) {
    Alert.alert(
      'Διαγραφή αποστολής',
      offerCount > 0
        ? `Υπάρχουν ${offerCount} εκκρεμείς προσφορές/αιτήματα. Θα σταλεί μήνυμα ακύρωσης σε κάθε μεταφορέα. Θέλεις σίγουρα να διαγράψεις;`
        : 'Θέλεις σίγουρα να διαγράψεις αυτή την αποστολή;',
      [
        { text: 'Ακύρωση', style: 'cancel' },
        { text: 'Διαγραφή', style: 'destructive', onPress: () => deleteMut.mutate(id) },
      ]
    )
  }

  function handleAccept(offerId: string) {
    Alert.alert('Αποδοχή προσφοράς', 'Θέλεις να αποδεχτείς αυτή την προσφορά;', [
      { text: 'Ακύρωση', style: 'cancel' },
      { text: 'Αποδοχή', onPress: () => acceptMut.mutate(offerId) },
    ])
  }

  function handleReject(offerId: string) {
    Alert.alert('Απόρριψη προσφοράς', 'Θέλεις να απορρίψεις αυτή την προσφορά;', [
      { text: 'Ακύρωση', style: 'cancel' },
      { text: 'Απόρριψη', style: 'destructive', onPress: () => rejectMut.mutate(offerId) },
    ])
  }

  const isCarrier = isCarrierUser(user?.role)

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', user?.role, sortBy],
    queryFn: async () => {
      if (isCarrier) {
        const { data } = await dashboardApi.getCarrier()
        return { shipments: data.shipments, completedShipments: [], announcementCount: 0, inboxMessageCount: 0 }
      }
      return dashboardApi.getSender(sortBy).then(r => r.data)
    },
    enabled: !!user,
  })

  const allShipments   = useMemo(() => (data?.shipments ?? []).filter(s => SHIPMENTS_STATUSES.includes(s.status)), [data])
  const allToTransport = useMemo(() => (data?.shipments ?? []).filter(s => TO_TRANSPORT_STATUSES.includes(s.status)), [data])
  const allInTransit   = useMemo(() => [
    ...(data?.shipments ?? []).filter(s => IN_TRANSIT_STATUSES.includes(s.status)),
    ...(data?.completedShipments ?? []),
  ], [data])

  const offerRequestGroups = useMemo<OfferGroup[]>(() =>
    (data?.shipments ?? [])
      .map(s => ({ shipment: s, offers: (s.offers ?? []).filter(o => o.status === 'REQUEST') }))
      .filter(g => g.offers.length > 0)
  , [data])

  const carrierOfferGroups = useMemo<OfferGroup[]>(() =>
    (data?.shipments ?? [])
      .map(s => ({ shipment: s, offers: (s.offers ?? []).filter(o => o.status === 'PENDING') }))
      .filter(g => g.offers.length > 0)
  , [data])

  const activeIds = useMemo(() => allShipments.map(s => s.id), [allShipments])

  const { data: matchCountData, isLoading: matchCountsLoading } = useQuery({
    queryKey: ['match-counts', activeIds],
    queryFn: () => matchCountsApi.getBatch(activeIds).then(r => r.data.counts),
    enabled: activeIds.length > 0,
    staleTime: 60_000,
  })
  const matchCounts: Record<string, number> = matchCountData ?? {}

  const displayed =
    filter === 'shipments'    ? allShipments :
    filter === 'to_transport' ? allToTransport :
    allInTransit

  const inboxCount        = data?.inboxMessageCount ?? 0
  const announcementCount = data?.announcementCount ?? 0

  const today = new Date().toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (isLoading) return <LoadingScreen message="Φόρτωση..." />

  if (error) {
    return (
      <View style={[styles.errorScreen, { backgroundColor: colors.surface }]}>
        <Ionicons name="warning-outline" size={42} color={Colors.danger} />
        <Text style={styles.errorTitle}>Δεν φορτώθηκαν τα records</Text>
        <Text style={styles.errorText}>
          {(error as any)?.response?.data?.error || (error as any)?.message || 'Άγνωστο σφάλμα'}
        </Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => refetch()}>
          <Text style={styles.emptyBtnText}>Δοκίμασε ξανά</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const TABS: { key: Filter; label: string; count: number }[] = [
    { key: 'shipments',      label: 'Αποστολές',        count: allShipments.length },
    { key: 'offer_requests', label: 'Αιτημ. Προσφορών', count: offerRequestGroups.reduce((s, g) => s + g.offers.length, 0) },
    { key: 'carrier_offers', label: 'Προσφορές Μεταφ.',  count: carrierOfferGroups.reduce((s, g) => s + g.offers.length, 0) },
    { key: 'to_transport',   label: 'Πρός Μεταφορά',    count: allToTransport.length },
    { key: 'in_transit',     label: 'Μεταφέρονται',     count: allInTransit.length },
  ]

  const isOfferView  = filter === 'offer_requests' || filter === 'carrier_offers'
  const offerGroups  = filter === 'offer_requests' ? offerRequestGroups : carrierOfferGroups

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>

      {/* ── Burger Menu Modal ── */}
      <Modal visible={burgerOpen} transparent animationType="fade" onRequestClose={() => setBurgerOpen(false)}>
        <Pressable style={styles.burgerOverlay} onPress={() => setBurgerOpen(false)}>
          <Pressable style={styles.burgerPanel} onPress={e => e.stopPropagation()}>
            <View style={styles.burgerHeader}>
              <Text style={styles.burgerLogo}>FORTIO</Text>
              <Text style={styles.burgerUser}>{user?.name ?? ''}</Text>
            </View>

            <TouchableOpacity style={styles.burgerItem} onPress={() => setBurgerOpen(false)}>
              <Text style={styles.burgerItemText}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.burgerItem} onPress={() => { setBurgerOpen(false); router.push('/(tabs)/profile') }}>
              <Text style={styles.burgerItemText}>Προφίλ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.burgerItem} onPress={() => { setBurgerOpen(false); router.push('/(tabs)/profile') }}>
              <Text style={styles.burgerItemText}>Ασφάλεια</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.burgerItem} onPress={() => { setBurgerOpen(false); router.push('/(tabs)/profile') }}>
              <Text style={styles.burgerItemText}>Ρυθμίσεις</Text>
            </TouchableOpacity>

            <View style={styles.burgerSep} />

            <TouchableOpacity style={styles.burgerItem} onPress={() => { setBurgerOpen(false); logout() }}>
              <Text style={[styles.burgerItemText, { color: '#F87171' }]}>Αποσύνδεση</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Top row: logo + exit + burger */}
        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: (inboxCount > 0 || announcementCount > 0) ? 10 : 0 }]}>
          <Text style={styles.headerLogo}>FORTIO</Text>
          <View style={[styles.row, { gap: 8 }]}>
            <TouchableOpacity onPress={() => logout()} style={styles.exitBtn}>
              <Ionicons name="log-out-outline" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.exitBtnText}>Έξοδος</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setBurgerOpen(true)} style={styles.burgerBtn}>
              <Text style={styles.burgerBtnText}>≡</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Badges row */}
        {(inboxCount > 0 || announcementCount > 0) && (
          <View style={[styles.row, { gap: 8 }]}>
            {inboxCount > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/messages')} style={styles.badge}>
                <Ionicons name="chatbubbles-outline" size={13} color="#fff" />
                <Text style={styles.badgeText}>{inboxCount} αδιάβαστα</Text>
              </TouchableOpacity>
            )}
            {announcementCount > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/announcements')}
                style={[styles.badge, { backgroundColor: '#D97706' }]}
              >
                <Ionicons name="megaphone-outline" size={13} color="#fff" />
                <Text style={styles.badgeText}>{announcementCount} ανακοινώσεις</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── Tab bar (horizontal scroll) ── */}
      <View style={[styles.tabBarOuter, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={[styles.tab, filter === tab.key && styles.tabActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, filter === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              <View style={[styles.tabBadge, filter === tab.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, filter === tab.key && styles.tabBadgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── List ── */}
      {isOfferView ? (
        <FlatList
          data={offerGroups}
          keyExtractor={item => item.shipment.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text style={styles.emptyText}>
                {filter === 'offer_requests' ? 'Δεν έχετε στείλει αιτήματα' : 'Δεν υπάρχουν εκκρεμείς προσφορές'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <OfferGroupSection
              group={item}
              mode={filter === 'offer_requests' ? 'request' : 'carrier_offer'}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          )}
        />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={s => s.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📦</Text>
              <Text style={styles.emptyText}>Δεν υπάρχουν αποστολές</Text>
              {filter === 'shipments' && (
                <TouchableOpacity
                  onPress={() => router.push(`/(tabs)/shipments/new?returnTo=${encodeURIComponent('/(tabs)')}` as any)}
                  style={styles.emptyBtn}
                >
                  <Text style={styles.emptyBtnText}>Δημιούργησε τώρα →</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <ShipmentCard
              item={item}
              filter={filter}
              matchCount={matchCounts[item.id]}
              matchCountsLoading={filter === 'shipments' && matchCountsLoading}
              onDelete={filter === 'shipments' ? handleDelete : undefined}
            />
          )}
        />
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/(tabs)/shipments/new?returnTo=${encodeURIComponent('/(tabs)')}` as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20,
  },
  headerLogo: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  headerSub:  { color: '#93C5FD', fontSize: 13, marginBottom: 2 },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerDate: { color: '#93C5FD', fontSize: 12, marginTop: 3 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Exit button
  exitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5,
  },
  exitBtnText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },

  // Burger button (header)
  burgerBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  burgerBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 22, fontWeight: '700', lineHeight: 26 },

  // Burger menu panel
  burgerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  burgerPanel: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: 240, backgroundColor: '#111',
    paddingTop: 60, paddingBottom: 40,
  },
  burgerHeader: {
    paddingHorizontal: 20, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  burgerLogo: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  burgerUser: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 4 },
  burgerItem: { paddingHorizontal: 20, paddingVertical: 13 },
  burgerItemText: { color: 'rgba(255,255,255,0.7)', fontSize: 15 },
  burgerSep: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginVertical: 8 },

  // Tab bar (scrollable)
  tabBarOuter: { flexShrink: 0, borderBottomWidth: 1 },
  tabBarContent: { paddingHorizontal: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 12, paddingHorizontal: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
    minWidth: 100,
  },
  tabActive:    { borderBottomColor: Colors.primary },
  tabText:      { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  tabBadgeActive:     { backgroundColor: Colors.primary },
  tabBadgeText:       { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  tabBadgeTextActive: { color: '#fff' },

  // Section header
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  // Sort
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fff',
  },
  sortText: { fontSize: 12, color: Colors.textSecondary },
  sortDropdown: {
    position: 'absolute', top: '100%', right: 0, marginTop: 4,
    backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, minWidth: 200, zIndex: 100,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  sortOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  sortOptionActive:  { backgroundColor: '#EFF6FF' },
  sortOptionText:    { fontSize: 13, color: Colors.textPrimary },

  // Card
  card: {
    borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0',
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  title:   { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  sub:     { fontSize: 12, color: '#94A3B8', flexShrink: 1 },
  infoBox: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10,
  },

  // Offer group section
  groupSection: {
    borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  groupShipmentHeader: { padding: 14, paddingBottom: 12 },
  offerRow: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },

  // Route header (inside OfferRow)
  routeHeader: {
    backgroundColor: 'rgba(27,58,107,0.05)',
    borderRadius: 8, padding: 8,
  },
  routeNum:  { fontSize: 11, fontWeight: '700', color: Colors.primary },
  routeCity: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },

  // Action buttons
  actionsCol: { marginTop: 10, gap: 6, marginLeft: 32 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  actionBtnEdit:     { backgroundColor: 'rgba(148,163,184,0.15)' },
  actionBtnEditText: { fontSize: 11, fontWeight: '600', color: Colors.textPrimary },
  actionBtnOff:      { backgroundColor: '#F1F5F9' },
  actionBtnOffText:  { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  actionBtnAmber:    { backgroundColor: Colors.accent },
  actionBtnAmberText:{ fontSize: 11, fontWeight: '700', color: '#000' },
  actionBtnDanger:     { backgroundColor: 'rgba(239,68,68,0.1)' },
  actionBtnDangerText: { fontSize: 11, fontWeight: '600', color: '#EF4444' } as const,
  btnBadge: {
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  btnBadgeText:    { fontSize: 10, fontWeight: '800', color: '#000' },
  btnBadgeOff: {
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  btnBadgeOffText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },

  // Status labels (Row C)
  statusLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusLabelAccepted: { backgroundColor: '#DCFCE7' },
  statusLabelText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  statusLabelBadge: {
    minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  statusLabelBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary },

  // Empty state
  empty:       { alignItems: 'center', paddingTop: 60 },
  emptyText:   { fontSize: 15, color: '#94A3B8', marginBottom: 12 },
  emptyBtn:    { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#1B3A6B', borderRadius: 12 },
  emptyBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  errorScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTitle:  { color: Colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 12 },
  errorText:   { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 16 },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
})
