import { Stack } from 'expo-router'
import { Colors } from '@/constants/colors'

export default function ShipmentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    />
  )
}
