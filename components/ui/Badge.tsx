import React from 'react'
import { View, Text } from 'react-native'

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'default'

const styles: Record<Variant, { bg: string; text: string }> = {
  success: { bg: 'bg-green-100', text: 'text-green-700' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700' },
  danger:  { bg: 'bg-red-100',   text: 'text-red-700' },
  info:    { bg: 'bg-blue-100',  text: 'text-blue-700' },
  default: { bg: 'bg-slate-100', text: 'text-slate-600' },
}

export function Badge({ label, variant = 'default' }: { label: string; variant?: Variant }) {
  const s = styles[variant]
  return (
    <View className={`px-2 py-0.5 rounded-full ${s.bg} self-start`}>
      <Text className={`text-xs font-semibold ${s.text}`}>{label}</Text>
    </View>
  )
}
