import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Theme, useStyles, useTheme } from '@/lib/theme'

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'default'

export function Badge({ label, variant = 'default' }: { label: string; variant?: Variant }) {
  const th = useTheme()
  const s = useStyles(makeStyles)

  const VARIANTS: Record<Variant, { bg: string; text: string }> = {
    success: { bg: 'rgba(74,222,128,0.12)',  text: th.soft('green') },
    warning: { bg: 'rgba(245,158,11,0.12)',  text: th.soft('yellow') },
    danger:  { bg: 'rgba(248,113,113,0.12)', text: th.soft('red') },
    info:    { bg: 'rgba(96,165,250,0.12)',  text: th.soft('blue') },
    default: { bg: th.ink(0.08),             text: th.inkText(0.5) },
  }
  const v = VARIANTS[variant]
  return (
    <View style={[s.badge, { backgroundColor: v.bg }]}>
      <Text style={[s.text, { color: v.text }]}>{label}</Text>
    </View>
  )
}

const makeStyles = (_t: Theme) => StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  text:  { fontSize: 11, fontWeight: '700' },
})
