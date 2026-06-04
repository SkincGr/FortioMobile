import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

export default function ForgotPasswordScreen() {
  const { t } = useI18n()
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

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

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Επαναφορά Κωδικού</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Text style={s.backText}>Επιστροφή</Text>
          <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      <View style={s.inner}>
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
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={handleSubmit}
            />

            <TouchableOpacity
              style={[s.submitBtn, loading && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator size="small" color="#000" />
                : <Text style={s.submitBtnText}>{t('auth.send')}</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  backText:    { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },

  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 28 },

  sub:   { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 28, lineHeight: 21 },
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },

  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#fff', marginBottom: 24 },

  sentBox:  { backgroundColor: 'rgba(74,222,128,0.1)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)', borderRadius: 14, padding: 18 },
  sentTitle:{ color: '#4ADE80', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  sentSub:  { color: 'rgba(74,222,128,0.7)', fontSize: 13 },

  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorTxt: { color: '#F87171', fontSize: 13 },

  submitBtn:         { backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:     { color: '#000', fontSize: 16, fontWeight: '700' },
})
