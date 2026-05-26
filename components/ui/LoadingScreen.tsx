import React from 'react'
import { View, ActivityIndicator, Text } from 'react-native'
import { Colors } from '@/constants/colors'

export function LoadingScreen({ message }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color={Colors.primary} />
      {message && <Text className="mt-3 text-slate-500 text-sm">{message}</Text>}
    </View>
  )
}
