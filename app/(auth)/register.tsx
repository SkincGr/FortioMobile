import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { authApi } from '@/lib/api'
import { Ionicons } from '@expo/vector-icons'

export default function RegisterScreen() {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [showPw, setShowPw]     = useState(false)
  const [showCf, setShowCf]     = useState(false)

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) { setError('Συμπλήρωσε όνομα, email και κωδικό'); return }
    if (password !== confirm) { setError('Οι κωδικοί δεν ταιριάζουν'); return }
    if (password.length < 6) { setError('Ο κωδικός πρέπει να είναι τουλάχιστον 6 χαρακτήρες'); return }
    setLoading(true); setError('')
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
      <View style={s.successRoot}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>✅</Text>
        <Text style={s.successTitle}>Επιτυχής Εγγραφή!</Text>
        <Text style={s.successSub}>Ο λογαριασμός σου δημιουργήθηκε. Μπορείς τώρα να συνδεθείς.</Text>
        <TouchableOpacity style={s.submitBtn} onPress={() => router.replace('/(auth)/login')}>
          <Text style={s.submitBtnText}>Σύνδεση</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">

        <View style={s.logoArea}>
          <Text style={s.logo}>FORTIO</Text>
          <Text style={s.logoSub}>Δημιουργία Λογαριασμού</Text>
        </View>

        <View style={s.card}>
          <Text style={s.title}>Εγγραφή</Text>
          <Text style={s.sub}>Δημιούργησε λογαριασμό αποστολέα</Text>

          {error ? <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View> : null}

          <Field label="Ονοματεπώνυμο" value={name} onChangeText={setName} placeholder="Γιάννης Παπαδόπουλος" autoCapitalize="words" />
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          <Field label="Τηλέφωνο (προαιρετικό)" value={phone} onChangeText={setPhone} placeholder="+30 69X XXX XXXX" keyboardType="phone-pad" />

          <Text style={s.label}>Κωδικός</Text>
          <View style={[s.pwRow, { marginBottom: 16 }]}>
            <TextInput style={s.pwInput} placeholder="Τουλάχιστον 6 χαρακτήρες" placeholderTextColor="rgba(255,255,255,0.25)" secureTextEntry={!showPw} value={password} onChangeText={setPassword} />
            <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.eyeBtn} hitSlop={8}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Επιβεβαίωση Κωδικού</Text>
          <View style={[s.pwRow, { marginBottom: 24 }]}>
            <TextInput style={s.pwInput} placeholder="Ίδιος κωδικός" placeholderTextColor="rgba(255,255,255,0.25)" secureTextEntry={!showCf} value={confirm} onChangeText={setConfirm} />
            <TouchableOpacity onPress={() => setShowCf(v => !v)} style={s.eyeBtn} hitSlop={8}>
              <Ionicons name={showCf ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[s.submitBtn, loading && s.submitBtnDisabled]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator size="small" color="#000" /> : <Text style={s.submitBtnText}>Εγγραφή</Text>}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerTxt}>Έχεις ήδη λογαριασμό; </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={s.footerLink}>Σύνδεση</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }: {
  label: string; value: string; onChangeText: (v: string) => void
  placeholder: string; keyboardType?: any; autoCapitalize?: any
}) {
  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.25)"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'none'}
      />
    </>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  successRoot: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 32 },
  successTitle:{ color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  successSub:  { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', marginBottom: 32 },

  logoArea: { alignItems: 'center', paddingTop: 60, paddingBottom: 28 },
  logo:     { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  logoSub:  { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },

  card: {
    flex: 1, backgroundColor: '#111',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  sub:   { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },

  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#fff', marginBottom: 14 },
  pwRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12 },
  pwInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#fff' },
  eyeBtn:  { paddingHorizontal: 14, paddingVertical: 11 },

  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 12, padding: 12, marginBottom: 14 },
  errorTxt: { color: '#F87171', fontSize: 13 },

  submitBtn:         { backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:     { color: '#000', fontSize: 15, fontWeight: '700' },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerTxt:  { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  footerLink: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
})
