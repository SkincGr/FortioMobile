import React from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { notificationsApi, Notification } from '@/lib/api'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Colors } from '@/constants/colors'

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  OFFER:     { icon: 'pricetag-outline', color: Colors.accent },
  MESSAGE:   { icon: 'chatbubble-outline', color: Colors.primary },
  ACCEPTED:  { icon: 'checkmark-circle-outline', color: Colors.success },
  DELIVERED: { icon: 'cube-outline', color: Colors.success },
  DEFAULT:   { icon: 'notifications-outline', color: Colors.textMuted },
}

export default function NotificationsScreen() {
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
    <View className="flex-1 bg-surface">
      <View className="bg-primary pt-14 pb-5 px-5">
        <View className="flex-row justify-between items-center">
          <Text className="text-white text-xl font-bold">Ειδοποιήσεις</Text>
          {unreadCount > 0 && (
            <View className="bg-red-500 rounded-full px-2 py-0.5">
              <Text className="text-white text-xs font-bold">{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="notifications-off-outline" size={56} color={Colors.textMuted} />
            <Text className="text-slate-400 mt-4">Δεν υπάρχουν ειδοποιήσεις</Text>
          </View>
        }
        renderItem={({ item }) => {
          const { icon, color } = TYPE_ICONS[item.type] ?? TYPE_ICONS.DEFAULT
          return (
            <TouchableOpacity
              onPress={() => !item.isRead && markReadMut.mutate(item.id)}
              className={`mb-2 rounded-2xl p-4 flex-row items-start gap-3 border ${item.isRead ? 'bg-white border-slate-100' : 'bg-blue-50 border-blue-100'}`}
            >
              <View className={`rounded-full p-2 mt-0.5`} style={{ backgroundColor: color + '20' }}>
                <Ionicons name={icon as any} size={18} color={color} />
              </View>
              <View className="flex-1">
                <Text className={`text-sm ${item.isRead ? 'text-slate-600' : 'text-slate-800 font-semibold'}`}>
                  {item.message}
                </Text>
                <Text className="text-xs text-slate-400 mt-1">
                  {new Date(item.createdAt).toLocaleString('el-GR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </Text>
              </View>
              {!item.isRead && (
                <View className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
              )}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}
