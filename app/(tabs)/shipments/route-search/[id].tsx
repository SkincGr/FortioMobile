import React, { useState, useMemo, useEffect } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { shipmentsApi, matchesApi, messagesApi, RouteMatch } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { Colors } from '@/constants/colors'

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_ICON: Record<string, string> = {
  VAN: '🚐', TRUCK: '🚛', SHIP: '🚢', AIRPLANE: '✈️', TRAIN: '🚂',
}

const DISTANCE_PRESETS = [5, 10, 20, 50, 100]

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
  onMessage: () => void
}

function RouteCard({ route, isSent, onRequest, onMessage }: RouteCardProps) {
  const { t } = useI18n()
  const icon = VEHICLE_ICON[route.vehicle?.type ?? ''] ?? '🚛'
  const carrier = route.company?.name ?? t('match.carrier_fallback')
  const rating = route.company?.rating
  const depDate = fDate(route.departureDate)
  const arrDate = fDate(route.estimatedArrival ?? route.departureDate)

  const midStops = (route.stops ?? []).slice(1, -1)

  return (
    <View style={styles.card}>
      {/* Row 1: vehicle icon + company name + rating + distance badge */}
      <View style={[styles.row, { gap: 8, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'space-between' }]}>
        <View style={[styles.row, { gap: 8, flex: 1 }]}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
          <Text style={styles.carrierName} numberOfLines={1}>{carrier}</Text>
          {rating != null && rating > 0 && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {Number(rating).toFixed(1)}</Text>
            </View>
          )}
        </View>
        {route.distanceKm != null && (
          <View style={styles.distChip}>
            <Ionicons name="navigate-outline" size={11} color="#60A5FA" />
            <Text style={styles.distText}>{route.distanceKm} km</Text>
          </View>
        )}
      </View>

      {/* Row 2: Status & Recurring */}
      <View style={[styles.row, { gap: 6, marginBottom: 8, flexWrap: 'wrap' }]}>
        {!!route.status && (
          <View style={styles.statusChip}>
            <Text style={styles.statusText}>{route.status}</Text>
          </View>
        )}
        {route.isRecurring && (
          <View style={styles.recurringChip}>
            <Text style={styles.recurringText}>{t('match.recurring')}</Text>
          </View>
        )}
      </View>

      {/* Row 3: origin → dest */}
      <View style={[styles.row, { marginBottom: 4, flexWrap: 'wrap', gap: 4 }]}>
        <Text style={styles.cityText}>{fCity(route.originCity)}</Text>
        {depDate && <Text style={styles.dateText}>({depDate})</Text>}
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.cityText}>{fCity(route.destCity)}</Text>
        {arrDate && <Text style={styles.dateText}>({arrDate})</Text>}
      </View>

      {/* Mid stops */}
      {midStops.length > 0 && (
        <Text style={styles.stopsText} numberOfLines={2}>
          {midStops.map(s => {
            let loc = s.city ?? '—'
            const country = (s as any).country
            if (country && !loc.includes(country)) {
              loc = `${country} / ${loc}`
            } else if (s.place?.name && s.place.name.includes('/')) {
              loc = s.place.name
            }
            const d = s.estimatedDate ? ` (${fDate(s.estimatedDate)})` : ''
            return `${loc}${d}`
          }).join(' → ')}
        </Text>
      )}

      {/* Price */}
      {(route.pricePerKg != null || route.pricePerM3 != null) && (
        <View style={{ marginTop: 10, marginBottom: 4 }}>
          {route.pricePerKg != null && (
            <Text style={styles.priceText}>€{route.pricePerKg}/kg</Text>
          )}
          {route.pricePerM3 != null && (
            <Text style={styles.priceSubText}>€{route.pricePerM3}/m³</Text>
          )}
        </View>
      )}

      {/* CTA Buttons */}
      <View style={[styles.row, { gap: 8, flexWrap: 'wrap', marginTop: 10, justifyContent: 'flex-start' }]}>
        {isSent ? (
          <View style={styles.sentBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
            <Text style={styles.sentText}>{t('match.btn_sent')}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.requestBtn} onPress={onRequest} activeOpacity={0.85}>
            <Text style={styles.requestBtnText}>{t('match.btn_request')}</Text>
          </TouchableOpacity>
        )}

        {/* Messages Button */}
        <TouchableOpacity
          style={[styles.msgBtn, (route.messageCount ?? 0) > 0 ? styles.msgBtnActive : styles.msgBtnOff]}
          onPress={onMessage}
          activeOpacity={0.85}
        >
          <Text style={(route.messageCount ?? 0) > 0 ? styles.msgBtnActiveText : styles.msgBtnOffText}>
            {t('match.btn_messages')}
          </Text>
          <View style={(route.messageCount ?? 0) > 0 ? styles.msgBadge : styles.msgBadgeOff}>
            <Text style={(route.messageCount ?? 0) > 0 ? styles.msgBadgeText : styles.msgBadgeOffText}>
              {route.messageCount ?? 0}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Route Search Screen ──────────────────────────────────────────────────────

export default function RouteSearchScreen() {
  const { id: shipmentId, title: titleParam, returnTo } = useLocalSearchParams<{ id: string; title?: string; returnTo?: string }>()
  const goBack = () => router.replace((returnTo ? decodeURIComponent(returnTo) : '/(tabs)') as any)
  const queryClient = useQueryClient()
  const { t } = useI18n()

  const [maxDistance, setMaxDistance] = useState(10)
  const [debouncedDistance, setDebouncedDistance] = useState(10)

  const [modalRoute, setModalRoute] = useState<RouteMatch | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const [msgModal, setMsgModal] = useState<RouteMatch | null>(null)
  const [msgText, setMsgText] = useState('')

  // Debounce distance changes for query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDistance(maxDistance)
    }, 350)
    return () => clearTimeout(handler)
  }, [maxDistance])

  const { data: shipmentData, isLoading: loadingShipment } = useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: () => shipmentsApi.get(shipmentId!).then(r => r.data),
    enabled: !!shipmentId,
  })

  const { data: matchData, isLoading: loadingMatches, isFetching: fetchingMatches } = useQuery({
    queryKey: ['route-search', shipmentId, debouncedDistance],
    queryFn: () => matchesApi.get(shipmentId!, debouncedDistance).then(r => r.data),
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeModal()
    },
  })

  const { mutate: sendPlainMsg, isPending: sendingMsg } = useMutation({
    mutationFn: (vars: { shipmentId: string; routeId: string; content: string }) =>
      messagesApi.sendPlainMessage(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-search', shipmentId, debouncedDistance] })
      setMsgModal(null)
      setMsgText('')
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

  function handleMessage(route: RouteMatch) {
    const count = route.messageCount ?? 0
    if (count > 0) {
      const offer = shipmentData?.offers?.find((o: any) => o.routeId === route.id)
      if (offer) {
        const currentPath = `/(tabs)/shipments/route-search/${shipmentId}?title=${encodeURIComponent(shipmentData?.title ?? '')}&returnTo=${encodeURIComponent(returnTo ?? '/(tabs)')}`
        router.push(`/(tabs)/messages/${offer.id}?returnTo=${encodeURIComponent(currentPath)}` as any)
      }
    } else {
      setMsgModal(route)
      setMsgText('')
    }
  }

  const routes = matchData?.routes ?? []
  const isLoading = loadingShipment || (loadingMatches && !matchData)

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('routeSearch.title')}</Text>
            {titleParam ? (
              <Text style={styles.headerSub} numberOfLines={1}>{decodeURIComponent(titleParam)}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FBBF24" />
          <Text style={styles.loadingText}>{t('match.loading')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('routeSearch.title')}</Text>
          {(shipmentData?.title || titleParam) ? (
            <Text style={styles.headerSub} numberOfLines={1}>
              {shipmentData?.title ?? decodeURIComponent(titleParam ?? '')}
            </Text>
          ) : null}
        </View>
        <View style={styles.countBadge}>
          {fetchingMatches ? (
            <ActivityIndicator size="small" color="#FBBF24" />
          ) : (
            <Text style={styles.countText}>{routes.length}</Text>
          )}
        </View>
      </View>

      <FlatList
        data={routes}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            {/* Shipment Summary Card */}
            {shipmentData && (
              <View style={styles.shipmentSummaryCard}>
                <Text style={styles.summaryLabel}>{t('routeSearch.section_shipment')}</Text>
                <Text style={styles.summaryTitle}>{shipmentData.title}</Text>
                <View style={[styles.row, { gap: 6, marginTop: 4 }]}>
                  <Ionicons name="navigate-outline" size={13} color={Colors.primary} />
                  <Text style={styles.summaryRoute}>
                    {fCity(shipmentData.originCity)} → {fCity(shipmentData.destCity)}
                  </Text>
                </View>
                <View style={[styles.row, { gap: 12, marginTop: 8, flexWrap: 'wrap' }]}>
                  {shipmentData.weight && (
                    <Text style={styles.summaryPill}>⚖️ {shipmentData.weight} kg</Text>
                  )}
                  {shipmentData.volume && (
                    <Text style={styles.summaryPill}>📦 {shipmentData.volume} m³</Text>
                  )}
                  {shipmentData.maxBudget && (
                    <Text style={[styles.summaryPill, { color: '#FBBF24', fontWeight: '700' }]}>
                      έως €{shipmentData.maxBudget}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Distance Slider / Radius Controller */}
            <View style={styles.distanceCard}>
              <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 10 }]}>
                <Text style={styles.distanceLabel}>{t('routeSearch.slider_label')}</Text>
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceBadgeText}>{maxDistance} km</Text>
                </View>
              </View>

              {/* Stepper Buttons and Slider Bar */}
              <View style={[styles.row, { gap: 12, alignItems: 'center', marginBottom: 12 }]}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setMaxDistance(d => Math.max(0, d - 5))}
                  hitSlop={8}
                >
                  <Text style={styles.stepperBtnText}>-5</Text>
                </TouchableOpacity>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, maxDistance))}%` }]} />
                </View>

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setMaxDistance(d => Math.min(100, d + 5))}
                  hitSlop={8}
                >
                  <Text style={styles.stepperBtnText}>+5</Text>
                </TouchableOpacity>
              </View>

              {/* Preset Quick Buttons */}
              <View style={[styles.row, { gap: 8, justifyContent: 'space-between' }]}>
                {DISTANCE_PRESETS.map(preset => {
                  const active = maxDistance === preset
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[styles.presetBtn, active && styles.presetBtnActive]}
                      onPress={() => setMaxDistance(preset)}
                    >
                      <Text style={[styles.presetBtnText, active && styles.presetBtnTextActive]}>
                        {preset} km
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Results Header */}
            <View style={[styles.row, { justifyContent: 'space-between', marginTop: 8 }]}>
              <Text style={styles.sectionTitle}>
                {t('routeSearch.section_routes')}
              </Text>
              {fetchingMatches && (
                <ActivityIndicator size="small" color="#FBBF24" />
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
            <Text style={styles.emptyTitle}>{t('routeSearch.no_routes_title')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('routeSearch.no_routes_sub')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RouteCard
            route={item}
            isSent={allSent.has(item.id)}
            onRequest={() => openModal(item)}
            onMessage={() => handleMessage(item)}
          />
        )}
      />

      {/* Offer Request Modal */}
      <Modal visible={!!modalRoute} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
              <View>
                <Text style={styles.modalLabel}>{t('match.modal.req_label')}</Text>
                <Text style={styles.modalTitle}>{t('match.modal.req_title')}</Text>
              </View>
              <TouchableOpacity onPress={closeModal} hitSlop={12}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            {modalRoute && (
              <View style={styles.modalRouteInfo}>
                <View style={[styles.row, { gap: 6, marginBottom: 8 }]}>
                  <Text style={{ fontSize: 16 }}>
                    {VEHICLE_ICON[modalRoute.vehicle?.type ?? ''] ?? '🚛'}
                  </Text>
                  <Text style={styles.modalRouteNum}>#{routeNumber(modalRoute)}</Text>
                  <Text style={styles.modalCarrierName}>
                    {modalRoute.company?.name ?? t('match.carrier_fallback')}
                  </Text>
                </View>
                <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
                  <Text style={styles.modalCityText}>{fCity(modalRoute.originCity)}</Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.modalCityText}>{fCity(modalRoute.destCity)}</Text>
                </View>
              </View>
            )}

            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder={t('match.modal.req_placeholder')}
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              numberOfLines={4}
              style={styles.messageInput}
              textAlignVertical="top"
            />

            <View style={[styles.row, { gap: 10, marginTop: 16 }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                onPress={handleSend}
                disabled={sending}
              >
                {sending
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.sendBtnText}>{t('common.send')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Plain Message Modal */}
      <Modal visible={!!msgModal} transparent animationType="slide" onRequestClose={() => setMsgModal(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
              <View>
                <Text style={styles.modalLabel}>{t('match.modal.msg_label')}</Text>
                <Text style={styles.modalTitle}>{t('match.modal.msg_title')}</Text>
              </View>
              <TouchableOpacity onPress={() => setMsgModal(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            {msgModal && (
              <View style={styles.modalRouteInfo}>
                <View style={[styles.row, { gap: 6, marginBottom: 8 }]}>
                  <Text style={{ fontSize: 16 }}>
                    {VEHICLE_ICON[msgModal.vehicle?.type ?? ''] ?? '🚛'}
                  </Text>
                  <Text style={styles.modalRouteNum}>#{routeNumber(msgModal)}</Text>
                  <Text style={styles.modalCarrierName}>
                    {msgModal.company?.name ?? t('match.carrier_fallback')}
                  </Text>
                </View>
                <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
                  <Text style={styles.modalCityText}>{fCity(msgModal.originCity)}</Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.modalCityText}>{fCity(msgModal.destCity)}</Text>
                </View>
              </View>
            )}

            <TextInput
              value={msgText}
              onChangeText={setMsgText}
              placeholder={t('match.modal.msg_placeholder')}
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              numberOfLines={4}
              style={styles.messageInput}
              textAlignVertical="top"
            />

            <View style={[styles.row, { gap: 10, marginTop: 16 }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setMsgModal(null)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, (sendingMsg || !msgText.trim()) && { opacity: 0.5 }]}
                onPress={() => {
                  if (!msgModal || !shipmentId || !msgText.trim()) return
                  sendPlainMsg({ shipmentId, routeId: msgModal.id, content: msgText.trim() })
                }}
                disabled={sendingMsg || !msgText.trim()}
              >
                {sendingMsg
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.sendBtnText}>{t('common.send')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },

  // Header
  header: {
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14,
    minWidth: 28, height: 28, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  countText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Shipment Summary Card
  shipmentSummaryCard: {
    backgroundColor: 'rgba(251,191,36,0.05)',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)',
    borderRadius: 16, padding: 14, marginBottom: 12,
  },
  summaryLabel: { fontSize: 10, fontWeight: '800', color: '#FBBF24', letterSpacing: 1 },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 2 },
  summaryRoute: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  summaryPill: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  // Distance Card
  distanceCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16, padding: 14, marginBottom: 12,
  },
  distanceLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  distanceBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  distanceBadgeText: { color: '#FBBF24', fontSize: 13, fontWeight: '800' },
  stepperBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  stepperBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  progressTrack: {
    flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: '#FBBF24', borderRadius: 4,
  },
  presetBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  presetBtnActive: {
    backgroundColor: '#FBBF24', borderColor: '#FBBF24',
  },
  presetBtnText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  presetBtnTextActive: { color: '#000', fontWeight: '800' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Route card
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 14, marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  carrierName: { fontSize: 15, fontWeight: '700', color: '#fff', flexShrink: 1 },
  ratingBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  ratingText: { fontSize: 11, color: '#FBBF24', fontWeight: '800' },
  distChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(96,165,250,0.1)', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  distText: { fontSize: 11, color: '#60A5FA', fontWeight: '700' },
  statusChip: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  statusText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' },
  recurringChip: {
    backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  recurringText: { fontSize: 11, color: '#FBBF24', fontWeight: '600' },
  cityText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
  dateText:  { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  arrow:     { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  stopsText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, marginLeft: 2 },
  priceText:    { fontSize: 16, fontWeight: '800', color: '#FBBF24' },
  priceSubText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  sentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  sentText: { fontSize: 12, fontWeight: '700', color: '#4ADE80' },
  requestBtn: {
    backgroundColor: '#FBBF24', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  requestBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },

  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1,
  },
  msgBtnOff: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  msgBtnActive: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  msgBtnOffText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  msgBtnActiveText: { fontSize: 12, fontWeight: '600', color: '#60A5FA' },
  msgBadgeOff: {
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  msgBadgeOffText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)' },
  msgBadge: {
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  msgBadgeText: { fontSize: 10, fontWeight: '700', color: '#60A5FA' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderBottomWidth: 0,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36,
  },
  modalLabel: { fontSize: 10, fontWeight: '800', color: '#FBBF24', letterSpacing: 1.5 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2 },
  modalRouteInfo: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
    padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalRouteNum:    { fontSize: 12, fontWeight: '700', color: '#FBBF24' },
  modalCarrierName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  modalCityText:    { fontSize: 14, fontWeight: '700', color: '#fff' },
  messageInput: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#fff',
    minHeight: 100, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  sendBtn: {
    flex: 1, backgroundColor: '#FBBF24', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  sendBtnText: { fontSize: 14, fontWeight: '800', color: '#000' }
})
