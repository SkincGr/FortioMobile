import React, { useState, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, StyleSheet, ScrollView,
} from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { shipmentsApi, matchesApi, messagesApi, RouteMatch } from '@/lib/api'
import { Colors } from '@/constants/colors'

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_ICON: Record<string, string> = {
  VAN: '🚐', TRUCK: '🚛', SHIP: '🚢', AIRPLANE: '✈️', TRAIN: '🚂',
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

function routeNumber(route: RouteMatch) {
  if (route.routeNumber) return String(route.routeNumber).padStart(6, '0')
  return route.id.slice(-8).toUpperCase()
}

// ─── Route card ───────────────────────────────────────────────────────────────

type RouteCardProps = {
  route: RouteMatch
  isSent: boolean
  onRequest: () => void
}

function RouteCard({ route, isSent, onRequest }: RouteCardProps) {
  const icon = VEHICLE_ICON[route.carrier?.vehicleType ?? ''] ?? '🚛'
  const carrier = route.carrier?.user?.name ?? 'Μεταφορέας'
  const rating = route.carrier?.rating
  const depDate = fDate(route.departureDate)
  const arrDate = fDate(route.estimatedArrival ?? route.departureDate)

  const midStops = (route.stops ?? []).slice(1, -1)

  return (
    <View style={styles.card}>
      {/* Row 1: vehicle + route number + carrier */}
      <View style={[styles.row, { flexWrap: 'wrap', gap: 6, marginBottom: 8 }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <Text style={styles.routeNum}>#{routeNumber(route)}</Text>
        <View style={styles.carrierChip}>
          <Text style={styles.carrierText}>{carrier}</Text>
          {rating != null && rating > 0 && (
            <Text style={styles.ratingText}> ★ {Number(rating).toFixed(1)}</Text>
          )}
        </View>
        {route.isRecurring && (
          <View style={styles.recurringChip}>
            <Text style={styles.recurringText}>Επαναλαμβανόμενο</Text>
          </View>
        )}
        {route.distanceKm != null && route.distanceKm > 0 && (
          <View style={styles.distChip}>
            <Ionicons name="navigate-outline" size={10} color={Colors.primary} />
            <Text style={styles.distText}>{route.distanceKm} km</Text>
          </View>
        )}
      </View>

      {/* Row 2: origin → dest */}
      <View style={[styles.row, { marginBottom: 4, flexWrap: 'wrap', gap: 4 }]}>
        <Text style={styles.cityText}>{fCity(route.originCity)}</Text>
        {depDate && <Text style={styles.dateText}>({depDate})</Text>}
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.cityText}>{fCity(route.destCity)}</Text>
        {arrDate && <Text style={styles.dateText}>({arrDate})</Text>}
      </View>

      {/* Mid stops */}
      {midStops.length > 0 && (
        <Text style={styles.stopsText} numberOfLines={1}>
          {midStops.map(s => s.city ?? '—').join(', ')}
        </Text>
      )}

      {/* Price + CTA */}
      <View style={[styles.row, { marginTop: 10, justifyContent: 'space-between' }]}>
        <View>
          {route.pricePerKg != null && (
            <Text style={styles.priceText}>€{route.pricePerKg}/kg</Text>
          )}
          {route.pricePerM3 != null && (
            <Text style={styles.priceSubText}>€{route.pricePerM3}/m³</Text>
          )}
        </View>

        {isSent ? (
          <View style={styles.sentBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.sentText}>Έχει Σταλεί Αίτημα για Προσφορά</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.requestBtn} onPress={onRequest} activeOpacity={0.85}>
            <Text style={styles.requestBtnText}>Αίτημα Προσφοράς</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ─── Matches screen ───────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const { id: shipmentId, title: titleParam } = useLocalSearchParams<{ id: string; title?: string }>()
  const queryClient = useQueryClient()

  const [modalRoute, setModalRoute] = useState<RouteMatch | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const { data: shipmentData, isLoading: loadingShipment } = useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: () => shipmentsApi.get(shipmentId!).then(r => r.data),
    enabled: !!shipmentId,
  })

  const { data: matchData, isLoading: loadingMatches } = useQuery({
    queryKey: ['matches', shipmentId],
    queryFn: () => matchesApi.get(shipmentId!).then(r => r.data),
    enabled: !!shipmentId,
  })

  const sentFromOffers = useMemo(() => {
    const ids = new Set<string>()
    for (const offer of shipmentData?.offers ?? []) {
      if (offer.routeId && offer.status !== 'WITHDRAWN') ids.add(offer.routeId)
    }
    return ids
  }, [shipmentData])

  const allSent = useMemo(() => new Set([...sentFromOffers, ...sentIds]), [sentFromOffers, sentIds])

  const { mutate: sendRequest, isPending: sending } = useMutation({
    mutationFn: (vars: { shipmentId: string; routeId: string; content: string }) =>
      messagesApi.sendOfferRequest(vars),
    onSuccess: (_, vars) => {
      setSentIds(prev => new Set([...prev, vars.routeId]))
      queryClient.invalidateQueries({ queryKey: ['dashboard-sender'] })
      closeModal()
    },
  })

  function openModal(route: RouteMatch) {
    setModalRoute(route)
    setMessageText('')
  }

  function closeModal() {
    setModalRoute(null)
    setMessageText('')
  }

  function handleSend() {
    if (!modalRoute || !shipmentId) return
    sendRequest({ shipmentId, routeId: modalRoute.id, content: messageText.trim() })
  }

  const routes = matchData?.routes ?? []
  const isLoading = loadingShipment || loadingMatches

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Διαθέσιμα Δρομολόγια</Text>
            {titleParam ? (
              <Text style={styles.headerSub} numberOfLines={1}>{decodeURIComponent(titleParam)}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Αναζήτηση δρομολογίων…</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Διαθέσιμα Δρομολόγια</Text>
          {(shipmentData?.title || titleParam) ? (
            <Text style={styles.headerSub} numberOfLines={1}>
              {shipmentData?.title ?? decodeURIComponent(titleParam ?? '')}
            </Text>
          ) : null}
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{routes.length}</Text>
        </View>
      </View>

      {/* Route list */}
      <FlatList
        data={routes}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
            <Text style={styles.emptyTitle}>Δεν βρέθηκαν δρομολόγια</Text>
            <Text style={styles.emptySubtitle}>
              Δοκίμασε να επεξεργαστείς την αποστολή και να επιλέξεις πόλεις από τη λίστα προτάσεων.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RouteCard
            route={item}
            isSent={allSent.has(item.id)}
            onRequest={() => openModal(item)}
          />
        )}
      />

      {/* Request modal */}
      <Modal visible={!!modalRoute} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal header */}
            <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
              <View>
                <Text style={styles.modalLabel}>ΑΙΤΗΜΑ</Text>
                <Text style={styles.modalTitle}>Αίτημα Προσφοράς</Text>
              </View>
              <TouchableOpacity onPress={closeModal} hitSlop={12}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Route info */}
            {modalRoute && (
              <View style={styles.modalRouteInfo}>
                <View style={[styles.row, { gap: 6, marginBottom: 8 }]}>
                  <Text style={{ fontSize: 16 }}>
                    {VEHICLE_ICON[modalRoute.carrier?.vehicleType ?? ''] ?? '🚛'}
                  </Text>
                  <Text style={styles.modalRouteNum}>#{routeNumber(modalRoute)}</Text>
                  <Text style={styles.modalCarrierName}>
                    {modalRoute.carrier?.user?.name ?? 'Μεταφορέας'}
                  </Text>
                </View>
                <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
                  <Text style={styles.modalCityText}>{fCity(modalRoute.originCity)}</Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.modalCityText}>{fCity(modalRoute.destCity)}</Text>
                </View>
              </View>
            )}

            {/* Message input */}
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Γράψε το μήνυμά σου στον μεταφορέα (προαιρετικό)…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              style={styles.messageInput}
              textAlignVertical="top"
            />

            {/* Buttons */}
            <View style={[styles.row, { gap: 10, marginTop: 16 }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Ακύρωση</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                onPress={handleSend}
                disabled={sending}
              >
                {sending
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.sendBtnText}>Αποστολή</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: 14 },

  // Header
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#93C5FD', fontSize: 12, marginTop: 2 },
  countBadge: {
    backgroundColor: Colors.accent, borderRadius: 14,
    minWidth: 28, height: 28, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: { color: '#000', fontWeight: '800', fontSize: 13 },

  // Shipment summary
  shipmentCard: {
    backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderBottomColor: '#FDE68A',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  shipmentRoute: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  shipmentDetail: { fontSize: 13, color: Colors.textSecondary },

  // Route card
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  routeNum: { fontSize: 12, fontWeight: '700', color: Colors.accent, fontVariant: ['tabular-nums'] },
  carrierChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F1F5F9', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  carrierText: { fontSize: 12, color: Colors.textPrimary, fontWeight: '600' },
  ratingText:  { fontSize: 11, color: Colors.accent, fontWeight: '700' },
  recurringChip: {
    backgroundColor: '#FEF3C7', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  recurringText: { fontSize: 11, color: '#D97706', fontWeight: '600' },
  distChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EFF6FF', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  distText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  cityText:  { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  dateText:  { fontSize: 12, color: Colors.textMuted },
  arrow:     { fontSize: 12, color: Colors.textMuted },
  stopsText: { fontSize: 11, color: Colors.textMuted, marginTop: 2, marginLeft: 2 },
  capacityText: { fontSize: 12, color: Colors.textSecondary },
  priceText:    { fontSize: 16, fontWeight: '800', color: Colors.accent },
  priceSubText: { fontSize: 12, color: Colors.textMuted },
  sentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FDF4', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  sentText: { fontSize: 12, fontWeight: '700', color: Colors.success },
  requestBtn: {
    backgroundColor: Colors.accent, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  requestBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36,
  },
  modalLabel: { fontSize: 10, fontWeight: '800', color: Colors.accent, letterSpacing: 1.5 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  modalRouteInfo: {
    backgroundColor: '#F8FAFC', borderRadius: 12,
    padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  modalRouteNum:    { fontSize: 12, fontWeight: '700', color: Colors.accent },
  modalCarrierName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  modalCityText:    { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  messageInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    padding: 12, fontSize: 14, color: Colors.textPrimary,
    minHeight: 100, backgroundColor: '#FAFAFA',
  },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  sendBtn: {
    flex: 1, backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  sendBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },
})
