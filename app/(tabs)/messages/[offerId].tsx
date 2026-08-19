import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, StyleSheet,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { useI18n, translateText } from '@/lib/i18n'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Msg = {
  id: string
  content: string
  subject?: string | null
  category?: string | null
  isRead: boolean
  createdAt: string
  messageType?: number
  sender?: { id: string; name?: string | null; company?: { name?: string } | null }
  shipment?: { id: string; title?: string | null; originCity?: string | null; destCity?: string | null } | null
  route?: { id?: string; routeNumber?: string | null; originCity?: string | null; destCity?: string | null; departureDate?: string | null; estimatedArrival?: string | null } | null
}

type ThreadData = {
  messages: Msg[]
  status?: string | null
  price?: number | null
  carrier?: { name?: string | null; company?: { name?: string } | null } | null
  shipment?: { id: string; title?: string | null; originCity?: string | null; destCity?: string | null } | null
  route?: { id?: string; routeNumber?: string | null; originCity?: string | null; destCity?: string | null; departureDate?: string | null; estimatedArrival?: string | null } | null
}

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

// ─── Chat screen ────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { offerId, returnTo } = useLocalSearchParams<{ offerId: string; returnTo?: string }>()
  const { user } = useAuth()
  const { t, language, autoTranslate } = useI18n()
  const myId = user?.id
  const flatListRef = useRef<FlatList>(null)

  const [data, setData]       = useState<ThreadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [text, setText]       = useState('')
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)
  const [replyMsgType, setReplyMsgType] = useState<number | null>(null)
  const subjectRef            = useRef<TextInput>(null)

  async function loadThread() {
    try {
      const r = await api.get<ThreadData>(`/api/messages?offerId=${offerId}`)
      let d = r.data
      if (autoTranslate && d.messages) {
        const translatedMessages = await Promise.all(d.messages.map(async m => {
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
        d = { ...d, messages: translatedMessages }
        
        if (d.shipment) {
          const [trTitle, trOrigin, trDest] = await Promise.all([
            d.shipment.title ? translateText(d.shipment.title, language) : null,
            d.shipment.originCity ? translateText(d.shipment.originCity, language) : null,
            d.shipment.destCity ? translateText(d.shipment.destCity, language) : null,
          ])
          if (trTitle) d.shipment.title = trTitle
          if (trOrigin) d.shipment.originCity = trOrigin
          if (trDest) d.shipment.destCity = trDest
        }
      }
      setData(d)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadThread() }, [offerId, autoTranslate, language])

  useEffect(() => {
    if ((data?.messages?.length ?? 0) > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [data?.messages?.length])

  async function toggleRead(msg: Msg) {
    try {
      await api.patch(`/api/messages/${msg.id}`, { isRead: !msg.isRead })
      setData(prev => prev ? {
        ...prev,
        messages: prev.messages.map(m => m.id === msg.id ? { ...m, isRead: !m.isRead } : m),
      } : prev)
    } catch {}
  }

  function replyTo(msg: Msg) {
    const { subject: s } = parseContent(msg.content)
    setSubject(s ? (s.startsWith('Re: ') ? s : `Re: ${s}`) : '')
    setReplyMsgType((msg as any).messageType ?? null)
    setText(`> ${msg.content}\n\n`)
  }

  async function sendReply() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await api.post('/api/messages', {
        offerId,
        content: text.trim(),
        ...(subject.trim() && { subject: subject.trim() }),
        ...(replyMsgType != null && { messageType: replyMsgType }),
      })
      setText('')
      setSubject('')
      setReplyMsgType(null)
      await loadThread()
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200)
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.error || t('msg.error.send'))
    }
    setSending(false)
  }

  if (loading) return <LoadingScreen message={t('msg.loading')} />

  const messages = data?.messages ?? []
  const thread = data
  const carrierLabel = thread?.carrier?.company?.name ?? thread?.carrier?.name ?? t('match.carrier_fallback')
  const route = thread?.route
  const routeNum = route?.routeNumber || (route?.id ? route.id.slice(-8).toUpperCase() : null)

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => returnTo ? router.replace(decodeURIComponent(returnTo) as any) : router.back()}
          style={s.backBtn} hitSlop={10}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={s.backBtnText}>{t('msg.back')}</Text>
        </TouchableOpacity>
        <View style={s.sep} />
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {thread?.shipment?.title ?? t('msg.tab_messages')}
          </Text>
          {routeNum && (
            <Text style={s.headerSub} numberOfLines={1}>
              🚛 {carrierLabel}  ·  #{routeNum}
              {route?.originCity ? `  ·  ${route.originCity.split(' / ')[0]} → ${route.destCity?.split(' / ')[0] ?? '—'}` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* ── Messages ── */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={m => m.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 8 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={s.emptyText}>{t('msg.empty')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <MessageRow
            msg={item}
            myId={myId}
            carrierName={carrierLabel}
            route={route}
            onToggleRead={() => toggleRead(item)}
            onReply={() => replyTo(item)}
            onNew={() => { setText(''); setSubject(''); setReplyMsgType(null); setTimeout(() => subjectRef.current?.focus(), 50) }}
          />
        )}
      />

      {/* ── Reply footer ── */}
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
            <TouchableOpacity
              onPress={() => { setText(''); setSubject(''); setReplyMsgType(null); subjectRef.current?.blur() }}
              style={[s.sendBtn, s.cancelBtn]}
            >
              <Text style={s.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Message row ─────────────────────────────────────────────────────────────

function MessageRow({ msg, myId, carrierName, route, onToggleRead, onReply, onNew }: {
  msg: Msg
  myId?: string
  carrierName: string
  route?: ThreadData['route']
  onToggleRead: () => void
  onReply: () => void
  onNew: () => void
}) {
  const { t } = useI18n()
  const isOutgoing = msg.sender?.id === myId
  const { subject, body } = parseContent(msg.content)
  const displaySubject = subject || msg.subject || msg.category || ''
  const senderName = msg.sender?.company?.name ?? msg.sender?.name ?? '—'
  const r = msg.route ?? route
  const routeNum = r?.routeNumber || (r?.id ? r.id.slice(-8).toUpperCase() : null)

  return (
    <View style={[s.card, msg.isRead && s.cardRead]}>
      {/* Row 1: direction + timestamp + read badge */}
      <View style={s.cardHeader}>
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
          {(r?.originCity || r?.destCity) && (
            <Text style={s.routeMeta}>
              {'  ·  '}
              {r.originCity?.split(' / ')[0] ?? '—'}{r.departureDate ? ` (${fmtDate(r.departureDate)})` : ''}
              {' → '}
              {r.destCity?.split(' / ')[0] ?? '—'}{r.estimatedArrival ? ` (${fmtDate(r.estimatedArrival)})` : ''}
            </Text>
          )}
        </Text>
      )}

      {/* Subject */}
      {!!displaySubject && <Text style={s.msgSubject}>{displaySubject}</Text>}

      {/* Body */}
      <Text style={s.msgBody}>{body}</Text>

      {/* Actions */}
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

  header: {
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText:  { color: '#fff', fontSize: 14, fontWeight: '600' },
  sep:          { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.2)' },
  headerTitle:  { color: '#fff', fontSize: 14, fontWeight: '800' },
  headerSub:    { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.25)', fontSize: 14 },

  card: {
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14, marginBottom: 8,
  },
  cardRead: { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.015)' },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  senderRow:   { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1, flexWrap: 'wrap' },
  dirLabel:    { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  senderName:  { fontSize: 12, fontWeight: '700' },
  senderOut:   { color: '#60A5FA' },
  senderIn:    { color: '#4ADE80' },
  dirDiamond:  { width: 5, height: 5, transform: [{ rotate: '45deg' }] },
  cardTime:    { fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 4 },
  readBadge:   { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  readBadgeRead:      { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.25)' },
  readBadgeUnread:    { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)' },
  readBadgeText:      { fontSize: 10, fontWeight: '700' },
  readBadgeReadText:  { color: '#4ADE80' },
  readBadgeUnreadText:{ color: '#F59E0B' },

  routeLine:    { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
  routeNumText: { fontFamily: 'monospace', fontWeight: '700', color: '#fff' },
  routeMeta:    { color: 'rgba(255,255,255,0.4)' },

  msgSubject: { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 5 },
  msgBody:    { fontSize: 14, color: '#fff', lineHeight: 20 },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  actionBtn:     { backgroundColor: '#F59E0B', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#000' },

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
  replyRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
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
  sendBtnText:     { color: '#000', fontWeight: '700', fontSize: 12 },
  cancelBtn:       { backgroundColor: 'rgba(255,255,255,0.08)' },
  cancelBtnText:   { color: '#fff', fontWeight: '600', fontSize: 12 },
})
