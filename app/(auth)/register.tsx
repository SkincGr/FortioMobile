import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform
} from 'react-native'
import { router } from 'expo-router'
import { authApi } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function RegisterScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Συμπλήρωσε όνομα, email και κωδικό')
      return
    }
    if (password !== confirm) {
      setError('Οι κωδικοί δεν ταιριάζουν')
      return
    }
    if (password.length < 6) {
      setError('Ο κωδικός πρέπει να είναι τουλάχιστον 6 χαρακτήρες')
      return
    }
    setLoading(true)
    setError('')
    try {
      await authApi.register({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined })
      setSuccess(true)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Σφάλμα εγγραφής')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-5xl mb-4">✅</Text>
        <Text className="text-2xl font-bold text-slate-800 mb-2">Επιτυχής Εγγραφή!</Text>
        <Text className="text-slate-500 text-center mb-8">
          Ο λογαριασμός σου δημιουργήθηκε. Μπορείς τώρα να συνδεθείς.
        </Text>
        <Button title="Σύνδεση" onPress={() => router.replace('/(auth)/login')} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-primary"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="items-center justify-center pt-16 pb-8">
          <Text className="text-4xl font-black text-white tracking-tight">FORTIO</Text>
          <Text className="text-blue-200 text-sm mt-1">Δημιουργία Λογαριασμού</Text>
        </View>

        <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10">
          <Text className="text-2xl font-bold text-slate-800 mb-1">Εγγραφή</Text>
          <Text className="text-slate-500 mb-6">Δημιούργησε λογαριασμό αποστολέα</Text>

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          ) : null}

          <Input label="Ονοματεπώνυμο" placeholder="Γιάννης Παπαδόπουλος" value={name} onChangeText={setName} autoCapitalize="words" />
          <Input label="Email" placeholder="you@example.com" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input label="Τηλέφωνο (προαιρετικό)" placeholder="+30 69X XXX XXXX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Input label="Κωδικός" placeholder="Τουλάχιστον 6 χαρακτήρες" isPassword value={password} onChangeText={setPassword} />
          <Input label="Επιβεβαίωση Κωδικού" placeholder="Ίδιος κωδικός" isPassword value={confirm} onChangeText={setConfirm} />

          <Button title="Εγγραφή" loading={loading} onPress={handleRegister} size="lg" />

          <View className="flex-row justify-center mt-6">
            <Text className="text-slate-500">Έχεις ήδη λογαριασμό; </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text className="text-primary font-semibold">Σύνδεση</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
