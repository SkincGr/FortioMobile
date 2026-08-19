'use client'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
import { useI18n, translateText } from '@/lib/i18n'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Carrier = {
  id?: string
  name?: string | null
  company?: { name?: string } | null
}

type ShipmentInfo = {
  id: string
  title?: string | null
  originCity?: string | null
  destCity?: string | null
  desiredDelivery?: string | null
  status?: string
}

type RouteInfo = {
  id?: string
  routeNumber?: string | null
  originCity?: string | null
  destCity?: string | null
  departureDate?: string | null
  estimatedArrival?: string | null
}

type Msg = {
  id: string
  content: string
  subject?: string | null
  category?: string | null
  isRead: boolean
  createdAt: string
  messageType?: number
  sender?: { id: string; name?: string | null; company?: { name?: string } | null }
  shipment?: ShipmentInfo
  route?: RouteInfo | null
}

type Conversation = {
  id: string
  directShipmentId?: string
  directRouteId?: string
  price?: number
  status?: string
  unreadCount?: number
  carrier?: Carrier
  shipment?: ShipmentInfo
  route?: RouteInfo | null
  messages?: Msg[]
  _count?: { messages: number }
}

type ShipmentGroup = { shipment: ShipmentInfo; conversations: Conversation[] }

const ALL_ID = '__all__'

function isDirect(c: Conversation) { return !!c.directShipmentId }
function isOffer(c: Conversation) { return !c.directShipmentId }

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtDateTime(d?: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleString('el-GR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function parseContent(content: string) {
  const m = content.match(/^\[([^\]]+)\]\s*([\s\S]*)$/)
  if (m) return { subject: m[1].trim(), body: m[2].trim() }
  return { subject: '', body: content }
}

// ─── Main screen ────────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const { user } = useAuth()
  const { t, language, autoTranslate } = useI18n()
  const myId = user?.id
  const { shipmentId: paramShipId, offerId: paramOfferId, routeId: paramRouteId, returnTo } =
    useLocalSearchParams<{ shipmentId?: string; offerId?: string; routeId?: string; returnTo?: string }>()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages]           = useState<Msg[]>([])
  const [selectedShipId, setSelectedShipId] = useState<string>(paramShipId ?? '')
  const [kind, setKind]                   = useState<'messages' | 'offers'>('messages')
  const [unreadOnly, setUnreadOnly]       = useState(false)
  const [loading, setLoading]             = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [refreshing, setRefreshing]       = useState(false)
  const [text, setText]                   = useState('')
  const [subject, setSubject]             = useState('')
  const [sending, setSending]             = useState(false)
  const [replyMsgType, setReplyMsgType]   = useState<number | null>(null)
  const flatListRef                       = useRef<FlatList>(null)
  const subjectRef                        = useRef<TextInput>(null)
  const chipsScrollRef                    = useRef<ScrollView>(null)
  const chipOffsets                       = useRef<Record<string, number>>({})

  // ── Groups ──────────────────────────────────────────────────────────────────

  const groups = useMemo<ShipmentGroup[]>(() => {
    const map = new Map<string, ShipmentGroup>()
    for (const c of conversations) {
      const s = c.shipment
      if (!s?.id) continue
      if (!map.has(s.id)) map.set(s.id, { shipment: s, conversations: [] })
      map.get(s.id)!.conversations.push(c)
    }
    return Array.from(map.values())
  }, [conversations])

  // Auto-select first shipment when groups load and nothing is selected
  useEffect(() => {
    if (groups.length > 0 && !selectedShipId) {
      setSelectedShipId(groups[0].shipment.id)
    }
  }, [groups])

  const selectedGroup = useMemo(() => {
    if (!groups.length) return null
    return groups.find(g => g.shipment.id === selectedShipId) ?? groups[0]
  }, [groups, selectedShipId])

  const visible = useMemo(() => {
    if (!selectedGroup) return []
    return selectedGroup.conversations.filter(kind === 'offers' ? isOffer : isDirect)
  }, [selectedGroup, kind])

  const selectedConv = useMemo(() => {
    if (!visible.length) return null
    if (paramOfferId) {
      const found = visible.find(c => c.id === paramOfferId)
      if (found) return found
    }
    if (paramShipId && paramRouteId) {
      const directId = `direct:${paramShipId}:${paramRouteId}`
      const found = visible.find(c => c.id === directId)
      if (found) return found
    }
    return visible[0]
  }, [visible, paramOfferId, paramShipId, paramRouteId])

  // Counts: total messages (not unread) — matches web
  const counts = useMemo(() => {
    const pool = selectedGroup?.conversations ?? []
    return {
      messages: pool.filter(isDirect).reduce((s, c) => s + (c._count?.messages ?? 0), 0),
      offers:   pool.filter(isOffer).reduce((s, c) => s + (c._count?.messages ?? 0), 0),
      unread:   (kind === 'offers' ? pool.filter(isOffer) : pool.filter(isDirect))
                  .reduce((s, c) => s + (c.unreadCount ?? 0), 0),
    }
  }, [selectedGroup, kind])

  // ── Load conversations ──────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      const listUrl = paramShipId && !paramOfferId && !paramRouteId
        ? `/api/messages?shipmentId=${paramShipId}&list=1`
        : paramRouteId && !paramShipId && !paramOfferId
        ? `/api/messages?routeId=${paramRouteId}`
        : '/api/messages'
      const res = await api.get<Conversation[]>(listUrl)
      let data: Conversation[] = Array.isArray(res.data) ? res.data : []

      // If a specific offerId was requested but not in list, fetch it individually
      if (paramOfferId && !data.some(c => c.id === paramOfferId)) {
        try {
          const r = await api.get<any>(`/api/messages?offerId=${paramOfferId}`)
          const d = r.data
          if (!d.error) {
            data = [{
              id: paramOfferId,
              price: d.price ?? 0,
              status: d.status,
              carrier: d.carrier,
              shipment: d.shipment,
              route: d.route,
              messages: Array.isArray(d.messages) ? d.messages.slice(-1) : [],
              _count: { messages: Array.isArray(d.messages) ? d.messages.length : 0 },
            }, ...data]
          }
        } catch {}
      }

      // If shipmentId+routeId requested, ensure direct conversation is in list
      if (paramShipId && paramRouteId) {
        const directId = `direct:${paramShipId}:${paramRouteId}`
        if (!data.some(c => c.id === directId)) {
          try {
            const r = await api.get<any>(`/api/messages?shipmentId=${paramShipId}&routeId=${paramRouteId}`)
            const d = r.data
            if (!d.error && d.shipment && d.route) {
              data = [{
                id: directId,
                price: 0,
                directShipmentId: paramShipId,
                directRouteId: paramRouteId,
                shipment: d.shipment,
                route: d.route,
                messages: Array.isArray(d.messages) ? d.messages.slice(-1) : [],
                _count: { messages: Array.isArray(d.messages) ? d.messages.length : 0 },
              }, ...data]
            }
          } catch {}
        }
      }

      if (autoTranslate) {
        data = await Promise.all(data.map(async c => {
          const tC: any = { ...c }
          try {
            const [trLast, trMsg, trCond, trShipTitle, trShipOrigin, trShipDest] = await Promise.all([
              tC.lastMessage ? translateText(tC.lastMessage, language) : null,
              tC.message ? translateText(tC.message, language) : null,
              tC.conditions ? translateText(tC.conditions, language) : null,
              tC.shipment?.title ? translateText(tC.shipment.title, language) : null,
              tC.shipment?.originCity ? translateText(tC.shipment.originCity, language) : null,
              tC.shipment?.destCity ? translateText(tC.shipment.destCity, language) : null,
            ])
            if (trLast) tC.lastMessage = trLast
            if (trMsg) tC.message = trMsg
            if (trCond) tC.conditions = trCond
            if (tC.shipment) {
              tC.shipment = { ...tC.shipment }
              if (trShipTitle) tC.shipment.title = trShipTitle
              if (trShipOrigin) tC.shipment.originCity = trShipOrigin
              if (trShipDest) tC.shipment.destCity = trShipDest
            }
          } catch {}
          return tC
        }))
      }

      setConversations(data)

      // Auto-select shipment & kind from params
      if (paramShipId) setSelectedShipId(paramShipId)
      const targetConv = paramOfferId
        ? data.find(c => c.id === paramOfferId)
        : paramShipId && paramRouteId
        ? data.find(c => c.id === `direct:${paramShipId}:${paramRouteId}`)
        : null
      if (targetConv) setKind(isDirect(targetConv) ? 'messages' : 'offers')
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }, [paramShipId, paramOfferId, paramRouteId, autoTranslate, language, myId])

  useEffect(() => { loadConversations() }, [paramShipId, paramOfferId, paramRouteId, autoTranslate, language])

  // Auto-switch kind if current kind has no conversations
  useEffect(() => {
    if (!selectedGroup) return
    const hasKind = selectedGroup.conversations.some(kind === 'offers' ? isOffer : isDirect)
    if (hasKind) return
    if (selectedGroup.conversations.some(isDirect)) setKind('messages')
    else if (selectedGroup.conversations.some(isOffer)) setKind('offers')
  }, [selectedGroup, kind])

  // ── Load threads ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!visible.length) { setMessages([]); return }
    loadThreads(visible)
  }, [visible, unreadOnly, autoTranslate, language])

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
      const flat = results.flat()
        .filter(m => !unreadOnly || !m.isRead)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        
      if (autoTranslate) {
        const translated = await Promise.all(flat.map(async m => {
          try {
            const [trContent, trOrigin, trDest] = await Promise.all([
              translateText(m.content, language),
              m.route?.originCity ? translateText(m.route.originCity, language) : null,
              m.route?.destCity ? translateText(m.route.destCity, language) : null,
            ])
            const trRoute = m.route ? { ...m.route } : null
            if (trRoute && trOrigin) trRoute.originCity = trOrigin
            if (trRoute && trDest) trRoute.destCity = trDest
            return { ...m, content: trContent, route: trRoute }
          } catch {
            return m
          }
        }))
        setMessages(translated)
      } else {
        setMessages(flat)
      }
    } catch {}
    setThreadLoading(false)
  }

  async function refreshAll() {
    setRefreshing(true)
    await loadConversations()
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function toggleRead(msg: Msg) {
    try {
      await api.patch(`/api/messages/${msg.id}`, { isRead: !msg.isRead })
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: !m.isRead } : m))
      setConversations(prev => prev.map(c => ({
        ...c,
        unreadCount: c.unreadCount !== undefined
          ? Math.max(0, c.unreadCount + (msg.isRead ? 1 : -1))
          : c.unreadCount,
      })))
    } catch {}
  }

  function replyTo(msg: Msg) {
    const { subject: s } = parseContent(msg.content)
    setSubject(s ? (s.startsWith('Re: ') ? s : `Re: ${s}`) : '')
    setReplyMsgType((msg as any).messageType ?? null)
    setText(`> ${msg.content}\n\n`)
  }

  function handleNew() {
    setText('')
    setSubject('')
    setReplyMsgType(null)
    setTimeout(() => subjectRef.current?.focus(), 50)
  }

  function handleCancel() {
    setText('')
    setSubject('')
    setReplyMsgType(null)
    subjectRef.current?.blur()
    // scroll chips to show selected shipment
    const x = chipOffsets.current[selectedShipId] ?? 0
    chipsScrollRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true })
  }

  async function sendReply() {
    if (!selectedConv || !text.trim() || sending) return
    setSending(true)
    try {
      const body = selectedConv.directShipmentId
        ? {
            shipmentId: selectedConv.directShipmentId,
            ...(selectedConv.directRouteId && { routeId: selectedConv.directRouteId }),
            content: text.trim(),
            ...(subject.trim() && { subject: subject.trim() }),
            ...(replyMsgType != null && { messageType: replyMsgType }),
          }
        : {
            offerId: selectedConv.id,
            content: text.trim(),
            ...(subject.trim() && { subject: subject.trim() }),
            ...(replyMsgType != null && { messageType: replyMsgType }),
          }
      await api.post('/api/messages', body)
      setText('')
      setSubject('')
      setReplyMsgType(null)
      await loadThreads(visible)
      await loadConversations()
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200)
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.error || t('msg.error.send'))
    }
    setSending(false)
  }

  if (loading) return <LoadingScreen message={t('msg.loading')} />

  const carrierName = (conv: Conversation | null) =>
    conv?.carrier?.company?.name ?? conv?.carrier?.name ?? t('match.carrier_fallback')

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── Header ── */}
      <View style={s.header}>
        {returnTo ? (
          <TouchableOpacity
            onPress={() => router.replace(decodeURIComponent(returnTo) as any)}
            style={s.backBtn} hitSlop={10}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={s.backBtnText}>{t('msg.back')}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={s.logo}>FORTIO</Text>
        )}
        <View style={s.sep} />
        <Text style={s.headerTitle}>{t('msg.title')}</Text>
      </View>

      {/* ── Shipment chips ── */}
      {groups.length > 0 && (
        <ScrollView
          ref={chipsScrollRef}
          horizontal showsHorizontalScrollIndicator={false}
          style={s.chipsScroll} contentContainerStyle={s.chipsContent}
        >
          {groups.map(g => (
            <TouchableOpacity
              key={g.shipment.id}
              onPress={() => setSelectedShipId(g.shipment.id)}
              onLayout={e => { chipOffsets.current[g.shipment.id] = e.nativeEvent.layout.x }}
              style={[s.chip, selectedShipId === g.shipment.id && s.chipActive]}
            >
              <Text style={[s.chipText, selectedShipId === g.shipment.id && s.chipTextActive]} numberOfLines={1}>
                {g.shipment.title || `${g.shipment.originCity} → ${g.shipment.destCity}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Selected shipment info ── */}
      {selectedGroup && selectedGroup.shipment.id !== ALL_ID && (
        <View style={s.shipInfo}>
          <Text style={s.shipTitle} numberOfLines={1}>{selectedGroup.shipment.title}</Text>
          {(selectedGroup.shipment.originCity || selectedGroup.shipment.destCity) && (
            <Text style={s.shipRoute}>
              {selectedGroup.shipment.originCity} → {selectedGroup.shipment.destCity}
            </Text>
          )}
        </View>
      )}

      {/* ── Filters ── */}
      <View style={s.filterRow}>
        {([
          { key: 'messages' as const, label: t('msg.tab_messages'), count: counts.messages },
          { key: 'offers'   as const, label: t('msg.tab_offers'), count: counts.offers },
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

        <TouchableOpacity
          onPress={() => setUnreadOnly(v => !v)}
          style={[s.filterBtn, unreadOnly && s.filterBtnUnread]}
        >
          <View style={[s.unreadDot, unreadOnly && s.unreadDotOn]} />
          <Text style={[s.filterText, unreadOnly && s.filterTextUnread]}>{t('msg.unread_only')}</Text>
          {counts.unread > 0 && (
            <View style={[s.filterBadge, { backgroundColor: 'rgba(99,102,241,0.2)' }]}>
              <Text style={[s.filterBadgeText, { color: '#818CF8' }]}>{counts.unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={m => m.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#F59E0B" />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            {threadLoading
              ? <ActivityIndicator color="#F59E0B" size="large" />
              : <>
                  <Ionicons name="chatbubbles-outline" size={48} color="rgba(255,255,255,0.15)" />
                  <Text style={s.emptyText}>{t('msg.empty')}</Text>
                </>
            }
          </View>
        }
        renderItem={({ item }) => (
          <MessageRow
            msg={item}
            myId={myId}
            carrierName={carrierName(selectedConv)}
            onToggleRead={() => toggleRead(item)}
            onReply={() => replyTo(item)}
            onNew={handleNew}
          />
        )}
      />

      {/* ── Reply footer ── */}
      {selectedConv && (
        <View style={s.footer}>
          <TextInput
            ref={subjectRef}
            style={s.subjectInput}
            placeholder={t('msg.ph.subject')}
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={subject}
            onChangeText={setSubject}
          />
          <View style={s.replyRow}>
            <TextInput
              style={s.input}
              placeholder={t('msg.ph.body')}
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={text}
              onChangeText={setText}
              multiline
            />
            <View style={s.replyBtns}>
              <TouchableOpacity
                onPress={sendReply}
                disabled={sending || !text.trim()}
                style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
              >
                {sending
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={s.sendBtnText}>{t('msg.btn.reply')}</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCancel} style={[s.sendBtn, s.cancelBtn]}>
                <Text style={s.sendBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

// ─── Message row ──────────────────────────────────────────────────────────────

function MessageRow({ msg, myId, carrierName, onToggleRead, onReply, onNew }: {
  msg: Msg
  myId?: string
  carrierName: string
  onToggleRead: () => void
  onReply: () => void
  onNew: () => void
}) {
  const { t } = useI18n()
  const isOutgoing = msg.sender?.id === myId
  const { subject, body } = parseContent(msg.content)
  const displaySubject = subject || msg.subject || msg.category || ''
  const senderName = msg.sender?.company?.name ?? msg.sender?.name ?? '—'

  const routeNum = msg.route?.routeNumber || (msg.route?.id ? msg.route.id.slice(-8).toUpperCase() : null)
  const routeOrigin = msg.route?.originCity?.split(' / ')[0]
  const routeDest   = msg.route?.destCity?.split(' / ')[0]

  return (
    <View style={[s.card, msg.isRead && s.cardRead]}>
      {/* Row 1: sender direction + timestamp + read badge */}
      <View style={[s.cardHeader]}>
        <View style={s.senderRow}>
          {isOutgoing ? (
            <>
              <Text style={s.dirLabel}>{t('msg.to')} </Text>
              <Text style={[s.senderName, s.senderOut]}>{carrierName}</Text>
              <View style={[s.dirDiamond, { backgroundColor: '#60A5FA' }]} />
            </>
          ) : (
            <>
              <Text style={s.dirLabel}>{t('msg.from')} </Text>
              <Text style={[s.senderName, s.senderIn]}>{senderName}</Text>
              <View style={[s.dirDiamond, { backgroundColor: '#4ADE80' }]} />
            </>
          )}
          <Text style={s.cardTime}>{fmtDateTime(msg.createdAt)}</Text>
        </View>
        <View style={[s.readBadge, msg.isRead ? s.readBadgeRead : s.readBadgeUnread]}>
          <Text style={[s.readBadgeText, msg.isRead ? s.readBadgeReadText : s.readBadgeUnreadText]}>
            {msg.isRead ? t('msg.read') : t('msg.unread')}
          </Text>
        </View>
      </View>

      {/* Row 2: route info */}
      {routeNum && (
        <Text style={s.routeLine} numberOfLines={1}>
          <Text style={s.routeNumText}>#{routeNum}</Text>
          {(routeOrigin || routeDest) && (
            <Text style={s.routeMeta}>
              {'  ·  '}
              {routeOrigin ?? '—'}{msg.route?.departureDate ? ` (${fmtDate(msg.route.departureDate)})` : ''}
              {' → '}
              {routeDest ?? '—'}{msg.route?.estimatedArrival ? ` (${fmtDate(msg.route.estimatedArrival)})` : ''}
            </Text>
          )}
        </Text>
      )}

      {/* Row 3: subject */}
      {!!displaySubject && (
        <Text style={s.msgSubject}>{displaySubject}</Text>
      )}

      {/* Row 4: body */}
      <Text style={s.msgBody}>{body}</Text>

      {/* Row 5: actions */}
      <View style={s.actionsRow}>
        {!isOutgoing && (
          <TouchableOpacity onPress={onToggleRead} style={s.actionBtn}>
            <Text style={s.actionBtnText}>{msg.isRead ? t('msg.read') : t('msg.mark_read')}</Text>
          </TouchableOpacity>
        )}
        {!isOutgoing && (
          <TouchableOpacity onPress={onReply} style={s.actionBtn}>
            <Text style={s.actionBtnText}>{t('msg.btn.reply')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onNew} style={s.actionBtn}>
          <Text style={s.actionBtnText}>{t('msg.btn.new')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

  // Header
  header: {
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  logo:        { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  sep:         { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.2)' },
  headerTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Chips
  chipsScroll:   { maxHeight: 48, flexShrink: 0 },
  chipsContent:  { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip:          { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' },
  chipActive:    { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  chipText:      { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  chipTextActive:{ color: '#000' },

  // Shipment info
  shipInfo:  { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  shipTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 8 },
  shipRoute: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },

  // Filters
  filterRow: {
    flexDirection: 'row', gap: 8, flexWrap: 'wrap',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  filterBtn:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' },
  filterBtnActive:     { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.35)' },
  filterText:          { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  filterTextActive:    { color: '#F59E0B' },
  filterBadge:         { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  filterBadgeActive:   { backgroundColor: '#F59E0B' },
  filterBadgeText:     { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  filterBadgeTextActive:{ color: '#000' },
  filterBtnUnread:     { backgroundColor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.35)' },
  filterTextUnread:    { color: '#818CF8' },
  unreadDot:           { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  unreadDotOn:         { backgroundColor: '#818CF8' },

  // Empty
  empty:     { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.25)', fontSize: 14 },

  // Message card — matches web MessageRow
  card: {
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14, marginBottom: 8,
  },
  cardRead: { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.015)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  senderRow:  { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1, flexWrap: 'wrap' },
  dirLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  senderName: { fontSize: 12, fontWeight: '700' },
  senderOut:  { color: '#60A5FA' },
  senderIn:   { color: '#4ADE80' },
  dirDiamond: { width: 5, height: 5, transform: [{ rotate: '45deg' }] },
  cardTime:   { fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 4 },
  readBadge:  { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  readBadgeRead:     { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.25)' },
  readBadgeUnread:   { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)' },
  readBadgeText:     { fontSize: 10, fontWeight: '700' },
  readBadgeReadText: { color: '#4ADE80' },
  readBadgeUnreadText:{ color: '#F59E0B' },

  // Route line
  routeLine:    { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
  routeNumText: { fontFamily: 'monospace', fontWeight: '700', color: '#fff' },
  routeMeta:    { color: 'rgba(255,255,255,0.4)' },

  // Message content
  msgSubject: { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 5 },
  msgBody:    { fontSize: 14, color: '#fff', lineHeight: 20 },

  // Action buttons (per message)
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  actionBtn:     { backgroundColor: '#F59E0B', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#000' },

  // Reply footer
  footer: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#111', padding: 12, gap: 8,
  },
  subjectInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    color: '#fff', fontSize: 13,
  },
  replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    color: '#fff', fontSize: 14, maxHeight: 100,
  },
  replyBtns:       { gap: 6 },
  sendBtn:         { backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: 'rgba(245,158,11,0.25)' },
  cancelBtn:       { backgroundColor: '#F59E0B' },
  sendBtnText:     { color: '#000', fontWeight: '700', fontSize: 12 },
})
