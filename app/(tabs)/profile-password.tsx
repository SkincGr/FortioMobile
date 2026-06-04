import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { profileApi } from '@/lib/api'

// ─── Change password screen ───────────────────────────────────────────────────

export default function ChangePasswordScreen() {
  const [form, setForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function set(key: keyof typeof form) {
    return (val: string) => setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    setError(''); setSaved(false)

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Συμπλήρωσε όλα τα πεδία.'); return
    }
    if (form.newPassword.length < 8) {
      setError('Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.'); return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Οι νέοι κωδικοί δεν ταιριάζουν.'); return
    }

    setSaving(true)
    try {
      await profileApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      setSaved(true)
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setSaved(false), 4000)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Σφάλμα αλλαγής κωδικού.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={s.backText}>Επιστροφή</Text>
        </TouchableOpacity>
        <View style={s.sep} />
        <Text style={s.headerTitle}>Αλλαγή Password</Text>
      </View>

      <ScrollView contentContainerStyle={s.body}>

        <Text style={s.subtitle}>
          Για λόγους ασφαλείας εισάγετε πρώτα τον τρέχοντα κωδικό σας.
        </Text>

        <View style={s.card}>
          {/* Current password */}
          <View style={[s.field, s.fieldBorder]}>
            <Text style={s.fieldLabel}>Τρέχων Κωδικός</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.fieldInput}
                value={form.currentPassword}
                onChangeText={set('currentPassword')}
                placeholder="Εισάγετε τρέχοντα κωδικό"
                placeholderTextColor="rgba(255,255,255,0.25)"
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                autoComplete="current-password"
              />
              <TouchableOpacity onPress={() => setShowCurrent(v => !v)} hitSlop={8} style={s.eyeBtn}>
                <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* New password */}
          <View style={[s.field, s.fieldBorder]}>
            <Text style={s.fieldLabel}>Νέος Κωδικός</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.fieldInput}
                value={form.newPassword}
                onChangeText={set('newPassword')}
                placeholder="Τουλάχιστον 8 χαρακτήρες"
                placeholderTextColor="rgba(255,255,255,0.25)"
                secureTextEntry={!showNew}
                autoCapitalize="none"
                autoComplete="new-password"
              />
              <TouchableOpacity onPress={() => setShowNew(v => !v)} hitSlop={8} style={s.eyeBtn}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            <Text style={s.hint}>Τουλάχιστον 8 χαρακτήρες</Text>
          </View>

          {/* Confirm password */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>Επιβεβαίωση Νέου Κωδικού</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.fieldInput}
                value={form.confirmPassword}
                onChangeText={set('confirmPassword')}
                placeholder="Επαναλάβετε τον νέο κωδικό"
                placeholderTextColor="rgba(255,255,255,0.25)"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoComplete="new-password"
              />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} hitSlop={8} style={s.eyeBtn}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Feedback */}
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}
        {saved ? (
          <View style={s.successBox}>
            <Text style={s.successText}>✓ Ο κωδικός άλλαξε επιτυχώς</Text>
          </View>
        ) : null}

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
        >
          {saving
            ? <ActivityIndicator size="small" color="#000" />
            : <Text style={s.saveBtnText}>Αποθήκευση Αλλαγών</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText:    { color: '#fff', fontSize: 14, fontWeight: '600' },
  sep:         { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.2)' },
  headerTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },

  body:     { padding: 20, paddingBottom: 48 },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20, lineHeight: 20 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden', marginBottom: 20,
  },

  field:       { paddingHorizontal: 16, paddingVertical: 14 },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  fieldLabel:  { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },

  inputRow: { flexDirection: 'row', alignItems: 'center' },
  fieldInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    color: '#fff', fontSize: 14,
  },
  eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 4 },

  hint: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 },

  errorBox:   { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 12, padding: 14, marginBottom: 16 },
  errorText:  { color: '#F87171', fontSize: 13 },
  successBox: { backgroundColor: 'rgba(74,222,128,0.1)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)', borderRadius: 12, padding: 14, marginBottom: 16 },
  successText:{ color: '#4ADE80', fontSize: 13 },

  saveBtn:        { backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnDisabled:{ opacity: 0.5 },
  saveBtnText:    { color: '#000', fontWeight: '700', fontSize: 15 },
})
