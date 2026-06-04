import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { profileApi, SenderProfile } from '@/lib/api'

// ─── Personal details screen ──────────────────────────────────────────────────

export default function PersonalScreen() {
  const [form, setForm] = useState<SenderProfile>({
    name: '', email: '', username: '', phone: '',
    vatNumber: '', country: '', city: '', address: '',
  })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    profileApi.get()
      .then(r => setForm(r.data))
      .catch(() => setError('Αδύνατη η φόρτωση στοιχείων.'))
      .finally(() => setLoading(false))
  }, [])

  function set(key: keyof SenderProfile) {
    return (val: string) => setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const { email, ...rest } = form
      await profileApi.update(rest)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Σφάλμα αποθήκευσης.')
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
        <Text style={s.headerTitle}>Προσωπικά Στοιχεία</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#F59E0B" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.body}>

          {/* ── Προσωπικά ── */}
          <Text style={s.sectionLabel}>Προσωπικά Στοιχεία</Text>
          <View style={s.card}>
            <Field label="Ονοματεπώνυμο *" value={form.name ?? ''} onChangeText={set('name')} placeholder="π.χ. Γιώργης Παπαδόπουλος" />
            <Field label="Email" value={form.email ?? ''} onChangeText={() => {}} placeholder="" editable={false} />
            <Field label="Username" value={form.username ?? ''} onChangeText={set('username')} placeholder="π.χ. gpapadopoulos" />
            <Field label="Τηλέφωνο" value={form.phone ?? ''} onChangeText={set('phone')} placeholder="π.χ. 6901234567" keyboardType="phone-pad" />
            <Field label="ΑΦΜ" value={form.vatNumber ?? ''} onChangeText={set('vatNumber')} placeholder="π.χ. 123456789" isLast />
          </View>

          {/* ── Διεύθυνση ── */}
          <Text style={s.sectionLabel}>Διεύθυνση</Text>
          <View style={s.card}>
            <Field label="Χώρα" value={form.country ?? ''} onChangeText={set('country')} placeholder="π.χ. Ελλάδα" />
            <Field label="Πόλη" value={form.city ?? ''} onChangeText={set('city')} placeholder="π.χ. Αθήνα" />
            <Field label="Διεύθυνση" value={form.address ?? ''} onChangeText={set('address')} placeholder="π.χ. Λεωφόρος Αθηνών 12" isLast />
          </View>

          {/* Feedback */}
          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}
          {saved ? (
            <View style={s.successBox}>
              <Text style={s.successText}>✓ Οι αλλαγές αποθηκεύτηκαν</Text>
            </View>
          ) : null}

          {/* Buttons */}
          <View style={s.btnRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.cancelBtn}>
              <Text style={s.cancelBtnText}>Ακύρωση</Text>
            </TouchableOpacity>
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
          </View>

        </ScrollView>
      )}
    </KeyboardAvoidingView>
  )
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({ label, value, onChangeText, placeholder, editable = true, keyboardType, isLast }: {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder: string
  editable?: boolean
  keyboardType?: 'phone-pad' | 'default'
  isLast?: boolean
}) {
  return (
    <View style={[s.field, !isLast && s.fieldBorder]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, !editable && s.fieldInputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.25)"
        editable={editable}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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

  body: { padding: 20, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 1.5,
    marginBottom: 10, marginLeft: 2,
    marginTop: 20,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },

  field:       { paddingHorizontal: 16, paddingVertical: 14 },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  fieldLabel:  { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    color: '#fff', fontSize: 14,
  },
  fieldInputDisabled: { opacity: 0.45 },

  errorBox:   { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 12, padding: 14, marginTop: 16 },
  errorText:  { color: '#F87171', fontSize: 13 },
  successBox: { backgroundColor: 'rgba(74,222,128,0.1)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)', borderRadius: 12, padding: 14, marginTop: 16 },
  successText:{ color: '#4ADE80', fontSize: 13 },

  btnRow:         { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn:      { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText:  { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },
  saveBtn:        { flex: 1, backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled:{ opacity: 0.5 },
  saveBtnText:    { color: '#000', fontWeight: '700', fontSize: 14 },
})
