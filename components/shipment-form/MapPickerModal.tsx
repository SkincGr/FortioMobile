import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, Platform } from 'react-native'
import MapView, { Marker, type LatLng, type Region } from 'react-native-maps'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import type { FormT } from '@/lib/useFormT'

// Κέντρο της Ελλάδας όταν δεν υπάρχει τίποτα να κεντράρει ο χάρτης (το web ξεκινά επίσης σε zoom χώρας)
const GREECE: Region = { latitude: 38.6, longitude: 23.6, latitudeDelta: 7, longitudeDelta: 7 }
const CLOSE = { latitudeDelta: 0.02, longitudeDelta: 0.02 }

/**
 * Επιλογή συντεταγμένων σε χάρτη, όπως το MapPickerModal του web: ο δείκτης μπαίνει με πάτημα στον χάρτη ή μετακινείται με
 * σύρσιμο, και η θέση του είναι οι συντεταγμένες. Η αναζήτηση μόνο μετακινεί τον χάρτη σε μια περιοχή.
 *
 * Το web κεντράρει στο place id της διεύθυνσης με το Google Places JS. Εδώ το ίδιο γίνεται με τον geocoder της συσκευής
 * (expo-location) πάνω στο κείμενο της διεύθυνσης και της πόλης, ώστε να μη χρειάζεται κλειδί Google στην εφαρμογή.
 */
export function MapPickerModal({ t, open, title, initialLat, initialLng, focusText, onClose, onSelect }: {
  t: FormT
  open: boolean
  title: string
  initialLat?: number | null
  initialLng?: number | null
  /** Π.χ. «Ερμού 5, Αθήνα»: πού να ανοίξει ο χάρτης όταν δεν υπάρχουν ακόμα συντεταγμένες */
  focusText?: string
  onClose: () => void
  onSelect: (lat: number, lng: number) => void
}) {
  const mapRef = useRef<MapView>(null)
  const [picked, setPicked] = useState<LatLng | null>(null)
  const [region, setRegion] = useState<Region | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const geocode = async (text: string): Promise<LatLng | null> => {
    try {
      const [hit] = await Location.geocodeAsync(text)
      return hit ? { latitude: hit.latitude, longitude: hit.longitude } : null
    } catch {
      return null
    }
  }

  // Κάθε άνοιγμα: οι υπάρχουσες συντεταγμένες, αλλιώς η διεύθυνση της φόρμας, αλλιώς η Ελλάδα
  useEffect(() => {
    if (!open) return
    setQuery(''); setNotFound(false)
    const start = initialLat != null && initialLng != null && Number.isFinite(initialLat) && Number.isFinite(initialLng)
      ? { latitude: initialLat, longitude: initialLng } : null
    setPicked(start)
    if (start) { setRegion({ ...start, ...CLOSE }); return }
    if (!focusText?.trim()) { setRegion(GREECE); return }
    setRegion(null)
    let cancelled = false
    geocode(focusText).then(hit => { if (!cancelled) setRegion(hit ? { ...hit, ...CLOSE } : GREECE) })
    return () => { cancelled = true }
  }, [open, initialLat, initialLng, focusText])

  const moveTo = (point: LatLng) => mapRef.current?.animateToRegion({ ...point, ...CLOSE }, 400)

  async function search() {
    if (!query.trim()) return
    setBusy(true); setNotFound(false)
    const hit = await geocode(query)
    setBusy(false)
    if (hit) moveTo(hit)
    else setNotFound(true)
  }

  async function myLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return
    setBusy(true)
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const point = { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
      setPicked(point)
      moveTo(point)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.header}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
        </View>

        <View style={s.searchRow}>
          <TextInput
            style={s.search} value={query} onChangeText={v => { setQuery(v); setNotFound(false) }} onSubmitEditing={search}
            placeholder={t('mobile.map_search_ph')} placeholderTextColor="#94A3B8" returnKeyType="search"
          />
          <TouchableOpacity style={s.goBtn} onPress={search} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color="#000" /> : <Text style={s.goTxt}>{t('mobile.map_search_go')}</Text>}
          </TouchableOpacity>
        </View>
        {notFound && <Text style={s.notFound}>{t('mobile.map_not_found')}</Text>}

        <View style={{ flex: 1 }}>
          {region ? (
            <MapView
              // initialRegion διαβάζεται μόνο στο mount: νέο κέντρο (νέο άνοιγμα ή geocode) = νέος χάρτης
              key={`${region.latitude},${region.longitude},${region.latitudeDelta}`}
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={region}
              onPress={e => setPicked(e.nativeEvent.coordinate)}
              showsUserLocation
              toolbarEnabled={false}
            >
              {picked && <Marker coordinate={picked} draggable onDragEnd={e => setPicked(e.nativeEvent.coordinate)} pinColor={Colors.accent} />}
            </MapView>
          ) : (
            <View style={s.loading}><ActivityIndicator color={Colors.primary} /></View>
          )}
          <TouchableOpacity style={s.myLocation} onPress={myLocation} activeOpacity={0.85}>
            <Text style={s.myLocationTxt}>{t('mobile.map_my_location')}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.hint}>{t('mobile.map_hint')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}><Text style={s.cancelTxt}>{t('mobile.cancel')}</Text></TouchableOpacity>
            <TouchableOpacity
              style={[s.useBtn, !picked && { opacity: 0.35 }]} disabled={!picked}
              onPress={() => { if (picked) { onSelect(picked.latitude, picked.longitude); onClose() } }}
            >
              <Text style={s.useTxt} numberOfLines={2}>
                {picked ? `${t('mobile.map_use')} (${picked.latitude.toFixed(5)}, ${picked.longitude.toFixed(5)})` : t('mobile.map_pick')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#fff' },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.primary, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 14, paddingHorizontal: 16 },
  title:     { flex: 1, color: '#fff', fontSize: 17, fontWeight: '800' },
  searchRow: { flexDirection: 'row', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  search:    { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1E293B', backgroundColor: '#FAFAFA' },
  goBtn:     { backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', minWidth: 72, alignItems: 'center' },
  goTxt:     { color: '#000', fontWeight: '700' },
  notFound:  { color: Colors.danger, fontSize: 12, paddingHorizontal: 12, paddingTop: 6 },
  loading:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  myLocation:{ position: 'absolute', right: 12, bottom: 12, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: Colors.border, elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  myLocationTxt: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  footer:    { padding: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  hint:      { fontSize: 12, color: '#64748B' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { fontWeight: '700', color: '#475569' },
  useBtn:    { flex: 2, backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  useTxt:    { fontWeight: '800', color: '#000', textAlign: 'center', fontSize: 13 },
})
