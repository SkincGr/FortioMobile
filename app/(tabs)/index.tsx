import React, { useState, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  FlatList, StyleSheet, Modal, Pressable, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { dashboardApi, matchCountsApi, shipmentsApi, Shipment, ShipmentStatus } from '@/lib/api'
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

type Filter = 'active' | 'transit' | 'completed'

const ACTIVE_STATUSES: ShipmentStatus[]  = ['PENDING', 'OFFERED']
const TRANSIT_STATUSES: ShipmentStatus[] = ['ACCEPTED', 'LOADED', 'IN_TRANSIT', 'DELIVERED']

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

// ─── Shipment card ────────────────────────────────────────────────────────────

function ShipmentCard({
  item, filter, matchCount, matchCountsLoading, onDelete,
}: {
  item: Shipment
  filter: Filter
  matchCount?: number
  matchCountsLoading?: boolean
  onDelete?: (id: string, offerCount: number) => void
}) {
  const icon       = CATEGORY_ICON[item.category] ?? '📦'
  const roadInfo   = formatRoad(item.roadDistanceKm, item.roadDurationMinutes)
  const offerCount = item._count?.offers ?? 0
  const msgCount   = (item.offers ?? []).reduce((s, o) => s + (o._count?.messages ?? 0), 0)
    + (item._count?.messages ?? 0)

  // For transit & completed: find accepted offer
  const acceptedOffer = (item.offers ?? []).find(o =>
    ['ACCEPTED', 'COMPLETED'].includes(o.status)
  )
  const carrierName  = acceptedOffer?.carrier?.carrierProfile?.companyName
    ?? acceptedOffer?.carrier?.email
    ?? null
  const deliveryDate = acceptedOffer?.deliveryDate
    ?? acceptedOffer?.route?.estimatedArrival
    ?? null

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => router.push(`/(tabs)/shipments/${item.id}`)}
      style={styles.card}
    >
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

      {/* Transit / Completed: carrier + delivery */}
      {(filter === 'transit' || filter === 'completed') && carrierName && (
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

      {/* Active: action buttons */}
      {filter === 'active' && (
        <View style={styles.actionsCol}>
          {/* Σειρά Α: Διόρθωση + Διαγραφή + Μηνύματα */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnEdit]}
              activeOpacity={0.7}
              onPress={e => { e.stopPropagation?.(); router.push(`/(tabs)/shipments/new?editId=${item.id}` as any) }}
            >
              <Text style={styles.actionBtnEditText}>Διόρθωση</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              activeOpacity={0.7}
              onPress={e => { e.stopPropagation?.(); onDelete?.(item.id, offerCount) }}
            >
              <Ionicons name="trash-outline" size={11} color="#EF4444" />
              <Text style={styles.actionBtnDangerText}>Διαγραφή</Text>
            </TouchableOpacity>

            {msgCount > 0 ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnAmber]}
                activeOpacity={0.8}
                onPress={e => { e.stopPropagation?.(); router.push(`/(tabs)/messages?shipmentId=${item.id}` as any) }}
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

          {/* Σειρά Β: Εμφάν. Δρομολογίων + #Αιτημ/Προσφορών */}
          <View style={styles.actionsRow}>
            {matchCountsLoading || matchCount === undefined ? (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOff]} activeOpacity={1} onPress={e => e.stopPropagation?.()}>
                <Text style={styles.actionBtnOffText}>Εμφάν. Δρομολογίων</Text>
                <View style={styles.btnBadgeOff}><Text style={styles.btnBadgeOffText}>…</Text></View>
              </TouchableOpacity>
            ) : matchCount === 0 ? (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOff]} activeOpacity={1} onPress={e => e.stopPropagation?.()}>
                <Text style={styles.actionBtnOffText}>Εμφάν. Δρομολογίων</Text>
                <View style={styles.btnBadgeOff}><Text style={styles.btnBadgeOffText}>0</Text></View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnAmber]}
                activeOpacity={0.8}
                onPress={e => { e.stopPropagation?.(); router.push(`/(tabs)/shipments/matches/${item.id}` as any) }}
              >
                <Text style={styles.actionBtnAmberText}>Εμφάν. Δρομολογίων</Text>
                <View style={styles.btnBadge}><Text style={styles.btnBadgeText}>{matchCount}</Text></View>
              </TouchableOpacity>
            )}

            {offerCount > 0 ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnAmber]}
                activeOpacity={0.8}
                onPress={e => { e.stopPropagation?.(); router.push(`/(tabs)/shipments/${item.id}` as any) }}
              >
                <Text style={styles.actionBtnAmberText}>#Αιτημ/Προσφορών</Text>
                <View style={styles.btnBadge}><Text style={styles.btnBadgeText}>{offerCount}</Text></View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOff]} activeOpacity={1} onPress={e => e.stopPropagation?.()}>
                <Text style={styles.actionBtnOffText}>#Αιτημ/Προσφορών</Text>
                <View style={styles.btnBadgeOff}><Text style={styles.btnBadgeOffText}>0</Text></View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Transit / Completed: date */}
      {(filter === 'transit' || filter === 'completed') && (
        <Text style={[styles.sub, { marginTop: 4, marginLeft: 32 }]}>
          {new Date(item.createdAt).toLocaleDateString('el-GR')}
          {item.maxBudget ? `  ·  €${item.maxBudget}` : ''}
        </Text>
      )}
    </TouchableOpacity>
  )
}

// ─── Sort picker ──────────────────────────────────────────────────────────────

function SortPicker({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false)
  const current = SORT_OPTIONS.find(o => o.id === value)!

  return (
    <View style={{ position: 'relative', zIndex: 10 }}>
      <TouchableOpacity
        onPress={() => setOpen(o => !o)}
        style={styles.sortBtn}
        activeOpacity={0.8}
      >
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
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('active')
  const [sortBy, setSortBy] = useState<SortKey>('date_desc')
  const [burgerOpen, setBurgerOpen] = useState(false)

  const deleteMut = useMutation({
    mutationFn: (id: string) => shipmentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-sender'] })
    },
    onError: (e: any) => {
      Alert.alert('Σφάλμα', e?.response?.data?.error || 'Αποτυχία διαγραφής.')
    },
  })

  function handleDelete(id: string, offerCount: number) {
    const hasOffers = offerCount > 0
    Alert.alert(
      'Διαγραφή αποστολής',
      hasOffers
        ? `Υπάρχουν ${offerCount} εκκρεμείς προσφορές/αιτήματα. Θα σταλεί μήνυμα ακύρωσης σε κάθε μεταφορέα. Θέλεις σίγουρα να διαγράψεις;`
        : 'Θέλεις σίγουρα να διαγράψεις αυτή την αποστολή;',
      [
        { text: 'Ακύρωση', style: 'cancel' },
        { text: 'Διαγραφή', style: 'destructive', onPress: () => deleteMut.mutate(id) },
      ]
    )
  }

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-sender', sortBy],
    queryFn: () => dashboardApi.getSender(sortBy).then(r => r.data),
  })

  const allActive    = useMemo(() => (data?.shipments ?? []).filter(s => ACTIVE_STATUSES.includes(s.status)),  [data])
  const allTransit   = useMemo(() => (data?.shipments ?? []).filter(s => TRANSIT_STATUSES.includes(s.status)), [data])
  const allCompleted = useMemo(() => data?.completedShipments ?? [], [data])

  const activeIds = useMemo(() => allActive.map(s => s.id), [allActive])

  const { data: matchCountData, isLoading: matchCountsLoading } = useQuery({
    queryKey: ['match-counts', activeIds],
    queryFn: () => matchCountsApi.getBatch(activeIds).then(r => r.data.counts),
    enabled: activeIds.length > 0,
    staleTime: 60_000,
  })
  const matchCounts: Record<string, number> = matchCountData ?? {}

  const displayed =
    filter === 'active'    ? allActive :
    filter === 'transit'   ? allTransit :
    allCompleted

  const inboxCount        = data?.inboxMessageCount ?? 0
  const announcementCount = data?.announcementCount ?? 0

  const today = new Date().toLocaleDateString('el-GR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  if (isLoading) return <LoadingScreen message="Φόρτωση..." />

  const TABS: { key: Filter; label: string; count: number }[] = [
    { key: 'active',    label: 'Ενεργές',    count: allActive.length },
    { key: 'transit',   label: 'Μεταφορά',   count: allTransit.length },
    { key: 'completed', label: 'Ολοκλ.',     count: allCompleted.length },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface }}>

      {/* ── Burger Menu Modal ── */}
      <Modal
        visible={burgerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBurgerOpen(false)}
      >
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
        {/* Top row: logo + burger button */}
        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
          <Text style={styles.headerLogo}>FORTIO</Text>
          <TouchableOpacity onPress={() => setBurgerOpen(true)} style={styles.burgerBtn}>
            <Text style={styles.burgerBtnText}>≡</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom row: greeting + badges */}
        <View style={[styles.row, { alignItems: 'flex-start' }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSub}>Καλωσόρισες,</Text>
            <Text style={styles.headerName}>{user?.name ?? 'Αποστολέας'}</Text>
            <Text style={styles.headerDate}>{today}</Text>
          </View>

          <View style={{ gap: 6, alignItems: 'flex-end' }}>
            {inboxCount > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/messages')}
                style={styles.badge}
              >
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
        </View>
      </View>

      {/* ── Filter tabs ── */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setFilter(tab.key)}
            style={[styles.tab, filter === tab.key && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, filter === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            <View style={[styles.tabBadge, filter === tab.key && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, filter === tab.key && styles.tabBadgeTextActive]}>
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      <FlatList
        data={displayed}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
            <Text style={styles.sectionTitle}>
              {TABS.find(t => t.key === filter)?.label} ({displayed.length})
            </Text>
            <SortPicker value={sortBy} onChange={setSortBy} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📦</Text>
            <Text style={styles.emptyText}>Δεν υπάρχουν αποστολές</Text>
            {filter === 'active' && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/shipments/new')}
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
            matchCountsLoading={filter === 'active' && matchCountsLoading}
            onDelete={filter === 'active' ? handleDelete : undefined}
          />
        )}
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/shipments/new')}
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
    paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
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

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:    { borderBottomColor: Colors.primary },
  tabText:      { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
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
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  title:   { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sub:     { fontSize: 12, color: Colors.textMuted, flexShrink: 1 },
  infoBox: {
    backgroundColor: '#F8FAFC', borderRadius: 10,
    padding: 10, gap: 0,
  },
  // Action buttons (active shipments)
  actionsCol: {
    marginTop: 10, gap: 6,
  },
  actionsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
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

  // Empty state
  empty:       { alignItems: 'center', paddingTop: 60 },
  emptyText:   { fontSize: 15, color: Colors.textMuted, marginBottom: 12 },
  emptyBtn:    { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 12 },
  emptyBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },

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
