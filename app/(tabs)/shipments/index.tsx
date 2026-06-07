import React from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { dashboardApi, Shipment } from '@/lib/api'
import { useI18n, translateText } from '@/lib/i18n'
import { ShipmentStatusBadge } from '@/components/ShipmentStatusBadge'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

const CATEGORY_ICON: Record<string, string> = {
  FURNITURE: '🛋️', HOUSE_MOVE: '🏠', SMALL_PACKAGE: '📦', COURIER: '🛵',
  ELECTRONICS: '💻', VEHICLE: '🚗', MACHINERY: '⚙️', BOAT: '⛵',
  FOOD: '🥩', HAZARDOUS: '⚠️', OTHER: '🗃️',
}

function fCity(raw?: string | null) {
  if (!raw) return '—'
  return raw.split(' / ')[0]
}

export default function ShipmentsListScreen() {
  const { t, autoTranslate, language } = useI18n()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sender-shipments', language, autoTranslate],
    queryFn: async () => {
      const r = await dashboardApi.getSender()
      let result = r.data
      
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
          } catch {}
          return ts
        }))
      }
      return result
    },
  })

  const shipments: Shipment[] = [
    ...(data?.shipments ?? []),
    ...(data?.completedShipments ?? []),
  ]

  if (isLoading) return <LoadingScreen message={t('ship.list.loading')} />

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('ship.list.title')}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/shipments/new')} style={s.newBtn}>
          <Ionicons name="add" size={18} color="#000" />
          <Text style={s.newBtnText}>{t('ship.list.new')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={shipments}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#F59E0B" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={56} color="rgba(255,255,255,0.2)" />
            <Text style={s.emptyText}>{t('ship.list.empty')}</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(tabs)/shipments/new')}>
              <Text style={s.emptyBtnText}>{t('ship.list.create')}</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => router.push(`/(tabs)/shipments/${item.id}`)}>
            <View style={[s.row, { justifyContent: 'space-between', marginBottom: 6 }]}>
              <View style={s.row}>
                <Text style={s.catIcon}>{CATEGORY_ICON[item.category] ?? '📦'}</Text>
                <Text style={s.title} numberOfLines={1}>{item.title}</Text>
              </View>
              <ShipmentStatusBadge status={item.status} />
            </View>
            <View style={[s.row, { marginBottom: 10, marginLeft: 28 }]}>
              <Ionicons name="navigate-outline" size={13} color="rgba(255,255,255,0.4)" />
              <Text style={s.route} numberOfLines={1}>
                {fCity(item.originCity)} → {fCity(item.destCity)}
              </Text>
            </View>
            <View style={[s.row, { justifyContent: 'space-between', marginLeft: 28 }]}>
              <Text style={s.date}>{new Date(item.createdAt).toLocaleDateString('el-GR')}</Text>
              <View style={s.row}>
                {(item._count?.offers ?? 0) > 0 && (
                  <View style={s.offerChip}>
                    <Ionicons name="pricetag-outline" size={11} color="#F59E0B" />
                    <Text style={s.offerChipText}>{item._count!.offers}</Text>
                  </View>
                )}
                {item.maxBudget && (
                  <Text style={s.budget}>€{item.maxBudget}</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
  },
  newBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 14, marginBottom: 10,
  },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  title:   { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
  route:   { fontSize: 12, color: 'rgba(255,255,255,0.4)', flex: 1 },
  date:    { fontSize: 11, color: 'rgba(255,255,255,0.3)' },

  offerChip:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  offerChipText: { fontSize: 11, color: '#F59E0B', fontWeight: '700' },
  budget:        { fontSize: 12, color: '#4ADE80', fontWeight: '700', marginLeft: 8 },

  empty:       { alignItems: 'center', paddingTop: 60 },
  emptyText:   { color: 'rgba(255,255,255,0.3)', fontSize: 15, marginTop: 12, marginBottom: 16 },
  emptyBtn:    { backgroundColor: '#F59E0B', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  emptyBtnText:{ color: '#000', fontWeight: '700', fontSize: 14 },
})
