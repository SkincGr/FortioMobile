import { Stack } from 'expo-router'
import { Colors } from '@/constants/colors'
import { useTheme } from '@/lib/theme'

export default function MessagesLayout() {
  const { page } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: page },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
      }}
    />
  )
}
