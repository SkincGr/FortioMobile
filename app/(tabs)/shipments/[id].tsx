import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  RefreshControl, Modal, StyleSheet, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { shipmentsApi, offersApi, Offer } from '@/lib/api'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Colors } from '@/constants/colors'

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_ICON: Record<string, string> = {
  VAN: '🚐', TRUCK: '🚛', SHIP: '🚢', AIRPLANE: '✈️', TRAIN: '🚂',
}

const STATUS_LABEL: Record<string, string> = {
  REQUEST:          'Αίτηση',
  PENDING:          'Σε αναμονή',
  AWAITING_SENDER:  'Αναμ. Αποστολέα',
  AWAITING_CARRIER: 'Αναμ. Μεταφορέα',
  ACCEPTED:         'Αποδεκτή',
  REJECTED:         'Απορρίφθηκε',
  WITHDRAWN:        'Ανακλήθηκε',
  COMPLETED:        'Ολοκληρώθηκε',
}

const STATUS_COLOR: Record<string, string> = {
  REQUEST:          Colors.textMuted,
  PENDING:          '#D97706',
  AWAITING_SENDER:  Colors.primary,
  AWAITING_CARRIER: Colors.primary,
  ACCEPTED:         Colors.success,
  REJECTED:         '#EF4444',
  WITHDRAWN:        Colors.textMuted,
  COMPLETED:        Colors.primary,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fDate(v?: string | null) {
  if (!v) return null
  return new Date(v).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fCity(raw?: string | null) {
  if (!raw) return '—'
  return raw.split(' / ')[0]
}

function fRouteNum(routeNumber?: string | null, routeId?: string | null) {
  if (routeNumber) return `#${String(routeNumber).padStart(6, '0')}`
  if (routeId) return `#${routeId.slice(-8).toUpperCase()}`
  return '—'
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    </View>
  )
}

// ─── Offer card ───────────────────────────────────────────────────────────────

function OfferCard({
  offer, shipmentId, onView,
}: {
  offer: Offer
  shipmentId: string
  onView: (o: Offer) => void
}) {
  const qc = useQueryClient()

  const acceptMut = useMutation({
    mutationFn: () => offersApi.accept(offer.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipment', shipmentId] })
      qc.invalidateQueries({ queryKey: ['dashboard-sender'] })
    },
    onError: () => Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η αποδοχή'),
  })

  const rejectMut = useMutation({
    mutationFn: () => offersApi.reject(offer.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipment', shipmentId] }),
    onError: () => Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η απόρριψη'),
  })

  const vehicleType = offer.carrier?.carrierProfile?.vehicleType
  const icon        = VEHICLE_ICON[vehicleType ?? ''] ?? '🚛'
  const companyName = offer.carrier?.carrierProfile?.companyName ?? offer.carrier?.name ?? offer.carrier?.email ?? '—'
  const email       = offer.carrier?.email ?? '—'
  const phone       = offer.carrier?.phone ?? ''
  const msgCount    = offer.unreadCount ?? offer._count?.messages ?? 0
  const depDate     = fDate(offer.route?.departureDate)
  const arrDate     = fDate(offer.deliveryDate ?? offer.route?.estimatedArrival)
  const origCity    = fCity(offer.route?.originCity)
  const destCity    = fCity(offer.route?.destCity)
  const midStops    = (offer.route?.stops ?? []).slice(1, -1)

  const isRequest  = offer.status === 'REQUEST'
  const isPending  = offer.status === 'PENDING'
  const isAccepted = offer.status === 'ACCEPTED'
  const isRejected = ['REJECTED', 'WITHDRAWN'].includes(offer.status)

  const statusColor = STATUS_COLOR[offer.status] ?? Colors.textMuted

  function confirmAccept() {
    Alert.alert(
      'Αποδοχή Προσφοράς',
      `Αποδέχεσαι την προσφορά από ${companyName};`,
      [
        { text: 'Ακύρωση', style: 'cancel' },
        { text: 'Αποδοχή', onPress: () => acceptMut.mutate() },
      ]
    )
  }

  return (
    <View style={[styles.card, isAccepted && styles.cardAccepted, isRejected && styles.cardRejected]}>

      {/* Row 1: vehicle + route# | status + price */}
      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
        <View style={styles.row}>
          <Text style={{ fontSize: 18, marginRight: 6 }}>{icon}</Text>
          <Text style={styles.routeNum}>
            {fRouteNum(offer.route?.routeNumber, offer.routeId)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABEL[offer.status] ?? offer.status}
            </Text>
          </View>
          {isRequest && (
            <Text style={styles.awaitingText}>Αναμένεται απάντηση</Text>
          )}
          {!isRequest && offer.price != null && offer.price > 0 && (
            <Text style={styles.priceText}>€{offer.price}</Text>
          )}
        </View>
      </View>

      {/* Row 2: Μεταφορέας */}
      <Text style={styles.carrierRow} numberOfLines={2}>
        <Text style={styles.muted}>Μεταφορέας: </Text>
        <Text style={styles.bold}>{companyName}</Text>
        <Text style={styles.muted}>{` (${email}${phone ? ` - ${phone}` : ''})`}</Text>
      </Text>

      {/* Row 3: origin → dest */}
      <View style={[styles.row, { marginTop: 5, flexWrap: 'wrap', gap: 4 }]}>
        <Text style={styles.cityText}>{origCity}</Text>
        {depDate && <Text style={styles.dateText}>({depDate})</Text>}
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.cityText}>{destCity}</Text>
        {arrDate && <Text style={styles.dateText}>({arrDate})</Text>}
      </View>

      {/* Mid stops */}
      {midStops.length > 0 && (
        <Text style={styles.stopsText} numberOfLines={1}>
          Στάσεις: {midStops.map(s => s.city ?? '—').join(' · ')}
        </Text>
      )}

      <View style={styles.divider} />

      {/* Buttons */}
      <View style={[styles.row, { flexWrap: 'wrap', gap: 6 }]}>
        <TouchableOpacity style={styles.btnView} onPress={() => onView(offer)}>
          <Text style={styles.btnViewText}>Προβολή</Text>
        </TouchableOpacity>

        {isPending && (
          <>
            <TouchableOpacity
              style={styles.btnAccept}
              onPress={confirmAccept}
              disabled={acceptMut.isPending}
            >
              {acceptMut.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnAcceptText}>Αποδοχή</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnReject}
              onPress={() => rejectMut.mutate()}
              disabled={rejectMut.isPending}
            >
              <Text style={styles.btnRejectText}>Απόρριψη</Text>
            </TouchableOpacity>
          </>
        )}

        {isAccepted && (
          <View style={styles.acceptedBadge}>
            <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
            <Text style={styles.acceptedText}>Αποδεκτή</Text>
          </View>
        )}

        {msgCount > 0 ? (
          <TouchableOpacity
            style={styles.btnMessage}
            onPress={() => router.push(
              `/(tabs)/messages?shipmentId=${shipmentId}&returnTo=${encodeURIComponent(`/(tabs)/shipments/${shipmentId}`)}` as any
            )}
          >
            <Text style={styles.btnMessageText}>✉️ Μηνύματα</Text>
            <View style={styles.msgBadge}>
              <Text style={styles.msgBadgeText}>{msgCount}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.btnMessageOff}>
            <Text style={styles.btnMessageOffText}>✉️ Μηνύματα</Text>
            <View style={styles.msgBadgeOff}>
              <Text style={styles.msgBadgeOffText}>0</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

// ─── View offer modal ─────────────────────────────────────────────────────────

function ViewOfferModal({
  offer, shipmentTitle, onClose,
}: {
  offer: Offer | null
  shipmentTitle?: string
  onClose: () => void
}) {
  if (!offer) return null
  const companyName = offer.carrier?.carrierProfile?.companyName ?? offer.carrier?.name ?? offer.carrier?.email ?? '—'
  const statusColor = STATUS_COLOR[offer.status] ?? Colors.textMuted

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABEL[offer.status] ?? offer.status}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {shipmentTitle && (
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>ΑΠΟΣΤΟΛΗ</Text>
              <Text style={styles.modalValue}>{shipmentTitle}</Text>
            </View>
          )}

          <View style={styles.modalRow}>
            <Text style={styles.modalLabel}>ΤΙΜΗ</Text>
            {offer.price != null && offer.price > 0
              ? <Text style={styles.modalPrice}>€{offer.price}</Text>
              : <Text style={styles.muted}>Δεν έχει οριστεί ακόμα</Text>}
          </View>

          <View style={styles.modalRow}>
            <Text style={styles.modalLabel}>ΜΕΤΑΦΟΡΕΑΣ</Text>
            <Text style={styles.modalValue}>{companyName}</Text>
          </View>

          {offer.deliveryDate && (
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>ΠΑΡΑΔΟΣΗ</Text>
              <Text style={styles.modalValue}>
                {new Date(offer.deliveryDate).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.btnClose} onPress={onClose}>
            <Text style={styles.btnCloseText}>Κλείσιμο</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ShipmentDetailScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>()
  const goBack = () => router.replace((returnTo ? decodeURIComponent(returnTo) : '/(tabs)') as any)
  const [viewOffer, setViewOffer] = useState<Offer | null>(null)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => shipmentsApi.get(id!).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) return <LoadingScreen message="Φόρτωση..." />
  if (!data) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface }}>
      <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
      <Text style={{ color: Colors.textMuted, marginTop: 12 }}>Η αποστολή δεν βρέθηκε</Text>
    </View>
  )

  const allOffers     = data.offers ?? []
  const requestOffers = allOffers.filter(o => o.status === 'REQUEST')
  const carrierOffers = allOffers.filter(o => !['REQUEST', 'WITHDRAWN'].includes(o.status))
  const totalActive   = requestOffers.length + carrierOffers.length

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Αιτήσεις και Προσφορές Μεταφορέων</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{data.title}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {totalActive === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
            <Text style={styles.emptyTitle}>Δεν υπάρχουν αιτήματα</Text>
            <Text style={styles.emptySubtitle}>Βρες διαθέσιμα δρομολόγια και στείλε αίτημα.</Text>
            <TouchableOpacity
              style={styles.routesBtn}
              onPress={() => router.push(`/(tabs)/shipments/matches/${id}?returnTo=${encodeURIComponent(`/(tabs)/shipments/${id}${returnTo ? `?returnTo=${returnTo}` : ''}`)}` as any)}
            >
              <Text style={styles.routesBtnText}>Εμφάν. Δρομολογίων</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {requestOffers.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <SectionHeader title="Αιτήσεις μου Για Προσφορά" count={requestOffers.length} />
                {requestOffers.map(o => (
                  <OfferCard key={o.id} offer={o} shipmentId={id!} onView={setViewOffer} />
                ))}
              </View>
            )}

            {carrierOffers.length > 0 && (
              <View>
                <SectionHeader title="Προσφορές Μεταφορέων" count={carrierOffers.length} />
                {carrierOffers.map(o => (
                  <OfferCard key={o.id} offer={o} shipmentId={id!} onView={setViewOffer} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <ViewOfferModal
        offer={viewOffer}
        shipmentTitle={data.title}
        onClose={() => setViewOffer(null)}
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn:     { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', lineHeight: 18 },
  headerSub:   { color: '#93C5FD', fontSize: 12, marginTop: 4 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  sectionTitle:     { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  sectionBadge:     { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  cardAccepted: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
  cardRejected: { opacity: 0.55 },

  row:        { flexDirection: 'row', alignItems: 'center' },
  routeNum:   { fontSize: 13, fontWeight: '800', color: Colors.accent, fontVariant: ['tabular-nums'] },
  statusBadge:{ borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  awaitingText:{ fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  priceText:  { fontSize: 20, fontWeight: '900', color: Colors.accent, marginTop: 2 },

  carrierRow: { fontSize: 12, marginTop: 6, lineHeight: 18 },
  bold:       { fontWeight: '600', color: Colors.textPrimary },
  muted:      { color: Colors.textMuted },

  cityText:  { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  dateText:  { fontSize: 11, color: Colors.textMuted },
  arrow:     { fontSize: 12, color: Colors.textMuted, marginHorizontal: 4 },
  stopsText: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },

  btnView:      { backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  btnViewText:  { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  btnAccept:    { backgroundColor: Colors.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  btnAcceptText:{ fontSize: 12, fontWeight: '700', color: '#fff' },
  btnReject:    { backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  btnRejectText:{ fontSize: 12, fontWeight: '700', color: '#EF4444' },
  acceptedBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  acceptedText: { fontSize: 12, fontWeight: '700', color: Colors.success },
  btnMessage:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  btnMessageText:{ fontSize: 11, fontWeight: '700', color: '#000' },
  btnMessageOff: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  btnMessageOffText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  msgBadge:     { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 9, minWidth: 17, height: 17, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  msgBadgeText: { fontSize: 10, fontWeight: '800', color: '#000' },
  msgBadgeOff:  { backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 9, minWidth: 17, height: 17, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  msgBadgeOffText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },

  emptyState:    { alignItems: 'center', paddingTop: 60 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 20, textAlign: 'center' },
  routesBtn:     { backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  routesBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 },
  modalRow:     { marginBottom: 14 },
  modalLabel:   { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: Colors.textMuted, marginBottom: 4 },
  modalValue:   { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  modalPrice:   { fontSize: 28, fontWeight: '900', color: Colors.accent },
  btnClose:     { marginTop: 16, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnCloseText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
})
