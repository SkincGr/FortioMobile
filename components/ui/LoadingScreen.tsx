import React from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'

export function LoadingScreen({ message }: { message?: string }) {
  return (
    <View style={s.root}>
      <ActivityIndicator size="large" color="#F59E0B" />
      {message && <Text style={s.text}>{message}</Text>}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  text: { marginTop: 12, color: 'rgba(255,255,255,0.4)', fontSize: 13 },
})
