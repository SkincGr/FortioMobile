import React, { useState } from 'react'
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, TextInput } from 'react-native'
import { router } from 'expo-router'
import { api } from '@/lib/api'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/Button'

export default function ForgotPasswordScreen() {
  const { colors } = useTheme()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email.trim()) { setError('Συμπλήρωσε το email σου'); return }
    setLoading(true); setError('')
    try {
      await api.post('/api/forgot-password', { email: email.trim() })
      setSent(true)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Σφάλμα αποστολής')
    } finally {
      setLoading(false)
    }
  }

  const s = StyleSheet.create({
    root:     { flex: 1, backgroundColor: colors.surface },
    inner:    { flex: 1, paddingHorizontal: 24, paddingTop: 64 },
    back:     { marginBottom: 32 },
    backTxt:  { color: colors.primary, fontSize: 15 },
    title:    { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
    sub:      { fontSize: 14, color: colors.textMuted, marginBottom: 28, lineHeight: 21 },
    label:    { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
    input:    { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary, marginBottom: 20 },
    sentBox:  { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#6EE7B7', borderRadius: 14, padding: 18 },
    sentTitle:{ color: '#065F46', fontWeight: '700', fontSize: 16, marginBottom: 4 },
    sentSub:  { color: '#047857', fontSize: 13 },
    errorBox: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 12, padding: 12, marginBottom: 16 },
    errorTxt: { color: '#DC2626', fontSize: 13 },
  })

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.inner}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backTxt}>{t('auth.back')}</Text>
        </TouchableOpacity>

        <Text style={s.title}>{t('auth.forgot_title')}</Text>
        <Text style={s.sub}>{t('auth.forgot_sub')}</Text>

        {sent ? (
          <View style={s.sentBox}>
            <Text style={s.sentTitle}>{t('auth.sent_ok')}</Text>
            <Text style={s.sentSub}>{t('auth.sent_check')}</Text>
          </View>
        ) : (
          <>
            {error ? <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View> : null}
            <Text style={s.label}>{t('auth.email')}</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={handleSubmit}
            />
            <Button title={t('auth.send')} loading={loading} onPress={handleSubmit} />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}
