'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Alert, KeyboardAvoidingView,
  Platform, RefreshControl, StyleSheet,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Conversation = {
  id: string
  directShipmentId?: string
  directRouteId?: string
  status?: string
  unreadCount?: number
  carrier?: { id: string; name: string | null }
  shipment?: {
    id: string
    title: string | null
    originCity?: string | null
    destCity?: string | null
    desiredDelivery?: string | null
    status?: string
  }
  route?: {
    id: string
    originCity?: string | null
    destCity?: string | null
    routeNumber?: string | null
    departureDate?: string | null
    estimatedArrival?: string | null
  } | null
  messages?: Msg[]
  _count?: { messages: number }
}

type Msg = {
  id: string
  content: string
  subject?: string | null
  category?: string | null
  isRead: boolean
  createdAt: string
  sender?: { id: string; name: string | null }
  shipment?: Conversation['shipment']
  route?: Conversation['route']
}

type Group = { shipment: NonNullable<Conversation['shipment']>; conversations: Conversation[] }

const ALL_ID = '__all__'

function isDirect(c: Conversation) { return !!c.directShipmentId }
function isOffer(c: Conversation) { return !c.directShipmentId }

function parseContent(content: string) {
  const m = content.match(/^\[([^\]]+)\]\s*([\s\S]*)$/)
  if (m) return { subject: m[1].trim(), body: m[2].trim() }
  return { subject: '', body: content }
}

// ─── Main screen ────────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const { user } = useAuth()
  const myId = user?.id
  const { shipmentId: paramShipId, returnTo } = useLocalSearchParams<{ shipmentId?: string; returnTo?: string }>()

  const [conversations, setConversations]     = useState<Conversation[]>([])
  const [messages, setMessages]               = useState<Msg[]>([])
  const [selectedShipId, setSelectedShipId]   = useState<string>(paramShipId ?? ALL_ID)
  const [kind, setKind]                       = useState<'messages' | 'offers'>('messages')
  const [unreadOnly, setUnreadOnly]           = useState(false)
  const [loading, setLoading]                 = useState(true)
  const [threadLoading, setThreadLoading]     = useState(false)
  const [refreshing, setRefreshing]           = useState(false)
  const [text, setText]                       = useState('')
  const [sending, setSending]                 = useState(false)

  // Group conversations by shipment
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const c of conversations) {
      const s = c.shipment
      if (!s?.id) continue
      if (!map.has(s.id)) map.set(s.id, { shipment: s, conversations: [] })
      map.get(s.id)!.conversations.push(c)
    }
    return Array.from(map.values())
  }, [conversations])

  // Conversations visible under current shipment + kind filter
  const visible = useMemo(() => {
    const pool = selectedShipId === ALL_ID
      ? conversations
      : groups.find(g => g.shipment.id === selectedShipId)?.conversations ?? []
    return kind === 'offers' ? pool.filter(isOffer) : pool.filter(isDirect)
  }, [conversations, groups, selectedShipId, kind])

  const selectedGroup = useMemo(
    () => selectedShipId === ALL_ID ? null : groups.find(g => g.shipment.id === selectedShipId) ?? null,
    [groups, selectedShipId]
  )

  const selectedConversation = visible[0] ?? null

  const counts = useMemo(() => {
    const pool = selectedShipId === ALL_ID
      ? conversations
      : groups.find(g => g.shipment.id === selectedShipId)?.conversations ?? []
    return {
      messages: pool.filter(isDirect).reduce((s, c) => s + (c.unreadCount ?? 0), 0),
      offers:   pool.filter(isOffer).reduce((s, c)  => s + (c.unreadCount ?? 0), 0),
    }
  }, [conversations, groups, selectedShipId])

  // ── Load conversations ──────────────────────────────────────────────────────

  const loadConversations = useCallback(async (shipId?: string) => {
    try {
      const res = await api.get<Conversation[]>('/api/messages')
      const data: Conversation[] = Array.isArray(res.data) ? res.data : []
      setConversations(data)
      const activeShipId = shipId ?? paramShipId
      if (activeShipId) setSelectedShipId(activeShipId)
      const pool = activeShipId ? data.filter(c => c.shipment?.id === activeShipId) : data
      const unreadDirect = pool.filter(isDirect).some(c => (c.unreadCount ?? 0) > 0)
      const unreadOffer  = pool.filter(isOffer).some(c => (c.unreadCount ?? 0) > 0)
      if (!unreadDirect && unreadOffer) setKind('offers')
      else setKind('messages')
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }, [paramShipId])

  // Re-load and re-select whenever the URL param changes (navigating from different shipments)
  useEffect(() => {
    if (paramShipId) setSelectedShipId(paramShipId)
    loadConversations(paramShipId)
  }, [paramShipId])

  // ── Load threads when visible conversations change ──────────────────────────

  useEffect(() => {
    if (!visible.length) { setMessages([]); return }
    loadThreads(visible)
  }, [visible])

  async function loadThreads(convs: Conversation[]) {
    setThreadLoading(true)
    try {
      const results = await Promise.all(convs.map(async c => {
        const url = c.directShipmentId
          ? c.directRouteId
            ? `/api/messages?shipmentId=${c.directShipmentId}&routeId=${c.directRouteId}`
            : `/api/messages?shipmentId=${c.directShipmentId}`
          : `/api/messages?offerId=${c.id}`
        const r = await api.get<any>(url)
        return Array.isArray(r.data.messages) ? r.data.messages as Msg[] : []
      }))
      const flat = results.flat().sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      setMessages(flat)
      // If unreadOnly is on but no unread messages found, turn it off
      if (unreadOnly && !flat.some(m => !m.isRead)) setUnreadOnly(false)
    } catch {}
    setThreadLoading(false)
  }

  // ── Send reply ──────────────────────────────────────────────────────────────

  async function sendReply() {
    if (!selectedConversation || !text.trim() || sending) return
    setSending(true)
    try {
      await api.post('/api/messages', selectedConversation.directShipmentId
        ? {
            shipmentId: selectedConversation.directShipmentId,
            ...(selectedConversation.directRouteId && { routeId: selectedConversation.directRouteId }),
            content: text.trim(),
          }
        : { offerId: selectedConversation.id, content: text.trim() }
      )
      setText('')
      await loadThreads(visible)
      await loadConversations()
    } catch (e: any) {
      Alert.alert('Σφάλμα', e?.response?.data?.error || 'Αποτυχία αποστολής')
    }
    setSending(false)
  }

  if (loading) return <LoadingScreen message="Φόρτωση μηνυμάτων..." />

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        {returnTo ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backBtn}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={s.backBtnText}>Επιστροφή</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={s.logo}>FORTIO</Text>
            <View style={s.sep} />
          </>
        )}
        <Text style={s.subtitle}>Διαχείρηση Μηνυμάτων</Text>
      </View>

      {/* ── Shipment tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsScroll}
        contentContainerStyle={s.tabsContent}
      >
        {groups.map(g => (
          <TouchableOpacity
            key={g.shipment.id}
            onPress={() => setSelectedShipId(prev => prev === g.shipment.id ? ALL_ID : g.shipment.id)}
            style={[s.chip, selectedShipId === g.shipment.id && s.chipActive]}
          >
            <Text
              style={[s.chipText, selectedShipId === g.shipment.id && s.chipTextActive]}
              numberOfLines={1}
            >
              {g.shipment.title || `${g.shipment.originCity} → ${g.shipment.destCity}`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Selected shipment info ── */}
      {selectedGroup && (
        <View style={s.shipInfo}>
          <Text style={s.shipTitle} numberOfLines={1}>{selectedGroup.shipment.title}</Text>
          <Text style={s.shipRoute}>
            {selectedGroup.shipment.originCity} → {selectedGroup.shipment.destCity}
          </Text>
        </View>
      )}

      {/* ── Kind filter + Αδιάβαστα ── */}
      <View style={s.filterRow}>
        {([
          { key: 'messages' as const, label: 'Μηνύματα', count: counts.messages },
          { key: 'offers' as const,   label: 'Προσφορές', count: counts.offers },
        ] as const).map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setKind(tab.key)}
            style={[s.filterBtn, kind === tab.key && s.filterBtnActive]}
          >
            <Text style={[s.filterText, kind === tab.key && s.filterTextActive]}>{tab.label}</Text>
            {tab.count > 0 && (
              <View style={[s.filterBadge, kind === tab.key && s.filterBadgeActive]}>
                <Text style={[s.filterBadgeText, kind === tab.key && s.filterBadgeTextActive]}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* Αδιάβαστα toggle */}
        <TouchableOpacity
          onPress={() => setUnreadOnly(v => !v)}
          style={[s.filterBtn, unreadOnly && s.filterBtnUnread]}
        >
          <View style={[s.unreadToggleDot, unreadOnly && s.unreadToggleDotOn]} />
          <Text style={[s.filterText, unreadOnly && s.filterTextUnread]}>Αδιάβαστα</Text>
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      <FlatList
        data={unreadOnly ? messages.filter(m => !m.isRead) : messages}
        keyExtractor={m => m.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadConversations() }}
            tintColor="#F59E0B"
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            {threadLoading
              ? <ActivityIndicator color="#F59E0B" size="large" />
              : <>
                  <Ionicons name="chatbubbles-outline" size={48} color="rgba(255,255,255,0.15)" />
                  <Text style={s.emptyText}>Δεν υπάρχουν μηνύματα</Text>
                </>
            }
          </View>
        }
        renderItem={({ item }) => <MessageCard msg={item} myId={myId} />}
      />

      {/* ── Reply footer ── */}
      {selectedConversation && (
        <View style={s.footer}>
          <TextInput
            style={s.input}
            placeholder="Γράψε απάντηση..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            onPress={sendReply}
            disabled={sending || !text.trim()}
            style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
          >
            {sending
              ? <ActivityIndicator size="small" color="#000" />
              : <Text style={s.sendBtnText}>Απάντηση</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

// ─── Message card ─────────────────────────────────────────────────────────────

function MessageCard({ msg, myId }: { msg: Msg; myId?: string }) {
  const isMine = msg.sender?.id === myId
  const { subject, body } = parseContent(msg.content)
  const displaySubject = subject || msg.subject || msg.category || ''

  return (
    <View style={[s.card, msg.isRead && s.cardRead]}>
      {/* Sender + time */}
      <View style={s.cardHeader}>
        <Text style={[s.senderName, isMine && s.senderMine]} numberOfLines={1}>
          {isMine
            ? (msg.sender?.name || 'Εγώ')
            : `Αποστολέας: ${msg.sender?.name || '—'}`}
        </Text>
        <Text style={s.cardTime}>
          {new Date(msg.createdAt).toLocaleString('el-GR', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Shipment */}
      {msg.shipment && (
        <Text style={s.metaLine} numberOfLines={1}>
          📦 {msg.shipment.title}
          {msg.shipment.originCity ? ` · ${msg.shipment.originCity} → ${msg.shipment.destCity}` : ''}
        </Text>
      )}

      {/* Route */}
      {msg.route && (
        <Text style={s.metaLine} numberOfLines={1}>
          🚛 #{msg.route.routeNumber || msg.route.id?.slice(-6).toUpperCase()}
          {msg.route.originCity ? ` · ${msg.route.originCity} → ${msg.route.destCity}` : ''}
        </Text>
      )}

      {/* Subject */}
      {!!displaySubject && (
        <Text style={s.msgSubject}>{displaySubject}</Text>
      )}

      {/* Body */}
      <Text style={s.msgBody}>{body}</Text>

      {/* Unread dot */}
      {!msg.isRead && (
        <View style={s.unreadRow}>
          <View style={s.unreadDot} />
          <Text style={s.unreadLabel}>Αδιάβαστο</Text>
        </View>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

  // Header
  header: {
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  logo: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  sep:  { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.2)' },
  subtitle: {
    color: 'rgba(255,255,255,0.4)', fontSize: 10,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 10 },
  backBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Shipment chips
  tabsScroll:   { maxHeight: 48 },
  tabsContent:  { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip:         { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' },
  chipActive:   { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  chipText:     { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  chipTextActive: { color: '#000' },

  // Shipment info
  shipInfo:  { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  shipTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  shipRoute: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },

  // Filters
  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterBtnActive: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.35)',
  },
  filterText:         { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  filterTextActive:   { color: '#F59E0B' },
  filterBadge:        { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  filterBadgeActive:  { backgroundColor: '#F59E0B' },
  filterBadgeText:    { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  filterBadgeTextActive: { color: '#000' },
  filterBtnUnread:   { backgroundColor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.35)' },
  filterTextUnread:  { color: '#818CF8' },
  unreadToggleDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  unreadToggleDotOn: { backgroundColor: '#818CF8' },

  // Empty
  empty:     { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.25)', fontSize: 14 },

  // Message card
  card: {
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14, marginBottom: 8,
  },
  cardRead: {
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  senderName:  { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)', flex: 1 },
  senderMine:  { color: '#F59E0B' },
  cardTime:    { fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 8 },
  metaLine:    { fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 3 },
  msgSubject:  { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 5 },
  msgBody:     { fontSize: 14, color: '#fff', lineHeight: 20 },
  unreadRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  unreadDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' },
  unreadLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },

  // Footer
  footer: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#111',
    padding: 12,
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    color: '#fff', fontSize: 14, maxHeight: 100,
  },
  sendBtn:         { backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnDisabled: { backgroundColor: 'rgba(245,158,11,0.25)' },
  sendBtnText:     { color: '#000', fontWeight: '700', fontSize: 13 },
})
