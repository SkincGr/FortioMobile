import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, TouchableOpacityProps } from 'react-native'
import { Theme, useStyles, useTheme } from '@/lib/theme'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size    = 'sm' | 'md' | 'lg'

type Props = TouchableOpacityProps & {
  title: string
  variant?: Variant
  loading?: boolean
  size?: Size
}

const SIZES: Record<Size, { px: number; py: number; radius: number; fontSize: number }> = {
  sm: { px: 12, py: 8,  radius: 8,  fontSize: 13 },
  md: { px: 16, py: 12, radius: 12, fontSize: 15 },
  lg: { px: 20, py: 15, radius: 14, fontSize: 16 },
}

export function Button({ title, variant = 'primary', loading, size = 'md', disabled, style, ...rest }: Props) {
  const th = useTheme()
  const s = useStyles(makeStyles)

  const VARIANTS: Record<Variant, { bg: string; border?: string; text: string; spinnerColor: string }> = {
    primary:   { bg: '#F59E0B',          text: '#000',          spinnerColor: '#000' },
    secondary: { bg: th.ink(0.06), border: th.ink(0.15), text: th.inkSolid, spinnerColor: th.inkSolid },
    danger:    { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: th.soft('red'), spinnerColor: th.soft('red') },
    ghost:     { bg: 'transparent',      text: th.accentText,  spinnerColor: th.accentText },
  }
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

const makeStyles = (t: Theme) => StyleSheet.create({
  btn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700' },
})
