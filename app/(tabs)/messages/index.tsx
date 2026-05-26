import React from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { dashboardApi, Shipment } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Colors } from '@/constants/colors'

type OfferConvo = {
  offerId: string
  shipmentTitle: string
  companyName: string
  messageCount: number
  status: string
}

export default function MessagesListScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-sender-messages'],
    queryFn: () => dashboardApi.getSender().then(r => r.data),
  })

  if (isLoading) return <LoadingScreen message="Φόρτωση μηνυμάτων..." />

  const conversations: OfferConvo[] = []
  const shipments: Shipment[] = [...(data?.shipments ?? []), ...(data?.completedShipments ?? [])]

  for (const s of shipments) {
    for (const offer of (s.offers ?? [])) {
      if ((offer._count?.messages ?? 0) > 0 || offer.status === 'ACCEPTED') {
        conversations.push({
          offerId: offer.id,
          shipmentTitle: s.title,
          companyName: offer.carrier?.carrierProfile?.companyName ?? offer.carrier?.email ?? 'Μεταφορέας',
          messageCount: offer._count?.messages ?? 0,
          status: offer.status,
        })
      }
    }
  }

  return (
    <View className="flex-1 bg-surface">
      <View className="bg-primary pt-14 pb-5 px-5">
        <Text className="text-white text-xl font-bold">Μηνύματα</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={item => item.offerId}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="chatbubbles-outline" size={56} color={Colors.textMuted} />
            <Text className="text-slate-400 mt-4 text-base">Δεν υπάρχουν συνομιλίες</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(tabs)/messages/${item.offerId}`)}>
            <Card className="mb-3">
              <View className="flex-row items-center gap-3">
                <View className="bg-primary/10 rounded-full p-2.5">
                  <Ionicons name="business-outline" size={20} color={Colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-slate-800">{item.companyName}</Text>
                  <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
                    {item.shipmentTitle}
                  </Text>
                </View>
                <View className="items-end">
                  {item.messageCount > 0 && (
                    <View className="bg-primary rounded-full w-6 h-6 items-center justify-center">
                      <Text className="text-white text-xs font-bold">{item.messageCount}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginTop: 4 }} />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}
