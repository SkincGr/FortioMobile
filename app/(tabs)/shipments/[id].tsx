import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { shipmentsApi, offersApi, Offer } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { ShipmentStatusBadge } from '@/components/ShipmentStatusBadge'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Colors } from '@/constants/colors'

function OfferCard({ offer, shipmentId }: { offer: Offer; shipmentId: string }) {
  const qc = useQueryClient()

  const acceptMut = useMutation({
    mutationFn: () => offersApi.accept(offer.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipment', shipmentId] })
      qc.invalidateQueries({ queryKey: ['dashboard-sender'] })
    },
    onError: () => Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η αποδοχή'),
  })

  const rejectMut = useMutation({
    mutationFn: () => offersApi.reject(offer.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipment', shipmentId] }),
    onError: () => Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η απόρριψη'),
  })

  const statusColors: Record<string, string> = {
    PENDING: 'text-amber-600', ACCEPTED: 'text-green-600',
    REJECTED: 'text-red-500', WITHDRAWN: 'text-slate-400',
  }

  function confirmAccept() {
    Alert.alert(
      'Αποδοχή Προσφοράς',
      `Αποδέχεσαι την προσφορά από ${offer.carrier?.carrierProfile?.companyName ?? offer.carrier?.email}?`,
      [
        { text: 'Ακύρωση', style: 'cancel' },
        { text: 'Αποδοχή', onPress: () => acceptMut.mutate() },
      ]
    )
  }

  return (
    <Card className="mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="font-bold text-slate-800">
            {offer.carrier?.carrierProfile?.companyName ?? offer.carrier?.email}
          </Text>
          {offer.carrier?.phone && (
            <Text className="text-xs text-slate-500 mt-0.5">{offer.carrier.phone}</Text>
          )}
        </View>
        <Text className={`text-sm font-semibold ${statusColors[offer.status] ?? 'text-slate-500'}`}>
          {offer.status}
        </Text>
      </View>

      {offer.price && (
        <Text className="text-green-600 font-bold text-lg mb-1">€{offer.price}</Text>
      )}
      {offer.deliveryDate && (
        <Text className="text-xs text-slate-500 mb-3">
          Παράδοση: {new Date(offer.deliveryDate).toLocaleDateString('el-GR')}
        </Text>
      )}

      {offer.status === 'PENDING' && (
        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            className="flex-1 bg-slate-100 rounded-xl py-2.5 items-center flex-row justify-center gap-1"
            onPress={() => router.push(`/(tabs)/messages/${offer.id}`)}
          >
            <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
            <Text className="text-primary text-sm font-semibold">Μήνυμα</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-red-50 rounded-xl py-2.5 items-center"
            onPress={() => rejectMut.mutate()}
            disabled={rejectMut.isPending}
          >
            <Text className="text-red-600 text-sm font-semibold">Απόρριψη</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-primary rounded-xl py-2.5 items-center"
            onPress={confirmAccept}
            disabled={acceptMut.isPending}
          >
            <Text className="text-white text-sm font-semibold">Αποδοχή</Text>
          </TouchableOpacity>
        </View>
      )}

      {offer.status === 'ACCEPTED' && (
        <TouchableOpacity
          className="mt-2 bg-primary/10 rounded-xl py-2.5 items-center flex-row justify-center gap-2"
          onPress={() => router.push(`/(tabs)/messages/${offer.id}`)}
        >
          <Ionicons name="chatbubbles-outline" size={16} color={Colors.primary} />
          <Text className="text-primary text-sm font-semibold">Άνοιγμα Συνομιλίας</Text>
        </TouchableOpacity>
      )}
    </Card>
  )
}

export default function ShipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => shipmentsApi.get(id).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) return <LoadingScreen message="Φόρτωση αποστολής..." />
  if (!data) return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-slate-400">Η αποστολή δεν βρέθηκε</Text>
    </View>
  )

  const fields = [
    { icon: 'location-outline', label: 'Από', value: data.originAddress ? `${data.originCity} — ${data.originAddress}` : data.originCity },
    { icon: 'navigate-outline', label: 'Προς', value: data.destAddress ? `${data.destCity} — ${data.destAddress}` : data.destCity },
    data.weight && { icon: 'barbell-outline', label: 'Βάρος', value: `${data.weight} kg` },
    data.maxBudget && { icon: 'cash-outline', label: 'Προϋπολογισμός', value: `€${data.maxBudget}` },
    data.desiredDelivery && { icon: 'calendar-outline', label: 'Παράδοση έως', value: new Date(data.desiredDelivery).toLocaleDateString('el-GR') },
    data.roadDistanceKm && { icon: 'map-outline', label: 'Απόσταση', value: `${data.roadDistanceKm} km` },
  ].filter(Boolean) as { icon: string; label: string; value: string }[]

  const flags = [
    data.isFragile && 'Εύθραυστο',
    data.requiresCooling && 'Απαιτεί Ψύξη',
    data.isHazardous && 'Επικίνδυνο',
  ].filter(Boolean) as string[]

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="bg-primary pt-14 pb-4 px-5">
        <View className="flex-row items-center gap-3 mb-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1" numberOfLines={1}>{data.title}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <ShipmentStatusBadge status={data.status} />
          <Text className="text-blue-200 text-xs">{data.category}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Details */}
        <Card className="mb-4">
          <Text className="font-bold text-slate-700 mb-3">Λεπτομέρειες</Text>
          {fields.map(({ icon, label, value }) => (
            <View key={label} className="flex-row items-start gap-2 mb-2">
              <Ionicons name={icon as any} size={16} color={Colors.textMuted} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-xs text-slate-400">{label}</Text>
                <Text className="text-sm text-slate-700">{value}</Text>
              </View>
            </View>
          ))}
          {flags.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-2">
              {flags.map(f => (
                <View key={f} className="bg-amber-100 rounded-full px-3 py-1">
                  <Text className="text-amber-700 text-xs font-semibold">{f}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Offers */}
        <Text className="text-lg font-bold text-slate-800 mb-3">
          Προσφορές ({(data as any)._count?.offers ?? data.offers?.length ?? 0})
        </Text>
        {(data.offers ?? []).length === 0 ? (
          <Card className="items-center py-8">
            <Ionicons name="pricetag-outline" size={36} color={Colors.textMuted} />
            <Text className="text-slate-400 mt-3 text-sm">Δεν υπάρχουν προσφορές ακόμα</Text>
          </Card>
        ) : (
          (data.offers ?? []).map(o => <OfferCard key={o.id} offer={o} shipmentId={id} />)
        )}
      </ScrollView>
    </View>
  )
}
