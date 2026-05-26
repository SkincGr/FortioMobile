import React, { useState } from 'react'
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email.trim()) { setError('Συμπλήρωσε το email σου'); return }
    setLoading(true)
    setError('')
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
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-6 pt-16">
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text className="text-primary text-base">← Πίσω</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-slate-800 mb-2">Επαναφορά Κωδικού</Text>
        <Text className="text-slate-500 mb-8">
          Δώσε το email σου και θα σου στείλουμε οδηγίες επαναφοράς.
        </Text>

        {sent ? (
          <View className="bg-green-50 border border-green-200 rounded-xl p-4">
            <Text className="text-green-700 font-semibold">Email εστάλη! ✓</Text>
            <Text className="text-green-600 text-sm mt-1">Έλεγξε τα εισερχόμενά σου.</Text>
          </View>
        ) : (
          <>
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            ) : null}
            <Input label="Email" placeholder="you@example.com" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <Button title="Αποστολή" loading={loading} onPress={handleSubmit} />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}
