import React from 'react'
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { announcementsApi, Announcement } from '@/lib/api'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function AnnouncementsScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => announcementsApi.list().then(r => r.data),
    staleTime: 60_000,
  })

  if (isLoading) return <LoadingScreen message="Φόρτωση ανακοινώσεων..." />

  const announcements: Announcement[] = data ?? []

  return (
    <View style={s.root}>
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
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#F59E0B" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="megaphone-outline" size={56} color="rgba(255,255,255,0.2)" />
            <Text style={s.emptyText}>Δεν υπάρχουν ανακοινώσεις</Text>
          </View>
        }
        renderItem={({ item }) => <AnnouncementCard item={item} />}
      />
    </View>
  )
}

function AnnouncementCard({ item }: { item: Announcement }) {
  const rating = item.carrier?.company?.rating
  return (
    <View style={s.card}>
      <View style={s.cardRow}>
        <Text style={s.icon}>🚛</Text>
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
        <View style={s.cta}>
          <Text style={s.ctaText}>{item.ctaText}</Text>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 56, paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  countBadge:  { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  countText:   { color: '#F59E0B', fontSize: 13, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.3)', marginTop: 12 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 16, marginBottom: 12,
  },
  cardRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  icon:      { fontSize: 22, width: 28, textAlign: 'center' },
  carrier:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  rating:    { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  title:     { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 6 },
  body:      { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },
  cta:       { marginTop: 12, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  ctaText:   { fontSize: 13, color: '#F59E0B', fontWeight: '600' },
})
