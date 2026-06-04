import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'default'

const VARIANTS: Record<Variant, { bg: string; text: string }> = {
  success: { bg: 'rgba(74,222,128,0.12)',   text: '#4ADE80' },
  warning: { bg: 'rgba(245,158,11,0.12)',   text: '#F59E0B' },
  danger:  { bg: 'rgba(248,113,113,0.12)',  text: '#F87171' },
  info:    { bg: 'rgba(96,165,250,0.12)',   text: '#60A5FA' },
  default: { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.5)' },
}

export function Badge({ label, variant = 'default' }: { label: string; variant?: Variant }) {
  const v = VARIANTS[variant]
  return (
    <View style={[s.badge, { backgroundColor: v.bg }]}>
      <Text style={[s.text, { color: v.text }]}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  text:  { fontSize: 11, fontWeight: '700' },
})
