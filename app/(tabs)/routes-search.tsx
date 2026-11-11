import React, { useEffect, useMemo, useState } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Modal, Pressable,
  ScrollView, StyleSheet, Platform, KeyboardAvoidingView,
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
import { Theme, useStyles, useTheme } from '@/lib/theme'

// Αναζήτηση δρομολογίων μεταφορέων, όπως η σελίδα /routes του web (components/RoutesSearchClient.tsx): αφετηρία και
// προορισμός από το Google, ημερομηνία «από» και αριθμός ημερών (έως 30) υποχρεωτικά — το GET /api/routes τα απαιτεί.
// Προαιρετικά: αποστολή που συμπληρώνει τα φίλτρα, «Μόνο νέα δρομολόγια», ακτίνα (checkbox + −/+ km).
// Διάταξη: αποστολή (+ «Μόνο νέα»), αναδιπλούμενο πλαίσιο φίλτρων με κουμπί Αναζήτηση, και στα αποτελέσματα combobox τύπου οχήματος και ταξινόμησης.
// Το web στέλνει το αίτημα από τη σελίδα του δρομολογίου· εδώ στέλνεται απευθείας για την επιλεγμένη αποστολή.

type SearchRoute = RouteMatch & {
  parentRouteId?: string | null
  isRecurringInstance?: boolean
  moreDates?: number
  pallets?: number | null
}

const SORTS = [['date', 'rs.sort_date'], ['price', 'rs.sort_price'], ['rating', 'rs.sort_rating']] as const
// Τύπος οχήματος: ίδια ids με το web (RoutesSearchClient)
const VEHICLES = [['TRUCK,VAN', 'rs.vehicle_land'], ['SHIP', 'rs.vehicle_ship'], ['AIRPLANE', 'rs.vehicle_airplane']] as const
const RADIUS_STEP = 5
// Η αναζήτηση είναι για δρομολόγια: οι αποστολές των ειδικών κατηγοριών (Μετακόμιση, Κάδοι, Ενοικίαση Van) δεν έχουν δρομολόγια
// — ταιριάζουν με κάρτες μεταφορέα — και δεν εμφανίζονται στη λίστα επιλογής αποστολής
const CARD_CATEGORIES = ['HOUSE_MOVE', 'WASTE_BINS', 'VEHICLE_RENTAL']
const DAYS_MIN = 1
const DAYS_MAX = 30
const LOCALES = { el: 'el-GR', en: 'en-GB', fr: 'fr-FR' } as const
const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

type TKey = Parameters<ReturnType<typeof useI18n>['t']>[0]

// Checkbox με ετικέτα
function Check({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const th = useTheme()
  const s = useStyles(makeStyles)
  return (
    <TouchableOpacity style={[s.row, { gap: 8, opacity: disabled ? 0.4 : 1 }]} disabled={disabled} onPress={() => onChange(!checked)} activeOpacity={0.7}
      accessibilityRole="checkbox" accessibilityState={{ checked, disabled }}>
      <View style={[s.checkBox, checked && s.checkBoxOn]}>{checked && <Ionicons name="checkmark" size={14} color={th.onAccent} />}</View>
      <Text style={s.checkTxt}>{label}</Text>
    </TouchableOpacity>
  )
}

// Combobox: πεδίο που ανοίγει λίστα επιλογών
function Combo({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, TKey])[]; onChange: (v: string) => void }) {
  const th = useTheme()
  const s = useStyles(makeStyles)
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const current = options.find(o => o[0] === value)
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={[s.select, { marginBottom: 0 }]} onPress={() => setOpen(true)}>
        <Text style={s.selectTxt} numberOfLines={1}>{current ? t(current[1]) : ''}</Text>
        <Ionicons name="chevron-down" size={16} color={th.inkText(0.5)} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>{label}</Text>
            {options.map(([v, key]) => (
              <TouchableOpacity key={v} style={s.option} onPress={() => { onChange(v); setOpen(false) }}>
                <Text style={[s.optionTxt, v === value && { color: th.accentText }]}>{t(key)}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

export default function RoutesSearchScreen() {
  const th = useTheme()
  const s = useStyles(makeStyles)

  const { t, language } = useI18n()
  const locale = LOCALES[language]
  const qc = useQueryClient()
  const fDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }) : null)

  const [search, setSearch] = useState({ from: '', fromId: '', to: '', toId: '' })
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [daysAhead, setDaysAhead] = useState(7) // το GET /api/routes θέλει εύρος ημερομηνιών: 7 ημέρες, ή ±5 γύρω από την επιθυμητή παράδοση της αποστολής
  const [radiusMode, setRadiusMode] = useState(false)
  const [radiusKm, setRadiusKm] = useState(20)
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'rating'>('date')
  const [vehicle, setVehicle] = useState<string>('TRUCK,VAN')
  const [filtersOpen, setFiltersOpen] = useState(true)
  // Τα φίλτρα που εκτελέστηκαν με το κουμπί «Αναζήτηση» (οι αλλαγές στη φόρμα δεν τρέχουν μόνες τους)
  const [applied, setApplied] = useState<{ fromId: string; toId: string; dateFrom: string; dateTo: string; radiusKm: number | null } | null>(null)
  const [searchHint, setSearchHint] = useState('')
  const [searchRun, setSearchRun] = useState(0) // αυξάνεται σε κάθε πάτημα του «Αναζήτηση»: νέο ερώτημα, χωρίς τα προηγούμενα αποτελέσματα
  const [page, setPage] = useState(1)
  const [showDate, setShowDate] = useState(false)

  const [shipmentId, setShipmentId] = useState('')
  const [shipmentPicker, setShipmentPicker] = useState(false)
  const [withShipment, setWithShipment] = useState(false) // checkbox «Επιλογή Αποστολής»: συμπληρώνει τα φίλτρα και επιτρέπει αίτημα προσφοράς
  const [onlyNew, setOnlyNew] = useState(true)

  const [requestRoute, setRequestRoute] = useState<SearchRoute | null>(null)
  const [requestText, setRequestText] = useState('')
  const [sending, setSending] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  // Οι ανοιχτές αποστολές του αποστολέα (για να συμπληρώσουν τα φίλτρα και για το αίτημα)
  const { data: dash } = useQuery({ queryKey: ['dashboard-open-shipments'], queryFn: () => dashboardApi.getSender().then(r => r.data) })
  const openShipments = useMemo(() => (dash?.shipments ?? []).filter((s: Shipment) => ['PENDING', 'REQUEST', 'OFFERED'].includes(s.status) && !CARD_CATEGORIES.includes(s.category as string)), [dash])
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

  // Το κουμπί είναι πάντα ενεργό: αν λείπουν στοιχεία, δείχνει τι χρειάζεται αντί να μένει «κλειστό»
  function runSearch() {
    setSearchHint('')
    // Πρώτα σβήνονται τα προηγούμενα αποτελέσματα (και οι αποθηκευμένες απαντήσεις), μετά τρέχει η νέα αναζήτηση
    setApplied(null)
    qc.removeQueries({ queryKey: ['routes-search'] })
    if (!isValid || !dateFrom) { setSearchHint(t('rs.fill_required')); return }
    setSearchRun(n => n + 1)
    setApplied({
      fromId: search.fromId, toId: search.toId, dateFrom: day(dateFrom),
      dateTo: day(new Date(dateFrom.getTime() + daysAhead * 86_400_000)),
      radiusKm: radiusMode ? radiusKm : null,
    })
    setPage(1)
    setFiltersOpen(false)
  }

  const params = useMemo(() => {
    if (!applied) return null
    const p = new URLSearchParams({
      fromId: applied.fromId, toId: applied.toId, dateFrom: applied.dateFrom, dateTo: applied.dateTo,
      vehicle, sortBy, page: String(page), pageSize: '20',
    })
    if (applied.radiusKm) { p.set('radius', '1'); p.set('radiusKm', String(applied.radiusKm)) }
    return p.toString()
  }, [applied, vehicle, sortBy, page])

  const { data, isFetching, error } = useQuery({
    queryKey: ['routes-search', params, searchRun],
    queryFn: () => api.get<{ routes: SearchRoute[]; total: number; page: number; pageSize: number }>(`/api/routes?${params}`).then(r => r.data),
    enabled: !!params,
  })

  // «Μόνο νέα δρομολόγια»: κρύβει όσα δείχνουν ήδη τα matches της αποστολής
  const { data: known } = useQuery({
    queryKey: ['matches', shipmentId],
    queryFn: () => matchesApi.get(shipmentId).then(r => r.data),
    enabled: !!shipmentId && onlyNew,
  })
  const knownIds = useMemo(() => (onlyNew && shipmentId && known ? new Set(known.routes.map(r => (r as { parentRouteId?: string | null }).parentRouteId || r.id)) : null), [onlyNew, shipmentId, known])
  const routes = (data?.routes ?? []).filter(r => !knownIds || !knownIds.has(r.parentRouteId || r.id))
  const total = knownIds ? routes.length : data?.total ?? 0
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.pageSize || 20))) : 1

  // Τα αιτήματα που έχει ήδη στείλει η αποστολή (δεν ξαναστέλνονται)
  const requested = useMemo(() => new Set((shipment?.offers ?? []).map(o => o.routeId).filter(Boolean) as string[]), [shipment])

  const { all: templates } = useMessageTemplates('SENDER', 'REQUEST', templateKindForCategory(shipment?.category))

  useEffect(() => { setPage(1) }, [vehicle, sortBy])

  function openRequest(route: SearchRoute) {
    if (!shipment) { setWithShipment(true); setShipmentPicker(true); return }
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
      {/* #1 Επιλογή αποστολής ( + checkbox «Μόνο νέα δρομολόγια» ) */}
      <View style={[s.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
        <Check checked={withShipment} label={t('rs.select_shipment')}
          onChange={v => { setWithShipment(v); if (v) setShipmentPicker(true); else setShipmentId('') }} />
        <Check checked={onlyNew && !!shipment} disabled={!shipment} label={t('rs.only_new')} onChange={setOnlyNew} />
      </View>
      {withShipment && (
        <TouchableOpacity style={s.select} onPress={() => setShipmentPicker(true)}>
          <Text style={[s.selectTxt, !shipment && { color: th.inkText(0.35) }]} numberOfLines={1}>{shipment?.title ?? t('rs.select_shipment_ph')}</Text>
          <Ionicons name="chevron-down" size={16} color={th.inkText(0.5)} />
        </TouchableOpacity>
      )}

      {/* Αναδιπλούμενο πλαίσιο: Φίλτρα Αναζήτησης → Αφετηρία, Προορισμός, Από, ακτίνα, Αναζήτηση */}
      <View style={s.frame}>
        <TouchableOpacity style={s.frameHead} onPress={() => setFiltersOpen(o => !o)} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={18} color={th.accentText} />
          <Text style={s.frameTitle}>{t('rs.filters_title')}</Text>
          <Ionicons name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={18} color={th.inkText(0.5)} />
        </TouchableOpacity>
        {filtersOpen && (
          <View style={s.frameBody}>
            <PlacesInput label={`${t('rs.from')} *`} type="city" value={search.from} placeId={search.fromId} placeholder="π.χ. Αθήνα"
              onSelect={(v, id) => setSearch(x => ({ ...x, from: v, fromId: id }))} />
            <PlacesInput label={`${t('rs.to')} *`} type="city" value={search.to} placeId={search.toId} placeholder="π.χ. Θεσσαλονίκη"
              onSelect={(v, id) => setSearch(x => ({ ...x, to: v, toId: id }))} />

            <View style={[s.row, { gap: 10, alignItems: 'flex-end' }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{t('rs.date_from')} *</Text>
                <TouchableOpacity style={s.select} onPress={() => setShowDate(true)}>
                  <Text style={[s.selectTxt, !dateFrom && { color: th.inkText(0.35) }]} numberOfLines={1}>{dateFrom ? fDate(dateFrom.toISOString()) : t('rs.pick_date')}</Text>
                  <Ionicons name="calendar-outline" size={16} color={th.inkText(0.5)} />
                </TouchableOpacity>
              </View>
              <View style={{ marginBottom: 12 }}>
                <Text style={s.label}>{t('rs.days_pm')}</Text>
                <View style={[s.row, { gap: 6 }]}>
                  <TouchableOpacity style={s.stepBtn} hitSlop={6} onPress={() => setDaysAhead(d => Math.max(DAYS_MIN, d - 1))}>
                    <Ionicons name="remove" size={18} color={th.inkSolid} />
                  </TouchableOpacity>
                  <Text style={[s.stepVal, { minWidth: 28 }]}>{daysAhead}</Text>
                  <TouchableOpacity style={s.stepBtn} hitSlop={6} onPress={() => setDaysAhead(d => Math.min(DAYS_MAX, d + 1))}>
                    <Ionicons name="add" size={18} color={th.inkText(0.9)} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {showDate && (
              <DateTimePicker value={dateFrom ?? new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => { setShowDate(Platform.OS === 'ios'); if (d) setDateFrom(d) }} />
            )}

            <View style={[s.row, { justifyContent: 'space-between', marginBottom: 14 }]}>
              <Check checked={radiusMode} label={t('rs.radius')} onChange={setRadiusMode} />
              <View style={[s.row, { gap: 8, opacity: radiusMode ? 1 : 0.4 }]} pointerEvents={radiusMode ? 'auto' : 'none'}>
                <TouchableOpacity style={s.stepBtn} hitSlop={6} onPress={() => setRadiusKm(k => Math.max(RADIUS_STEP, k - RADIUS_STEP))}>
                  <Ionicons name="remove" size={18} color={th.inkSolid} />
                </TouchableOpacity>
                <Text style={s.stepVal}>{radiusKm} km</Text>
                <TouchableOpacity style={s.stepBtn} hitSlop={6} onPress={() => setRadiusKm(k => Math.min(500, k + RADIUS_STEP))}>
                  <Ionicons name="add" size={18} color={th.inkSolid} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={s.searchBtn} onPress={runSearch} activeOpacity={0.8}>
              <Ionicons name="search" size={16} color={th.onAccent} />
              <Text style={s.searchTxt}>{t('rs.search_btn')}</Text>
            </TouchableOpacity>
            {!!searchHint && <Text style={s.error}>{searchHint}</Text>}
          </View>
        )}
      </View>

      {/* Αποτελέσματα */}
      {!applied ? (
        <View style={s.empty}><Text style={{ fontSize: 36 }}>🧭</Text><Text style={s.emptyTxt}>{t('rs.fill_required')}</Text></View>
      ) : (
        <View>
          <View style={[s.row, { gap: 10, marginBottom: 12 }]}>
            <Combo label={t('rs.vehicle_type')} value={vehicle} options={VEHICLES} onChange={setVehicle} />
            <Combo label={t('rs.sort_by')} value={sortBy} options={SORTS} onChange={v => setSortBy(v as 'date' | 'price' | 'rating')} />
          </View>
          {isFetching ? (
            <ActivityIndicator color={th.accentText} style={{ marginVertical: 30 }} />
          ) : error ? (
            <Text style={s.error}>{(error as any)?.response?.data?.error ?? t('common.error')}</Text>
          ) : (
            <Text style={[s.muted, { marginBottom: 10 }]}>
              <Text style={{ color: th.inkSolid, fontWeight: '800' }}>{total}</Text> {t('rs.results')}
              {totalPages > 1 && !knownIds ? `  ·  ${page}/${totalPages}` : ''}
            </Text>
          )}
        </View>
      )}
    </View>
  )

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={22} color={th.inkSolid} /></TouchableOpacity>
        <Text style={s.headerTitle}>{t('rs.title')}</Text>
      </View>

      <FlatList
        data={applied && !isFetching && !error ? routes : []}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListEmptyComponent={applied && !isFetching && !error ? (
          <View style={s.empty}><Text style={{ fontSize: 36 }}>🔍</Text><Text style={s.emptyTxt}>{t('rs.empty')}</Text></View>
        ) : undefined}
        ListFooterComponent={totalPages > 1 && !knownIds && applied ? (
          <View style={[s.row, { justifyContent: 'center', gap: 12, marginTop: 8 }]}>
            <TouchableOpacity style={[s.chip, page === 1 && { opacity: 0.3 }]} disabled={page === 1} onPress={() => setPage(p => p - 1)}><Text style={s.chipTxt}>←</Text></TouchableOpacity>
            <Text style={s.muted}>{page} / {totalPages}</Text>
            <TouchableOpacity style={[s.chip, page >= totalPages && { opacity: 0.3 }]} disabled={page >= totalPages} onPress={() => setPage(p => p + 1)}><Text style={s.chipTxt}>→</Text></TouchableOpacity>
          </View>
        ) : undefined}
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
                  <Text style={[s.optionTxt, x.id === shipmentId && { color: th.accentText }]}>{x.title}</Text>
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
              <TouchableOpacity onPress={() => setRequestRoute(null)} hitSlop={12}><Ionicons name="close" size={22} color={th.inkText(0.4)} /></TouchableOpacity>
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
              placeholder={t('match.modal.req_placeholder')} placeholderTextColor={th.inkText(0.3)} />
            {requestError ? <Text style={s.error}>{requestError}</Text> : null}
            <View style={[s.row, { gap: 10, marginTop: 12 }]}>
              <TouchableOpacity style={[s.chip, { flex: 1, alignItems: 'center', paddingVertical: 12 }]} onPress={() => setRequestRoute(null)}>
                <Text style={s.chipTxt}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.requestBtn, { flex: 1, alignItems: 'center', paddingVertical: 12 }, (sending || !requestText.trim()) && { opacity: 0.5 }]}
                disabled={sending || !requestText.trim()} onPress={sendRequest}>
                {sending ? <ActivityIndicator size="small" color={th.onAccent} /> : <Text style={s.requestTxt}>{t('common.send')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root:        { flex: 1, backgroundColor: t.page },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: t.ink(0.1) },
  headerTitle: { color: t.inkSolid, fontSize: 17, fontWeight: '800' },
  row:         { flexDirection: 'row', alignItems: 'center' },
  label:       { fontSize: 11, fontWeight: '700', color: t.inkText(0.45), textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  muted:       { fontSize: 12, color: t.inkText(0.45) },
  select:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.ink(0.06), borderWidth: 1, borderColor: t.ink(0.12), borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  selectTxt:   { flex: 1, color: t.inkSolid, fontSize: 14 },
  input:       { backgroundColor: t.ink(0.06), borderWidth: 1, borderColor: t.ink(0.12), borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: t.inkSolid, fontSize: 14 },
  frame:       { backgroundColor: t.surface, borderWidth: 1, borderColor: t.ink(0.1), borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  frameHead:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  frameTitle:  { flex: 1, color: t.inkSolid, fontSize: 14, fontWeight: '800' },
  frameBody:   { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: t.ink(0.08), paddingTop: 12 },
  checkBox:    { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: t.ink(0.35), alignItems: 'center', justifyContent: 'center' },
  checkBoxOn:  { backgroundColor: t.accent, borderColor: t.accent },
  checkTxt:    { color: t.inkText(0.7), fontSize: 13, fontWeight: '600' },
  stepBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: t.ink(0.06), borderWidth: 1, borderColor: t.ink(0.12), alignItems: 'center', justifyContent: 'center' },
  stepVal:     { minWidth: 64, textAlign: 'center', color: t.inkSolid, fontSize: 14, fontWeight: '800' },
  searchBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 13 },
  searchTxt:   { color: t.onAccent, fontSize: 14, fontWeight: '800' },
  chip:        { borderWidth: 1, borderColor: t.ink(0.15), borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn:      { backgroundColor: t.accentBrightA(0.15), borderColor: t.accentBright },
  chipTxt:     { color: t.inkText(0.7), fontSize: 12, fontWeight: '700' },
  chipTxtOn:   { color: t.accentText },
  empty:       { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTxt:    { color: t.inkText(0.5), fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  error:       { color: t.soft('red'), fontSize: 13, marginTop: 8 },
  card:        { backgroundColor: t.ink(0.03), borderWidth: 1, borderColor: t.ink(0.1), borderRadius: 16, padding: 14, marginBottom: 12 },
  company:     { color: t.inkSolid, fontSize: 14, fontWeight: '700' },
  recurring:   { fontSize: 12 },
  distance:    { fontSize: 11, color: t.accentText, fontWeight: '700' },
  rating:      { marginLeft: 'auto', fontSize: 12, color: t.soft('red'), fontWeight: '800' },
  recurrence:  { fontSize: 12, color: t.soft('violet'), marginBottom: 4 },
  cities:      { color: t.inkSolid, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  charge:      { fontSize: 12, color: t.accentText, fontWeight: '700', marginTop: 2 },
  sent:        { color: t.soft('green'), fontSize: 12, fontWeight: '700' },
  requestBtn:  { backgroundColor: t.accentBright, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  requestTxt:  { color: t.onAccent, fontSize: 13, fontWeight: '700' },
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  sheet:       { backgroundColor: t.raised, borderRadius: 16, paddingVertical: 12, borderWidth: 1, borderColor: t.ink(0.1) },
  sheetTitle:  { color: t.inkText(0.5), fontSize: 12, fontWeight: '700', textTransform: 'uppercase', paddingHorizontal: 16, paddingBottom: 8 },
  option:      { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.ink(0.06) },
  optionTxt:   { color: t.inkSolid, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard:   { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  modalTitle:  { color: t.inkSolid, fontSize: 18, fontWeight: '800' },
})
