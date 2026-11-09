/**
 * Φωτεινό και σκούρο θέμα της εφαρμογής — ίδια λογική και ίδιες τιμές με το web (Fortio: tailwind.config.js, lib/theme.ts).
 *
 * Οι οθόνες είναι γραμμένες με τη σκούρα παλέτα (λευκό κείμενο, rgba(255,255,255,x) για περιγράμματα και ένθετα). Το θέμα τη
 * μεταφράζει με «μελάνι» (ink): λευκό στο σκούρο, σκούρο στο φωτεινό.
 *
 *  • page / surface / raised: φόντο σελίδας, φόντο καρτών και παραθύρων, φόντο πεδίων και λιστών.
 *  • shade: ένθετο πλαίσιο που σκουραίνει ελαφρά το φόντο (μαύρο στο σκούρο, «μελάνι» στο φωτεινό).
 *  • ink(a): χρώμα του μελανιού με διαφάνεια a — για φόντα, περιγράμματα, διαχωριστικά (rgba(255,255,255,a) του σκούρου).
 *  • inkText(a): το ίδιο για κείμενο. Στο φωτεινό η διαφάνεια ανεβαίνει (0.3 + a × 0.7), γιατί το αχνό σκούρο κείμενο σε
 *    ανοιχτό φόντο διαβάζεται χειρότερα από το αχνό λευκό σε σκούρο (π.χ. 40% → ~58%).
 *  • soft(hue, level): χρώμα κειμένου με απαλή απόχρωση (text-amber-400 κ.λπ. του web)· στο φωτεινό γίνεται πιο σκούρο.
 *  • snow: το πάντα-λευκό (κείμενο πάνω σε έντονο χρώμα).
 *
 * Χρήση σε οθόνη: `const t = useTheme()` για απευθείας τιμές, ή `const s = useStyles(makeStyles)` με
 * `const makeStyles = (t: Theme) => StyleSheet.create({...})` για StyleSheet που εξαρτάται από το θέμα.
 */
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react'
import { Appearance } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const THEME_KEY = 'fortio_theme'

export type ThemeMode = 'light' | 'dark'

/** Τα χρώματα κειμένου που σκουραίνουν στο φωτεινό θέμα: [σκούρο θέμα, φωτεινό θέμα] — ίδια με του web */
const SOFT = {
  red:     { 200: ['#fecaca', '#7f1d1d'], 300: ['#fca5a5', '#991b1b'], 400: ['#f87171', '#b91c1c'] },
  green:   { 200: ['#bbf7d0', '#14532d'], 300: ['#86efac', '#166534'], 400: ['#4ade80', '#15803d'] },
  blue:    { 200: ['#bfdbfe', '#1e3a8a'], 300: ['#93c5fd', '#1e40af'], 400: ['#60a5fa', '#1d4ed8'] },
  yellow:  { 200: ['#fef08a', '#713f12'], 300: ['#fde047', '#854d0e'], 400: ['#facc15', '#a16207'] },
  emerald: { 200: ['#a7f3d0', '#064e3b'], 300: ['#6ee7b7', '#065f46'], 400: ['#34d399', '#047857'] },
  violet:  { 200: ['#ddd6fe', '#4c1d95'], 300: ['#c4b5fd', '#5b21b6'], 400: ['#a78bfa', '#6d28d9'] },
  orange:  { 200: ['#fed7aa', '#7c2d12'], 300: ['#fdba74', '#9a3412'], 400: ['#fb923c', '#c2410c'] },
  sky:     { 200: ['#bae6fd', '#0c4a6e'], 300: ['#7dd3fc', '#075985'], 400: ['#38bdf8', '#0369a1'] },
  purple:  { 200: ['#e9d5ff', '#581c87'], 300: ['#d8b4fe', '#6b21a8'], 400: ['#c084fc', '#7e22ce'] },
  cyan:    { 200: ['#a5f3fc', '#164e63'], 300: ['#67e8f9', '#155e75'], 400: ['#22d3ee', '#0e7490'] },
  amber:   { 200: ['#fde68a', '#78350f'], 300: ['#fcd34d', '#92400e'], 400: ['#fbbf24', '#b45309'] },
} as const

export type SoftHue = keyof typeof SOFT
export type SoftLevel = 200 | 300 | 400

type Palette = {
  page: string; surface: string; raised: string
  /** Τριάδα RGB του μελανιού και του «shade» (για rgba) */
  inkRgb: string; shadeRgb: string
  /** Βάση και κλίμακα της διαφάνειας κειμένου (βλ. inkText) */
  taBase: number; taScale: number
}

const PALETTES: Record<ThemeMode, Palette> = {
  dark: {
    page: '#0a0a0a', surface: '#111111', raised: '#1a1a1a',
    inkRgb: '255,255,255', shadeRgb: '0,0,0', taBase: 0, taScale: 1,
  },
  light: {
    page: '#fafaf9', surface: '#ffffff', raised: '#f5f5f4',
    inkRgb: '28,25,23', shadeRgb: '28,25,23', taBase: 0.3, taScale: 0.7,
  },
}

const round = (n: number) => Math.round(n * 1000) / 1000

export type Theme = {
  mode: ThemeMode
  isDark: boolean
  page: string
  surface: string
  raised: string
  /** Μελάνι (πλήρες) — το «λευκό» του σκούρου θέματος */
  inkSolid: string
  shade: (alpha: number) => string
  ink: (alpha: number) => string
  inkText: (alpha: number) => string
  soft: (hue: SoftHue, level?: SoftLevel) => string
  /** Πάντα λευκό */
  snow: string
  /** Το κίτρινο της εφαρμογής ως χρώμα κειμένου/εικονιδίου (σκουραίνει στο φωτεινό για να διαβάζεται) */
  accentText: string
  /** Σταθερά χρώματα (ίδια και στα δύο θέματα) */
  accent: string
  success: string
  danger: string
  warning: string
  /** Συμβατότητα με παλιότερο κώδικα (tab bar, κάρτες) */
  colors: {
    background: string; surface: string; card: string; border: string
    textPrimary: string; textSecondary: string; textMuted: string
    tabBar: string; tabBarActive: string; tabBarInactive: string
    inputBg: string; headerBg: string
    primary: string; accent: string; success: string; danger: string; warning: string
  }
}

export function makeTheme(mode: ThemeMode): Theme {
  const p = PALETTES[mode]
  const isDark = mode === 'dark'
  const ink = (a: number) => `rgba(${p.inkRgb},${a})`
  const inkText = (a: number) => `rgba(${p.inkRgb},${round(p.taBase + a * p.taScale)})`
  const soft = (hue: SoftHue, level: SoftLevel = 400) => SOFT[hue][level][isDark ? 0 : 1]
  const accent = '#F59E0B'
  const success = '#10B981'
  const danger = '#EF4444'
  const warning = '#F59E0B'

  return {
    mode, isDark,
    page: p.page, surface: p.surface, raised: p.raised,
    inkSolid: `rgb(${p.inkRgb})`,
    shade: (a: number) => `rgba(${p.shadeRgb},${a})`,
    ink, inkText, soft,
    snow: '#ffffff',
    accentText: isDark ? accent : soft('amber', 400),
    accent, success, danger, warning,
    colors: {
      background: p.page, surface: p.surface, card: p.surface, border: ink(0.1),
      textPrimary: `rgb(${p.inkRgb})`, textSecondary: inkText(0.6), textMuted: inkText(0.4),
      tabBar: p.surface, tabBarActive: isDark ? accent : soft('amber', 400), tabBarInactive: inkText(0.4),
      inputBg: p.raised, headerBg: p.surface,
      primary: accent, accent, success, danger, warning,
    },
  }
}

type ThemeContextType = Theme & {
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  ...makeTheme('dark'),
  setMode: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Χωρίς επιλογή του χρήστη η εφαρμογή ξεκινά σκούρα (όπως ήταν πάντα)
  const [mode, setModeState] = useState<ThemeMode>('dark')

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then(v => {
        if (v === 'dark' || v === 'light') {
          setModeState(v)
          Appearance.setColorScheme(v)
        } else {
          Appearance.setColorScheme('dark')
        }
      })
      .catch(() => {})
  }, [])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    Appearance.setColorScheme(next)
    SecureStore.setItemAsync(THEME_KEY, next).catch(() => {})
  }, [])

  const value = useMemo<ThemeContextType>(() => ({
    ...makeTheme(mode),
    setMode,
    toggleTheme: () => setMode(mode === 'dark' ? 'light' : 'dark'),
  }), [mode, setMode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

/** StyleSheet που εξαρτάται από το θέμα: `const makeStyles = (t: Theme) => StyleSheet.create({...})` */
export function useStyles<T>(make: (t: Theme) => T): T {
  const theme = useTheme()
  // Το theme αλλάζει μόνο όταν αλλάζει το mode (βλ. useMemo παραπάνω)
  return useMemo(() => make(theme), [theme.mode]) // eslint-disable-line react-hooks/exhaustive-deps
}
