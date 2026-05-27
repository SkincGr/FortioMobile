import { Redirect } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) return <LoadingScreen message="Φόρτωση..." />
  return <Redirect href={(isAuthenticated ? '/(tabs)' : '/(auth)/login') as any} />
}
