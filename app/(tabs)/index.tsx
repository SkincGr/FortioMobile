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
import { useI18n, translateText } from '@/lib/i18n'
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

const OFFER_STATUS_KEY: Record<string, any> = {
  REQUEST: 'dash.offer.status.request', PENDING: 'dash.offer.status.pending',
  AWAITING_SENDER: 'dash.offer.status.awaiting_sender', AWAITING_CARRIER: 'dash.offer.status.awaiting_carrier',
  ACCEPTED: 'dash.offer.status.accepted',
}
const OFFER_STATUS_BG: Record<string, string> = {
  REQUEST: '#EFF6FF', PENDING: '#FFFBEB',
  AWAITING_SENDER: '#F5F3FF', AWAITING_CARRIER: '#FFF7ED', ACCEPTED: '#F0FDF4',
}
const OFFER_STATUS_COLOR: Record<string, string> = {
  REQUEST: '#3B82F6', PENDING: '#D97706',
  AWAITING_SENDER: '#7C3AED', AWAITING_CARRIER: '#EA580C', ACCEPTED: '#166534',
}

const ROUTE_STATUS_KEY: Record<string, any> = {
  ACTIVE: 'dash.route.status.active', FULL: 'dash.route.status.full', IN_TRANSIT: 'dash.route.status.in_transit',
  COMPLETED: 'dash.route.status.completed', CANCELLED: 'dash.route.status.cancelled',
}
const ROUTE_STATUS_BG: Record<string, string> = {
  ACTIVE: '#F0FDF4', FULL: '#FFFBEB', IN_TRANSIT: '#F0F9FF',
  COMPLETED: '#F8FAFC', CANCELLED: '#FEF2F2',
}
const ROUTE_STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#166534', FULL: '#D97706', IN_TRANSIT: '#0369A1',
  COMPLETED: '#64748B', CANCELLED: '#DC2626',
}

const SORT_OPTIONS = [
  { id: 'date_desc',   labelKey: 'dash.sort_new' },
  { id: 'date_asc',    labelKey: 'dash.sort_old' },
  { id: 'offers_desc', labelKey: 'dash.sort_offers' },
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

function OfferRow({ offer, mode, shipmentId, showMessages, onViewOffer }: {
  offer: Offer
  mode: 'request' | 'carrier_offer'
  shipmentId: string
  showMessages?: boolean
  onViewOffer?: () => void
}) {
  const { t } = useI18n()
  const msgCount    = offer._count?.messages ?? 0
  const carrierName = offer.carrier?.company?.name ?? offer.carrier?.name ?? '—'
  const depDate     = offer.route?.departureDate
    ? new Date(offer.route.departureDate).toLocaleDateString('el-GR') : null
  const arrDate     = offer.route?.estimatedArrival
    ? new Date(offer.route.estimatedArrival).toLocaleDateString('el-GR') : null
  const midStops    = (offer.route?.stops ?? []).slice(1, -1)

  /* ── REQUEST mode: simple row ── */
  if (mode === 'request') {
    return (
      <View style={styles.offerRow}>
        <View style={styles.routeHeader}>
          <View style={styles.row}>
            <Text style={{ fontSize: 14 }}>🚛</Text>
            <Text style={[styles.routeCity, { flex: 1 }]} numberOfLines={1}>{carrierName}</Text>
          </View>
          {(offer.route?.originCity || offer.route?.destCity) && (
            <View style={[styles.row, { marginTop: 3, flexWrap: 'wrap', gap: 3 }]}>
              <Text style={styles.sub}>{fCity(offer.route?.originCity)}</Text>
              {depDate && <Text style={styles.sub}>({depDate})</Text>}
              <Text style={styles.sub}>→</Text>
              <Text style={styles.sub}>{fCity(offer.route?.destCity)}</Text>
            </View>
          )}
        </View>
        <View style={[styles.actionsRow, { marginTop: 8 }]}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnEdit]}
            activeOpacity={0.8}
            onPress={() => router.push(`/(tabs)/shipments/${shipmentId}?returnTo=${encodeURIComponent('/(tabs)')}` as any)}
          >
            <Text style={styles.actionBtnEditText}>{t('dash.btn.view_request')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, msgCount > 0 ? styles.actionBtnAmber : styles.actionBtnOff]}
            activeOpacity={0.8}
            onPress={() => router.push(`/(tabs)/messages?offerId=${offer.id}&returnTo=${encodeURIComponent('/(tabs)')}` as any)}
          >
            <Text style={msgCount > 0 ? styles.actionBtnAmberText : styles.actionBtnOffText}>{t('dash.btn.messages')}</Text>
            <View style={msgCount > 0 ? styles.btnBadge : styles.btnBadgeOff}>
              <Text style={msgCount > 0 ? styles.btnBadgeText : styles.btnBadgeOffText}>{msgCount}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  /* ── CARRIER OFFER mode: full layout ── */
  return (
    <View style={styles.offerRow}>

      {/* Row 1: icon + carrier + price + status */}
      <View style={[styles.row, { flexWrap: 'wrap', gap: 6, marginBottom: 8 }]}>
        <Text style={{ fontSize: 16 }}>🚛</Text>
        <Text style={styles.offerCarrierName} numberOfLines={1}>{carrierName}</Text>
        {(offer.price ?? 0) > 0 && (
          <View style={styles.offerPricePill}>
            <Text style={styles.offerPriceText}>€{offer.price}</Text>
          </View>
        )}
        {offer.status && (
          <View style={[styles.offerStatusPill, { backgroundColor: 'rgba(251,191,36,0.12)' }]}>
            <Text style={[styles.offerStatusPillText, { color: '#FBBF24' }]}>
              {OFFER_STATUS_KEY[offer.status] ? t(OFFER_STATUS_KEY[offer.status]) : offer.status}
            </Text>
          </View>
        )}
      </View>

      {/* Row 2: route origin → dest with dates */}
      {(offer.route?.originCity || offer.route?.destCity) && (
        <View style={[styles.row, { flexWrap: 'wrap', gap: 4, marginBottom: 4 }]}>
          <Ionicons name="navigate-outline" size={12} color={Colors.primary} />
          <Text style={styles.offerRouteCity}>{fCity(offer.route?.originCity)}</Text>
          {depDate && <Text style={styles.offerRouteDate}>({depDate})</Text>}
          <Text style={styles.offerRouteArrow}>→</Text>
          <Text style={styles.offerRouteCity}>{fCity(offer.route?.destCity)}</Text>
          {arrDate && <Text style={styles.offerRouteDate}>({arrDate})</Text>}
        </View>
      )}

      {/* Row 3: mid stops */}
      {midStops.length > 0 && (
        <View style={[styles.row, { flexWrap: 'wrap', gap: 3, marginBottom: 4, marginLeft: 16 }]}>
          <Ionicons name="ellipsis-horizontal" size={11} color={Colors.textMuted} />
          {midStops.map((s, i) => {
            let loc = s.city ?? '—'
            const country = (s as any).country
            if (country && !loc.includes(country)) {
              loc = `${country} / ${loc}`
            } else if ((s as any).place?.name && (s as any).place.name.includes('/')) {
              loc = (s as any).place.name
            }
            const d = s.estimatedDate ? ` (${new Date(s.estimatedDate).toLocaleDateString('el-GR')})` : ''
            const sep = i < midStops.length - 1 ? ' ·' : ''
            return (
              <Text key={i} style={styles.offerStopText}>
                {loc}{d}{sep}
              </Text>
            )
          })}
        </View>
      )}

      {/* Row 4: carrier message */}
      {offer.message ? (
        <>
          <View style={{ height: 12 }} />
          <Text style={styles.offerDocTitle}>{t('dash.offer.offer_title')}</Text>
          <Text style={styles.offerMessage} numberOfLines={3}>"{offer.message}"</Text>
        </>
      ) : null}

      {/* Row 5: conditions */}
      {offer.conditions ? (
        <>
          <View style={{ height: 12 }} />
          <Text style={styles.offerDocTitle}>{t('dash.offer.conditions')}</Text>
          <View style={styles.offerConditionsBox}>
            {offer.conditions.split('\n').filter(Boolean).map((line, i) => (
              <Text key={i} style={styles.offerConditionLine}>{line}</Text>
            ))}
          </View>
          <Text style={styles.offerDocNote}>{t('dash.offer.note')}</Text>
        </>
      ) : null}

      {/* Row 6: buttons */}
      <View style={[styles.actionsRow, { marginTop: 10 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnEdit]}
          activeOpacity={0.8}
          onPress={() => onViewOffer?.()}
        >
          <Ionicons name="eye-outline" size={12} color="#000" />
          <Text style={styles.actionBtnEditText}>{t('dash.btn.view_offer')}</Text>
        </TouchableOpacity>
        {showMessages && (
          <TouchableOpacity
            style={[styles.actionBtn, msgCount > 0 ? styles.actionBtnAmber : styles.actionBtnOff]}
            activeOpacity={0.75}
            onPress={() => router.push(`/(tabs)/messages?offerId=${offer.id}&returnTo=${encodeURIComponent('/(tabs)')}` as any)}
          >
            <Text style={msgCount > 0 ? styles.actionBtnAmberText : styles.actionBtnOffText}>{t('dash.btn.messages')}</Text>
            <View style={msgCount > 0 ? styles.btnBadge : styles.btnBadgeOff}>
              <Text style={msgCount > 0 ? styles.btnBadgeText : styles.btnBadgeOffText}>{msgCount}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

    </View>
  )
}

// ─── OfferGroupSection (shipment header + offer rows) ─────────────────────────

function OfferGroupSection({ group, mode, showMessages, onViewOffer }: {
  group: OfferGroup
  mode: 'request' | 'carrier_offer'
  showMessages?: boolean
  onViewOffer?: (offer: Offer, shipmentTitle: string) => void
}) {
  const { colors } = useTheme()
  const { t } = useI18n()
  const { shipment, offers } = group
  const roadInfo = formatRoad(shipment.roadDistanceKm, shipment.roadDurationMinutes)

  return (
    <View style={styles.groupSection}>
      {/* Shipment header */}
      <View style={styles.groupShipmentHeader}>
        <View style={[styles.row, { marginBottom: 4 }]}>
          <Text style={styles.catIcon}>{CATEGORY_ICON[shipment.category] ?? '📦'}</Text>
          <Text style={[styles.title, { flex: 1 }]} numberOfLines={1}>{shipment.title}</Text>
        </View>
        <View style={[styles.row, { marginLeft: 32 }]}>
          <Ionicons name="navigate-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.sub} numberOfLines={1}>
            {fCity(shipment.originCity)} → {fCity(shipment.destCity)}
            {roadInfo ? ` (${roadInfo})` : ''}
          </Text>
        </View>
        {shipment.desiredDelivery && (
          <View style={[styles.row, { marginTop: 4, marginLeft: 32 }]}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.sub}>
              {t('dash.label.delivery_date')} {new Date(shipment.desiredDelivery).toLocaleDateString('el-GR')}
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 10 }} />

      {/* Offer rows */}
      {offers.map(offer => (
        <OfferRow
          key={offer.id}
          offer={offer}
          mode={mode}
          shipmentId={shipment.id}
          showMessages={showMessages}
          onViewOffer={onViewOffer ? () => onViewOffer(offer, shipment.title) : undefined}
        />
      ))}
    </View>
  )
}

// ─── Shipment card ────────────────────────────────────────────────────────────

function ShipmentCard({ item, filter, matchCount, matchCountsLoading, onDelete, onViewOffer }: {
  item: Shipment
  filter: Filter
  matchCount?: number
  matchCountsLoading?: boolean
  onDelete?: (id: string, offerCount: number) => void
  onViewOffer?: (offer: Offer, title: string) => void
}) {
  const { colors } = useTheme()
  const { t } = useI18n()
  const icon       = CATEGORY_ICON[item.category] ?? '📦'
  const roadInfo   = formatRoad(item.roadDistanceKm, item.roadDurationMinutes)
  const offerCount = item._count?.offers ?? 0
  const requestCount      = (item.offers ?? []).filter(o => o.status === 'REQUEST').length
  const pendingOfferCount = (item.offers ?? []).filter(o => ['PENDING', 'AWAITING_SENDER', 'AWAITING_CARRIER'].includes(o.status)).length
  const hasAccepted       = (item.offers ?? []).some(o => o.status === 'ACCEPTED')

  const acceptedOffer = (item.offers ?? []).find(o => ['ACCEPTED', 'COMPLETED'].includes(o.status))
  const carrierName   = acceptedOffer?.carrier?.company?.name
    ?? acceptedOffer?.carrier?.name ?? null
  const deliveryDate  = acceptedOffer?.deliveryDate
    ?? acceptedOffer?.route?.estimatedArrival ?? null

  const isTransitView = filter === 'to_transport' || filter === 'in_transit'

  return (
    <View style={styles.card}>
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

      {/* Row 3: desired delivery date */}
      {item.desiredDelivery && (
        <View style={[styles.row, { marginTop: 4, marginLeft: 32 }]}>
          <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.sub}>
            {t('dash.label.delivery_date')} {new Date(item.desiredDelivery).toLocaleDateString('el-GR')}
          </Text>
        </View>
      )}

      {/* Transit views: carrier + delivery + route status + action buttons */}
      {isTransitView && (
        <View style={{ marginTop: 8 }}>
          {carrierName && (
            <View style={[styles.infoBox, { marginBottom: 8 }]}>
              <View style={styles.row}>
                <Ionicons name="business-outline" size={13} color={Colors.primary} />
                <Text style={[styles.sub, { color: Colors.textPrimary, fontWeight: '600', flex: 1 }]}>{carrierName}</Text>
                {/* Route status badge — Tab 5 only */}
                {filter === 'in_transit' && acceptedOffer?.route?.status && (
                  <View style={[styles.routeStatusBadge, { backgroundColor: ROUTE_STATUS_BG[acceptedOffer.route.status] ?? '#F1F5F9' }]}>
                    <Text style={[styles.routeStatusText, { color: ROUTE_STATUS_COLOR[acceptedOffer.route.status] ?? Colors.textMuted }]}>
                      {ROUTE_STATUS_KEY[acceptedOffer.route.status] ? t(ROUTE_STATUS_KEY[acceptedOffer.route.status]) : acceptedOffer.route.status}
                    </Text>
                  </View>
                )}
              </View>
              {deliveryDate && (
                <View style={[styles.row, { marginTop: 3 }]}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.sub}>{t('dash.label.delivery')} {new Date(deliveryDate).toLocaleDateString('el-GR')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Action buttons */}
          <View style={[styles.actionsRow, { marginLeft: 32 }]}>
            {filter === 'to_transport' && acceptedOffer && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnEdit]}
                activeOpacity={0.75}
                onPress={() => onViewOffer?.(acceptedOffer, item.title)}
              >
                <Ionicons name="eye-outline" size={12} color="#000" />
                <Text style={styles.actionBtnEditText}>{t('dash.btn.view_offer')}</Text>
              </TouchableOpacity>
            )}
            {filter === 'in_transit' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnEdit]}
                activeOpacity={0.75}
                onPress={() => router.push(`/(tabs)/shipments/${item.id}?returnTo=${encodeURIComponent('/(tabs)')}` as any)}
              >
                <Ionicons name="document-text-outline" size={12} color="#000" />
                <Text style={styles.actionBtnEditText}>{t('dash.btn.view_shipment')}</Text>
              </TouchableOpacity>
            )}
            {filter === 'in_transit' && acceptedOffer && (
              <TouchableOpacity
                style={[styles.actionBtn, (acceptedOffer._count?.messages ?? 0) > 0 ? styles.actionBtnAmber : styles.actionBtnOff]}
                activeOpacity={0.8}
                onPress={() => router.push(`/(tabs)/messages?offerId=${acceptedOffer.id}&returnTo=${encodeURIComponent('/(tabs)')}` as any)}
              >
                <Text style={(acceptedOffer._count?.messages ?? 0) > 0 ? styles.actionBtnAmberText : styles.actionBtnOffText}>{t('dash.btn.messages')}</Text>
                <View style={(acceptedOffer._count?.messages ?? 0) > 0 ? styles.btnBadge : styles.btnBadgeOff}>
                  <Text style={(acceptedOffer._count?.messages ?? 0) > 0 ? styles.btnBadgeText : styles.btnBadgeOffText}>
                    {acceptedOffer._count?.messages ?? 0}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Shipments filter: action buttons */}
      {filter === 'shipments' && (
        <View style={[styles.actionsRow, { marginTop: 10, marginLeft: 32 }]}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnEdit]}
            activeOpacity={0.75}
            onPress={e => { e.stopPropagation?.(); router.push(`/(tabs)/shipments/new?editId=${item.id}&returnTo=${encodeURIComponent('/(tabs)')}` as any) }}
          >
            <Text style={styles.actionBtnEditText}>{t('dash.btn.edit')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnEdit]}
            activeOpacity={0.75}
            onPress={e => { e.stopPropagation?.(); onDelete?.(item.id, offerCount) }}
          >
            <Text style={styles.actionBtnEditText}>{t('dash.btn.delete')}</Text>
          </TouchableOpacity>

          {(matchCountsLoading || matchCount === undefined) ? (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOff]} activeOpacity={1} onPress={e => e.stopPropagation?.()}>
              <Text style={styles.actionBtnOffText}>{t('dash.btn.routes')}</Text>
              <View style={styles.btnBadgeOff}><Text style={styles.btnBadgeOffText}>…</Text></View>
            </TouchableOpacity>
          ) : matchCount === 0 ? (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOff]} activeOpacity={1} onPress={e => e.stopPropagation?.()}>
              <Text style={styles.actionBtnOffText}>{t('dash.btn.routes')}</Text>
              <View style={styles.btnBadgeOff}><Text style={styles.btnBadgeOffText}>0</Text></View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnEdit]}
              activeOpacity={0.75}
              onPress={e => { e.stopPropagation?.(); router.push(`/(tabs)/shipments/matches/${item.id}?title=${encodeURIComponent(item.title)}&returnTo=${encodeURIComponent('/(tabs)')}` as any) }}
            >
              <Text style={styles.actionBtnEditText}>{t('dash.btn.routes')}</Text>
              <View style={styles.btnBadgeAmber}><Text style={styles.btnBadgeAmberText}>{matchCount}</Text></View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnEdit]}
            activeOpacity={0.75}
            onPress={e => { e.stopPropagation?.(); router.push(`/(tabs)/shipments/route-search/${item.id}?title=${encodeURIComponent(item.title)}&returnTo=${encodeURIComponent('/(tabs)')}` as any) }}
          >
            <Text style={styles.actionBtnEditText}>{t('dash.btn.route_search')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status labels */}
      {filter === 'shipments' && (
        <View style={[styles.actionsRow, { gap: 6, marginTop: 12, marginLeft: 32 }]}>
          <Text style={styles.statusLabelText}>{t('dash.label.requests')} <Text style={styles.statusLabelBadgeText}>{requestCount}</Text></Text>
          <Text style={styles.statusLabelText}>·</Text>
          <Text style={styles.statusLabelText}>{t('dash.label.offers')} <Text style={styles.statusLabelBadgeText}>{pendingOfferCount}</Text></Text>
          {hasAccepted && (
            <>
              <Text style={styles.statusLabelText}>·</Text>
              <View style={styles.row}>
                <Ionicons name="checkmark-circle-outline" size={11} color="#4ADE80" />
                <Text style={[styles.statusLabelText, { color: '#4ADE80' }]}>{t('dash.label.selected')}</Text>
              </View>
            </>
          )}
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
  const { t } = useI18n()
  const current = SORT_OPTIONS.find(o => o.id === value)!

  return (
    <View style={{ position: 'relative', zIndex: 10 }}>
      <TouchableOpacity onPress={() => setOpen(o => !o)} style={styles.sortBtn} activeOpacity={0.8}>
        <Ionicons name="swap-vertical-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.sortText}>{t(current.labelKey)}</Text>
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
                {t(o.labelKey)}
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
  const { user, token, logout } = useAuth()
  const { t, autoTranslate, language } = useI18n()
  const { colors } = useTheme()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('shipments')
  const [sortBy, setSortBy] = useState<SortKey>('date_desc')
  const [burgerOpen, setBurgerOpen] = useState(false)
  const [offerModal, setOfferModal] = useState<{ offer: Offer; shipmentTitle: string } | null>(null)

  const deleteMut = useMutation({
    mutationFn: (id: string) => shipmentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.error || 'Αποτυχία διαγραφής.'),
  })

  const acceptMut = useMutation({
    mutationFn: (offerId: string) => offersApi.accept(offerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.error || 'Αποτυχία αποδοχής.'),
  })

  const rejectMut = useMutation({
    mutationFn: (offerId: string) => offersApi.reject(offerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.error || 'Αποτυχία απόρριψης.'),
  })

  function handleDelete(id: string, offerCount: number) {
    Alert.alert(
      t('dash.alert.delete_title'),
      offerCount > 0
        ? `${t('dash.alert.delete_msg_1')} ${offerCount} ${t('dash.alert.delete_msg_2')}`
        : t('dash.alert.delete_msg_simple'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('dash.btn.delete'), style: 'destructive', onPress: () => deleteMut.mutate(id) },
      ]
    )
  }

  function handleAccept(offerId: string) {
    Alert.alert(t('dash.alert.accept_title'), t('dash.alert.accept_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.accept'), onPress: () => acceptMut.mutate(offerId) },
    ])
  }

  function handleReject(offerId: string) {
    Alert.alert(t('dash.alert.reject_title'), t('dash.alert.reject_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.reject'), style: 'destructive', onPress: () => rejectMut.mutate(offerId) },
    ])
  }

  const isCarrier = isCarrierUser(user?.role)

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', user?.role, sortBy, language, autoTranslate],
    queryFn: async () => {
      let result;
      if (isCarrier) {
        const { data } = await dashboardApi.getCarrier()
        result = { shipments: data.shipments, completedShipments: [], announcementCount: 0, inboxMessageCount: 0 }
      } else {
        result = await dashboardApi.getSender(sortBy).then(r => r.data)
      }

      if (autoTranslate && result.shipments) {
        result.shipments = await Promise.all(result.shipments.map(async (s: Shipment) => {
          const ts = { ...s }
          try {
            const [trTitle, trOrigin, trDest] = await Promise.all([
              ts.title ? translateText(ts.title, language) : null,
              ts.originCity ? translateText(ts.originCity, language) : null,
              ts.destCity ? translateText(ts.destCity, language) : null,
            ])
            if (trTitle) ts.title = trTitle
            if (trOrigin) ts.originCity = trOrigin
            if (trDest) ts.destCity = trDest
            
            if (ts.offers) {
              ts.offers = await Promise.all(ts.offers.map(async (o: Offer) => {
                const to = { ...o }
                const [trMsg, trCond, trOOrigin, trODest] = await Promise.all([
                  to.message ? translateText(to.message, language) : null,
                  to.conditions ? translateText(to.conditions, language) : null,
                  to.route?.originCity ? translateText(to.route.originCity, language) : null,
                  to.route?.destCity ? translateText(to.route.destCity, language) : null,
                ])
                if (trMsg) to.message = trMsg
                if (trCond) to.conditions = trCond
                if (to.route) {
                  to.route = { ...to.route }
                  if (trOOrigin) to.route.originCity = trOOrigin
                  if (trODest) to.route.destCity = trODest
                }
                return to
              }))
            }
          } catch {}
          return ts
        }))
      }

      return result
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
      .map(s => ({ shipment: s, offers: (s.offers ?? []).filter(o => ['PENDING', 'AWAITING_SENDER', 'AWAITING_CARRIER'].includes(o.status)) }))
      .filter(g => g.offers.length > 0)
  , [data])

  const toTransportGroups = useMemo<OfferGroup[]>(() =>
    allToTransport
      .map(s => {
        const offer = (s.offers ?? []).find(o =>
          ['ACCEPTED', 'LOADED', 'AWAITING_SENDER', 'AWAITING_CARRIER'].includes(o.status)
        )
        return offer ? { shipment: s, offers: [offer] } : null
      })
      .filter((g): g is OfferGroup => g !== null)
  , [allToTransport])

  const inTransitGroups = useMemo<OfferGroup[]>(() =>
    allInTransit
      .map(s => {
        const offer = (s.offers ?? []).find(o =>
          ['ACCEPTED', 'COMPLETED', 'LOADED', 'AWAITING_SENDER', 'AWAITING_CARRIER'].includes(o.status)
        )
        return offer ? { shipment: s, offers: [offer] } : null
      })
      .filter((g): g is OfferGroup => g !== null)
  , [allInTransit])

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

  if (isLoading) return <LoadingScreen message={t('common.loading')} />

  if (error) {
    return (
      <View style={styles.errorScreen}>
        <Ionicons name="warning-outline" size={42} color={Colors.danger} />
        <Text style={styles.errorTitle}>{t('common.error')}</Text>
        <Text style={styles.errorText}>
          {(error as any)?.response?.data?.error || (error as any)?.message || t('common.error')}
        </Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => refetch()}>
          <Text style={styles.emptyBtnText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const TABS: { key: Filter; label: string; count: number }[] = [
    { key: 'shipments',      label: t('dash.tab.shipments'), count: allShipments.length },
    { key: 'offer_requests', label: t('dash.tab.offer_requests'), count: offerRequestGroups.reduce((s, g) => s + g.offers.length, 0) },
    { key: 'carrier_offers', label: t('dash.tab.carrier_offers'),  count: carrierOfferGroups.reduce((s, g) => s + g.offers.length, 0) },
    { key: 'to_transport',   label: t('dash.tab.to_transport'),    count: allToTransport.length },
    { key: 'in_transit',     label: t('dash.tab.in_transit'),     count: allInTransit.length },
  ]

  const isOfferView  = filter === 'offer_requests' || filter === 'carrier_offers' || filter === 'to_transport' || filter === 'in_transit'
  const offerGroups  =
    filter === 'offer_requests' ? offerRequestGroups :
    filter === 'to_transport'   ? toTransportGroups  :
    filter === 'in_transit'     ? inTransitGroups    :
    carrierOfferGroups

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>

      {/* ── Burger Menu Modal ── */}
      <Modal visible={burgerOpen} transparent animationType="fade" onRequestClose={() => setBurgerOpen(false)}>
        <Pressable style={styles.burgerOverlay} onPress={() => setBurgerOpen(false)}>
          <Pressable style={styles.burgerPanel} onPress={e => e.stopPropagation()}>
{TABS.map((tab) => (
              <TouchableOpacity key={tab.key} style={styles.burgerItem} onPress={() => { setFilter(tab.key); setBurgerOpen(false) }}>
                <Text style={[styles.burgerItemText, filter === tab.key && { color: '#F59E0B' }]}>{tab.label}</Text>
                <View style={styles.burgerBadge}>
                  <Text style={styles.burgerBadgeText}>{tab.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Top row: logo + active label + burger */}
        {(() => {
          const active = TABS.find(t => t.key === filter)!
          return (
            <View style={[styles.row, { justifyContent: 'space-between', marginBottom: announcementCount > 0 ? 6 : 0 }]}>
              <View style={[styles.row, { flex: 1, gap: 10 }]}>
                <Text style={styles.headerLogo}>FORTIO</Text>
                <View style={[styles.row, { flex: 1, flexWrap: 'wrap', gap: 6 }]}>
                  <Text style={styles.filterSubtitle} numberOfLines={2}>{active.label}</Text>
                  <View style={styles.filterSubtitleBadge}>
                    <Text style={styles.filterSubtitleBadgeText}>{active.count}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => setBurgerOpen(true)} style={styles.burgerBtn}>
                <Text style={styles.burgerBtnText}>≡</Text>
              </TouchableOpacity>
            </View>
          )
        })()}

        {/* Badges row — announcements only */}
        {announcementCount > 0 && (
          <View style={[styles.row, { gap: 8 }]}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/announcements')}
              style={[styles.badge, { backgroundColor: '#D97706' }]}
            >
              <Ionicons name="megaphone-outline" size={13} color="#fff" />
              <Text style={styles.badgeText}>{announcementCount} {t('dash.announcements')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── List ── */}
      {isOfferView ? (
        <FlatList
          data={offerGroups}
          keyExtractor={item => item.shipment.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#F59E0B" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text style={styles.emptyText}>
                {filter === 'offer_requests' ? t('dash.empty.requests') :
                 filter === 'to_transport'   ? t('dash.empty.transport') :
                 filter === 'in_transit'     ? t('dash.empty.transit') :
                 t('dash.empty.offers')}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <OfferGroupSection
              group={item}
              mode={filter === 'offer_requests' ? 'request' : 'carrier_offer'}
              showMessages={filter === 'in_transit' || filter === 'carrier_offers' || filter === 'to_transport'}
              onViewOffer={(offer, title) => setOfferModal({ offer, shipmentTitle: title })}
            />
          )}
        />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={s => s.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#F59E0B" />}
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
              onViewOffer={(offer, title) => setOfferModal({ offer, shipmentTitle: title })}
            />
          )}
        />
      )}

      {/* ── Offer Detail Modal ── */}
      <Modal visible={!!offerModal} transparent animationType="fade" onRequestClose={() => setOfferModal(null)}>
        <Pressable style={styles.burgerOverlay} onPress={() => setOfferModal(null)}>
          <Pressable style={styles.offerModalCard} onPress={e => e.stopPropagation()}>
            {offerModal && (() => {
              const { offer: o, shipmentTitle } = offerModal
              const midStops = (o.route?.stops ?? []).slice(1, -1)
              const msgCount = o._count?.messages ?? 0
              return (
                <>
                  {/* Header */}
                  <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.offerModalLabel}>ΠΡΟΣΦΟΡΑ ΜΕΤΑΦΟΡΕΑ</Text>
                      <Text style={styles.offerModalTitle} numberOfLines={1}>{shipmentTitle}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setOfferModal(null)} hitSlop={12}>
                      <Ionicons name="close" size={22} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                    {/* Carrier */}
                    <View style={styles.offerModalRow}>
                      <Text style={styles.offerModalKey}>Μεταφορέας</Text>
                      <Text style={styles.offerModalVal}>🚛 {o.carrier?.company?.name ?? o.carrier?.name ?? '—'}</Text>
                    </View>

                    {/* Price */}
                    {(o.price ?? 0) > 0 && (
                      <View style={styles.offerModalRow}>
                        <Text style={styles.offerModalKey}>Τιμή</Text>
                        <Text style={[styles.offerModalVal, { color: Colors.accent, fontWeight: '800', fontSize: 16 }]}>€{o.price}</Text>
                      </View>
                    )}

                    {/* Status */}
                    <View style={styles.offerModalRow}>
                      <Text style={styles.offerModalKey}>Κατάσταση</Text>
                      <View style={[styles.offerStatusPill, { backgroundColor: OFFER_STATUS_BG[o.status] ?? '#F1F5F9' }]}>
                        <Text style={[styles.offerStatusPillText, { color: OFFER_STATUS_COLOR[o.status] ?? Colors.textMuted }]}>
                          {OFFER_STATUS_KEY[o.status] ? t(OFFER_STATUS_KEY[o.status]) : o.status}
                        </Text>
                      </View>
                    </View>

                    {/* Route */}
                    {o.route && (
                      <View style={[styles.offerModalSection]}>
                        <Text style={styles.offerModalSectionTitle}>Δρομολόγιο</Text>
                        <View style={[styles.row, { flexWrap: 'wrap', gap: 4 }]}>
                          <Text style={styles.offerModalVal}>{fCity(o.route.originCity)}</Text>
                          {o.route.departureDate && <Text style={styles.offerModalMuted}>({new Date(o.route.departureDate).toLocaleDateString('el-GR')})</Text>}
                          <Text style={styles.offerModalMuted}>→</Text>
                          <Text style={styles.offerModalVal}>{fCity(o.route.destCity)}</Text>
                          {o.route.estimatedArrival && <Text style={styles.offerModalMuted}>({new Date(o.route.estimatedArrival).toLocaleDateString('el-GR')})</Text>}
                        </View>
                        {midStops.length > 0 && (
                          <Text style={[styles.offerModalMuted, { marginTop: 4 }]}>
                            {midStops.map(s => s.city ?? '—').join(' · ')}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Pickup / Delivery */}
                    {(o.pickupDate || o.deliveryDate) && (
                      <View style={[styles.row, { gap: 16, marginTop: 10 }]}>
                        {o.pickupDate && (
                          <View style={{ flex: 1 }}>
                            <Text style={styles.offerModalKey}>Παραλαβή</Text>
                            <Text style={styles.offerModalVal}>{new Date(o.pickupDate).toLocaleDateString('el-GR')}</Text>
                          </View>
                        )}
                        {o.deliveryDate && (
                          <View style={{ flex: 1 }}>
                            <Text style={styles.offerModalKey}>Παράδοση</Text>
                            <Text style={styles.offerModalVal}>{new Date(o.deliveryDate).toLocaleDateString('el-GR')}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Carrier message */}
                    {o.message && (
                      <View style={styles.offerModalSection}>
                        <Text style={styles.offerModalSectionTitle}>Μήνυμα Μεταφορέα</Text>
                        <Text style={styles.offerModalBody}>"{o.message}"</Text>
                      </View>
                    )}

                    {/* Conditions */}
                    {o.conditions && (
                      <View style={styles.offerModalSection}>
                        <Text style={styles.offerModalSectionTitle}>Όροι Μεταφοράς</Text>
                        {o.conditions.split('\n').map((line, i) => (
                          <Text key={i} style={styles.offerModalBody}>{line}</Text>
                        ))}
                      </View>
                    )}
                  </ScrollView>

                  {/* Footer buttons */}
                  <View style={[styles.row, { gap: 8, marginTop: 16 }]}>
                    {!['ACCEPTED', 'COMPLETED'].includes(o.status) && ['AWAITING_SENDER', 'PENDING'].includes(o.status) && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { flex: 1, justifyContent: 'center', backgroundColor: '#DCFCE7', paddingVertical: 12 }]}
                        onPress={() => { setOfferModal(null); handleAccept(o.id) }}
                      >
                        <Text style={[styles.actionBtnEditText, { color: '#166534' }]}>Αποδοχή</Text>
                      </TouchableOpacity>
                    )}
                    {!['ACCEPTED', 'COMPLETED'].includes(o.status) && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnDanger, { flex: 1, justifyContent: 'center', paddingVertical: 12 }]}
                        onPress={() => { setOfferModal(null); handleReject(o.id) }}
                      >
                        <Text style={styles.actionBtnDangerText}>Απόρριψη</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnEdit, { flex: 1, justifyContent: 'center', paddingVertical: 12 }]}
                      onPress={() => setOfferModal(null)}
                    >
                      <Text style={styles.actionBtnEditText}>Κλείσιμο</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── FAB ── */}
      {filter === 'shipments' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push(`/(tabs)/shipments/new?returnTo=${encodeURIComponent('/(tabs)')}` as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20,
  },
  headerLogo:    { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  headerLogoSub: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '500', marginLeft: 8, alignSelf: 'flex-end', marginBottom: 1 },
  filterSubtitle: { color: '#FBBF24', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  filterSubtitleBadge: {
    marginLeft: 8, minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  filterSubtitleBadgeText: { color: '#000', fontSize: 11, fontWeight: '800' },
  headerSub:  { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 2 },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerDate: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 3 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeText: { color: '#F59E0B', fontSize: 12, fontWeight: '600' },

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
  burgerItem: { paddingHorizontal: 20, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  burgerItemText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, flex: 1 },
  burgerBadge: {
    minWidth: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  burgerBadgeText: { color: '#000', fontSize: 13, fontWeight: '800' },
  burgerSep: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginVertical: 8 },

  // Tab bar (scrollable)
  tabBarOuter: { flexShrink: 0, borderBottomWidth: 1, backgroundColor: '#111', borderBottomColor: 'rgba(255,255,255,0.1)' },
  tabBarContent: { paddingHorizontal: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 12, paddingHorizontal: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
    minWidth: 100,
  },
  tabActive:    { borderBottomColor: '#F59E0B' },
  tabText:      { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  tabTextActive: { color: '#F59E0B' },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabBadgeActive:     { backgroundColor: '#F59E0B' },
  tabBadgeText:       { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  tabBadgeTextActive: { color: '#000' },

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
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14, marginBottom: 10,
  },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  title:   { fontSize: 15, fontWeight: '700', color: '#fff' },
  sub:     { fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 1 },
  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10,
  },

  // Offer group section
  groupSection: {
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 10, overflow: 'hidden',
  },
  groupShipmentHeader: { padding: 14, paddingBottom: 12 },
  offerRow: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },

  // Route header (request mode inside OfferRow)
  routeHeader: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8, padding: 8,
  },
  routeNum:  { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
  routeCity: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // carrier_offer mode styles
  offerCarrierName:  { fontSize: 14, fontWeight: '700', color: '#fff', flexShrink: 1 },
  offerPricePill:    { backgroundColor: 'rgba(251,191,36,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  offerPriceText:    { fontSize: 12, fontWeight: '800', color: '#FBBF24' },
  offerRouteCity:    { fontSize: 13, fontWeight: '700', color: '#fff' },
  offerRouteDate:    { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  offerRouteArrow:   { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  offerStopText:     { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  offerMessage:      { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginBottom: 6, paddingHorizontal: 2 },
  offerConditionsBox:{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 8, marginBottom: 4 },
  offerConditionLine:{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 17 },
  offerDocTitle:     { fontSize: 11, fontWeight: '800', color: '#FBBF24', letterSpacing: 0.5, marginBottom: 2 },
  offerDocSender:    { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginBottom: 6 },
  offerDocNote:      { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', marginTop: 4 },

  // Action buttons
  actionsCol: { marginTop: 10, gap: 6, marginLeft: 32 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  actionBtnEdit:     { backgroundColor: '#FBBF24' },
  actionBtnEditText: { fontSize: 11, fontWeight: '700', color: '#000' },
  actionBtnOff: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actionBtnOffText:  { fontSize: 11, fontWeight: '600', color: '#60A5FA' },
  actionBtnAmber: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actionBtnAmberText:{ fontSize: 11, fontWeight: '600', color: '#60A5FA' },
  actionBtnDanger:     { backgroundColor: 'rgba(239,68,68,0.12)' },
  actionBtnDangerText: { fontSize: 11, fontWeight: '600', color: '#F87171' } as const,
  btnBadge: {
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnBadgeText:    { fontSize: 10, fontWeight: '700', color: '#60A5FA' },
  btnBadgeAmber: {
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  btnBadgeAmberText: { fontSize: 10, fontWeight: '800', color: '#000' },
  btnBadgeOff: {
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnBadgeOffText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)' },

  // Status labels (Row C)
  statusLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusLabelAccepted: { backgroundColor: 'rgba(74,222,128,0.12)' },
  statusLabelText: { fontSize: 11, fontWeight: '600', color: '#FBBF24' },
  statusLabelBadge: {
    minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statusLabelBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // Empty state
  empty:       { alignItems: 'center', paddingTop: 60 },
  emptyText:   { fontSize: 15, color: 'rgba(255,255,255,0.3)', marginBottom: 12 },
  emptyBtn:    { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F59E0B', borderRadius: 12 },
  emptyBtnText:{ color: '#000', fontWeight: '700', fontSize: 14 },
  errorScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0a0a0a' },
  errorTitle:  { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 12 },
  errorText:   { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 16 },

  // Route status badge (transit view)
  routeStatusBadge: {
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  routeStatusText: { fontSize: 10, fontWeight: '700' },

  // Offer detail modal
  offerModalCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    padding: 20, paddingBottom: 36,
    maxHeight: '90%',
  },
  offerModalLabel: { fontSize: 10, fontWeight: '800', color: '#F59E0B', letterSpacing: 1.5 },
  offerModalTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginTop: 2 },
  offerModalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  offerModalKey:  { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  offerModalVal:  { fontSize: 13, fontWeight: '600', color: '#fff' },
  offerModalMuted:{ fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  offerModalSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  offerModalSectionTitle: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  offerModalBody: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  offerStatusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  offerStatusPillText: { fontSize: 11, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
})
