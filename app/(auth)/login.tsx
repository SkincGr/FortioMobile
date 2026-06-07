import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { Ionicons } from '@expo/vector-icons'

export default function LoginScreen() {
  const { login } = useAuth()
  const { t } = useI18n()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [showPw, setShowPw]         = useState(false)

  async function handleLogin() {
    if (!identifier.trim() || !password) { setError('Συμπλήρωσε email/username και κωδικό'); return }
    setLoading(true); setError('')
    try {
      await login(identifier.trim(), password)
      router.replace('/(tabs)' as any)
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Σφάλμα σύνδεσης')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">

        {/* Logo area */}
        <View style={s.logoArea}>
          <Text style={s.logo}>FORTIO</Text>
          <Text style={s.logoSub}>Logistics Marketplace</Text>
        </View>

        {/* Form card */}
        <View style={s.card}>
          <Text style={s.title}>{t('auth.welcome')}</Text>
          <Text style={s.sub}>{t('auth.sign_in_sub')}</Text>

          {error ? <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View> : null}

          <Text style={s.label}>{t('auth.identifier')}</Text>
          <TextInput
            style={s.input}
            placeholder="email ή username"
            placeholderTextColor="rgba(255,255,255,0.25)"
            keyboardType="default"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect={false}
            value={identifier}
            onChangeText={setIdentifier}
          />

          <Text style={s.label}>{t('auth.password')}</Text>
          <View style={s.pwRow}>
            <TextInput
              style={s.pwInput}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.25)"
              secureTextEntry={!showPw}
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(v => !v)} hitSlop={8}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.forgotRow} onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={s.forgotTxt}>{t('auth.forgot')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.submitBtn, loading && s.submitBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color="#000" />
              : <Text style={s.submitBtnText}>{t('auth.sign_in')}</Text>
            }
          </TouchableOpacity>

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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

  logoArea: { alignItems: 'center', justifyContent: 'center', paddingTop: 72, paddingBottom: 36 },
  logo:     { color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: -1 },
  logoSub:  { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },

  card: {
    flex: 1,
    backgroundColor: '#111',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4 },
  sub:   { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#fff', marginBottom: 16,
  },
  pwRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, marginBottom: 4,
  },
  pwInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#fff' },
  eyeBtn:  { paddingHorizontal: 14, paddingVertical: 12 },

  forgotRow: { alignSelf: 'flex-end', marginBottom: 20, marginTop: 8 },
  forgotTxt: { color: '#F59E0B', fontSize: 13 },

  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorTxt: { color: '#F87171', fontSize: 13 },

  submitBtn:         { backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:     { color: '#000', fontSize: 16, fontWeight: '700' },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerTxt:  { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  footerLink: { color: '#F59E0B', fontSize: 14, fontWeight: '600' },
})
