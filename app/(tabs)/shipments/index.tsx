import React from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { dashboardApi, Shipment } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { ShipmentStatusBadge } from '@/components/ShipmentStatusBadge'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Colors } from '@/constants/colors'

export default function ShipmentsListScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sender-shipments'],
    queryFn: () => dashboardApi.getSender().then(r => r.data),
  })

  const shipments: Shipment[] = [
    ...(data?.shipments ?? []),
    ...(data?.completedShipments ?? []),
  ]

  if (isLoading) return <LoadingScreen message="Φόρτωση αποστολών..." />

  return (
    <View className="flex-1 bg-surface">
      <View className="bg-primary pt-14 pb-4 px-5">
        <View className="flex-row justify-between items-center">
          <Text className="text-white text-xl font-bold">Αποστολές</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/shipments/new')}
            className="bg-white/20 rounded-xl px-3 py-2 flex-row items-center gap-1"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-white text-sm font-semibold">Νέα</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={shipments}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="cube-outline" size={56} color={Colors.textMuted} />
            <Text className="text-slate-400 mt-4 text-base">Δεν έχεις αποστολές</Text>
            <TouchableOpacity
              className="mt-4 bg-primary px-6 py-3 rounded-xl"
              onPress={() => router.push('/(tabs)/shipments/new')}
            >
              <Text className="text-white font-semibold">Δημιούργησε Αποστολή</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(tabs)/shipments/${item.id}`)}>
            <Card className="mb-3">
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-base font-bold text-slate-800 flex-1 mr-2" numberOfLines={1}>
                  {item.title}
                </Text>
                <ShipmentStatusBadge status={item.status} />
              </View>
              <View className="flex-row items-center gap-1 mb-3">
                <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                <Text className="text-slate-500 text-sm">
                  {item.originCity} → {item.destCity}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString('el-GR')}
                </Text>
                <View className="flex-row gap-3">
                  {(item._count?.offers ?? 0) > 0 && (
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="pricetag-outline" size={12} color={Colors.accent} />
                      <Text className="text-xs text-amber-600 font-semibold">{item._count!.offers}</Text>
                    </View>
                  )}
                  {item.maxBudget && (
                    <Text className="text-xs text-green-600 font-semibold">€{item.maxBudget}</Text>
                  )}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}
