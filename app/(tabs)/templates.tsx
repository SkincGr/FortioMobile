import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { DEFAULT_TEMPLATES, MessageTemplate, renderTemplate } from '@/lib/templates'
import { useI18n } from '@/lib/i18n'
import { api } from '@/lib/api'

export default function TemplatesScreen() {
  const { t } = useI18n()
  const [tab, setTab] = useState<'custom' | 'system'>('custom')
  const [customList, setCustomList] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // Form
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<'OFFER' | 'CLARIFICATION' | 'REQUEST' | 'GENERAL'>('OFFER')
  const [icon, setIcon] = useState('📋')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    try {
      setLoading(true)
      const res = await api.get<{ system: MessageTemplate[]; custom: MessageTemplate[] }>('/api/templates')
      if (res.data?.custom) setCustomList(res.data.custom)
    } catch (e) {
      console.log('Failed to fetch templates:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Σφάλμα', 'Συμπληρώστε τίτλο και κείμενο')
      return
    }

    try {
      setSaving(true)
      const res = await api.post<MessageTemplate>('/api/templates', {
        title: title.trim(),
        content: content.trim(),
        category,
        icon,
      })
      if (res.data) {
        setCustomList(prev => [res.data, ...prev])
        setModalOpen(false)
        setTitle('')
        setContent('')
      }
    } catch (e) {
      Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η αποθήκευση του προτύπου')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Διαγραφή', 'Θέλετε να διαγράψετε αυτό το πρότυπο;', [
      { text: 'Ακύρωση', style: 'cancel' },
      {
        text: 'Διαγραφή',
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

  const list = tab === 'custom' ? customList : DEFAULT_TEMPLATES

  return (
    <View style={s.root}>
      <Stack.Screen options={{ title: 'Πρότυπα Μηνυμάτων', headerBackTitle: 'Πίσω' }} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Πρότυπα Μηνυμάτων & Email</Text>
        <TouchableOpacity onPress={() => setModalOpen(true)} style={s.addBtn}>
          <Ionicons name="add" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Segment tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'custom' && s.tabBtnActive]}
          onPress={() => setTab('custom')}
        >
          <Text style={[s.tabText, tab === 'custom' && s.tabTextActive]}>
            Δικά μου ({customList.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'system' && s.tabBtnActive]}
          onPress={() => setTab('system')}
        >
          <Text style={[s.tabText, tab === 'system' && s.tabTextActive]}>
            Έτοιμα ({DEFAULT_TEMPLATES.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Placeholders note */}
      <View style={s.placeholderBanner}>
        <Text style={s.placeholderTitle}>💡 Διαθέσιμες μεταβλητές:</Text>
        <Text style={s.placeholderText}>
          {'{shipment_title}'} • {'{origin_city}'} • {'{dest_city}'}
        </Text>
      </View>

      {/* List */}
      {loading && tab === 'custom' ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#FBBF24" />
        </View>
      ) : list.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
          <Text style={s.emptyText}>Δεν έχετε αποθηκεύσει δικά σας πρότυπα</Text>
          <TouchableOpacity style={s.createBtn} onPress={() => setModalOpen(true)}>
            <Text style={s.createBtnText}>+ Δημιουργία Προτύπου</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {list.map(item => (
            <View key={item.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text style={{ fontSize: 20 }}>{item.icon || '📋'}</Text>
                  <Text style={s.cardTitle}>{item.title}</Text>
                </View>
                {tab === 'custom' && (
                  <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={18} color="#F87171" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={s.cardContent}>{item.content}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal Add */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Νέο Πρότυπο</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLabel}>Τίτλος Προτύπου</Text>
            <TextInput
              style={s.input}
              placeholder="π.χ. Προσφορά με Εργατικά"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={title}
              onChangeText={setTitle}
            />

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
              {['{shipment_title}', '{origin_city}', '{dest_city}'].map(tag => (
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
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={s.cancelText}>Ακύρωση</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleCreate}
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
