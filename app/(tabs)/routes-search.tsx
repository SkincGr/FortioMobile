import React, { useEffect, useMemo, useState } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Modal, Pressable,
  ScrollView, StyleSheet, Platform, KeyboardAvoidingView, Switch,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { api, dashboardApi, matchesApi, messagesApi, type RouteMatch, type Shipment } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { PlacesInput } from '@/components/PlacesInput'
import { carrierRating, recurrenceNote } from '@/lib/display'
import { fCity } from '@/lib/cityDisplay'
import { useMessageTemplates, renderTemplate, templateKindForCategory } from '@/lib/templates'

// Αναζήτηση δρομολογίων μεταφορέων, όπως η σελίδα /routes του web (components/RoutesSearchClient.tsx): αφετηρία και
// προορισμός από το Google, ημερομηνία «από» και αριθμός ημερών (έως 30) υποχρεωτικά — το GET /api/routes τα απαιτεί.
// Προαιρετικά: αποστολή που συμπληρώνει τα φίλτρα, «Μόνο νέα δρομολόγια», ελάχιστος όγκος, ακτίνα, ταξινόμηση.
// Το web στέλνει το αίτημα από τη σελίδα του δρομολογίου· εδώ στέλνεται απευθείας για την επιλεγμένη αποστολή.

type SearchRoute = RouteMatch & {
  parentRouteId?: string | null
  isRecurringInstance?: boolean
  moreDates?: number
  pallets?: number | null
}

const SORTS = [['date', 'rs.sort_date'], ['price', 'rs.sort_price'], ['rating', 'rs.sort_rating']] as const
const DAYS = [3, 7, 14, 30]
const LOCALES = { el: 'el-GR', en: 'en-GB', fr: 'fr-FR' } as const
const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function RoutesSearchScreen() {
  const { t, language } = useI18n()
  const locale = LOCALES[language]
  const qc = useQueryClient()
  const fDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }) : null)

  const [search, setSearch] = useState({ from: '', fromId: '', to: '', toId: '' })
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [daysAhead, setDaysAhead] = useState(7)
  const [minVolume, setMinVolume] = useState('')
  const [radiusMode, setRadiusMode] = useState(false)
  const [radiusKm, setRadiusKm] = useState('20')
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'rating'>('date')
  const [page, setPage] = useState(1)
  const [showDate, setShowDate] = useState(false)

  const [shipmentId, setShipmentId] = useState('')
  const [shipmentPicker, setShipmentPicker] = useState(false)
  const [onlyNew, setOnlyNew] = useState(true)

  const [requestRoute, setRequestRoute] = useState<SearchRoute | null>(null)
  const [requestText, setRequestText] = useState('')
  const [sending, setSending] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  // Οι ανοιχτές αποστολές του αποστολέα (για να συμπληρώσουν τα φίλτρα και για το αίτημα)
  const { data: dash } = useQuery({ queryKey: ['dashboard-open-shipments'], queryFn: () => dashboardApi.getSender().then(r => r.data) })
  const openShipments = useMemo(() => (dash?.shipments ?? []).filter((s: Shipment) => ['PENDING', 'REQUEST', 'OFFERED'].includes(s.status)), [dash])
  const shipment = openShipments.find((s: Shipment) => s.id === shipmentId) as (Shipment & { originPlaceId?: string; destPlaceId?: string }) | undefined

  function pickShipment(s: Shipment & { originPlaceId?: string; destPlaceId?: string }) {
    setShipmentId(s.id)
    setShipmentPicker(false)
    setSearch({ from: fCity(s.originCity, s.originPlace), fromId: s.originPlaceId || '', to: fCity(s.destCity, s.destPlace), toId: s.destPlaceId || '' })
    // ±5 ημέρες γύρω από την επιθυμητή παράδοση, όπως το web
    if (s.desiredDelivery) {
      setDateFrom(new Date(new Date(s.desiredDelivery).getTime() - 5 * 86_400_000))
      setDaysAhead(10)
    }
    setPage(1)
  }

  const isValid = !!search.fromId && !!search.toId && !!dateFrom && daysAhead >= 1 && daysAhead <= 30
  const dateTo = dateFrom ? new Date(dateFrom.getTime() + daysAhead * 86_400_000) : null

  const params = useMemo(() => {
    if (!isValid || !dateFrom || !dateTo) return null
    const p = new URLSearchParams({
      fromId: search.fromId, toId: search.toId, dateFrom: day(dateFrom), dateTo: day(dateTo),
      vehicle: 'TRUCK,VAN', sortBy, page: String(page), pageSize: '20',
    })
    if (minVolume) p.set('minVolume', minVolume)
    if (radiusMode) { p.set('radius', '1'); p.set('radiusKm', radiusKm || '20') }
    return p.toString()
  }, [isValid, search.fromId, search.toId, dateFrom, dateTo, sortBy, page, minVolume, radiusMode, radiusKm])

  const { data, isFetching, error } = useQuery({
    queryKey: ['routes-search', params],
    queryFn: () => api.get<{ routes: SearchRoute[]; total: number; page: number; pageSize: number }>(`/api/routes?${params}`).then(r => r.data),
    enabled: !!params,
  })

  // «Μόνο νέα δρομολόγια»: κρύβει όσα δείχνουν ήδη τα matches της αποστολής
  const { data: known } = useQuery({
    queryKey: ['matches', shipmentId],
    queryFn: () => matchesApi.get(shipmentId).then(r => r.data),
    enabled: !!shipmentId && onlyNew,
  })
  const knownIds = useMemo(() => (onlyNew && shipmentId && known ? new Set(known.routes.map(r => r.id)) : null), [onlyNew, shipmentId, known])
  const routes = (data?.routes ?? []).filter(r => !knownIds || !knownIds.has(r.parentRouteId || r.id))
  const total = knownIds ? routes.length : data?.total ?? 0
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.pageSize || 20))) : 1

  // Τα αιτήματα που έχει ήδη στείλει η αποστολή (δεν ξαναστέλνονται)
  const requested = useMemo(() => new Set((shipment?.offers ?? []).map(o => o.routeId).filter(Boolean) as string[]), [shipment])

  const { all: templates } = useMessageTemplates('SENDER', 'REQUEST', templateKindForCategory(shipment?.category))

  useEffect(() => { setPage(1) }, [search.fromId, search.toId, dateFrom, daysAhead, sortBy, minVolume, radiusMode, radiusKm])

  function openRequest(route: SearchRoute) {
    if (!shipment) { setShipmentPicker(true); return }
    setRequestRoute(route); setRequestText(''); setRequestError('')
  }

  async function sendRequest() {
    if (!requestRoute || !shipment) return
    setSending(true); setRequestError('')
    try {
      await messagesApi.sendOfferRequest({ shipmentId: shipment.id, routeId: requestRoute.id, content: requestText.trim(), subject: t('match.modal.req_title') })
      setSentIds(prev => new Set([...prev, requestRoute.id]))
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setRequestRoute(null)
    } catch (e: any) {
      setRequestError(e?.response?.data?.error || t('match.error_request'))
    } finally {
      setSending(false)
    }
  }

  const header = (
    <View>
      {/* Αποστολή που συμπληρώνει τα φίλτρα */}
      <Text style={s.label}>{t('rs.select_shipment')}</Text>
      <TouchableOpacity style={s.select} onPress={() => setShipmentPicker(true)}>
        <Text style={[s.selectTxt, !shipment && { color: 'rgba(255,255,255,0.35)' }]} numberOfLines={1}>{shipment?.title ?? t('rs.select_shipment_ph')}</Text>
        <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
      {!!shipment && (
        <View style={[s.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
          <Text style={s.muted}>{t('rs.only_new')}</Text>
          <Switch value={onlyNew} onValueChange={setOnlyNew} trackColor={{ true: '#F59E0B' }} />
        </View>
      )}

      <View style={s.places}>
        <PlacesInput label={`${t('rs.from')} *`} type="city" value={search.from} placeId={search.fromId} placeholder="π.χ. Αθήνα"
          onSelect={(v, id) => setSearch(x => ({ ...x, from: v, fromId: id }))} />
        <PlacesInput label={`${t('rs.to')} *`} type="city" value={search.to} placeId={search.toId} placeholder="π.χ. Θεσσαλονίκη"
          onSelect={(v, id) => setSearch(x => ({ ...x, to: v, toId: id }))} />
      </View>

      <Text style={s.label}>{t('rs.date_from')} *</Text>
      <TouchableOpacity style={s.select} onPress={() => setShowDate(true)}>
        <Text style={[s.selectTxt, !dateFrom && { color: 'rgba(255,255,255,0.35)' }]}>{dateFrom ? fDate(dateFrom.toISOString()) : t('rs.pick_date')}</Text>
        <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
      {showDate && (
        <DateTimePicker value={dateFrom ?? new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowDate(Platform.OS === 'ios'); if (d) setDateFrom(d) }} />
      )}
      <Text style={s.label}>{t('rs.days')}</Text>
      <View style={[s.row, { gap: 6, flexWrap: 'wrap', marginBottom: 12 }]}>
        {DAYS.map(n => (
          <TouchableOpacity key={n} style={[s.chip, daysAhead === n && s.chipOn]} onPress={() => setDaysAhead(n)}>
            <Text style={[s.chipTxt, daysAhead === n && s.chipTxtOn]}>{n} {t('rs.days_suffix')}</Text>
          </TouchableOpacity>
        ))}
        {!DAYS.includes(daysAhead) && <View style={[s.chip, s.chipOn]}><Text style={[s.chipTxt, s.chipTxtOn]}>{daysAhead} {t('rs.days_suffix')}</Text></View>}
      </View>

      <View style={[s.row, { gap: 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{t('rs.min_volume')}</Text>
          <TextInput style={s.input} value={minVolume} onChangeText={setMinVolume} keyboardType="decimal-pad" placeholder="m³" placeholderTextColor="rgba(255,255,255,0.3)" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={s.label}>{t('rs.radius')}</Text>
            <Switch value={radiusMode} onValueChange={setRadiusMode} trackColor={{ true: '#F59E0B' }} />
          </View>
          {radiusMode && <TextInput style={s.input} value={radiusKm} onChangeText={setRadiusKm} keyboardType="number-pad" placeholder="km" placeholderTextColor="rgba(255,255,255,0.3)" />}
        </View>
      </View>

      <View style={[s.row, { gap: 6, flexWrap: 'wrap', marginVertical: 12 }]}>
        {SORTS.map(([key, label]) => (
          <TouchableOpacity key={key} style={[s.chip, sortBy === key && s.chipOn]} onPress={() => setSortBy(key)}>
            <Text style={[s.chipTxt, sortBy === key && s.chipTxtOn]}>{t(label)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!isValid ? (
        <View style={s.empty}><Text style={{ fontSize: 36 }}>🧭</Text><Text style={s.emptyTxt}>{t('rs.fill_required')}</Text></View>
      ) : isFetching ? (
        <ActivityIndicator color="#FBBF24" style={{ marginVertical: 30 }} />
      ) : error ? (
        <Text style={s.error}>{(error as any)?.response?.data?.error ?? t('common.error')}</Text>
      ) : (
        <Text style={[s.muted, { marginBottom: 10 }]}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{total}</Text> {t('rs.results')}
          {totalPages > 1 && !knownIds ? `  ·  ${page}/${totalPages}` : ''}
        </Text>
      )}
    </View>
  )

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={22} color="#fff" /></TouchableOpacity>
        <Text style={s.headerTitle}>{t('rs.title')}</Text>
      </View>

      <FlatList
        data={isValid && !isFetching && !error ? routes : []}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListEmptyComponent={isValid && !isFetching && !error ? (
          <View style={s.empty}><Text style={{ fontSize: 36 }}>🔍</Text><Text style={s.emptyTxt}>{t('rs.empty')}</Text></View>
        ) : null}
        ListFooterComponent={totalPages > 1 && !knownIds && isValid ? (
          <View style={[s.row, { justifyContent: 'center', gap: 12, marginTop: 8 }]}>
            <TouchableOpacity style={[s.chip, page === 1 && { opacity: 0.3 }]} disabled={page === 1} onPress={() => setPage(p => p - 1)}><Text style={s.chipTxt}>←</Text></TouchableOpacity>
            <Text style={s.muted}>{page} / {totalPages}</Text>
            <TouchableOpacity style={[s.chip, page >= totalPages && { opacity: 0.3 }]} disabled={page >= totalPages} onPress={() => setPage(p => p + 1)}><Text style={s.chipTxt}>→</Text></TouchableOpacity>
          </View>
        ) : null}
        renderItem={({ item: r }) => {
          const { rating, trips } = carrierRating(r.company, r.id)
          const recurrence = recurrenceNote(r, language)
          const midStops = (r.stops ?? []).slice(1, -1)
          const done = requested.has(r.id) || sentIds.has(r.id)
          return (
            <View style={s.card}>
              <View style={[s.row, { gap: 8, flexWrap: 'wrap', marginBottom: 4 }]}>
                <Text style={{ fontSize: 18 }}>{r.vehicle?.type === 'VAN' ? '🚐' : '🚛'}</Text>
                <Text style={s.company}>{r.company?.name ?? t('match.carrier_fallback')}</Text>
                {(r.parentRouteId || r.isRecurringInstance || r.isRecurring) && <Text style={s.recurring}>🔄</Text>}
                {typeof r.distanceKm === 'number' && <Text style={s.distance}>📍 {r.distanceKm} km</Text>}
                <Text style={s.rating}>★ {rating.toFixed(1)}{trips > 0 ? ` (${trips})` : ''}</Text>
              </View>
              {recurrence && <Text style={s.recurrence}>{recurrence}</Text>}
              <Text style={s.cities}>
                {fCity(r.originCity, r.originPlace)} <Text style={s.muted}>({fDate(r.departureDate)})</Text> → {fCity(r.destCity, r.destPlace)} <Text style={s.muted}>({fDate(r.estimatedArrival ?? r.departureDate)})</Text>
              </Text>
              {(r.moreDates ?? 0) > 0 && <Text style={s.recurrence}>📅 +{r.moreDates} {t('rs.more_dates')}</Text>}
              {midStops.length > 0 && <Text style={s.muted} numberOfLines={2}>{midStops.map(st => `${st.city ?? '—'}${st.estimatedDate ? ` (${fDate(st.estimatedDate)})` : ''}`).join(', ')}</Text>}
              <Text style={[s.muted, { marginTop: 6 }]}>{t('rs.capacity')}: {r.availableWeight ?? '—'} kg - {r.availableVolume ?? '—'} m³{r.pallets ? ` - ${r.pallets} ${t('rs.pallets')}` : ''}</Text>
              {(r.pricePerKg || r.pricePerM3) ? (
                <Text style={s.charge}>{t('rs.charge')}: {[r.pricePerKg && `${r.pricePerKg} € / Kg`, r.pricePerM3 && `${r.pricePerM3} € / M³`].filter(Boolean).join(' - ')}</Text>
              ) : null}
              <View style={[s.row, { justifyContent: 'flex-end', marginTop: 10 }]}>
                {done ? (
                  <Text style={s.sent}>✓ {t('match.btn_sent')}</Text>
                ) : (
                  <TouchableOpacity style={s.requestBtn} onPress={() => openRequest(r)}><Text style={s.requestTxt}>{t('match.btn_request')}</Text></TouchableOpacity>
                )}
              </View>
            </View>
          )
        }}
      />

      {/* Επιλογή αποστολής */}
      <Modal visible={shipmentPicker} transparent animationType="fade" onRequestClose={() => setShipmentPicker(false)}>
        <Pressable style={s.backdrop} onPress={() => setShipmentPicker(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>{t('rs.select_shipment')}</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {openShipments.length === 0 && <Text style={[s.muted, { padding: 16 }]}>{t('rs.no_shipments')}</Text>}
              {openShipments.map((x: any) => (
                <TouchableOpacity key={x.id} style={s.option} onPress={() => pickShipment(x)}>
                  <Text style={[s.optionTxt, x.id === shipmentId && { color: '#FBBF24' }]}>{x.title}</Text>
                  <Text style={s.muted}>{fCity(x.originCity, x.originPlace)} → {fCity(x.destCity, x.destPlace)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Αίτημα προσφοράς με πρότυπο REQUEST του είδους της αποστολής */}
      <Modal visible={!!requestRoute} transparent animationType="slide" onRequestClose={() => setRequestRoute(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
              <Text style={s.modalTitle}>{t('match.modal.req_title')}</Text>
              <TouchableOpacity onPress={() => setRequestRoute(null)} hitSlop={12}><Ionicons name="close" size={22} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
            </View>
            {requestRoute && <Text style={[s.muted, { marginBottom: 10 }]}>{shipment?.title} · {requestRoute.company?.name}</Text>}
            <Text style={s.label}>📋 {t('templates.quick_select')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
              {templates.map(tpl => (
                <TouchableOpacity key={tpl.id} style={s.chip} onPress={() => setRequestText(renderTemplate(tpl.content, {
                  shipment_title: shipment?.title,
                  shipment_origin_city: requestRoute ? fCity(requestRoute.originCity, requestRoute.originPlace) : undefined,
                  shipment_dest_city: requestRoute ? fCity(requestRoute.destCity, requestRoute.destPlace) : undefined,
                  carrier_name: requestRoute?.company?.name,
                }))}>
                  <Text style={s.chipTxt}>{tpl.icon ? `${tpl.icon} ` : ''}{tpl.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={[s.input, { minHeight: 100, textAlignVertical: 'top' }]} multiline value={requestText} onChangeText={setRequestText}
              placeholder={t('match.modal.req_placeholder')} placeholderTextColor="rgba(255,255,255,0.3)" />
            {requestError ? <Text style={s.error}>{requestError}</Text> : null}
            <View style={[s.row, { gap: 10, marginTop: 12 }]}>
              <TouchableOpacity style={[s.chip, { flex: 1, alignItems: 'center', paddingVertical: 12 }]} onPress={() => setRequestRoute(null)}>
                <Text style={s.chipTxt}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.requestBtn, { flex: 1, alignItems: 'center', paddingVertical: 12 }, (sending || !requestText.trim()) && { opacity: 0.5 }]}
                disabled={sending || !requestText.trim()} onPress={sendRequest}>
                {sending ? <ActivityIndicator size="small" color="#000" /> : <Text style={s.requestTxt}>{t('common.send')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#0a0a0a' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  row:         { flexDirection: 'row', alignItems: 'center' },
  label:       { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  muted:       { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  select:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  selectTxt:   { flex: 1, color: '#fff', fontSize: 14 },
  input:       { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 14 },
  places:      { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 12 },
  chip:        { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn:      { backgroundColor: 'rgba(251,191,36,0.15)', borderColor: '#FBBF24' },
  chipTxt:     { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  chipTxtOn:   { color: '#FBBF24' },
  empty:       { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTxt:    { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  error:       { color: '#F87171', fontSize: 13, marginTop: 8 },
  card:        { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14, marginBottom: 12 },
  company:     { color: '#fff', fontSize: 14, fontWeight: '700' },
  recurring:   { fontSize: 12 },
  distance:    { fontSize: 11, color: '#FBBF24', fontWeight: '700' },
  rating:      { marginLeft: 'auto', fontSize: 12, color: '#F87171', fontWeight: '800' },
  recurrence:  { fontSize: 12, color: '#A78BFA', marginBottom: 4 },
  cities:      { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  charge:      { fontSize: 12, color: '#FBBF24', fontWeight: '700', marginTop: 2 },
  sent:        { color: '#4ADE80', fontSize: 12, fontWeight: '700' },
  requestBtn:  { backgroundColor: '#FBBF24', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  requestTxt:  { color: '#000', fontSize: 13, fontWeight: '700' },
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  sheet:       { backgroundColor: '#161616', borderRadius: 16, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sheetTitle:  { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', paddingHorizontal: 16, paddingBottom: 8 },
  option:      { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  optionTxt:   { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard:   { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  modalTitle:  { color: '#fff', fontSize: 18, fontWeight: '800' },
})
