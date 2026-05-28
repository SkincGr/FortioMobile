import '../global.css'
import React from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider } from '@/lib/auth'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { I18nProvider } from '@/lib/i18n'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function AppShell() {
  const { isDark } = useTheme()
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'light'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
