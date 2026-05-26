import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native'
import { Colors } from '@/constants/colors'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

type Props = TouchableOpacityProps & {
  title: string
  variant?: Variant
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const variantStyles: Record<Variant, { container: string; text: string }> = {
  primary: { container: 'bg-primary', text: 'text-white' },
  secondary: { container: 'bg-white border border-primary', text: 'text-primary' },
  danger: { container: 'bg-red-500', text: 'text-white' },
  ghost: { container: 'bg-transparent', text: 'text-primary' },
}

const sizeStyles = {
  sm: { container: 'px-3 py-2 rounded-lg', text: 'text-sm font-medium' },
  md: { container: 'px-4 py-3 rounded-xl', text: 'text-base font-semibold' },
  lg: { container: 'px-6 py-4 rounded-2xl', text: 'text-lg font-bold' },
}

export function Button({ title, variant = 'primary', loading, size = 'md', disabled, style, ...rest }: Props) {
  const v = variantStyles[variant]
  const s = sizeStyles[size]
  const opacity = disabled || loading ? 'opacity-50' : ''

  return (
    <TouchableOpacity
      className={`${v.container} ${s.container} ${opacity} items-center justify-center flex-row gap-2`}
      disabled={disabled || loading}
      style={style as any}
      activeOpacity={0.8}
      {...rest}
    >
      {loading && <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : Colors.primary} />}
      <Text className={`${v.text} ${s.text}`}>{title}</Text>
    </TouchableOpacity>
  )
}
