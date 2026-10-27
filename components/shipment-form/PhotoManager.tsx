import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Image, TouchableOpacity, TextInput, Modal, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { Colors } from '@/constants/colors'
import { PhotoPermissionError, cleanRoomName, photosApi, pickPhotos, type ShipmentPhoto } from '@/lib/photos'
import type { FormT } from '@/lib/useFormT'
import { Chip, inputStyle, s } from './ui'

/**
 * Φωτογραφίες αποστολής. Απλή λίστα (PhotoUpload του web) ή, για τη μετακόμιση, ανά δωμάτιο (MovePhotoRooms του web): κάθε
 * δωμάτιο είναι κουμπί, φαίνονται οι φωτογραφίες του επιλεγμένου, και μια φωτογραφία πάει σε άλλο δωμάτιο με παρατεταμένο
 * πάτημα (αντί για το σύρσιμο του web). Η αντιστοίχιση φωτογραφίας → δωμάτιο αποθηκεύεται αμέσως.
 */
export function PhotoManager({ t, shipmentId, initialPhotos = [], rooms: withRooms = false, initialRooms = {}, maxPhotos, maxEdgePx, onPhotosChange, onRoomsChange }: {
  t: FormT
  shipmentId: string
  initialPhotos?: ShipmentPhoto[]
  rooms?: boolean
  initialRooms?: Record<string, string>
  maxPhotos: number
  maxEdgePx: number
  onPhotosChange?: (photos: ShipmentPhoto[]) => void
  onRoomsChange?: (rooms: Record<string, string>) => void
}) {
  const [photos, setPhotos] = useState<ShipmentPhoto[]>(initialPhotos)
  const photosRef = useRef(initialPhotos)
  const [rooms, setRooms] = useState<Record<string, string>>(initialRooms)
  const roomsRef = useRef(initialRooms)
  const [extraRooms, setExtraRooms] = useState<string[]>([])
  const [newRoom, setNewRoom] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)
  const roomQueue = useRef<Promise<void>>(Promise.resolve())

  const photosChangeRef = useRef(onPhotosChange)
  useEffect(() => { photosChangeRef.current = onPhotosChange })
  useEffect(() => { photosChangeRef.current?.(photos) }, [photos])

  const commitPhotos = (next: ShipmentPhoto[]) => { photosRef.current = next; setPhotos(next) }
  const commitRooms = useCallback((next: Record<string, string>) => {
    roomsRef.current = next
    setRooms(next)
    onRoomsChange?.(next)
  }, [onRoomsChange])

  /** Ορίζει (ή αφαιρεί, με '') το δωμάτιο μιας φωτογραφίας: στην οθόνη αμέσως, στον server με τη σειρά που έγιναν */
  const saveRoom = useCallback((photoId: string, room: string) => {
    const name = cleanRoomName(room)
    if ((roomsRef.current[photoId] ?? '') === name) return
    const next = { ...roomsRef.current }
    if (name) next[photoId] = name
    else delete next[photoId]
    commitRooms(next)
    roomQueue.current = roomQueue.current.then(async () => {
      try { await photosApi.setRoom(shipmentId, photoId, name || null) }
      catch { Alert.alert('', t('photoUpload.error_room')) }
    })
  }, [commitRooms, shipmentId, t])

  const roomOf = (photoId: string) => rooms[photoId] ?? ''
  const named: string[] = []
  if (withRooms) {
    for (const p of photos) { const r = roomOf(p.id); if (r && !named.includes(r)) named.push(r) }
    for (const r of extraRooms) if (!named.some(n => n.toLowerCase() === r.toLowerCase())) named.push(r)
  }
  const groups = withRooms ? [...named, ...(photos.some(p => !roomOf(p.id)) ? [''] : [])] : ['']
  const active = selected !== null && groups.includes(selected) ? selected : groups[0]
  const suggestions = t('photoUpload.room_suggestions').split('|').filter(x => x && !named.some(n => n.toLowerCase() === x.toLowerCase()))
  const full = photos.length >= maxPhotos

  async function upload(source: 'camera' | 'gallery') {
    const room = withRooms ? (active ?? '') : ''
    setBusy(true)
    try {
      const uris = await pickPhotos(source, maxEdgePx, maxPhotos - photosRef.current.length)
      for (const uri of uris) {
        if (photosRef.current.length >= maxPhotos) { Alert.alert('', t('photoUpload.error_max')); break }
        const photo = await photosApi.upload(shipmentId, uri)
        commitPhotos([...photosRef.current, photo])
        if (room) saveRoom(photo.id, room)
      }
    } catch (e) {
      if (e instanceof PhotoPermissionError) Alert.alert('', t(source === 'camera' ? 'mobile.permission_camera' : 'mobile.permission_gallery'))
      else Alert.alert('', e instanceof Error && e.message ? e.message : t('photoUpload.error_upload'))
    } finally {
      setBusy(false)
    }
  }

  function chooseSource() {
    Alert.alert(t('mobile.photo_source'), undefined, [
      { text: t('mobile.camera'), onPress: () => upload('camera') },
      { text: t('mobile.gallery'), onPress: () => upload('gallery') },
      { text: t('mobile.cancel'), style: 'cancel' },
    ])
  }

  function deletePhoto(photoId: string) {
    Alert.alert(t('photoUpload.delete_confirm'), undefined, [
      { text: t('mobile.cancel'), style: 'cancel' },
      {
        text: t('mobile.delete'), style: 'destructive', onPress: async () => {
          try {
            await photosApi.remove(shipmentId, photoId)
            commitPhotos(photosRef.current.filter(p => p.id !== photoId))
            if (photoId in roomsRef.current) {
              const next = { ...roomsRef.current }
              delete next[photoId]
              commitRooms(next)
            }
          } catch { /* η φωτογραφία μένει όπως ήταν */ }
        },
      },
    ])
  }

  /** Μεταφορά σε άλλο δωμάτιο· το δωμάτιο που αδειάζει μένει (ο χρήστης μπορεί να θέλει να το ξαναγεμίσει) */
  function movePhoto(photoId: string, to: string) {
    const from = roomOf(photoId)
    setMoving(null)
    if (from === to) return
    if (from && photos.filter(p => roomOf(p.id) === from).length === 1) setExtraRooms(prev => (prev.some(r => r.toLowerCase() === from.toLowerCase()) ? prev : [...prev, from]))
    saveRoom(photoId, to)
  }

  function addRoom(raw: string) {
    const name = cleanRoomName(raw)
    if (!name) return
    const existing = named.find(n => n.toLowerCase() === name.toLowerCase())
    if (!existing) setExtraRooms(prev => [...prev, name])
    setSelected(existing ?? name)
    setNewRoom(null)
  }

  const shown = photos.filter(p => !withRooms || roomOf(p.id) === active)

  return (
    <View>
      {withRooms && (
        <>
          <View style={[s.row, { alignItems: 'center', marginBottom: 10 }]}>
            {newRoom === null ? (
              <TouchableOpacity onPress={() => setNewRoom('')} style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.accent, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#B45309' }}>+ {t('photoUpload.add_room')}</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>{photos.length}/{maxPhotos}</Text>
          </View>
          {newRoom !== null && (
            <View style={{ marginBottom: 10 }}>
              <View style={[s.row, { alignItems: 'center' }]}>
                <TextInput autoFocus style={[inputStyle, { flex: 1, paddingVertical: 8 }]} maxLength={60} value={newRoom} onChangeText={setNewRoom}
                  placeholder={t('photoUpload.add_room_ph')} placeholderTextColor="#94A3B8" onSubmitEditing={() => addRoom(newRoom)} />
                <TouchableOpacity onPress={() => addRoom(newRoom)} disabled={!cleanRoomName(newRoom)}
                  style={{ backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, opacity: cleanRoomName(newRoom) ? 1 : 0.4 }}>
                  <Text style={{ fontWeight: '700', color: '#000' }}>{t('photoUpload.add_room_confirm')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setNewRoom(null)} style={{ padding: 8 }}><Text style={{ color: '#64748B' }}>✕</Text></TouchableOpacity>
              </View>
              <View style={[s.wrap, { marginTop: 8 }]}>
                {suggestions.map(x => <Chip key={x} label={`+ ${x}`} onPress={() => addRoom(x)} />)}
              </View>
            </View>
          )}
          {named.length === 0 && photos.length === 0 ? (
            <Text style={[s.hint, { marginBottom: 10 }]}>{t('photoUpload.rooms_empty')}</Text>
          ) : (
            <View style={[s.wrap, { marginBottom: 10 }]}>
              {groups.map(room => (
                <Chip key={room || '__none'} active={room === active}
                  label={`${room || t('photoUpload.no_room')} (${photos.filter(p => roomOf(p.id) === room).length})`}
                  onPress={() => setSelected(room)} />
              ))}
            </View>
          )}
        </>
      )}

      {shown.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {shown.map(photo => (
            <TouchableOpacity key={photo.id} onPress={() => setLightbox(photo.url)} onLongPress={withRooms ? () => setMoving(photo.id) : undefined} activeOpacity={0.85}>
              <Image source={{ uri: photo.url }} style={{ width: 92, height: 92, borderRadius: 12, backgroundColor: '#E2E8F0' }} />
              <TouchableOpacity onPress={() => deletePhoto(photo.id)} hitSlop={6}
                style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12 }}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {(!withRooms || groups.length > 0 || named.length > 0) && (
        <View style={[s.row, { alignItems: 'center' }]}>
          <TouchableOpacity onPress={chooseSource} disabled={full || busy}
            style={{ borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, opacity: full || busy ? 0.5 : 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {busy && <ActivityIndicator size="small" color={Colors.primary} />}
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{busy ? t('photoUpload.compressing') : `📷 ${t('photoUpload.add_photos')}`}</Text>
          </TouchableOpacity>
          {!withRooms && <Text style={{ fontSize: 12, color: '#94A3B8' }}>{photos.length}/{maxPhotos}</Text>}
        </View>
      )}
      {full && <Text style={[s.hint, { marginTop: 6 }]}>{t('photoUpload.max_reached')}</Text>}
      {withRooms && photos.length > 0 && <Text style={[s.hint, { marginTop: 8 }]}>{t('mobile.move_hint')}</Text>}

      <Modal visible={lightbox !== null} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 }} onPress={() => setLightbox(null)}>
          {lightbox && <Image source={{ uri: lightbox }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
        </Pressable>
      </Modal>

      <Modal visible={moving !== null} transparent animationType="fade" onRequestClose={() => setMoving(null)}>
        <Pressable style={s.backdrop} onPress={() => setMoving(null)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>{t('mobile.move_to_room')}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {[...named, ''].filter(r => moving === null || r !== roomOf(moving)).map(r => (
                <TouchableOpacity key={r || '__none'} style={s.option} onPress={() => moving && movePhoto(moving, r)}>
                  <Text style={s.optionTxt}>{r || t('photoUpload.no_room')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
