import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, TextInput } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/Button'

export default function LoginScreen() {
  const { login } = useAuth()
  const { colors, isDark } = useTheme()
  const { t } = useI18n()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  async function handleLogin() {
    if (!email.trim() || !password) { setError(t('auth.email') + ' & ' + t('auth.password') + ' required'); return }
    setLoading(true); setError('')
    try {
      await login(email.trim(), password)
      router.replace('/(tabs)' as any)
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Σφάλμα σύνδεσης')
    } finally {
      setLoading(false)
    }
  }

  const s = StyleSheet.create({
    root:     { flex: 1, backgroundColor: colors.primary },
    header:   { alignItems: 'center', justifyContent: 'center', paddingTop: 72, paddingBottom: 36 },
    logo:     { color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: -1 },
    logoSub:  { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
    card:     { flex: 1, backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
    title:    { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
    sub:      { fontSize: 14, color: colors.textMuted, marginBottom: 24 },
    label:    { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
    input:    { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary, marginBottom: 16 },
    pwRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginBottom: 4 },
    pwInput:  { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary },
    pwToggle: { paddingHorizontal: 14, paddingVertical: 12 },
    pwToggleTxt: { fontSize: 12, color: colors.textMuted },
    forgotRow:{ alignSelf: 'flex-end', marginBottom: 20, marginTop: 8 },
    forgotTxt:{ color: colors.primary, fontSize: 13 },
    errorBox: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 12, padding: 12, marginBottom: 16 },
    errorTxt: { color: '#DC2626', fontSize: 13 },
    footer:   { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerTxt:{ color: colors.textMuted, fontSize: 14 },
    footerLink:{ color: colors.primary, fontSize: 14, fontWeight: '600' },
  })

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>FORTIO</Text>
          <Text style={s.logoSub}>Logistics Marketplace</Text>
        </View>

        <View style={s.card}>
          <Text style={s.title}>{t('auth.welcome')}</Text>
          <Text style={s.sub}>{t('auth.sign_in_sub')}</Text>

          {error ? (
            <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View>
          ) : null}

          <Text style={s.label}>{t('auth.email')}</Text>
          <TextInput
            style={s.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={s.label}>{t('auth.password')}</Text>
          <View style={s.pwRow}>
            <TextInput
              style={s.pwInput}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPw}
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity style={s.pwToggle} onPress={() => setShowPw(v => !v)}>
              <Text style={s.pwToggleTxt}>{showPw ? 'Κρύψε' : 'Εμφάν.'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.forgotRow} onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={s.forgotTxt}>{t('auth.forgot')}</Text>
          </TouchableOpacity>

          <Button title={t('auth.sign_in')} loading={loading} onPress={handleLogin} size="lg" />

          <View style={s.footer}>
            <Text style={s.footerTxt}>{t('auth.no_account')} </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={s.footerLink}>{t('auth.register')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
