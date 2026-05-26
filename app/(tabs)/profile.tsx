import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Colors } from '@/constants/colors'

type MenuItem = {
  icon: string
  label: string
  onPress: () => void
  destructive?: boolean
}

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  function confirmLogout() {
    Alert.alert(
      'Αποσύνδεση',
      'Θέλεις σίγουρα να αποσυνδεθείς;',
      [
        { text: 'Ακύρωση', style: 'cancel' },
        {
          text: 'Αποσύνδεση',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true)
            await logout()
            router.replace('/(auth)/login')
          },
        },
      ]
    )
  }

  const menuItems: MenuItem[] = [
    { icon: 'person-outline', label: 'Στοιχεία Λογαριασμού', onPress: () => {} },
    { icon: 'lock-closed-outline', label: 'Αλλαγή Κωδικού', onPress: () => {} },
    { icon: 'notifications-outline', label: 'Ειδοποιήσεις', onPress: () => {} },
    { icon: 'help-circle-outline', label: 'Βοήθεια & Υποστήριξη', onPress: () => {} },
    { icon: 'information-circle-outline', label: 'Σχετικά με το Fortio', onPress: () => {} },
  ]

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="bg-primary pt-14 pb-8 px-5 items-center">
        <View className="bg-white/20 w-20 h-20 rounded-full items-center justify-center mb-3">
          <Text className="text-white text-3xl font-black">
            {user?.name?.charAt(0).toUpperCase() ?? 'A'}
          </Text>
        </View>
        <Text className="text-white text-xl font-bold">{user?.name}</Text>
        <Text className="text-blue-200 text-sm mt-1">{user?.email}</Text>
        <View className="mt-2 bg-white/20 rounded-full px-3 py-1">
          <Text className="text-white text-xs font-semibold">Αποστολέας</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Stats */}
        <Card className="flex-row mb-4">
          <View className="flex-1 items-center py-2">
            <Ionicons name="cube-outline" size={22} color={Colors.primary} />
            <Text className="text-slate-400 text-xs mt-1">Αποστολές</Text>
          </View>
          <View className="w-px bg-slate-100" />
          <View className="flex-1 items-center py-2">
            <Ionicons name="star-outline" size={22} color={Colors.accent} />
            <Text className="text-slate-400 text-xs mt-1">Αξιολογήσεις</Text>
          </View>
          <View className="w-px bg-slate-100" />
          <View className="flex-1 items-center py-2">
            <Ionicons name="checkmark-circle-outline" size={22} color={Colors.success} />
            <Text className="text-slate-400 text-xs mt-1">Ολοκληρωμένες</Text>
          </View>
        </Card>

        {/* Menu items */}
        <Card className="mb-4 p-0 overflow-hidden">
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              className={`flex-row items-center px-4 py-4 gap-3 ${idx < menuItems.length - 1 ? 'border-b border-slate-50' : ''}`}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon as any} size={20} color={item.destructive ? Colors.danger : Colors.textSecondary} />
              <Text className={`flex-1 text-sm font-medium ${item.destructive ? 'text-red-500' : 'text-slate-700'}`}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </Card>

        <Button
          title="Αποσύνδεση"
          variant="danger"
          loading={loggingOut}
          onPress={confirmLogout}
        />

        <Text className="text-center text-slate-300 text-xs mt-6">
          Fortio v1.0.0 — Logistics Marketplace
        </Text>
      </ScrollView>
    </View>
  )
}
