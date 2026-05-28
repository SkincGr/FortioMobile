import React, { useMemo } from 'react'
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { announcementsApi, Announcement } from '@/lib/api'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { useTheme } from '@/lib/theme'

const VEHICLE_ICONS: Record<string, string> = {
  TRUCK: '🚛', VAN: '🚐', MOTORCYCLE: '🛵', OTHER: '🚗',
}

function AnnouncementCard({ item }: { item: Announcement }) {
  const { colors } = useTheme()
  const s = useMemo(() => cardStyles(colors), [colors])
  const icon   = VEHICLE_ICONS[item.carrier?.carrierProfile?.vehicleType ?? 'OTHER'] ?? '🚛'
  const rating = item.carrier?.carrierProfile?.rating

  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.icon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.carrier}>{item.carrier?.name ?? '—'}</Text>
          {rating != null && (
            <View style={s.ratingRow}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={s.rating}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={s.title}>{item.title}</Text>
      <Text style={s.body}>{item.body}</Text>
      {item.ctaText && (
        <View style={s.cta}><Text style={s.ctaText}>{item.ctaText}</Text></View>
      )}
    </View>
  )
}

export default function AnnouncementsScreen() {
  const { colors } = useTheme()
  const s = useMemo(() => screenStyles(colors), [colors])

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => announcementsApi.list().then(r => r.data),
    staleTime: 60_000,
  })

  if (isLoading) return <LoadingScreen message="Φόρτωση ανακοινώσεων..." />

  const announcements: Announcement[] = data ?? []

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Ανακοινώσεις</Text>
        {announcements.length > 0 && (
          <View style={s.countBadge}><Text style={s.countText}>{announcements.length}</Text></View>
        )}
      </View>

      <FlatList
        data={announcements}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="megaphone-outline" size={56} color={colors.textMuted} />
            <Text style={s.emptyText}>Δεν υπάρχουν ανακοινώσεις</Text>
          </View>
        }
        renderItem={({ item }) => <AnnouncementCard item={item} />}
      />
    </View>
  )
}

function screenStyles(c: any) {
  return StyleSheet.create({
    header: { backgroundColor: c.headerBg, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
    countBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    countText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 15, color: c.textMuted, marginTop: 12 },
  })
}

function cardStyles(c: any) {
  return StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    icon: { fontSize: 22, width: 28, textAlign: 'center' },
    carrier: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    rating: { fontSize: 12, color: '#92400E', fontWeight: '600' },
    title: { fontSize: 16, fontWeight: '800', color: c.textPrimary, marginBottom: 6 },
    body: { fontSize: 14, color: c.textSecondary, lineHeight: 20 },
    cta: { marginTop: 12, backgroundColor: c.isDark ? '#1E1500' : '#FFFBEB', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FDE68A' },
    ctaText: { fontSize: 13, color: '#92400E', fontWeight: '600' },
  })
}
