import React from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { Theme, useStyles, useTheme } from '@/lib/theme'

export function LoadingScreen({ message }: { message?: string }) {
  const th = useTheme()
  const s = useStyles(makeStyles)

  return (
    <View style={s.root}>
      <ActivityIndicator size="large" color={th.accentText} />
      {message && <Text style={s.text}>{message}</Text>}
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.page },
  text: { marginTop: 12, color: t.inkText(0.4), fontSize: 13 },
})
