import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Συμπλήρωσε email και κωδικό')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(email.trim(), password)
      router.replace('/(tabs)/')
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Σφάλμα σύνδεσης')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-primary"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="items-center justify-center pt-20 pb-10">
          <Text className="text-5xl font-black text-white tracking-tight">FORTIO</Text>
          <Text className="text-blue-200 text-sm mt-1">Logistics Marketplace</Text>
        </View>

        {/* Form Card */}
        <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10">
          <Text className="text-2xl font-bold text-slate-800 mb-1">Καλωσόρισες</Text>
          <Text className="text-slate-500 mb-6">Σύνδεσε τον λογαριασμό σου</Text>

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          ) : null}

          <Input
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />

          <Input
            label="Κωδικός"
            placeholder="••••••••"
            isPassword
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            className="self-end mb-6"
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text className="text-primary text-sm">Ξέχασες τον κωδικό;</Text>
          </TouchableOpacity>

          <Button title="Σύνδεση" loading={loading} onPress={handleLogin} size="lg" />

          <View className="flex-row justify-center mt-6">
            <Text className="text-slate-500">Δεν έχεις λογαριασμό; </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text className="text-primary font-semibold">Εγγραφή</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
