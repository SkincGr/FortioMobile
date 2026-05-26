import React from 'react'
import { View, ViewProps } from 'react-native'

type Props = ViewProps & { className?: string }

export function Card({ children, className = '', style, ...rest }: Props) {
  return (
    <View
      className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </View>
  )
}
