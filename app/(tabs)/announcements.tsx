import React from 'react'
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { announcementsApi, Announcement } from '@/lib/api'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Colors } from '@/constants/colors'

const VEHICLE_ICONS: Record<string, string> = {
  TRUCK: '🚛', VAN: '🚐', MOTORCYCLE: '🛵', OTHER: '🚗',
}

function AnnouncementCard({ item }: { item: Announcement }) {
  const vehicleType = item.carrier?.carrierProfile?.vehicleType ?? 'OTHER'
  const icon = VEHICLE_ICONS[vehicleType] ?? '🚛'
  const rating = item.carrier?.carrierProfile?.rating

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.carrier}>{item.carrier?.name ?? '—'}</Text>
          {rating != null && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={styles.rating}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>

      {item.ctaText && (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{item.ctaText}</Text>
        </View>
      )}
    </View>
  )
}

export default function AnnouncementsScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => announcementsApi.list().then(r => r.data),
    staleTime: 60_000,
  })

  if (isLoading) return <LoadingScreen message="Φόρτωση ανακοινώσεων..." />

  const announcements: Announcement[] = data ?? []

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ανακοινώσεις</Text>
        {announcements.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{announcements.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={announcements}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="megaphone-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Δεν υπάρχουν ανακοινώσεις</Text>
          </View>
        }
        renderItem={({ item }) => <AnnouncementCard item={item} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2,
  },
  countText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  icon:    { fontSize: 22, width: 28, textAlign: 'center' },
  carrier: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  rating:  { fontSize: 12, color: '#92400E', fontWeight: '600' },
  title:   { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  body:    { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  cta: {
    marginTop: 12, backgroundColor: '#FFFBEB',
    borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  ctaText: { fontSize: 13, color: '#92400E', fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: Colors.textMuted, marginTop: 12 },
})
