import { Stack } from 'expo-router'
import { Colors } from '@/constants/colors'

export default function MessagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
      }}
    />
  )
}
