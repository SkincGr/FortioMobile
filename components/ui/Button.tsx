import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, TouchableOpacityProps } from 'react-native'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size    = 'sm' | 'md' | 'lg'

type Props = TouchableOpacityProps & {
  title: string
  variant?: Variant
  loading?: boolean
  size?: Size
}

const VARIANTS: Record<Variant, { bg: string; border?: string; text: string; spinnerColor: string }> = {
  primary:   { bg: '#F59E0B',                    text: '#000',                    spinnerColor: '#000' },
  secondary: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', text: '#fff',  spinnerColor: '#fff' },
  danger:    { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',    text: '#F87171', spinnerColor: '#F87171' },
  ghost:     { bg: 'transparent',                text: '#F59E0B',                 spinnerColor: '#F59E0B' },
}

const SIZES: Record<Size, { px: number; py: number; radius: number; fontSize: number }> = {
  sm: { px: 12, py: 8,  radius: 8,  fontSize: 13 },
  md: { px: 16, py: 12, radius: 12, fontSize: 15 },
  lg: { px: 20, py: 15, radius: 14, fontSize: 16 },
}

export function Button({ title, variant = 'primary', loading, size = 'md', disabled, style, ...rest }: Props) {
  const v = VARIANTS[variant]
  const sz = SIZES[size]
  const opacity = disabled || loading ? 0.5 : 1

  return (
    <TouchableOpacity
      style={[
        s.btn,
        {
          backgroundColor: v.bg,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border ?? 'transparent',
          borderRadius: sz.radius,
          paddingHorizontal: sz.px,
          paddingVertical: sz.py,
          opacity,
        },
        style as any,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...rest}
    >
      {loading && <ActivityIndicator size="small" color={v.spinnerColor} style={{ marginRight: 6 }} />}
      <Text style={[s.text, { color: v.text, fontSize: sz.fontSize }]}>{title}</Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  btn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700' },
})
