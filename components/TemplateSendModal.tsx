import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, Modal, ScrollView, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useI18n } from '@/lib/i18n'
import { useMessageTemplates, renderTemplate, MessageTemplate, TemplateData } from '@/lib/templates'

const FREE_TEXT_ID = '__free_text__'

/**
 * Παράθυρο προτύπων για μια ενέργεια (Αποδοχή, Απόρριψη, Ακύρωση, Διευκρίνηση…).
 * Φορτώνει τα πρότυπα του ρόλου για μία κατηγορία, προεπιλέγει το πρώτο, και στέλνει
 * το μήνυμα με το κουμπί «Αποστολή» (η ενέργεια της οθόνης τρέχει μετά την αποστολή).
 */
export function TemplateSendModal({
  visible, role, category, data, onClose, onSend,
}: {
  visible: boolean
  role: 'SENDER' | 'CARRIER'
  category: string
  data: TemplateData
  onClose: () => void
  onSend: (subject: string, content: string) => Promise<void>
}) {
  const { t } = useI18n()
  const { all: templates, loading } = useMessageTemplates(role, category)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const freeText: MessageTemplate = {
    id: FREE_TEXT_ID, title: t('tplflow.free_text'), category: 'GENERAL', content: '', icon: '✏️',
  }
  const options = [...templates, freeText]

  function select(tpl: MessageTemplate) {
    setSelectedId(tpl.id)
    setPickerOpen(false)
    setError('')
    if (tpl.id === FREE_TEXT_ID) { setSubject(''); setContent(''); return }
    setSubject(renderTemplate(tpl.subject ?? tpl.title, data))
    setContent(renderTemplate(tpl.content, data))
  }

  // Κάθε φορά που ανοίγει: καθαρισμός και, μόλις φορτώσουν, προεπιλογή του πρώτου προτύπου
  useEffect(() => {
    if (visible) { setSelectedId(null); setPickerOpen(false); setSubject(''); setContent(''); setError('') }
  }, [visible])

  useEffect(() => {
    if (visible && !loading && !selectedId && templates[0]) select(templates[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, loading, templates, selectedId])

  async function handleSend() {
    if (!content.trim() || sending) return
    setSending(true)
    setError('')
    try {
      await onSend(subject.trim(), content.trim())
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || t('tplflow.error'))
    } finally {
      setSending(false)
    }
  }

  const selected = options.find(o => o.id === selectedId)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('tplflow.title')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Combo προτύπων */}
          <TouchableOpacity style={styles.combo} onPress={() => setPickerOpen(o => !o)} activeOpacity={0.8}>
            <Text style={styles.comboText} numberOfLines={1}>
              {loading ? t('tplflow.loading') : selected ? `${selected.icon ?? '📋'} ${selected.title}` : t('tplflow.pick')}
            </Text>
            <Ionicons name={pickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#94A3B8" />
          </TouchableOpacity>
          {pickerOpen && (
            <ScrollView style={styles.dropdown} nestedScrollEnabled>
              {options.map(tpl => (
                <TouchableOpacity key={tpl.id} style={styles.dropdownItem} onPress={() => select(tpl)}>
                  <Text style={[styles.dropdownText, tpl.id === selectedId && { color: '#FBBF24' }]}>
                    {tpl.icon ?? '📋'} {tpl.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color="#FBBF24" />
          ) : (
            <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>{t('tplflow.subject')}</Text>
              <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholderTextColor="#64748B" />
              <Text style={styles.label}>{t('tplflow.body')}</Text>
              <TextInput
                style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
                value={content}
                onChangeText={setContent}
                multiline
                placeholderTextColor="#64748B"
              />
            </ScrollView>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnGhost} onPress={onClose} disabled={sending}>
              <Text style={styles.btnGhostText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSend, (!content.trim() || sending) && { opacity: 0.4 }]}
              onPress={handleSend}
              disabled={!content.trim() || sending}
            >
              {sending ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.btnSendText}>{t('tplflow.send')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: '#fff', fontSize: 16, fontWeight: '800' },
  combo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11,
  },
  comboText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  dropdown: {
    maxHeight: 180, marginTop: 6, backgroundColor: '#1a1a1a', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  dropdownText: { color: '#E2E8F0', fontSize: 14 },
  label: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 14,
  },
  error: { color: '#FCA5A5', fontSize: 12, marginTop: 10 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  btnGhost: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  btnGhostText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  btnSend: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, backgroundColor: '#FBBF24', minWidth: 90, alignItems: 'center' },
  btnSendText: { color: '#000', fontSize: 14, fontWeight: '800' },
})
