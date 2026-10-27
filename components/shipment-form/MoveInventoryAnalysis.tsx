import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { Colors } from '@/constants/colors'
import { api } from '@/lib/api'
import type { MoveDetails } from '@/lib/shared/moveCard'
import { dropAiItems, existingForRoom, mergeAnalysis, planAnalysis, planRepeat } from '@/lib/shared/moveInventoryMerge'
import type { FormT } from '@/lib/useFormT'
import { Check, s } from './ui'

/**
 * Προαιρετική αυτόματη καταγραφή αντικειμένων από τις φωτογραφίες (AI), όπως το MoveInventoryAnalysis του web: ο αποστολέας τη
 * ζητά ο ίδιος, αναλύονται μόνο οι φωτογραφίες που δεν έχουν αναλυθεί, ένα δωμάτιο τη φορά, και ό,τι βρεθεί μπαίνει στις λίστες
 * ως πρόταση. Η «Επανάληψη» ξαναστέλνει όλες τις φωτογραφίες, γι' αυτό ρωτά πρώτα (χρεώνεται ξανά).
 */
export function MoveInventoryAnalysis({ t, shipmentId, photos, details, onChange, onEnabledChange }: {
  t: FormT
  shipmentId: string
  photos: readonly { id: string }[]
  details: MoveDetails
  onChange: (patch: (d: MoveDetails) => MoveDetails) => void
  onEnabledChange?: (enabled: boolean) => void
}) {
  const enabled = details.aiEnabled
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [added, setAdded] = useState<number | null>(null)

  const pendingCount = planAnalysis(photos, details).reduce((n, b) => n + b.photoIds.length, 0)
  const running = progress !== null

  async function run(all = false) {
    const { base, batches } = all ? planRepeat(photos, details) : { base: details, batches: planAnalysis(photos, details) }
    if (batches.length === 0) return
    setProgress({ done: 0, total: batches.length })
    setError(''); setWarnings([]); setAdded(null)
    const replaced = new Set<string>()
    let working = base
    let found = 0
    const notes: string[] = []
    try {
      for (const [index, batch] of batches.entries()) {
        let data: any
        try {
          // Η ανάλυση ενός δωματίου κρατά αρκετά δευτερόλεπτα: μεγαλύτερο όριο από τα 15 s του api
          const res = await api.post(`/api/shipments/${shipmentId}/inventory-estimate`,
            { photoIds: batch.photoIds, existing: existingForRoom(working, batch.room) }, { timeout: 120000 })
          data = res.data
        } catch (e: any) {
          const msg = e?.response?.data?.error
          setError(typeof msg === 'string' ? msg : t('moveCard.ai_error'))
          break
        }
        const result = {
          furniture: Array.isArray(data?.furniture) ? data.furniture : [],
          appliances: Array.isArray(data?.appliances) ? data.appliances : [],
          otherItems: Array.isArray(data?.otherItems) ? data.otherItems : [],
          analyzedPhotoIds: Array.isArray(data?.analyzedPhotoIds) ? data.analyzedPhotoIds : batch.photoIds,
        }
        working = mergeAnalysis(working, result)
        if (all && !replaced.has(batch.room)) {
          replaced.add(batch.room)
          onChange(d => dropAiItems(d, batch.room))
        }
        onChange(d => mergeAnalysis(d, result))
        found += result.furniture.length + result.appliances.length + result.otherItems.length
        for (const w of Array.isArray(data?.warnings) ? data.warnings : []) notes.push(batch.room ? `${batch.room}: ${w}` : String(w))
        setProgress({ done: index + 1, total: batches.length })
      }
    } finally {
      setProgress(null)
      setWarnings(notes)
      setAdded(found)
    }
  }

  function repeat() {
    Alert.alert('', t('moveCard.ai_repeat_confirm'), [
      { text: t('moveCard.ai_no'), style: 'cancel' },
      { text: t('moveCard.ai_yes'), onPress: () => { void run(true) } },
    ])
  }

  return (
    <View style={{ borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 14 }}>
      <Check checked={enabled} onChange={on => { onChange(d => ({ ...d, aiEnabled: on })); onEnabledChange?.(on) }} label={t('moveCard.ai_toggle')} />
      <Text style={[s.hint, { marginTop: 6 }]}>{t('moveCard.ai_disclosure')}</Text>

      {enabled && (
        <View style={{ marginTop: 10 }}>
          {photos.length === 0 ? (
            <Text style={s.hint}>{t('moveCard.ai_no_photos')}</Text>
          ) : (
            <>
              {pendingCount > 0
                ? <Text style={{ fontSize: 13, fontWeight: '700', color: '#B45309', marginBottom: 8 }}>{t('moveCard.ai_unanalysed')}: {pendingCount}</Text>
                : <Text style={[s.hint, { marginBottom: 8 }]}>{t('moveCard.ai_none_new')}</Text>}
              <View style={s.wrap}>
                {pendingCount > 0 && (
                  <TouchableOpacity onPress={() => run()} disabled={running}
                    style={{ backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, opacity: running ? 0.6 : 1 }}>
                    <Text style={{ fontWeight: '700', color: '#000' }}>
                      {progress ? `${t('moveCard.ai_running')} ${progress.done + 1}/${progress.total}…` : `${t('moveCard.ai_button')} (${pendingCount})`}
                    </Text>
                  </TouchableOpacity>
                )}
                {details.analyzedPhotoIds.length > 0 && (
                  <TouchableOpacity onPress={repeat} disabled={running}
                    style={{ borderWidth: 1, borderColor: Colors.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, opacity: running ? 0.6 : 1 }}>
                    <Text style={{ fontWeight: '700', color: '#B45309' }}>{t('moveCard.ai_repeat')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
          {error ? <Text style={{ color: Colors.danger, fontSize: 13, marginTop: 8 }}>{error}</Text> : null}
          {added !== null && !running && (
            <Text style={{ color: Colors.success, fontSize: 13, marginTop: 8 }}>
              {added > 0 ? `${t('moveCard.ai_found')}: ${added}. ${t('moveCard.ai_check')}` : t('moveCard.ai_nothing')}
            </Text>
          )}
          {warnings.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#B45309' }}>{t('moveCard.ai_warnings')}</Text>
              {warnings.map((w, i) => <Text key={i} style={{ fontSize: 12, color: '#B45309' }}>• {w}</Text>)}
            </View>
          )}
        </View>
      )}
    </View>
  )
}
