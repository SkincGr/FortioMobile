import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { authApi, LEGAL_FORMS } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { Ionicons } from '@expo/vector-icons'

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,30}$/

type EntityType = 'INDIVIDUAL' | 'COMPANY'
type Step = 'user' | 'company'

const EMPTY_COMPANY = {
  companyName: '', vatNumber: '', taxOffice: '', legalForm: '',
  registrationNumber: '', address: '', city: '', postalCode: '',
  companyPhone: '', companyEmail: '', website: '',
}

// Same flow as the web registration page (/register/company) for a sender:
// an individual registers in one step; a company (legal entity) adds a
// second step with its details, and this user becomes its Administrator.
export default function RegisterScreen() {
  const { t } = useI18n()
  const [entityType, setEntityType] = useState<EntityType>('INDIVIDUAL')
  const [step, setStep]         = useState<Step>('user')
  const [user, setUser]         = useState({ username: '', name: '', email: '', password: '', confirm: '' })
  const [company, setCompany]   = useState(EMPTY_COMPANY)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [badFields, setBadFields] = useState<string[]>([])
  const [success, setSuccess]   = useState(false)
  const [showPw, setShowPw]     = useState(false)
  const [showCf, setShowCf]     = useState(false)

  const isIndividual = entityType === 'INDIVIDUAL'

  function updateUser(field: keyof typeof user, value: string) {
    setUser(u => ({ ...u, [field]: value }))
    setError(''); setBadFields(f => f.filter(x => x !== field))
  }
  function updateCompany(field: keyof typeof company, value: string) {
    setCompany(c => ({ ...c, [field]: value }))
    setError(''); setBadFields(f => f.filter(x => x !== field))
  }
  function fail(message: string, fields: string[]) {
    setError(message); setBadFields(fields)
  }

  function validateUser(): boolean {
    const missing = (['username', 'name', 'email', 'password'] as const).filter(f => !user[f].trim())
    if (missing.length > 0) { fail(t('reg.err_required'), missing); return false }
    if (!USERNAME_RE.test(user.username.trim())) { fail(t('reg.err_username'), ['username']); return false }
    if (user.password.length < 8) { fail(t('reg.err_password_length'), ['password']); return false }
    if (user.password !== user.confirm) { fail(t('reg.err_passwords_match'), ['confirm']); return false }
    return true
  }

  function validateCompany(): boolean {
    const missing = (['companyName', 'vatNumber', 'companyPhone', 'companyEmail'] as const).filter(f => !company[f].trim())
    if (missing.length > 0) { fail(t('reg.err_company_required'), missing); return false }
    return true
  }

  function handleNext() {
    if (!validateUser()) return
    setBadFields([])
    if (isIndividual) { submit(); return }
    setStep('company')
  }

  async function submit() {
    if (!isIndividual && !validateCompany()) return
    setLoading(true); setError('')
    const account = {
      username: user.username.trim().toLowerCase(),
      name: user.name.trim(),
      email: user.email.trim(),
      password: user.password,
    }
    // Empty company fields are left out, the backend treats them as not given
    const companyFields = Object.fromEntries(
      Object.entries(company).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v),
    )
    try {
      await authApi.register(isIndividual
        ? { ...account, entityType }
        : { ...account, ...companyFields, entityType })
      setSuccess(true)
    } catch (e: any) {
      setError(e?.response?.data?.error || t('reg.err_generic'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <View style={s.successRoot}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>✅</Text>
        <Text style={s.successTitle}>{t('reg.success_title')}</Text>
        <Text style={s.successSub}>{t('reg.success_sub')}</Text>
        <TouchableOpacity style={s.submitBtn} onPress={() => router.replace('/(auth)/login')}>
          <Text style={s.submitBtnText}>{t('reg.login')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">

        <View style={s.logoArea}>
          <Text style={s.logo}>FORTIO</Text>
          <Text style={s.logoSub}>{t('reg.subtitle')}</Text>
        </View>

        <View style={s.card}>
          {step === 'user' ? (
            <>
              <Text style={s.title}>{isIndividual ? t('reg.title_individual') : t('reg.title_company')}</Text>
              <Text style={s.sub}>
                {isIndividual ? t('reg.sub_individual') : t('reg.sub_company')}
                {!isIndividual ? `  ·  ${t('reg.step')} 1/2` : ''}
              </Text>

              <View style={s.toggle}>
                {(['INDIVIDUAL', 'COMPANY'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[s.toggleBtn, entityType === type && s.toggleBtnActive]}
                    onPress={() => { setEntityType(type); setError(''); setBadFields([]) }}
                  >
                    <Text style={[s.toggleTxt, entityType === type && s.toggleTxtActive]}>
                      {type === 'INDIVIDUAL' ? t('reg.entity_individual') : t('reg.entity_company')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error ? <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View> : null}

              <Field label={t('reg.username')} value={user.username} bad={badFields.includes('username')}
                onChangeText={v => updateUser('username', v.toLowerCase().replace(/\s/g, ''))} placeholder={t('reg.username_ph')} />
              <Field label={t('reg.name')} value={user.name} bad={badFields.includes('name')}
                onChangeText={v => updateUser('name', v)} placeholder="π.χ. Νίκος Παπαδόπουλος" autoCapitalize="words" />
              <Field label={t('reg.email')} value={user.email} bad={badFields.includes('email')}
                onChangeText={v => updateUser('email', v)} placeholder="name@company.gr" keyboardType="email-address" />

              <Text style={s.label}>{t('reg.password')}</Text>
              <View style={[s.pwRow, badFields.includes('password') && s.bad, { marginBottom: 16 }]}>
                <TextInput style={s.pwInput} placeholder={t('reg.password_ph')} placeholderTextColor="rgba(255,255,255,0.25)" secureTextEntry={!showPw} value={user.password} onChangeText={v => updateUser('password', v)} />
                <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.eyeBtn} hitSlop={8}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>{t('reg.confirm')}</Text>
              <View style={[s.pwRow, badFields.includes('confirm') && s.bad, { marginBottom: 24 }]}>
                <TextInput style={s.pwInput} placeholder="••••••••" placeholderTextColor="rgba(255,255,255,0.25)" secureTextEntry={!showCf} value={user.confirm} onChangeText={v => updateUser('confirm', v)} />
                <TouchableOpacity onPress={() => setShowCf(v => !v)} style={s.eyeBtn} hitSlop={8}>
                  <Ionicons name={showCf ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[s.submitBtn, loading && s.submitBtnDisabled]} onPress={handleNext} disabled={loading} activeOpacity={0.85}>
                {loading
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={s.submitBtnText}>{isIndividual ? t('reg.btn_create_individual') : t('reg.btn_next')}</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.title}>{t('reg.company_title')}</Text>
              <Text style={s.sub}>{t('reg.company_sub')}  ·  {t('reg.step')} 2/2</Text>

              {error ? <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View> : null}

              <Field label={t('reg.company_name')} value={company.companyName} bad={badFields.includes('companyName')}
                onChangeText={v => updateCompany('companyName', v)} placeholder="π.χ. Express Hellas Α.Ε." autoCapitalize="words" />
              <Field label={t('reg.vat')} value={company.vatNumber} bad={badFields.includes('vatNumber')}
                onChangeText={v => updateCompany('vatNumber', v)} placeholder="π.χ. 123456789" keyboardType="number-pad" />
              <Field label={t('reg.doy')} value={company.taxOffice} onChangeText={v => updateCompany('taxOffice', v)} placeholder="π.χ. Α΄ Αθηνών" autoCapitalize="words" />

              <Text style={s.label}>{t('reg.legal_form')}</Text>
              <View style={s.chips}>
                {LEGAL_FORMS.map(f => {
                  const active = company.legalForm === f.value
                  return (
                    <TouchableOpacity key={f.value} style={[s.chip, active && s.chipActive]}
                      onPress={() => updateCompany('legalForm', active ? '' : f.value)}>
                      <Text style={[s.chipTxt, active && s.chipTxtActive]}>{f.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Field label={t('reg.gemi')} value={company.registrationNumber} onChangeText={v => updateCompany('registrationNumber', v)} placeholder="π.χ. 000000000000" keyboardType="number-pad" />

              <Text style={s.section}>{t('reg.contact')}</Text>
              <Field label={t('reg.address')} value={company.address} onChangeText={v => updateCompany('address', v)} placeholder="π.χ. Λεωφ. Αθηνών 100" autoCapitalize="words" />
              <View style={s.row}>
                <View style={{ flex: 2 }}>
                  <Field label={t('reg.city')} value={company.city} onChangeText={v => updateCompany('city', v)} placeholder="π.χ. Αθήνα" autoCapitalize="words" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label={t('reg.postal')} value={company.postalCode} onChangeText={v => updateCompany('postalCode', v)} placeholder="10434" keyboardType="number-pad" />
                </View>
              </View>
              <Field label={t('reg.phone')} value={company.companyPhone} bad={badFields.includes('companyPhone')}
                onChangeText={v => updateCompany('companyPhone', v)} placeholder="210 0000000" keyboardType="phone-pad" />
              <Field label={t('reg.company_email')} value={company.companyEmail} bad={badFields.includes('companyEmail')}
                onChangeText={v => updateCompany('companyEmail', v)} placeholder="info@company.gr" keyboardType="email-address" />
              <Field label={t('reg.website')} value={company.website} onChangeText={v => updateCompany('website', v)} placeholder="https://www.company.gr" keyboardType="url" />

              <View style={[s.row, { marginTop: 10 }]}>
                <TouchableOpacity style={[s.backBtn, { flex: 1 }]} onPress={() => { setStep('user'); setError(''); setBadFields([]) }} disabled={loading}>
                  <Text style={s.backBtnText}>{t('reg.btn_back')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.submitBtn, { flex: 2 }, loading && s.submitBtnDisabled]} onPress={submit} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator size="small" color="#000" /> : <Text style={s.submitBtnText}>{t('reg.btn_create')}</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={s.footer}>
            <Text style={s.footerTxt}>{t('reg.has_account')} </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={s.footerLink}>{t('reg.login')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, bad }: {
  label: string; value: string; onChangeText: (v: string) => void
  placeholder: string; keyboardType?: any; autoCapitalize?: any; bad?: boolean
}) {
  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, bad && s.bad]}
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
  section: { fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },

  toggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 4, marginBottom: 18 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#F59E0B' },
  toggleTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  toggleTxtActive: { color: '#000' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.15)' },
  chipTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  chipTxtActive: { color: '#F59E0B', fontWeight: '600' },

  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#fff', marginBottom: 14 },
  bad:   { borderColor: '#EF4444' },
  pwRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12 },
  pwInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#fff' },
  eyeBtn:  { paddingHorizontal: 14, paddingVertical: 11 },

  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 12, padding: 12, marginBottom: 14 },
  errorTxt: { color: '#F87171', fontSize: 13 },

  submitBtn:         { backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:     { color: '#000', fontSize: 15, fontWeight: '700' },
  backBtn:           { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  backBtnText:       { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerTxt:  { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  footerLink: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
})
