import React from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { notificationsApi, Notification } from '@/lib/api'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Theme, useStyles, useTheme } from '@/lib/theme'

type IconColor = 'accent' | 'blue' | 'green' | 'muted'
const TYPE_ICONS: Record<string, { icon: string; color: IconColor }> = {
  OFFER:     { icon: 'pricetag-outline',         color: 'accent' },
  MESSAGE:   { icon: 'chatbubble-outline',        color: 'blue' },
  ACCEPTED:  { icon: 'checkmark-circle-outline',  color: 'green' },
  DELIVERED: { icon: 'cube-outline',              color: 'green' },
  DEFAULT:   { icon: 'notifications-outline',     color: 'muted' },
}

export default function NotificationsScreen() {
  const th = useTheme()
  const s = useStyles(makeStyles)

  const qc = useQueryClient()
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then(r => r.data),
  })

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  if (isLoading) return <LoadingScreen message="Φόρτωση ειδοποιήσεων..." />

  const notifications: Notification[] = data ?? []
  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Ειδοποιήσεις</Text>
        {unreadCount > 0 && (
          <View style={s.unreadBadge}>
            <Text style={s.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch() }} tintColor={th.accentText} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={56} color={th.inkText(0.2)} />
            <Text style={s.emptyText}>Δεν υπάρχουν ειδοποιήσεις</Text>
          </View>
        }
        renderItem={({ item }) => {
          const { icon, color: colorKey } = TYPE_ICONS[item.type] ?? TYPE_ICONS.DEFAULT
          const color = { accent: th.accentText, blue: th.soft('blue'), green: th.soft('green'), muted: th.inkText(0.4) }[colorKey]
          return (
            <TouchableOpacity
              onPress={() => !item.isRead && markReadMut.mutate(item.id)}
              style={[s.card, !item.isRead && s.cardUnread]}
              activeOpacity={0.7}
            >
              <View style={[s.iconWrap, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon as any} size={18} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.message, !item.isRead && s.messageUnread]}>
                  {item.message}
                </Text>
                <Text style={s.time}>
                  {new Date(item.createdAt).toLocaleString('el-GR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              {!item.isRead && <View style={s.dot} />}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.page },

  header: {
    backgroundColor: t.page,
    borderBottomWidth: 1, borderBottomColor: t.ink(0.1),
    paddingTop: 56, paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  headerTitle:  { color: t.inkSolid, fontSize: 22, fontWeight: '800' },
  unreadBadge:  { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  unreadBadgeText: { color: t.inkSolid, fontSize: 12, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: t.inkText(0.3), marginTop: 12 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: t.ink(0.03),
    borderRadius: 12, borderWidth: 1, borderColor: t.ink(0.08),
    padding: 14, marginBottom: 8,
  },
  cardUnread:    { backgroundColor: 'rgba(96,165,250,0.06)', borderColor: 'rgba(96,165,250,0.2)' },
  iconWrap:      { borderRadius: 10, padding: 8, marginTop: 1 },
  message:       { fontSize: 13, color: t.inkText(0.6), lineHeight: 18 },
  messageUnread: { color: t.inkSolid, fontWeight: '600' },
  time:          { fontSize: 11, color: t.inkText(0.3), marginTop: 4 },
  dot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: '#60A5FA', marginTop: 4 },
})
