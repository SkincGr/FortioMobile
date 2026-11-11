import React, { useState, useMemo, useEffect } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { shipmentsApi, matchesApi, messagesApi, cardsApi, RouteMatch, CardMatch } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { Colors } from '@/constants/colors'
import { useMessageTemplates, renderTemplate, templateKindForCategory } from '@/lib/templates'
import { carrierRating, recurrenceNote } from '@/lib/display'
import { fCity } from '@/lib/cityDisplay'
import { Theme, useStyles, useTheme } from '@/lib/theme'

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_ICON: Record<string, string> = {
  VAN: '🚐', TRUCK: '🚛', SHIP: '🚢', AIRPLANE: '✈️', TRAIN: '🚂',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fDate(v?: string | null) {
  if (!v) return null
  return new Date(v).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}


function routeNumber(route: RouteMatch) {
  if (route.routeCompanyId) return route.routeCompanyId
  if (route.routeNumber) return String(route.routeNumber).padStart(6, '0')
  return route.id.slice(-8).toUpperCase()
}

const cardIcon = (cardId: string) => (cardId === 'WASTE_BINS' ? '🗑️' : cardId === 'VEHICLE_RENTAL' ? '🚐' : '🚛')

// ─── Route card ───────────────────────────────────────────────────────────────

type RouteCardProps = {
  route: RouteMatch
  offerStatus?: string
  onRequest: () => void
  onMessage: () => void
  onViewOffer: () => void
}

const ROUTE_STATUS_KEY: Record<string, any> = {
  ACTIVE: 'dash.route.status.active', IN_TRANSIT: 'dash.route.status.in_transit',
  COMPLETED: 'dash.route.status.completed', CANCELLED: 'dash.route.status.cancelled',
}

function RouteCard({ route, offerStatus, onRequest, onViewOffer }: RouteCardProps) {
  const th = useTheme()
  const styles = useStyles(makeStyles)

  const { t, language } = useI18n()
  const isRequestOnly = offerStatus === 'REQUEST'
  const hasQuote = Boolean(offerStatus) && !isRequestOnly
  const icon = VEHICLE_ICON[route.vehicle?.type ?? ''] ?? '🚛'
  const carrier = route.company?.name ?? t('match.carrier_fallback')
  const { rating, trips } = carrierRating(route.company, route.id)
  const recurrence = recurrenceNote(route, language)
  const depDate = fDate(route.departureDate)
  const arrDate = fDate(route.estimatedArrival ?? route.departureDate)
  const midStops = (route.stops ?? []).slice(1, -1)

  // Ίδια χρώματα κατάστασης με το web (ενεργό πράσινο, σε μεταφορά μπλε, ολοκληρωμένο γκρι, ακυρωμένο κόκκινο)
  const statusPill = ({
    ACTIVE:     { bg: 'rgba(74,222,128,0.1)',  color: th.soft('green') },
    IN_TRANSIT: { bg: 'rgba(96,165,250,0.1)',  color: th.soft('blue') },
    COMPLETED:  { bg: th.ink(0.1),              color: th.inkText(0.4) },
    CANCELLED:  { bg: 'rgba(248,113,113,0.1)', color: th.soft('red') },
  } as Record<string, { bg: string; color: string }>)[route.status] ?? { bg: th.ink(0.1), color: th.inkText(0.4) }

  return (
    <View style={styles.card}>
      {/* Row 1: εικονίδιο + κατάσταση + εταιρεία, και δεξιά η βαθμολογία */}
      <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }]}>
        <View style={[styles.row, { flex: 1, flexWrap: 'wrap', gap: 8 }]}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
          <View style={[styles.pill, { backgroundColor: statusPill.bg }]}>
            <Text style={[styles.pillText, { color: statusPill.color }]}>
              {ROUTE_STATUS_KEY[route.status] ? t(ROUTE_STATUS_KEY[route.status]) : route.status}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: th.ink(0.1) }]}>
            <Text style={[styles.pillText, { color: th.inkText(0.8) }]}>{carrier}</Text>
          </View>
        </View>
        <View style={[styles.row, { gap: 10 }]}>
          {route.viaTransshipment && <Text style={styles.transshipText}>{t('match.via_transshipment')}</Text>}
          <Text style={styles.ratingText}>
            ★ {rating.toFixed(1)}{trips > 0 ? <Text style={styles.ratingTrips}> ({trips})</Text> : null}
          </Text>
        </View>
      </View>

      {/* Row 1b: πρόγραμμα επαναλαμβανόμενου */}
      {recurrence && <Text style={styles.recurrenceNote}>{recurrence}</Text>}

      {/* Row 2: αφετηρία → προορισμός */}
      <View style={[styles.row, { marginBottom: 4, flexWrap: 'wrap', gap: 4 }]}>
        <Text style={styles.cityText}>{fCity(route.originCity, route.originPlace)}</Text>
        {depDate && <Text style={styles.dateText}>({depDate})</Text>}
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.cityText}>{fCity(route.destCity, route.destPlace)}</Text>
        {arrDate && <Text style={styles.dateText}>({arrDate})</Text>}
      </View>

      {/* Άλλες ημερομηνίες του ίδιου επαναλαμβανόμενου δρομολογίου */}
      {(route.otherExecutions?.length ?? 0) > 0 && (
        <View style={[styles.row, { gap: 6, flexWrap: 'wrap', marginBottom: 6 }]}>
          <Text style={styles.otherDatesLabel}>{t('match.other_dates')}</Text>
          {route.otherExecutions!.map(o => (
            <Text key={o.id} style={styles.otherDateChip}>{fDate(o.departureDate)}</Text>
          ))}
        </View>
      )}

      {/* Row 3: ενδιάμεσες στάσεις */}
      {midStops.length > 0 && (
        <Text style={styles.stopsText}>
          <Text style={styles.stopsLabel}>{t('ship.stops')} </Text>
          {midStops.map(s => {
            const d = s.estimatedDate ? ` (${fDate(s.estimatedDate)})` : ''
            return `${fCity(s.city, s.place as any)}${d}`
          }).join(', ')}
        </Text>
      )}

      {/* Row 4: τιμή + κουμπί, χωρισμένα με γραμμή */}
      <View style={[styles.row, styles.cardFooter]}>
        <View style={[styles.row, { flex: 1, alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }]}>
          {route.pricePerKg != null && <Text style={styles.priceText}>€{route.pricePerKg}/kg</Text>}
          {route.pricePerM3 != null && <Text style={styles.priceSubText}>€{route.pricePerM3}/m³</Text>}
        </View>
        {hasQuote ? (
          <TouchableOpacity style={styles.sentBadge} onPress={onViewOffer} activeOpacity={0.8}>
            <Text style={styles.sentText}>✓ {t('match.btn_view_offer')}</Text>
          </TouchableOpacity>
        ) : isRequestOnly ? (
          <View style={styles.sentBadge}>
            <Text style={styles.sentText}>{t('match.btn_sent')}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.requestBtn} onPress={onRequest} activeOpacity={0.85}>
            <Text style={styles.requestBtnText}>{t('match.btn_request')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ─── Matches screen ───────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const th = useTheme()
  const styles = useStyles(makeStyles)

  const { id: shipmentId, title: titleParam, returnTo } = useLocalSearchParams<{ id: string; title?: string; returnTo?: string }>()
  const goBack = () => router.replace((returnTo ? decodeURIComponent(returnTo) : '/(tabs)') as any)
  const queryClient = useQueryClient()
  const { t } = useI18n()

  const [modalRoute, setModalRoute] = useState<RouteMatch | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const [msgModal, setMsgModal] = useState<RouteMatch | null>(null)
  const [msgText, setMsgText] = useState('')

  // Κάρτες μεταφορέα (Μετακόμιση, Κάδοι, Ενοικίαση) και όσες έκρυψε ο αποστολέας, με τις αλλαγές αυτής της οθόνης
  const [cards, setCards] = useState<CardMatch[]>([])
  const [hiddenCards, setHiddenCards] = useState<CardMatch[]>([])
  const [modalCard, setModalCard] = useState<CardMatch | null>(null)
  const [cardBusy, setCardBusy] = useState<string | null>(null)
  const [cardError, setCardError] = useState('')
  const [sendingCard, setSendingCard] = useState(false)

  const { data: shipmentData, isLoading: loadingShipment } = useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: () => shipmentsApi.get(shipmentId!).then(r => r.data),
    enabled: !!shipmentId,
  })

  // Πρότυπα του είδους της αποστολής (Μεταφορές, Μετακομίσεις, Κάδοι, Ενοικιάσεις): REQUEST για το αίτημα, όλα για το μήνυμα
  const kind = templateKindForCategory(shipmentData?.category)
  const { all: templates } = useMessageTemplates('SENDER', 'REQUEST', kind)
  const { all: msgTemplates } = useMessageTemplates('SENDER', undefined, kind)

  const { data: matchData, isLoading: loadingMatches } = useQuery({
    queryKey: ['matches', shipmentId],
    queryFn: () => matchesApi.get(shipmentId!).then(r => r.data),
    enabled: !!shipmentId,
  })

  useEffect(() => {
    setCards(matchData?.cards ?? [])
    setHiddenCards(matchData?.hiddenCards ?? [])
  }, [matchData])

  // «Δεν με ενδιαφέρει» / επαναφορά: κρύβει το ζεύγος κάρτα + αποστολή και για τον μεταφορέα
  async function setCardHidden(card: CardMatch, hide: boolean) {
    if (!shipmentId) return
    setCardBusy(card.id); setCardError('')
    try {
      if (hide) await cardsApi.hide(card.id, shipmentId)
      else await cardsApi.restore(card.id, shipmentId)
      if (hide) {
        setCards(prev => prev.filter(c => c.id !== card.id))
        setHiddenCards(prev => [...prev, { id: card.id, cardId: card.cardId, title: card.title, companyName: card.companyName }])
      } else {
        setHiddenCards(prev => prev.filter(c => c.id !== card.id))
        setCards(prev => [...prev, { ...card, offerStatus: null }])
      }
    } catch (e: any) {
      setCardError(e?.response?.data?.error || t('match.error_request'))
    } finally {
      setCardBusy(null)
    }
  }

  // routeId → offer status ('REQUEST' while awaiting the carrier, anything
  // else not closed by the carrier once the carrier has actually responded with a quote).
  const offerStatusByRoute = useMemo(() => {
    const map = new Map<string, string>()
    for (const offer of shipmentData?.offers ?? []) {
      if (offer.routeId && offer.status !== 'REJECTED_BY_CARRIER') map.set(offer.routeId, offer.status)
    }
    for (const routeId of sentIds) {
      if (!map.has(routeId)) map.set(routeId, 'REQUEST')
    }
    return map
  }, [shipmentData, sentIds])

  const { mutate: sendRequest, isPending: sendingRoute } = useMutation({
    mutationFn: (vars: { shipmentId: string; routeId: string; content: string; subject?: string }) =>
      messagesApi.sendOfferRequest(vars),
    onSuccess: (_, vars) => {
      setSentIds(prev => new Set([...prev, vars.routeId]))
      queryClient.invalidateQueries({ queryKey: ['dashboard-sender'] })
      closeModal()
    },
  })

  const sending = sendingRoute || sendingCard

  const { mutate: sendPlainMsg, isPending: sendingMsg } = useMutation({
    mutationFn: (vars: { shipmentId: string; routeId: string; content: string }) =>
      messagesApi.sendPlainMessage(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches', shipmentId] })
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
    setModalCard(null)
    setMessageText('')
    setCardError('')
  }

  async function handleSend() {
    if (!shipmentId) return
    if (modalCard) {
      // Το αίτημα σε κάρτα δημιουργεί την εγγραφή της αποστολής στον μεταφορέα· σε σφάλμα το παράθυρο μένει ανοιχτό
      setSendingCard(true); setCardError('')
      try {
        await cardsApi.request(modalCard.id, { shipmentId, content: messageText.trim() })
        setCards(prev => prev.map(c => (c.id === modalCard.id ? { ...c, offerStatus: 'REQUEST' } : c)))
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        closeModal()
      } catch (e: any) {
        setCardError(e?.response?.data?.error || t('match.error_request'))
      } finally {
        setSendingCard(false)
      }
      return
    }
    if (!modalRoute) return
    sendRequest({ shipmentId, routeId: modalRoute.id, content: messageText.trim(), subject: t('match.modal.req_title') })
  }

  // Δεδομένα των προτύπων: ίδια κλειδιά με τον κατάλογο του web
  const templateData = (target: RouteMatch | CardMatch | null) => ({
    shipment_title: shipmentData?.title,
    shipment_origin_city: shipmentData ? fCity(shipmentData.originCity, shipmentData.originPlace) : undefined,
    shipment_dest_city: shipmentData ? fCity(shipmentData.destCity, shipmentData.destPlace) : undefined,
    carrier_name: target ? ('companyName' in target ? target.companyName : target.company?.name) : undefined,
    route_number: target && !('companyName' in target) ? routeNumber(target) : undefined,
  })

  function handleMessage(route: RouteMatch) {
    const count = route.messageCount ?? 0
    if (count > 0) {
      const offer = shipmentData?.offers?.find((o: any) => o.routeId === route.id)
      if (offer) {
        const currentPath = `/(tabs)/shipments/matches/${shipmentId}?title=${encodeURIComponent(shipmentData?.title ?? '')}&returnTo=${encodeURIComponent(returnTo ?? '/(tabs)')}`
        router.push(`/(tabs)/messages/${offer.id}?returnTo=${encodeURIComponent(currentPath)}` as any)
      }
    } else {
      setMsgModal(route)
      setMsgText('')
    }
  }

  // Best-rated carrier first — same order as web's matches page.
  const routes = useMemo(
    () => [...(matchData?.routes ?? [])].sort((a, b) =>
      carrierRating(b.company, b.id).rating - carrierRating(a.company, a.id).rating),
    [matchData],
  )
  const isLoading = loadingShipment || loadingMatches
  const sectionTitle = shipmentData?.category === 'HOUSE_MOVE' ? t('match.section_moves')
    : shipmentData?.category === 'WASTE_BINS' ? t('match.section_bins') : t('match.title')

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: th.page }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={th.inkSolid} />
          </TouchableOpacity>
          <Text style={styles.headerLogo}>FORTIO</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={th.accentText} />
          <Text style={styles.loadingText}>{t('match.loading')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: th.page }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={th.inkSolid} />
        </TouchableOpacity>
        <Text style={styles.headerLogo}>FORTIO</Text>
      </View>

      {/* Route list */}
      <FlatList
        data={routes}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListHeaderComponent={shipmentData ? (
          <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('match.section_shipment')}</Text>
            <Text style={styles.summaryTitle}>
              {shipmentData.title}
              {!!shipmentData.desiredDelivery && <Text style={styles.summaryDate}> ({fDate(shipmentData.desiredDelivery)})</Text>}
            </Text>
            {!!shipmentData.description && <Text style={styles.summaryMuted}>{shipmentData.description}</Text>}
          </View>

          <Text style={styles.sectionHeading}>
            {sectionTitle}  <Text style={{ color: th.accentText }}>{routes.length + cards.length}</Text>
          </Text>

          {cardError && !modalCard ? <Text style={styles.cardError}>{cardError}</Text> : null}

          {/* Κάρτες μεταφορέων (Μετακόμιση, Κάδοι, Ενοικίαση) */}
          {cards.map(card => (
            <View key={card.id} style={[styles.card, { borderColor: th.accentBrightA(0.35) }]}>
              <View style={[styles.row, { gap: 8, flexWrap: 'wrap', marginBottom: 10 }]}>
                <Text style={{ fontSize: 20 }}>{cardIcon(card.cardId)}</Text>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <View style={[styles.pill, { backgroundColor: th.ink(0.1) }]}>
                  <Text style={[styles.pillText, { color: th.inkText(0.8) }]}>{card.companyName}</Text>
                </View>
              </View>
              {card.offerStatus ? (
                <View style={[styles.sentBadge, { alignSelf: 'flex-start' }]}>
                  <Ionicons name="checkmark-circle" size={14} color={th.soft('green')} />
                  <Text style={styles.sentText}>{card.offerStatus === 'REQUEST' ? t('match.btn_sent') : t('match.btn_view_offer')}</Text>
                </View>
              ) : (
                <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
                  <TouchableOpacity style={styles.ghostBtn} disabled={cardBusy === card.id} onPress={() => setCardHidden(card, true)}>
                    <Text style={styles.ghostBtnText}>{t('match.btn_not_interested')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.requestBtn, cardBusy === card.id && { opacity: 0.5 }]} disabled={cardBusy === card.id}
                    onPress={() => { setModalCard(card); setMessageText(''); setCardError('') }} activeOpacity={0.85}>
                    <Text style={styles.requestBtnText}>{t('match.btn_request')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
          </>
        ) : undefined}
        ListFooterComponent={hiddenCards.length > 0 ? (
          // Κάρτες που έκρυψε ο αποστολέας: δεν ξαναεμφανίζονται, εκτός αν τις επαναφέρει
          <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: th.ink(0.1), paddingTop: 14 }}>
            <Text style={styles.summaryLabel}>{t('match.hidden_title')} ({hiddenCards.length})</Text>
            {hiddenCards.map(card => (
              <View key={card.id} style={[styles.row, styles.hiddenRow]}>
                <Text style={{ fontSize: 14 }}>{cardIcon(card.cardId)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hiddenTitle}>{card.title}</Text>
                  <Text style={styles.summaryMuted}>{card.companyName}</Text>
                </View>
                <TouchableOpacity style={styles.ghostBtn} disabled={cardBusy === card.id} onPress={() => setCardHidden(card, false)}>
                  <Text style={styles.ghostBtnText}>{t('match.btn_restore')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : undefined}
        ListEmptyComponent={cards.length > 0 ? undefined : (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
            <Text style={styles.emptyTitle}>{t('match.empty_title')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('match.empty_sub')}
            </Text>
            <TouchableOpacity onPress={goBack} style={{ marginTop: 20 }}>
              <Text style={styles.backLink}>{t('match.back_dashboard')}</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <RouteCard
            route={item}
            offerStatus={offerStatusByRoute.get(item.id)}
            onRequest={() => openModal(item)}
            onMessage={() => handleMessage(item)}
            onViewOffer={() => router.push(`/(tabs)/shipments/${shipmentId}?returnTo=${encodeURIComponent(`/(tabs)/shipments/matches/${shipmentId}?title=${encodeURIComponent(shipmentData?.title ?? '')}&returnTo=${encodeURIComponent(returnTo ?? '/(tabs)')}`)}` as any)}
          />
        )}
      />

      {/* Request modal (δρομολόγιο ή κάρτα) */}
      <Modal visible={!!modalRoute || !!modalCard} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            {/* Modal header */}
            <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
              <View>
                <Text style={styles.modalLabel}>{t('match.modal.req_label')}</Text>
                <Text style={styles.modalTitle}>{t('match.modal.req_title')}</Text>
              </View>
              <TouchableOpacity onPress={closeModal} hitSlop={12}>
                <Ionicons name="close" size={22} color={th.inkText(0.4)} />
              </TouchableOpacity>
            </View>

            {/* Route info */}
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
                  <Text style={styles.modalCityText}>{fCity(modalRoute.originCity, modalRoute.originPlace)}</Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.modalCityText}>{fCity(modalRoute.destCity, modalRoute.destPlace)}</Text>
                </View>
              </View>
            )}
            {modalCard && (
              <View style={styles.modalRouteInfo}>
                <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
                  <Text style={{ fontSize: 16 }}>{cardIcon(modalCard.cardId)}</Text>
                  <Text style={styles.modalRouteNum}>{modalCard.title}</Text>
                  <Text style={styles.modalCarrierName}>{modalCard.companyName}</Text>
                </View>
              </View>
            )}
            {cardError && modalCard ? <Text style={styles.cardError}>{cardError}</Text> : null}

            {/* Quick Template Selector — πρότυπα REQUEST του είδους της αποστολής */}
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.templateHeaderLabel}>
                📋 {t('templates.quick_select')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {templates.map(tpl => (
                  <TouchableOpacity
                    key={tpl.id}
                    style={styles.templateChip}
                    onPress={() => setMessageText(renderTemplate(tpl.content, templateData(modalRoute ?? modalCard)))}
                  >
                    <Text style={styles.templateChipText}>{tpl.icon ? `${tpl.icon} ` : ''}{tpl.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Message input */}
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder={t('match.modal.req_placeholder')}
              placeholderTextColor={th.inkText(0.4)}
              multiline
              numberOfLines={4}
              style={styles.messageInput}
              textAlignVertical="top"
            />

            {/* Buttons */}
            <View style={[styles.row, { gap: 10, marginTop: 16 }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, (sending || !messageText.trim()) && { opacity: 0.5 }]}
                onPress={handleSend}
                disabled={sending || !messageText.trim()}
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

      {/* Plain message modal (count = 0) */}
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
                <Ionicons name="close" size={22} color={th.inkText(0.4)} />
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
                  <Text style={styles.modalCityText}>{fCity(msgModal.originCity, msgModal.originPlace)}</Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.modalCityText}>{fCity(msgModal.destCity, msgModal.destPlace)}</Text>
                </View>
              </View>
            )}

            {/* Quick Template Selector */}
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.templateHeaderLabel}>
                📋 {t('templates.quick_select')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {msgTemplates.map(tpl => (
                  <TouchableOpacity
                    key={tpl.id}
                    style={styles.templateChip}
                    onPress={() => setMsgText(renderTemplate(tpl.content, templateData(msgModal)))}
                  >
                    <Text style={styles.templateChipText}>{tpl.icon ? `${tpl.icon} ` : ''}{tpl.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TextInput
              value={msgText}
              onChangeText={setMsgText}
              placeholder={t('match.modal.msg_placeholder')}
              placeholderTextColor={th.inkText(0.4)}
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

const makeStyles = (t: Theme) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: t.inkText(0.4), fontSize: 14 },

  // Header
  header: {
    backgroundColor: t.page,
    borderBottomWidth: 1, borderBottomColor: t.ink(0.1),
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { padding: 4 },
  headerLogo: { color: t.inkSolid, fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  sectionHeading: { color: t.inkSolid, fontSize: 22, fontWeight: '900', marginTop: 6, marginBottom: 14 },
  headerTitle: { color: t.inkSolid, fontSize: 18, fontWeight: '800' },
  headerSub: { color: t.inkText(0.4), fontSize: 12, marginTop: 2 },
  countBadge: {
    backgroundColor: t.ink(0.1), borderRadius: 14,
    minWidth: 28, height: 28, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8, borderWidth: 1, borderColor: t.ink(0.2)
  },
  countText: { color: t.inkSolid, fontWeight: '800', fontSize: 13 },

  // Shipment summary
  shipmentCard: {
    backgroundColor: t.ink(0.03), borderBottomWidth: 1, borderBottomColor: t.ink(0.1),
    paddingHorizontal: 16, paddingVertical: 12,
  },
  shipmentRoute: { fontSize: 14, fontWeight: '700', color: t.inkSolid, flex: 1 },
  shipmentDetail: { fontSize: 13, color: t.inkText(0.5) },

  summaryCard: {
    backgroundColor: t.accentBrightA(0.05), borderRadius: 16,
    borderWidth: 1, borderColor: t.accentBrightA(0.2),
    padding: 14, marginBottom: 14,
  },
  summaryLabel: { fontSize: 10, fontWeight: '800', color: t.accentText, letterSpacing: 1.2, marginBottom: 4, textTransform: 'uppercase' },
  summaryTitle: { fontSize: 20, fontWeight: '900', color: t.inkSolid },
  summaryDate: { fontSize: 15, fontWeight: '400', color: t.inkText(0.5) },
  summaryMuted: { fontSize: 12, color: t.inkText(0.5), marginTop: 2 },
  flagPill: { fontSize: 11, fontWeight: '700', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },

  // Route card
  card: {
    backgroundColor: t.ink(0.03), borderRadius: 16,
    borderWidth: 1, borderColor: t.ink(0.1),
    padding: 14, marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  routeNum: { fontSize: 12, fontWeight: '700', color: t.accentText, fontVariant: ['tabular-nums'] },
  carrierChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.ink(0.05), borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  carrierName: { fontSize: 15, fontWeight: '700', color: t.inkSolid },
  carrierText: { fontSize: 12, color: t.inkSolid, fontWeight: '600' },
  ratingText:  { fontSize: 12, color: t.soft('red'), fontWeight: '800' },
  ratingTrips: { color: 'rgba(248,113,113,0.6)', fontWeight: '600' },
  recurrenceNote: { fontSize: 12, color: t.soft('blue'), marginBottom: 6 },
  recurringChip: {
    backgroundColor: t.accentBrightA(0.1), borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  recurringText: { fontSize: 11, color: t.accentText, fontWeight: '600' },
  distChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(96,165,250,0.1)', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  distText: { fontSize: 11, color: t.soft('blue'), fontWeight: '600' },
  cityText:  { fontSize: 13, fontWeight: '700', color: t.inkSolid },
  dateText:  { fontSize: 12, color: t.inkText(0.4) },
  arrow:     { fontSize: 12, color: t.inkText(0.4) },
  stopsText: { fontSize: 12, color: t.inkText(0.4), marginTop: 2 },
  capacityText: { fontSize: 12, color: t.inkText(0.4) },
  priceText:    { fontSize: 18, fontWeight: '900', color: t.accentText },
  priceSubText: { fontSize: 13, color: t.accentText, opacity: 0.7 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: '700' },
  cardFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.ink(0.1), gap: 10 },
  otherDatesLabel: { fontSize: 12, fontWeight: '600', color: t.inkText(0.5) },
  stopsLabel: { fontWeight: '600', color: t.inkText(0.5) },
  backLink: { fontSize: 13, color: t.accentText },
  sentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  sentText: { fontSize: 12, fontWeight: '700', color: t.soft('green') },
  requestBtn: {
    backgroundColor: t.accentBright, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  requestBtnText: { fontSize: 13, fontWeight: '700', color: t.onAccent },
  ghostBtn: {
    borderWidth: 1, borderColor: t.ink(0.15), borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  ghostBtnText:  { fontSize: 13, fontWeight: '700', color: t.inkText(0.65) },
  transshipText: { fontSize: 11, fontWeight: '800', color: '#EF4444' },
  otherDateChip: {
    fontSize: 11, fontWeight: '600', color: t.soft('violet', 300), backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden',
  },
  cardTitle:   { fontSize: 16, fontWeight: '700', color: t.inkSolid },
  cardError:   { color: t.soft('red'), fontSize: 13, marginBottom: 10 },
  hiddenRow:   { gap: 10, borderWidth: 1, borderColor: t.ink(0.1), borderRadius: 12, padding: 10, marginTop: 8 },
  hiddenTitle: { fontSize: 13, fontWeight: '700', color: t.inkText(0.8) },
  viewOfferBtn: {
    backgroundColor: 'rgba(96,165,250,0.1)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  viewOfferBtnText: { fontSize: 13, fontWeight: '700', color: t.soft('blue') },

  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1,
  },
  msgBtnOff: { backgroundColor: t.ink(0.03), borderColor: t.ink(0.1) },
  msgBtnActive: { backgroundColor: t.ink(0.03), borderColor: t.ink(0.1) },
  msgBtnOffText: { fontSize: 12, fontWeight: '600', color: t.inkText(0.5) },
  msgBtnActiveText: { fontSize: 12, fontWeight: '600', color: t.soft('blue') },
  msgBadgeOff: {
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.ink(0.08),
  },
  msgBadgeOffText: { fontSize: 10, fontWeight: '700', color: t.inkText(0.35) },
  msgBadge: {
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.ink(0.08),
  },
  msgBadgeText: { fontSize: 10, fontWeight: '700', color: t.soft('blue') },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: t.inkSolid, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: t.inkText(0.4), textAlign: 'center', lineHeight: 20 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: t.ink(0.1), borderBottomWidth: 0,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36,
  },
  modalLabel: { fontSize: 10, fontWeight: '800', color: t.accentText, letterSpacing: 1.5 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: t.inkSolid, marginTop: 2 },
  modalRouteInfo: {
    backgroundColor: t.ink(0.03), borderRadius: 12,
    padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: t.ink(0.1),
  },
  modalRouteNum:    { fontSize: 12, fontWeight: '700', color: t.accentText },
  modalCarrierName: { fontSize: 13, fontWeight: '600', color: t.inkSolid },
  modalCityText:    { fontSize: 14, fontWeight: '700', color: t.inkSolid },
  messageInput: {
    borderWidth: 1, borderColor: t.ink(0.15), borderRadius: 12,
    padding: 12, fontSize: 14, color: t.inkSolid,
    minHeight: 100, backgroundColor: t.ink(0.04),
  },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: t.ink(0.2), borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: t.inkSolid, fontWeight: '600' },
  sendBtn: {
    flex: 1, backgroundColor: t.accentBright, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  sendBtnText: { fontSize: 14, fontWeight: '800', color: t.onAccent },
  templateHeaderLabel: {
    fontSize: 11, fontWeight: '700', color: t.inkText(0.4),
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
  },
  templateChip: {
    backgroundColor: t.accentBrightA(0.1),
    borderWidth: 1, borderColor: t.accentBrightA(0.3),
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  templateChipText: { fontSize: 12, fontWeight: '600', color: t.accentText },
})
