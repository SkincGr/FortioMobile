import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { MessageTemplate } from '@/lib/templates'
import { useI18n } from '@/lib/i18n'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const REST = '__REST__'
const CATEGORY_LABELS: Record<string, string> = {
  OFFER: 'Προσφορά',
  CLARIFICATION: 'Διευκρίνιση',
  REQUEST: 'Αίτημα',
  GENERAL: 'Γενικό',
}
const catLabel = (c: string) => CATEGORY_LABELS[c] ?? c

export default function TemplatesScreen() {
  const { t } = useI18n()
  const { user } = useAuth()
  const isCarrier = user?.role === 'CARRIER'
  const role = isCarrier ? 'CARRIER' : 'SENDER'

  const [tab, setTab] = useState<'system' | 'custom'>('system')
  const [systemList, setSystemList] = useState<MessageTemplate[]>([])
  const [customList, setCustomList] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [comboOpen, setComboOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<string>(isCarrier ? 'OFFER' : 'REQUEST')
  const [icon, setIcon] = useState(isCarrier ? '🚛' : '📋')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    try {
      setLoading(true)
      // raw=1: τα «Έτοιμα» έρχονται αναλλοίωτα (όπως είναι τα κοινά)
      const res = await api.get<{ system: MessageTemplate[]; custom: MessageTemplate[] }>(
        `/api/templates?role=${role}&raw=1`
      )
      setSystemList(res.data?.system ?? [])
      setCustomList(res.data?.custom ?? [])
    } catch (e) {
      console.log('Failed to fetch templates:', e)
    } finally {
      setLoading(false)
    }
  }

  // Οι κατηγορίες του combo προέρχονται από το πεδίο category των προτύπων
  const categoryOptions = Array.from(new Set(
    [...systemList, ...customList].map(tpl => (tpl.category ?? '').trim()).filter(Boolean),
  )).sort()
  const baseList = tab === 'system' ? systemList : customList
  const list = categoryFilter === 'ALL'
    ? baseList
    : categoryFilter === REST
      ? baseList.filter(tpl => !categoryOptions.includes((tpl.category ?? '').trim()))
      : baseList.filter(tpl => (tpl.category ?? '').trim() === categoryFilter)
  const filterLabel = categoryFilter === 'ALL' ? 'Όλες οι κατηγορίες' : categoryFilter === REST ? 'Ρεστ' : catLabel(categoryFilter)

  // Η κατηγορία κλειδώνει: σε επεξεργασία στην υπάρχουσα, σε νέο πρότυπο στην τιμή του combo
  const categoryLocked = Boolean(editingId) || (categoryFilter !== 'ALL' && categoryFilter !== REST)

  function openNew() {
    setEditingId(null)
    setTitle(''); setSubject(''); setContent(''); setIcon(isCarrier ? '🚛' : '📋')
    if (categoryFilter !== 'ALL' && categoryFilter !== REST) setCategory(categoryFilter)
    setModalOpen(true)
  }

  function openEdit(item: MessageTemplate) {
    setEditingId(item.id)
    setTitle(item.title)
    setSubject(item.subject ?? '')
    setContent(item.content)
    setCategory(item.category || 'GENERAL')
    setIcon(item.icon || (isCarrier ? '🚛' : '📋'))
    setModalOpen(true)
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Σφάλμα', 'Συμπληρώστε τίτλο και κείμενο')
      return
    }
    try {
      setSaving(true)
      const body = { title: title.trim(), content: content.trim(), subject: subject.trim() || undefined, category, icon }
      if (editingId) {
        // Επεξεργασία στη θέση του (και στα «Έτοιμα» — δεν δημιουργεί αντίγραφο)
        const res = await api.patch<MessageTemplate>(`/api/templates?id=${encodeURIComponent(editingId)}`, body)
        const patch = (l: MessageTemplate[]) => l.map(tpl => tpl.id === editingId ? { ...tpl, ...res.data } : tpl)
        setSystemList(patch)
        setCustomList(patch)
      } else {
        const res = await api.post<MessageTemplate>('/api/templates', body)
        if (res.data) {
          setCustomList(prev => [res.data, ...prev])
          setTab('custom')
        }
      }
      setModalOpen(false)
      setEditingId(null)
    } catch (e: any) {
      Alert.alert('Σφάλμα', e?.response?.data?.error || 'Δεν ήταν δυνατή η αποθήκευση του προτύπου')
    } finally {
      setSaving(false)
    }
  }

  async function handleCopyToMine(item: MessageTemplate) {
    try {
      const res = await api.post<MessageTemplate>(`/api/templates/copy?id=${encodeURIComponent(item.id)}`)
      if (res.data) {
        setCustomList(prev => prev.some(tpl => tpl.id === res.data.id) ? prev : [res.data, ...prev])
        setTab('custom')
      }
    } catch (e: any) {
      Alert.alert('Σφάλμα', e?.response?.data?.error || 'Η αντιγραφή απέτυχε')
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Διαγραφή', 'Θέλετε να διαγράψετε αυτό το πρότυπο;', [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/templates?id=${id}`)
            setCustomList(prev => prev.filter(item => item.id !== id))
          } catch {
            Alert.alert('Σφάλμα', 'Η διαγραφή απέτυχε')
          }
        },
      },
    ])
  }

  return (
    <View style={s.root}>
      <Stack.Screen
        options={{
          title: isCarrier ? 'Πρότυπα Μεταφορέα' : 'Πρότυπα Αποστολέα',
          headerBackTitle: 'Πίσω',
        }}
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isCarrier ? '🚛 Πρότυπα Μεταφορέα' : '👤 Πρότυπα Αποστολέα'}
        </Text>
        <TouchableOpacity onPress={openNew} style={s.addBtn}>
          <Ionicons name="add" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Segment tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'system' && s.tabBtnActive]}
          onPress={() => setTab('system')}
        >
          <Text style={[s.tabText, tab === 'system' && s.tabTextActive]}>
            {isCarrier ? '🚛 Έτοιμα Πρότυπα' : '📋 Έτοιμα Πρότυπα'} ({systemList.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'custom' && s.tabBtnActive]}
          onPress={() => setTab('custom')}
        >
          <Text style={[s.tabText, tab === 'custom' && s.tabTextActive]}>
            ⭐ Τα Δικά μου ({customList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Combo κατηγοριών */}
      <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
        <TouchableOpacity style={s.combo} onPress={() => setComboOpen(o => !o)} activeOpacity={0.8}>
          <Text style={s.comboText} numberOfLines={1}>🏷️ {filterLabel}</Text>
          <Ionicons name={comboOpen ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        {comboOpen && (
          <View style={s.comboList}>
            {['ALL', ...categoryOptions, REST].map(opt => (
              <TouchableOpacity
                key={opt}
                style={s.comboItem}
                onPress={() => { setCategoryFilter(opt); setComboOpen(false) }}
              >
                <Text style={[s.comboItemText, opt === categoryFilter && { color: '#FBBF24' }]}>
                  {opt === 'ALL' ? 'Όλες οι κατηγορίες' : opt === REST ? 'Ρεστ' : catLabel(opt)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#FBBF24" />
        </View>
      ) : list.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
          <Text style={s.emptyText}>
            {tab === 'system' ? 'Δεν υπάρχουν πρότυπα σε αυτή την κατηγορία' : 'Δεν έχετε αποθηκεύσει δικά σας πρότυπα'}
          </Text>
          <TouchableOpacity style={s.createBtn} onPress={openNew}>
            <Text style={s.createBtnText}>+ Δημιουργία Προτύπου</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {list.map(item => {
            const copied = customList.some(c => c.parentId === item.id)
            return (
              <View key={item.id} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Text style={{ fontSize: 20 }}>{item.icon || (isCarrier ? '🚛' : '📋')}</Text>
                    <Text style={s.cardTitle}>{item.title}</Text>
                  </View>
                  <View style={s.catBadge}>
                    <Text style={s.catBadgeText}>{catLabel(item.category)}</Text>
                  </View>
                </View>
                {item.parentId ? <Text style={s.customized}>✎ Δικό μου (αντίγραφο)</Text> : null}
                <Text style={s.cardContent}>{item.content}</Text>

                <View style={s.cardActions}>
                  {tab === 'system' && (
                    copied
                      ? <Text style={s.copiedText}>✓ Υπάρχει στα Δικά μου</Text>
                      : (
                        <TouchableOpacity onPress={() => handleCopyToMine(item)} hitSlop={8}>
                          <Text style={s.actionAmber}>⭐ Αντιγραφή στα Δικά μου</Text>
                        </TouchableOpacity>
                      )
                  )}
                  {/* Τα κοινά «Έτοιμα» αλλάζουν μόνο από admin· οι υπόλοιποι τα αντιγράφουν στα Δικά μου */}
                  {(tab === 'custom' || user?.role === 'ADMIN') && (
                    <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8}>
                      <Text style={s.actionMuted}>✏️ Επεξεργασία</Text>
                    </TouchableOpacity>
                  )}
                  {tab === 'custom' && (
                    <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={10}>
                      <Ionicons name="trash-outline" size={18} color="#F87171" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* Modal Add / Edit */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {editingId ? 'Επεξεργασία Προτύπου' : (isCarrier ? 'Νέο Πρότυπο Μεταφορέα' : 'Νέο Πρότυπο Αποστολέα')}
              </Text>
              <TouchableOpacity onPress={() => { setModalOpen(false); setEditingId(null) }}>
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLabel}>Τίτλος Προτύπου</Text>
            <TextInput
              style={s.input}
              placeholder={isCarrier ? 'π.χ. Προσφορά με Εργατικά' : 'π.χ. Αίτημα για Δρομολόγιο'}
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={s.inputLabel}>Θέμα (για το email)</Text>
            <TextInput
              style={s.input}
              placeholder="Αν μείνει κενό, χρησιμοποιείται ο τίτλος"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={s.inputLabel}>Κατηγορία</Text>
            {categoryLocked ? (
              <View style={[s.input, { opacity: 0.6 }]}>
                <Text style={{ color: '#fff', fontSize: 14 }}>🔒 {catLabel(category)}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {categoryOptions.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[s.chip, category === cat && s.chipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[s.chipText, category === cat && { color: '#000' }]}>{catLabel(cat)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.inputLabel}>Κείμενο Μηνύματος</Text>
            <TextInput
              style={[s.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Γράψτε το κείμενο..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              value={content}
              onChangeText={setContent}
            />

            <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8, flexWrap: 'wrap' }}>
              {['{{shipment_title}}', '{{shipment_origin_city}}', '{{shipment_dest_city}}'].map(tag => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => setContent(prev => prev + tag)}
                  style={s.tagBtn}
                >
                  <Text style={s.tagText}>+ {tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setModalOpen(false); setEditingId(null) }}>
                <Text style={s.cancelText}>Ακύρωση</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={s.saveText}>Αποθήκευση</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  combo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  comboText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  comboList: {
    marginTop: 6, backgroundColor: '#1a1a1a', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  comboItem: { paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  comboItemText: { color: '#E2E8F0', fontSize: 13 },
  catBadge: { backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  catBadgeText: { color: '#FBBF24', fontSize: 10, fontWeight: '800' },
  customized: { color: '#4ADE80', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  actionAmber: { color: '#FBBF24', fontSize: 12, fontWeight: '700' },
  actionMuted: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  copiedText: { color: '#4ADE80', fontSize: 12, fontWeight: '700' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  chipActive: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  chipText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' },
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    paddingTop: 54, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  addBtn: {
    backgroundColor: '#FBBF24', borderRadius: 20, width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, gap: 10,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  tabBtnActive: { backgroundColor: 'rgba(251,191,36,0.15)', borderColor: '#FBBF24' },
  tabText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#FBBF24' },
  placeholderBanner: {
    marginHorizontal: 16, marginTop: 12, padding: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  placeholderTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  placeholderText: { color: '#FBBF24', fontSize: 11, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 16 },
  createBtn: {
    backgroundColor: '#FBBF24', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
  },
  createBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardContent: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#161616', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  inputLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 14,
  },
  tagBtn: {
    backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  tagText: { color: '#FBBF24', fontSize: 11, fontWeight: '700' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center' },
  cancelText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#FBBF24', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#000', fontSize: 14, fontWeight: '800' },
})
