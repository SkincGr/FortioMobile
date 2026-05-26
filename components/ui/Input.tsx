import React, { useState } from 'react'
import { View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'

type Props = TextInputProps & {
  label?: string
  error?: string
  isPassword?: boolean
}

export function Input({ label, error, isPassword, style, ...rest }: Props) {
  const [showPw, setShowPw] = useState(false)

  return (
    <View className="mb-4">
      {label && <Text className="text-sm font-medium text-slate-700 mb-1">{label}</Text>}
      <View className={`flex-row items-center border rounded-xl px-3 bg-white ${error ? 'border-red-400' : 'border-slate-200'}`}>
        <TextInput
          className="flex-1 py-3 text-slate-800 text-base"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={isPassword && !showPw}
          autoCapitalize="none"
          style={style as any}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPw(v => !v)} className="p-1">
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  )
}
