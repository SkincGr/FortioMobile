import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { useI18n, Language } from '@/lib/i18n'

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const { isDark, colors, toggleTheme } = useTheme()
  const { t, language, setLanguage } = useI18n()
  const [loggingOut, setLoggingOut] = useState(false)

  const s = makeStyles(colors, isDark)

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

  return (
    <View style={[s.root]}>
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

        {/* ── Appearance ── */}
        <Text style={s.sectionLabel}>{t('profile.theme')}</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.accent} />
            <Text style={s.itemLabel}>{isDark ? t('profile.dark_mode') : t('profile.light_mode')}</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── Language ── */}
        <Text style={s.sectionLabel}>{t('profile.language')}</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.flagLabel}>🌐</Text>
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

        {/* ── Account ── */}
        <Text style={s.sectionLabel}>{t('profile.account')}</Text>
        <View style={s.card}>
          {[
            {
              icon: 'lock-closed-outline',
              label: t('profile.forgot_pass'),
              onPress: () => router.push('/(auth)/forgot-password'),
            },
            {
              icon: 'notifications-outline',
              label: t('profile.notifications'),
              onPress: () => {},
            },
            {
              icon: 'help-circle-outline',
              label: t('profile.help'),
              onPress: () => {},
            },
            {
              icon: 'information-circle-outline',
              label: t('profile.about'),
              onPress: () => {},
            },
          ].map((item, idx, arr) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              style={[s.menuItem, idx < arr.length - 1 && s.menuItemBorder]}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon as any} size={20} color={colors.textSecondary} />
              <Text style={s.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

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

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },

    header: {
      backgroundColor: colors.headerBg,
      paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20,
      alignItems: 'center',
    },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '900' },
    name:       { color: '#fff', fontSize: 20, fontWeight: '700' },
    email:      { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
    roleBadge:  { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
    roleText:   { color: '#fff', fontSize: 11, fontWeight: '600' },

    sectionLabel: {
      fontSize: 11, fontWeight: '700', color: colors.textMuted,
      textTransform: 'uppercase', letterSpacing: 1,
      marginTop: 20, marginBottom: 8, marginLeft: 4,
    },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16, borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden', marginBottom: 4,
    },

    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
    },

    itemLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary },
    flagLabel: { fontSize: 18 },

    langRow:         { flexDirection: 'row', gap: 6 },
    langBtn:         { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    langBtnActive:   { backgroundColor: colors.primary, borderColor: colors.primary },
    langBtnText:     { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    langBtnTextActive: { color: '#fff' },

    menuItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
    },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary },

    logoutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: '#EF4444', borderRadius: 14,
      paddingVertical: 14, marginTop: 24,
    },
    logoutText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    version: { textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 20 },
  })
}
