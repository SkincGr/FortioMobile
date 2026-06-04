import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { useI18n, Language } from '@/lib/i18n'

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const { t, language, setLanguage } = useI18n()
  const [loggingOut, setLoggingOut] = useState(false)

  function confirmLogout() {
    Alert.alert(t('profile.logout'), t('profile.logout_q'), [
      { text: t('profile.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true)
          await logout()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  const menuSections = [
    {
      label: 'Λογαριασμός',
      items: [
        { icon: 'person-outline',             label: 'Προσωπικά Στοιχεία',  onPress: () => router.push('/(tabs)/profile-personal' as any) },
        { icon: 'key-outline',                label: 'Αλλαγή Password',     onPress: () => router.push('/(tabs)/profile-password' as any) },
        { icon: 'lock-closed-outline',        label: t('profile.forgot_pass'), onPress: () => router.push('/(auth)/forgot-password') },
        { icon: 'notifications-outline',      label: t('profile.notifications'), onPress: () => {} },
        { icon: 'help-circle-outline',        label: t('profile.help'),     onPress: () => {} },
        { icon: 'information-circle-outline', label: t('profile.about'),    onPress: () => {} },
      ],
    },
  ]

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{user?.name?.charAt(0).toUpperCase() ?? 'A'}</Text>
        </View>
        <Text style={s.name}>{user?.name}</Text>
        <Text style={s.email}>{user?.email}</Text>
        <View style={s.roleBadge}>
          <Text style={s.roleText}>{t('profile.sender')}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* ── Language ── */}
        <Text style={s.sectionLabel}>{t('profile.language')}</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={{ fontSize: 18 }}>🌐</Text>
            <Text style={s.itemLabel}>{t('profile.language')}</Text>
            <View style={s.langRow}>
              {(['el', 'en'] as Language[]).map(lang => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  style={[s.langBtn, language === lang && s.langBtnActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[s.langBtnText, language === lang && s.langBtnTextActive]}>
                    {lang === 'el' ? '🇬🇷 ΕΛ' : '🇬🇧 EN'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Menu sections ── */}
        {menuSections.map(section => (
          <View key={section.label}>
            <Text style={s.sectionLabel}>{section.label}</Text>
            <View style={s.card}>
              {section.items.map((item, idx, arr) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={item.onPress}
                  style={[s.menuItem, idx < arr.length - 1 && s.menuItemBorder]}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon as any} size={20} color="rgba(255,255,255,0.5)" />
                  <Text style={s.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* ── Logout ── */}
        <TouchableOpacity
          onPress={confirmLogout}
          disabled={loggingOut}
          style={s.logoutBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={s.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>

        <Text style={s.version}>Fortio v1.0.0 — Logistics Marketplace</Text>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    backgroundColor: '#111',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderWidth: 2, borderColor: 'rgba(245,158,11,0.4)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarText: { color: '#F59E0B', fontSize: 32, fontWeight: '900' },
  name:       { color: '#fff', fontSize: 20, fontWeight: '700' },
  email:      { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  roleBadge:  { marginTop: 8, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  roleText:   { color: '#F59E0B', fontSize: 11, fontWeight: '600' },

  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: 1.5,
    marginTop: 20, marginBottom: 8, marginLeft: 4,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  itemLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#fff' },

  langRow:           { flexDirection: 'row', gap: 6 },
  langBtn:           { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' },
  langBtnActive:     { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  langBtnText:       { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  langBtnTextActive: { color: '#000' },

  menuItem:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  menuLabel:      { flex: 1, fontSize: 14, fontWeight: '500', color: '#fff' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12, paddingVertical: 14, marginTop: 24,
  },
  logoutText: { color: '#F87171', fontSize: 15, fontWeight: '700' },

  version: { textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 20 },
})
