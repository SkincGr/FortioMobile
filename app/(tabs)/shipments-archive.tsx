import React, { useState } from 'react'
import {
  View, Text, FlatList, RefreshControl, StyleSheet,
  Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { archiveApi, reviewsApi, ArchiveShipment } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { fCity } from '@/lib/cityDisplay'

function fDate(v?: string | null) {
  if (!v) return null
  return new Date(v).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}


function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Ionicons key={n} name={n <= rating ? 'star' : 'star-outline'} size={13} color="#F59E0B" />
      ))}
    </View>
  )
}

type ReviewTarget = {
  offerId: string
  reviewId?: string
  shipmentTitle: string
  carrierName: string
  rating: number
  comment: string
}

function ArchiveCard({ item, onRate }: { item: ArchiveShipment; onRate: (t: ReviewTarget) => void }) {
  const { t } = useI18n()
  const offer = item.offers[0]
  const topDate = offer?.deliveryDate ?? offer?.route?.estimatedArrival ?? item.updatedAt
  const carrierName = offer?.carrier?.company?.name ?? offer?.carrier?.name ?? offer?.carrier?.email ?? '—'
  const originDate = fDate(offer?.route?.departureDate)
  const destDate = fDate(offer?.route?.estimatedArrival)

  return (
    <View style={s.card}>
      {/* Row 1: title + date */}
      <View style={s.row}>
        <Text style={[s.title, { flex: 1 }]} numberOfLines={1}>{item.title}</Text>
        <Text style={s.date}>{fDate(topDate)}</Text>
      </View>

      {/* Row 2: carrier + origin (date) - dest (date) */}
      {offer && (
        <View style={[s.row, { marginTop: 6, flexWrap: 'wrap', gap: 4 }]}>
          <Ionicons name="business-outline" size={13} color="rgba(255,255,255,0.4)" />
          <Text style={s.carrier}>{carrierName}</Text>
          <Text style={s.sub}>
            {'  '}{fCity(offer.route?.originCity, offer.route?.originPlace)}{originDate ? ` (${originDate})` : ''} — {fCity(offer.route?.destCity, offer.route?.destPlace)}{destDate ? ` (${destDate})` : ''}
          </Text>
        </View>
      )}

      {/* Row 3: rating + comment */}
      <View style={[s.row, { marginTop: 8, alignItems: 'flex-start' }]}>
        {offer?.review ? (
          <>
            <Stars rating={offer.review.rating} />
            {offer.review.comment ? (
              <Text style={s.comment} numberOfLines={3}>{offer.review.comment}</Text>
            ) : null}
          </>
        ) : (
          <Text style={s.noReview}>{t('archive.no_review')}</Text>
        )}
      </View>

      {/* Carrier's reply, if any */}
      {offer?.review?.reply ? (
        <View style={s.replyBox}>
          <Text style={s.replyLabel}>{t('archive.carrier_reply_label')}</Text>
          <Text style={s.replyText}>{offer.review.reply}</Text>
        </View>
      ) : null}

      {/* Row 4: actions */}
      {offer && (
        <View style={[s.row, { marginTop: 10, gap: 8 }]}>
          <TouchableOpacity
            style={s.rateBtn}
            activeOpacity={0.8}
            onPress={() => onRate({
              offerId: offer.id,
              reviewId: offer.review?.id,
              shipmentTitle: item.title,
              carrierName,
              rating: offer.review?.rating ?? 0,
              comment: offer.review?.comment ?? '',
            })}
          >
            <Text style={s.rateBtnText}>{offer.review ? t('archive.btn_edit_review') : t('archive.btn_rate')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

export default function ShipmentsArchiveScreen() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['shipments-archive'],
    queryFn: () => archiveApi.getSender().then(r => r.data.shipments),
  })

  const saveMut = useMutation({
    mutationFn: (t: ReviewTarget) =>
      t.reviewId
        ? reviewsApi.update(t.reviewId, { rating: t.rating, comment: t.comment.trim() || undefined })
        : reviewsApi.create({ offerId: t.offerId, rating: t.rating, comment: t.comment.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments-archive'] })
      setReviewTarget(null)
    },
  })

  if (isLoading) return <LoadingScreen message={t('common.loading')} />

  const shipments = data ?? []

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)' as any)} style={s.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { flex: 1 }]}>{t('archive.title')}</Text>
        {shipments.length > 0 && (
          <View style={s.countBadge}><Text style={s.countText}>{shipments.length}</Text></View>
        )}
      </View>

      <FlatList
        data={shipments}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#F59E0B" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="archive-outline" size={56} color="rgba(255,255,255,0.2)" />
            <Text style={s.emptyText}>{t('archive.empty')}</Text>
          </View>
        }
        renderItem={({ item }) => <ArchiveCard item={item} onRate={setReviewTarget} />}
      />

      {/* Review modal (create/edit) */}
      <Modal visible={!!reviewTarget} transparent animationType="slide" onRequestClose={() => setReviewTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
              <Text style={s.modalLabel}>
                {reviewTarget?.reviewId ? t('archive.edit_title') : t('archive.rate_title')}
              </Text>
              <TouchableOpacity onPress={() => setReviewTarget(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            <Text style={s.modalShipment} numberOfLines={1}>{reviewTarget?.shipmentTitle}</Text>
            <Text style={s.modalCarrier}>🚛 {reviewTarget?.carrierName}</Text>

            <View style={[s.row, { gap: 6, marginVertical: 16 }]}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => reviewTarget && setReviewTarget({ ...reviewTarget, rating: n })} hitSlop={4}>
                  <Ionicons
                    name={reviewTarget && n <= reviewTarget.rating ? 'star' : 'star-outline'}
                    size={32}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={reviewTarget?.comment ?? ''}
              onChangeText={v => reviewTarget && setReviewTarget({ ...reviewTarget, comment: v })}
              placeholder={t('archive.comment_placeholder')}
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              numberOfLines={4}
              style={s.commentInput}
              textAlignVertical="top"
            />

            <View style={[s.row, { gap: 10, marginTop: 16 }]}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setReviewTarget(null)}>
                <Text style={s.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, (saveMut.isPending || !reviewTarget || reviewTarget.rating < 1) && { opacity: 0.5 }]}
                onPress={() => reviewTarget && saveMut.mutate(reviewTarget)}
                disabled={saveMut.isPending || !reviewTarget || reviewTarget.rating < 1}
              >
                {saveMut.isPending
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={s.saveBtnText}>{t('common.save')}</Text>
                }
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
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 56, paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  backBtn:     { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  countBadge:  { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  countText:   { color: '#F59E0B', fontSize: 13, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.3)', marginTop: 12, textAlign: 'center', paddingHorizontal: 24 },

  row: { flexDirection: 'row', alignItems: 'center' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 14, marginBottom: 10,
  },
  title:   { fontSize: 15, fontWeight: '800', color: '#fff' },
  date:    { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  carrier: { fontSize: 13, fontWeight: '700', color: '#fff' },
  sub:     { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  comment: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', flex: 1, marginLeft: 8 },
  noReview:{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' },

  replyBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8, padding: 10, marginTop: 8,
  },
  replyLabel: { fontSize: 10, fontWeight: '700', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  replyText:  { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  rateBtn: {
    backgroundColor: '#F59E0B', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  rateBtnText: { fontSize: 12, fontWeight: '700', color: '#000' },

  // Review modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderBottomWidth: 0,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36,
  },
  modalLabel:    { fontSize: 16, fontWeight: '800', color: '#fff' },
  modalShipment: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8 },
  modalCarrier:  { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  commentInput: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#fff',
    minHeight: 90, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  saveBtn: {
    flex: 1, backgroundColor: '#F59E0B', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },
})
