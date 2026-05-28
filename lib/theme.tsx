import React, { createContext, useContext, useState, useEffect } from 'react'
import { Appearance } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const THEME_KEY = 'fortio_theme'

export type ThemeMode = 'light' | 'dark'

export const LightColors = {
  primary:        '#1B3A6B',
  primaryLight:   '#2A5298',
  primaryDark:    '#0F2347',
  accent:         '#F59E0B',
  success:        '#10B981',
  danger:         '#EF4444',
  warning:        '#F59E0B',
  surface:        '#F8FAFC',
  background:     '#FFFFFF',
  card:           '#FFFFFF',
  border:         '#E2E8F0',
  textPrimary:    '#1E293B',
  textSecondary:  '#64748B',
  textMuted:      '#94A3B8',
  tabBar:         '#FFFFFF',
  tabBarActive:   '#1B3A6B',
  tabBarInactive: '#94A3B8',
  inputBg:        '#FAFAFA',
  headerBg:       '#1B3A6B',
}

export const DarkColors = {
  primary:        '#2A5298',
  primaryLight:   '#3B6AC0',
  primaryDark:    '#1B3A6B',
  accent:         '#F59E0B',
  success:        '#10B981',
  danger:         '#EF4444',
  warning:        '#F59E0B',
  surface:        '#0F172A',
  background:     '#1E293B',
  card:           '#1E293B',
  border:         '#334155',
  textPrimary:    '#F1F5F9',
  textSecondary:  '#94A3B8',
  textMuted:      '#64748B',
  tabBar:         '#0F172A',
  tabBarActive:   '#60A5FA',
  tabBarInactive: '#475569',
  inputBg:        '#1E293B',
  headerBg:       '#0F172A',
}

type ThemeContextType = {
  mode: ThemeMode
  isDark: boolean
  colors: typeof LightColors
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  isDark: false,
  colors: LightColors,
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light')

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then(v => {
      if (v === 'dark' || v === 'light') {
        setMode(v)
        Appearance.setColorScheme(v)
      }
    })
  }, [])

  function toggleTheme() {
    const next: ThemeMode = mode === 'light' ? 'dark' : 'light'
    setMode(next)
    Appearance.setColorScheme(next)
    SecureStore.setItemAsync(THEME_KEY, next)
  }

  const isDark = mode === 'dark'
  const colors = isDark ? DarkColors : LightColors

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
