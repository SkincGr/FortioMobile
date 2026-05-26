import React from 'react'
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity
} from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { dashboardApi, Shipment } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { ShipmentStatusBadge } from '@/components/ShipmentStatusBadge'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Colors } from '@/constants/colors'

function ShipmentCard({ item }: { item: Shipment }) {
  return (
    <TouchableOpacity onPress={() => router.push(`/(tabs)/shipments/${item.id}`)}>
      <Card className="mb-3">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-base font-bold text-slate-800 flex-1 mr-2" numberOfLines={1}>
            {item.title}
          </Text>
          <ShipmentStatusBadge status={item.status} />
        </View>
        <View className="flex-row items-center gap-1 mb-2">
          <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
          <Text className="text-slate-500 text-sm flex-1" numberOfLines={1}>
            {item.originCity} → {item.destCity}
          </Text>
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-xs text-slate-400">
            {new Date(item.createdAt).toLocaleDateString('el-GR')}
          </Text>
          {(item._count?.offers ?? 0) > 0 && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="pricetag-outline" size={12} color={Colors.accent} />
              <Text className="text-xs font-semibold text-amber-600">
                {item._count!.offers} προσφορές
              </Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  )
}

export default function DashboardScreen() {
  const { user } = useAuth()
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-sender'],
    queryFn: () => dashboardApi.getSender().then(r => r.data),
  })

  if (isLoading) return <LoadingScreen message="Φόρτωση dashboard..." />

  const activeShipments: Shipment[] = data?.shipments ?? []
  const completedShipments: Shipment[] = data?.completedShipments ?? []

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="bg-primary pt-14 pb-6 px-5">
        <Text className="text-blue-200 text-sm">Καλωσόρισες,</Text>
        <Text className="text-white text-2xl font-bold">{user?.name ?? 'Αποστολέας'}</Text>
        {data?.announcementCount > 0 && (
          <View className="mt-3 bg-amber-500 rounded-xl px-3 py-2 flex-row items-center gap-2 self-start">
            <Ionicons name="megaphone-outline" size={14} color="#fff" />
            <Text className="text-white text-xs font-semibold">
              {data.announcementCount} ενεργές ανακοινώσεις
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {/* Stats row */}
        <View className="flex-row gap-3 mb-5">
          <Card className="flex-1 items-center py-3">
            <Text className="text-3xl font-black text-primary">{activeShipments.length}</Text>
            <Text className="text-xs text-slate-500 mt-1">Ενεργές</Text>
          </Card>
          <Card className="flex-1 items-center py-3">
            <Text className="text-3xl font-black text-amber-500">
              {activeShipments.filter(s => (s._count?.offers ?? 0) > 0).length}
            </Text>
            <Text className="text-xs text-slate-500 mt-1">Έχουν Προσφορές</Text>
          </Card>
          <Card className="flex-1 items-center py-3">
            <Text className="text-3xl font-black text-green-500">{completedShipments.length}</Text>
            <Text className="text-xs text-slate-500 mt-1">Ολοκλήρωσαν</Text>
          </Card>
        </View>

        {/* New Shipment Button */}
        <TouchableOpacity
          className="bg-primary rounded-2xl p-4 flex-row items-center justify-center gap-3 mb-5"
          onPress={() => router.push('/(tabs)/shipments/new')}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={22} color="#fff" />
          <Text className="text-white font-bold text-base">Νέα Αποστολή</Text>
        </TouchableOpacity>

        {/* Active shipments */}
        <Text className="text-lg font-bold text-slate-800 mb-3">Ενεργές Αποστολές</Text>
        {activeShipments.length === 0 ? (
          <Card className="items-center py-8 mb-4">
            <Ionicons name="cube-outline" size={40} color={Colors.textMuted} />
            <Text className="text-slate-400 mt-3">Δεν έχεις ενεργές αποστολές</Text>
          </Card>
        ) : (
          activeShipments.map(s => <ShipmentCard key={s.id} item={s} />)
        )}

        {/* Recent completed */}
        {completedShipments.length > 0 && (
          <>
            <Text className="text-lg font-bold text-slate-800 mb-3 mt-2">Πρόσφατα Ολοκληρωμένες</Text>
            {completedShipments.map(s => <ShipmentCard key={s.id} item={s} />)}
          </>
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  )
}
