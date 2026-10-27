import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import * as Location from 'expo-location'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { shipmentsApi, profileApi } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useFormT, type FormT } from '@/lib/useFormT'
import { PlacesInput } from '@/components/PlacesInput'
import { Colors } from '@/constants/colors'
import { FORM_CATEGORY_ORDER, normalizeCategories, toggleCategory } from '@/lib/shared/shipmentCategories'
import { anySupportsInventory, cargoUpdateFromItems, normalizeCargoCard, type CargoUpdate } from '@/lib/shared/cargoInventory'
import { emptyRental, normalizeRental } from '@/lib/shared/rentalCard'
import { emptyBoat, emptyTransport, emptyVehicle, normalizeBoat, normalizeTransport, normalizeVehicle, shipmentSizeFromCards } from '@/lib/shared/transportCards'
import { applyMyAddress, canUseMyAddress, hasProfileAddress, isMyAddress, sideFields, type AddressSide, type ProfileAddress } from '@/lib/shared/myAddress'
import { BINS_TITLE, BIN_SIZES, binSizeLabel, isBinsCategory, normalizeBinDetails } from '@/lib/shared/carrierCard'
import { MOVE_TITLE, emptyMoveDetails, isMoveCategory, normalizeMoveDetails, type MoveDetails } from '@/lib/shared/moveCard'
import { volumeEstimateOf } from '@/lib/shared/moveVolume'
import { maxPhotosFor, photoMaxEdgeFor } from '@/lib/shared/photoLimits'
import { planAnalysis } from '@/lib/shared/moveInventoryMerge'
import type { ShipmentPhoto } from '@/lib/photos'
import { ChoiceField, Collapsible, errorBorder, inputStyle } from '@/components/shipment-form/ui'
import { CargoItemsSection, MoveAddressFields, MoveItemsSection } from '@/components/shipment-form/MoveCardFields'
import { BoatSection, TransportSection, VehicleSection } from '@/components/shipment-form/VehicleBoatFields'
import { RentalSection } from '@/components/shipment-form/RentalFields'
import { PhotoManager } from '@/components/shipment-form/PhotoManager'
import { MoveInventoryAnalysis } from '@/components/shipment-form/MoveInventoryAnalysis'
import { MoveCardSummary, TransportCardSummary } from '@/components/shipment-form/CardSummary'
import { MapPickerModal } from '@/components/shipment-form/MapPickerModal'

// Η φόρμα ακολουθεί το components/ShipmentForm.tsx του Fortio: ίδιες κατηγορίες (πολλαπλή επιλογή), ίδιοι κανόνες ανά
// κατηγορία (Μετακόμιση, Κάδοι, Όχημα/Σκάφος, Ενοικίαση) και ίδιο σώμα αιτήματος, με τις βιβλιοθήκες του lib/shared.

const CATEGORY_META: Record<string, { icon: string; key: string }> = {
  FURNITURE: { icon: '🛋️', key: 'furniture' }, APPLIANCES: { icon: '🔌', key: 'appliances' }, ELECTRONICS: { icon: '💻', key: 'electronics' },
  BOXES: { icon: '🧳', key: 'boxes' }, SMALL_PACKAGE: { icon: '📦', key: 'small_package' }, HOUSE_MOVE: { icon: '🏠', key: 'house_move' },
  VEHICLE_RENTAL: { icon: '🚐', key: 'vehicle_rental' }, WASTE_BINS: { icon: '🗑️', key: 'waste_bins' }, MACHINERY: { icon: '⚙️', key: 'machinery' },
  FOOD: { icon: '🥩', key: 'food' }, HAZARDOUS: { icon: '⚠️', key: 'hazardous' }, VEHICLE: { icon: '🚗', key: 'vehicle' },
  BOAT: { icon: '⛵', key: 'boat' }, OTHER: { icon: '🗃️', key: 'other' },
  // Παλιές αποστολές: δεν προσφέρεται πια, αλλά η επεξεργασία μιας υπάρχουσας τη δείχνει
  COURIER: { icon: '🛵', key: 'courier' },
}
const catLabel = (t: FormT, id: string) => (CATEGORY_META[id] ? t(`shipmentForm.cat_${CATEGORY_META[id].key}`) : id)

// Σε ποιο βήμα ανήκει ένα πεδίο που απέρριψε ο server, ώστε η φόρμα να γυρίσει εκεί
const STEP1_FIELDS = ['category', 'title', 'description']
const STEP2_FIELDS = [
  'originCity', 'originCityPlaceId', 'originAddress', 'originAddressPlaceId', 'originLat', 'originLng',
  'destCity', 'destCityPlaceId', 'destAddress', 'destAddressPlaceId', 'destLat', 'destLng',
  'recipientName', 'recipientPhone', 'recipientEmail', 'desiredDelivery', 'loadingInfo',
]
const stepOfField = (field: string) => (STEP1_FIELDS.includes(field) ? 1 : STEP2_FIELDS.includes(field) ? 2 : 3)

type Form = {
  category: string
  categories: string[]
  title: string; description: string
  originCity: string; originCityPlaceId: string; originAddress: string; originAddressPlaceId: string; originLat: string; originLng: string
  destCity: string; destCityPlaceId: string; destAddress: string; destAddressPlaceId: string; destLat: string; destLng: string
  recipientName: string; recipientPhone: string; recipientEmail: string; recipientSameAsSender: boolean
  desiredDelivery: Date | null
  weight: string; volume: string; length: string; width: string; height: string
  isFragile: boolean; requiresCooling: boolean; isHazardous: boolean
  maxBudget: string; loadingInfo: string
  cardDetails: MoveDetails
  vehicle: ReturnType<typeof emptyVehicle>; boat: ReturnType<typeof emptyBoat>; transport: ReturnType<typeof emptyTransport>; rental: ReturnType<typeof emptyRental>
}

const initialForm = (): Form => ({
  category: '', categories: [], title: '', description: '',
  originCity: '', originCityPlaceId: '', originAddress: '', originAddressPlaceId: '', originLat: '', originLng: '',
  destCity: '', destCityPlaceId: '', destAddress: '', destAddressPlaceId: '', destLat: '', destLng: '',
  recipientName: '', recipientPhone: '', recipientEmail: '', recipientSameAsSender: false,
  desiredDelivery: null,
  weight: '', volume: '', length: '', width: '', height: '',
  isFragile: false, requiresCooling: false, isHazardous: false,
  maxBudget: '', loadingInfo: '',
  cardDetails: emptyMoveDetails(),
  vehicle: emptyVehicle(), boat: emptyBoat(), transport: emptyTransport(), rental: emptyRental(),
})

/** Ημερομηνία σε YYYY-MM-DD με την τοπική ώρα (το toISOString θα την πήγαινε μία μέρα πίσω τα ξημερώματα) */
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const LOCALES = { el: 'el-GR', en: 'en-GB', fr: 'fr-FR' } as const

function Field({ label, optional, t, children }: { label: string; optional?: boolean; t: FormT; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
        {label}{optional ? <Text style={{ fontWeight: '400', color: '#94A3B8' }}> {t('shipmentForm.optional')}</Text> : null}
      </Text>
      {children}
    </View>
  )
}

function ErrorBox({ t, issues }: { t: FormT; issues: string[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
      <Text style={{ color: Colors.danger, fontSize: 15 }}>⚠</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '600' }}>{t('shipmentForm.errors_fill')}</Text>
        {issues.map(m => <Text key={m} style={{ color: '#DC2626', fontSize: 12, marginTop: 3 }}>• {m}</Text>)}
      </View>
    </View>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
      <Text style={{ fontSize: 13, color: '#64748B', flexShrink: 0 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: accent ? Colors.accent : '#1E293B', flex: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  )
}

function Checkbox({ checked, label, onPress, disabled }: { checked: boolean; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: disabled ? 0.4 : 1 }}>
      <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', borderColor: checked ? Colors.accent : '#CBD5E1', backgroundColor: checked ? Colors.accent : 'transparent' }}>
        {checked && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>}
      </View>
      <Text style={{ fontSize: 13, color: '#334155', fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  )
}

function BackNext({ t, onBack, onNext, nextLabel, busy }: { t: FormT; onBack: () => void; onNext: () => void; nextLabel?: string; busy?: boolean }) {
  return (
    <View className="flex-row gap-3 mt-2">
      <TouchableOpacity className="flex-1 border border-slate-200 rounded-2xl py-4 items-center bg-white" onPress={onBack} disabled={busy} activeOpacity={0.8}>
        <Text className="font-bold text-slate-600">{t('shipmentForm.btn_back')}</Text>
      </TouchableOpacity>
      <TouchableOpacity className={`flex-1 rounded-2xl py-4 items-center ${busy ? 'bg-primary/50' : 'bg-primary'}`} onPress={onNext} disabled={busy} activeOpacity={0.85}>
        <Text className="font-bold text-white">{nextLabel ?? t('shipmentForm.btn_continue')}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Συντεταγμένες: χάρτης (όπως το web), τρέχουσα τοποθεσία ή χειροκίνητα ─────────────────────────────────────────────

function CoordGroup({ t, title, latValue, lngValue, latPh, lngPh, onLatChange, onLngChange, onOpenMap }: {
  t: FormT; title: string; latValue: string; lngValue: string; latPh: string; lngPh: string
  onLatChange: (v: string) => void; onLngChange: (v: string) => void; onOpenMap: () => void
}) {
  const latRef = useRef<TextInput>(null)
  const lngRef = useRef<TextInput>(null)
  const skipAlert = useRef<'lat' | 'lng' | null>(null)

  function showPrompt(field: 'lat' | 'lng') {
    const ref = field === 'lat' ? latRef : lngRef
    ref.current?.blur()
    Alert.alert(t('mobile.coords_title'), t('mobile.coords_prompt'), [
      {
        text: t('mobile.coords_current'),
        onPress: async () => {
          const { status } = await Location.requestForegroundPermissionsAsync()
          if (status !== 'granted') { Alert.alert(t('mobile.location_denied_title'), t('mobile.location_denied')); return }
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
          onLatChange(loc.coords.latitude.toFixed(6))
          onLngChange(loc.coords.longitude.toFixed(6))
        },
      },
      { text: t('mobile.coords_manual'), onPress: () => { skipAlert.current = field; setTimeout(() => ref.current?.focus(), 150) } },
      { text: t('mobile.cancel'), style: 'cancel' },
    ])
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: '#94A3B8' }}>
          {title} <Text style={{ fontWeight: '400' }}>{t('shipmentForm.coord_note')}</Text>
        </Text>
        <TouchableOpacity onPress={onOpenMap} hitSlop={8}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>📍 {t('shipmentForm.btn_find_on_map')}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['lat', 'lng'] as const).map(f => (
          <TextInput
            key={f} ref={f === 'lat' ? latRef : lngRef}
            style={[inputStyle, { flex: 1, fontSize: 13 }]}
            placeholder={f === 'lat' ? latPh : lngPh} placeholderTextColor="#94A3B8"
            value={f === 'lat' ? latValue : lngValue} onChangeText={f === 'lat' ? onLatChange : onLngChange}
            keyboardType="decimal-pad"
            onFocus={() => { if (skipAlert.current === f) { skipAlert.current = null; return } showPrompt(f) }}
          />
        ))}
      </View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NewShipmentScreen() {
  const t = useFormT()
  const { language } = useI18n()
  const locale = LOCALES[language]
  const qc = useQueryClient()
  const { editId } = useLocalSearchParams<{ editId?: string }>()
  const isEditing = !!editId

  const [step, setStep]                 = useState(1)
  const [form, setForm]                 = useState<Form>(initialForm)
  const [binSize, setBinSize]           = useState('')
  const [durationDays, setDurationDays] = useState('')
  const [createdId, setCreatedId]       = useState<string | null>(null)
  const [savedList, setSavedList]       = useState<string | null>(null)
  const [initialPhotos, setInitialPhotos] = useState<ShipmentPhoto[]>([])
  const [currentPhotos, setCurrentPhotos] = useState<ShipmentPhoto[] | null>(null)
  const [photosOpen, setPhotosOpen]     = useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]               = useState('')
  const [fieldErrors, setFieldErrors]   = useState<Record<string, string>>({})
  const [showErrors, setShowErrors]     = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [mapTarget, setMapTarget]       = useState<'origin' | 'dest' | null>(null)
  const [listSaving, setListSaving]     = useState(false)
  const [listMessage, setListMessage]   = useState<{ ok: boolean; text: string } | null>(null)
  // Οι διαστάσεις που έβαλε η λίστα αντικειμένων, ώστε ο αυτόματος όγκος να μην τις θεωρήσει δικές του
  const listDimsKey = useRef<string | null>(null)

  // Νέα αποστολή: η φόρμα αδειάζει κάθε φορά που ανοίγει η οθόνη
  useFocusEffect(
    useCallback(() => {
      if (!isEditing) {
        setStep(1); setForm(initialForm()); setBinSize(''); setDurationDays('')
        setCreatedId(null); setSavedList(null); setCurrentPhotos(null); setPhotosOpen(null)
        setError(''); setFieldErrors({}); setShowErrors(false); setListMessage(null)
      }
    }, [isEditing])
  )

  const { data: existing } = useQuery({
    queryKey: ['shipment', editId],
    queryFn: () => shipmentsApi.get(editId!).then(r => r.data as any),
    enabled: !!editId,
  })

  const { data: profile } = useQuery({
    queryKey: ['sender-profile'],
    queryFn: () => profileApi.get().then(r => r.data),
  })
  const senderProfile = { name: profile?.name ?? '', phone: profile?.phone ?? '', email: profile?.email ?? '' }
  const profileAddress: ProfileAddress | null = profile
    ? { city: profile.city ?? '', cityPlaceId: profile.cityPlaceId ?? '', address: profile.address ?? '', addressPlaceId: profile.addressPlaceId ?? '' }
    : null

  useEffect(() => {
    if (!profile) return
    setForm(f => f.recipientSameAsSender
      ? { ...f, recipientName: profile.name ?? '', recipientPhone: profile.phone ?? '', recipientEmail: profile.email ?? '' }
      : f)
  }, [profile, form.recipientSameAsSender])

  useEffect(() => {
    if (!existing) return
    const d = existing
    const card = normalizeMoveDetails(d.cardDetails)
    setForm({
      category: d.category || '',
      categories: normalizeCategories(d.category, d.categories).categories,
      title: isMoveCategory(d.category) ? MOVE_TITLE : isBinsCategory(d.category) ? BINS_TITLE : (d.title || ''),
      description: d.description || '',
      originCity: d.originCity || '',
      originCityPlaceId: d.originCityPlaceId || d.originPlaceId || d.originPlace?.googlePlaceId || '',
      originAddress: d.originAddress || '', originAddressPlaceId: d.originAddressPlaceId || '',
      originLat: d.originLat?.toString() || '', originLng: d.originLng?.toString() || '',
      destCity: d.destCity || '',
      destCityPlaceId: d.destCityPlaceId || d.destPlaceId || d.destPlace?.googlePlaceId || '',
      destAddress: d.destAddress || '', destAddressPlaceId: d.destAddressPlaceId || '',
      destLat: d.destLat?.toString() || '', destLng: d.destLng?.toString() || '',
      recipientName: d.recipientName || '', recipientPhone: d.recipientPhone || '', recipientEmail: d.recipientEmail || '',
      recipientSameAsSender: d.recipientSameAsSender || false,
      desiredDelivery: d.desiredDelivery ? new Date(d.desiredDelivery) : null,
      weight: d.weight?.toString() || '', volume: d.volume?.toString() || '',
      length: d.length?.toString() || '', width: d.width?.toString() || '', height: d.height?.toString() || '',
      isFragile: d.isFragile || false, requiresCooling: d.requiresCooling || false, isHazardous: d.isHazardous || false,
      maxBudget: d.maxBudget?.toString() || '', loadingInfo: d.loadingInfo || '',
      cardDetails: card,
      vehicle: normalizeVehicle(d.cardDetails?.vehicle), boat: normalizeBoat(d.cardDetails?.boat),
      transport: normalizeTransport(d.cardDetails?.transport), rental: normalizeRental(d.cardDetails?.rental),
    })
    setSavedList(JSON.stringify([card.furniture, card.appliances, card.otherItems, card.analyzedPhotoIds]))
    const bins = isBinsCategory(d.category) ? normalizeBinDetails(d.cardDetails) : null
    setBinSize(bins?.binSize ?? '')
    setDurationDays(bins?.durationDays ? String(bins.durationDays) : '')
    setInitialPhotos(Array.isArray(d.photos) ? d.photos.filter((p: any) => p?.id && p?.url).map((p: any) => ({ id: p.id, url: p.url })) : [])
  }, [existing])

  // Αυτόματος όγκος από τις διαστάσεις (εκτός αν τις έβαλε η λίστα αντικειμένων)
  useEffect(() => {
    const l = parseFloat(form.length), w = parseFloat(form.width), h = parseFloat(form.height)
    if (l && w && h && listDimsKey.current !== `${form.length}|${form.width}|${form.height}`) {
      setForm(prev => ({ ...prev, volume: String((l * w * h) / 1000000) }))
    }
  }, [form.length, form.width, form.height])

  const update = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm(f => ({ ...f, [k]: v }))
    if (fieldErrors[k]) setFieldErrors(p => { const n = { ...p }; delete n[k]; return n })
  }
  const setMove = (patch: (d: MoveDetails) => MoveDetails) => setForm(f => ({ ...f, cardDetails: patch(f.cardDetails) }))

  const isMove = isMoveCategory(form.category)
  const isBins = isBinsCategory(form.category)
  const isRental = form.category === 'VEHICLE_RENTAL' || form.categories.includes('VEHICLE_RENTAL')
  const picked = form.categories.length > 0 ? form.categories : form.category ? [form.category] : []
  const hasVehicle = picked.includes('VEHICLE')
  const hasBoat = picked.includes('BOAT')
  const hasRental = picked.includes('VEHICLE_RENTAL')
  const inventoryFlow = anySupportsInventory(picked)

  // Πολλαπλή επιλογή· Μετακόμιση/Κάδοι κλειδώνουν τον τίτλο, και ο αυτόματος τίτλος σβήνει όταν αλλάξει η κατηγορία
  function selectCategory(id: string) {
    setForm(f => {
      const categories = toggleCategory(f.categories, id)
      const category = categories[0] ?? ''
      let title = f.title
      if (isMoveCategory(category)) title = MOVE_TITLE
      else if (isBinsCategory(category)) title = BINS_TITLE
      else if ((isMoveCategory(f.category) && f.title === MOVE_TITLE) || (isBinsCategory(f.category) && f.title === BINS_TITLE)) title = ''
      return { ...f, category, categories, title }
    })
    setFieldErrors(p => { const n = { ...p }; delete n.category; delete n.title; return n })
  }

  // «Η Διεύθυνσή μου»: η διεύθυνση του προφίλ σε μία πλευρά (ποτέ και στις δύο)
  function MyAddressToggle({ side }: { side: AddressSide }) {
    const checked = isMyAddress(sideFields(form, side), profileAddress)
    const usable = checked || canUseMyAddress(form, side, profileAddress)
    return (
      <View style={{ alignItems: 'flex-end' }}>
        <Checkbox checked={checked} disabled={!usable} label={t('shipmentForm.my_address')} onPress={() => setForm(f => applyMyAddress(f, side, profileAddress, !checked))} />
        {profileAddress && !hasProfileAddress(profileAddress) && <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{t('shipmentForm.my_address_missing')}</Text>}
      </View>
    )
  }

  type Issue = { key: string; message: string }
  const stepIssues = (n: number): Issue[] => {
    const fill = t('shipmentForm.issue_fill'), pick = t('shipmentForm.issue_pick'), google = t('shipmentForm.city_pick_google')
    const issues: Issue[] = []
    const add = (key: string, message: string) => issues.push({ key, message })
    if (n === 1) {
      if (!form.category) add('category', `${t('shipmentForm.step_category')}: ${pick}`)
      if (!form.title.trim()) add('title', `${t('shipmentForm.title_label')}: ${fill}`)
    }
    if (n === 2) {
      if (!isBins) {
        if (!form.originCity) add('originCity', `${t('location.origin')}: ${fill}`)
        else if (!form.originCityPlaceId) add('originCityPlaceId', `${t('location.origin')}: ${google}`)
        if (!isRental && !form.originAddress.trim()) add('originAddress', `${t('location.pickup_address')}: ${fill}`)
      }
      if (!isRental && !form.destCity) add('destCity', `${t('location.destination')}: ${fill}`)
      else if (!isRental && !form.destCityPlaceId) add('destCityPlaceId', `${t('location.destination')}: ${google}`)
      if (!isRental && !form.destAddress.trim()) add('destAddress', `${t('location.delivery_address')}: ${fill}`)
      if (!form.recipientName.trim()) add('recipientName', `${t('shipmentForm.recipient_name_label')}: ${fill}`)
      if (!form.recipientPhone.trim()) add('recipientPhone', `${t('shipmentForm.recipient_phone_label')}: ${fill}`)
      if (!form.desiredDelivery) add('desiredDelivery', `${t('shipmentForm.delivery_date_label')}: ${fill}`)
    }
    return issues
  }
  const issues = stepIssues(step)
  const missing = (...keys: string[]) => (showErrors && issues.some(i => keys.includes(i.key))) || keys.some(k => fieldErrors[k])
  const tryAdvance = (next: number) => {
    if (issues.length > 0) { setShowErrors(true); return }
    setShowErrors(false)
    setStep(next)
  }

  // ── Λίστα αντικειμένων (αυτόματη καταγραφή) ──
  const EMPTY_LIST = JSON.stringify([[], [], [], []])
  const listSnapshot = () => JSON.stringify([form.cardDetails.furniture, form.cardDetails.appliances, form.cardDetails.otherItems, form.cardDetails.analyzedPhotoIds])
  const listBaseline = savedList ?? (isEditing ? null : EMPTY_LIST)
  const listDirty = listBaseline !== null && listSnapshot() !== listBaseline
  const cargoUpdateNow = () => (!isMove && inventoryFlow && listDirty
    ? cargoUpdateFromItems([...form.cardDetails.furniture, ...form.cardDetails.appliances, ...form.cardDetails.otherItems], form.description)
    : null)
  const cargoFieldsOf = (u: CargoUpdate | null) => (u ? { description: u.description, ...(u.volume !== null ? { volume: u.volume } : {}), ...(u.weight !== null ? { weight: u.weight } : {}), ...(u.dimensions ?? {}) } : {})
  const applyCargoFields = (u: CargoUpdate) => {
    if (u.dimensions) listDimsKey.current = `${u.dimensions.length}|${u.dimensions.width}|${u.dimensions.height}`
    setForm(f => ({ ...f, ...cargoFieldsOf(u) }))
  }

  /** Το σώμα του αιτήματος αποθήκευσης — ίδιο με το buildBody του web */
  const buildBody = (cargoUpdate: CargoUpdate | null = cargoUpdateNow()) => {
    const moveVolume = isMove ? volumeEstimateOf(form.cardDetails) : null
    const { desiredDelivery, vehicle, boat, transport, rental, ...rest } = form
    return {
      ...rest,
      desiredDelivery: desiredDelivery ? localDay(desiredDelivery) : '',
      // Κάδοι: χωρίς αφετηρία — αντιγράφεται ο προορισμός
      ...(isBins ? {
        originCity: form.destCity, originCityPlaceId: form.destCityPlaceId,
        originAddress: form.destAddress, originAddressPlaceId: form.destAddressPlaceId,
        originLat: form.destLat, originLng: form.destLng,
      } : {}),
      // Ενοικίαση: μόνο πόλη παραλαβής — ο προορισμός είναι η ίδια πόλη, χωρίς διευθύνσεις και συντεταγμένες
      ...(isRental ? {
        destCity: form.originCity, destCityPlaceId: form.originCityPlaceId,
        originAddress: '', originAddressPlaceId: '', destAddress: '', destAddressPlaceId: '',
        originLat: '', originLng: '', destLat: '', destLng: '',
      } : {}),
      ...(moveVolume ? { volume: String(moveVolume.loadM3) } : {}),
      ...cargoFieldsOf(cargoUpdate),
      ...shipmentSizeFromCards(hasVehicle ? normalizeVehicle(vehicle) : null, hasBoat ? normalizeBoat(boat) : null),
      cardDetails: isMove
        ? { ...form.cardDetails, volumeEstimate: moveVolume }
        : isBins
          ? (binSize || durationDays ? { binSize: binSize || undefined, durationDays: durationDays || undefined } : undefined)
          : (normalizeCargoCard({ ...form.cardDetails, vehicle, boat, transport, rental }, picked) ?? undefined),
    }
  }

  function refreshLists() {
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['dashboard-sender'] })
    qc.invalidateQueries({ queryKey: ['sender-shipments'] })
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    setError('')
    try {
      const cargo = cargoUpdateNow()
      const body = buildBody(cargo)
      const { data } = isEditing && editId ? await shipmentsApi.update(editId, body) : await shipmentsApi.create(body)
      setFieldErrors({})
      refreshLists()
      if (isEditing) {
        qc.invalidateQueries({ queryKey: ['shipment', editId] })
        router.back()
        return
      }
      if (!data?.id) { setError(t('shipmentForm.error_connect')); return }
      setCreatedId(data.id)
      setSavedList(listSnapshot())
      if (cargo) applyCargoFields(cargo)
    } catch (e: any) {
      const res = e?.response
      if (!res) { setError(t('shipmentForm.error_connect')); return }
      setError(res.data?.error || `${t('shipmentForm.error_save')} (HTTP ${res.status})`)
      const fields = res.data?.fields as Record<string, string[]> | undefined
      if (fields && Object.keys(fields).length > 0) {
        const flat: Record<string, string> = {}
        for (const [field, messages] of Object.entries(fields)) flat[field] = Array.isArray(messages) ? messages[0] : String(messages)
        setFieldErrors(flat)
        setShowErrors(false)
        setStep(Math.min(...Object.keys(flat).map(stepOfField)))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  /** Επεξεργασία: αποθήκευση από οποιοδήποτε βήμα, αφού ελεγχθούν τα υποχρεωτικά των βημάτων 1 και 2 */
  function saveNow() {
    if (isSubmitting) return
    for (const n of [1, 2]) if (stepIssues(n).length > 0) { setStep(n); setShowErrors(true); return }
    setShowErrors(false)
    void handleSubmit()
  }

  async function saveList() {
    if (!createdId) return
    const snapshot = listSnapshot()
    const cargo = cargoUpdateNow()
    setListSaving(true)
    setListMessage(null)
    try {
      await shipmentsApi.update(createdId, buildBody(cargo))
      setSavedList(snapshot)
      if (cargo) applyCargoFields(cargo)
      setListMessage({ ok: true, text: cargo ? t(cargo.dimensions ? 'moveCard.cargo_saved_dims' : 'moveCard.cargo_saved') : t('moveCard.list_saved') })
    } catch (e: any) {
      const msg = e?.response?.data?.error
      setListMessage({ ok: false, text: typeof msg === 'string' ? msg : e?.response ? t('shipmentForm.error_save') : t('shipmentForm.error_connect') })
    } finally {
      setListSaving(false)
    }
  }

  // ── Φωτογραφίες ──
  const photoLimits = { maxPhotos: maxPhotosFor(form.category), maxEdgePx: photoMaxEdgeFor(form.category) }
  const allPhotos = currentPhotos ?? initialPhotos
  const unanalysed = planAnalysis(allPhotos, form.cardDetails).reduce((n, b) => n + b.photoIds.length, 0)
  const photosTitle = `${t('shipmentForm.photos_label')} (${allPhotos.length}/${photoLimits.maxPhotos})`
  const photosBadge = form.cardDetails.analyzedPhotoIds.length > 0 && unanalysed > 0 ? `${t('moveCard.ai_unanalysed')}: ${unanalysed}` : undefined
  const photoManager = (id: string, initial: ShipmentPhoto[]) => (
    <PhotoManager
      key={id} t={t} shipmentId={id} initialPhotos={initial} rooms={isMove} initialRooms={form.cardDetails.photoRooms} {...photoLimits}
      onPhotosChange={setCurrentPhotos}
      onRoomsChange={photoRooms => setMove(d => ({ ...d, photoRooms }))}
    />
  )

  const headerTitle = isEditing ? t('shipmentForm.title_edit')
    : isMove ? t('shipmentForm.title_create_move') : isBins ? t('shipmentForm.title_create_bins')
    : isRental ? t('shipmentForm.title_create_rental') : t('shipmentForm.title_create')
  const steps = [t('shipmentForm.step_category'), t('shipmentForm.step_route'), t('shipmentForm.step_details')]

  // ── Ημερομηνία + διάρκεια/περίοδος (κάδοι) ──
  const dateAndPeriod = (
    <>
      <Field t={t} label={`${t('shipmentForm.delivery_date_label')} *`}>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.8}
          style={[inputStyle, missing('desiredDelivery') && errorBorder, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <Text style={{ fontSize: 15, color: form.desiredDelivery ? '#1E293B' : '#94A3B8' }}>
            {form.desiredDelivery ? form.desiredDelivery.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }) : t('mobile.pick_date')}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        {fieldErrors.desiredDelivery ? <Text style={{ fontSize: 12, color: Colors.danger, marginTop: 4 }}>{fieldErrors.desiredDelivery}</Text> : null}
      </Field>
      {showDatePicker && (
        <DateTimePicker
          value={form.desiredDelivery ?? new Date()} mode="date" minimumDate={new Date()}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => { setShowDatePicker(Platform.OS === 'ios'); if (date) update('desiredDelivery', date) }}
        />
      )}
      {isBins && (
        <>
          <Field t={t} label={t('shipmentForm.bins_duration_label')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput style={[inputStyle, { width: 90, textAlign: 'center' }]} keyboardType="number-pad" value={durationDays} onChangeText={setDurationDays} />
              <Text style={{ color: '#64748B' }}>{t('shipmentForm.bins_duration_unit')}</Text>
            </View>
          </Field>
          <Field t={t} label={t('shipmentForm.bins_period_label')} optional>
            <TextInput style={inputStyle} placeholder={t('shipmentForm.bins_period_ph')} placeholderTextColor="#94A3B8" value={form.loadingInfo} onChangeText={v => update('loadingInfo', v)} />
          </Field>
        </>
      )}
    </>
  )

  // ── Οθόνη επιτυχίας (μετά τη δημιουργία): φωτογραφίες και, όπου γίνεται, λίστα αντικειμένων ──
  if (createdId) {
    return (
      <View className="flex-1 bg-surface">
        <View style={{ backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20 }}>
          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800' }}>{headerTitle}</Text>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 28, color: Colors.success }}>✓</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>{t('shipmentForm.success_title')}</Text>
            <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 6 }}>
              {t(isRental ? 'shipmentForm.success_desc_rental' : 'shipmentForm.success_desc')}
            </Text>
          </View>

          {inventoryFlow ? (
            <>
              <Text style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>{t(isMove ? 'moveCard.success_move_hint' : 'moveCard.cargo_hint')}</Text>
              <MoveInventoryAnalysis t={t} shipmentId={createdId} photos={currentPhotos ?? []} details={form.cardDetails} onChange={setMove}
                onEnabledChange={on => { if (on) setPhotosOpen(true) }} />
              <Collapsible title={photosTitle} badge={photosBadge} open={photosOpen ?? true} onOpenChange={setPhotosOpen}>
                {photoManager(createdId, currentPhotos ?? [])}
              </Collapsible>
              {isMove
                ? <MoveItemsSection t={t} value={form.cardDetails} onChange={cardDetails => setMove(() => cardDetails)} defaultOpen />
                : <CargoItemsSection t={t} value={form.cardDetails} categories={form.categories} onChange={cardDetails => setMove(() => cardDetails)} />}
              <TouchableOpacity onPress={saveList} disabled={!listDirty || listSaving} activeOpacity={0.85}
                style={{ backgroundColor: Colors.accent, borderRadius: 16, paddingVertical: 15, alignItems: 'center', opacity: !listDirty || listSaving ? 0.4 : 1 }}>
                <Text style={{ fontWeight: '800', color: '#000' }}>{listSaving ? t('moveCard.list_saving') : t('moveCard.save_list')}</Text>
              </TouchableOpacity>
              {listMessage && <Text style={{ fontSize: 13, marginTop: 8, color: listMessage.ok ? Colors.success : Colors.danger }}>{listMessage.text}</Text>}
              {listDirty && !listMessage && <Text style={{ fontSize: 13, marginTop: 8, color: '#B45309' }}>{t('moveCard.list_unsaved')}</Text>}
            </>
          ) : isRental ? null : (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 }}>{t('shipmentForm.success_photos_title')}</Text>
              {photoManager(createdId, [])}
              <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 12 }}>{t('shipmentForm.success_photos_desc')}</Text>
            </View>
          )}

          <TouchableOpacity onPress={() => router.replace('/(tabs)' as any)} activeOpacity={0.85}
            style={{ backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 20 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{t('shipmentForm.success_btn')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  // ── Περίληψη (βήμα 3): ό,τι έχει η φόρμα, κρύβοντας ό,τι δεν αφορά την κατηγορία ──
  const summaryRows = (() => {
    const recipient = [form.recipientName, form.recipientPhone, form.recipientEmail].filter(Boolean).join(' · ')
    const properties = [form.isFragile && t('shipmentForm.fragile_label'), form.requiresCooling && t('shipmentForm.cooling_label'), form.isHazardous && t('shipmentForm.hazardous_label')].filter(Boolean).join(', ')
    const hiddenForBins = [t('shipmentForm.summary_dimensions'), t('shipmentForm.summary_weight'), t('shipmentForm.summary_volume'), t('shipmentForm.summary_properties'), t('location.pickup_address'), t('shipmentForm.coord_section_origin')]
    const hiddenForMove = [t('shipmentForm.summary_dimensions'), t('shipmentForm.summary_weight'), t('shipmentForm.summary_volume'), t('shipmentForm.summary_properties')]
    const hiddenForRental = [t('location.pickup_address'), t('location.delivery_address'), t('shipmentForm.coord_section_origin'), t('shipmentForm.coord_section_dest')]
    const rows: { label: string; value: string; accent?: boolean }[] = [
      { label: t('shipmentForm.summary_category'), value: picked.length > 0 ? picked.map(id => `${CATEGORY_META[id]?.icon ?? ''} ${catLabel(t, id)}`).join(', ') : '-' },
      { label: t('shipmentForm.summary_shipment_title'), value: form.title || '-' },
      { label: t('shipmentForm.summary_description'), value: form.description || '-' },
      isBins ? { label: t('location.destination'), value: form.destCity || '-' }
        : isRental ? { label: t('shipmentForm.rental_pickup_city'), value: form.originCity || '-' }
        : { label: t('shipmentForm.summary_route'), value: (form.originCity || form.destCity) ? `${form.originCity || '-'} → ${form.destCity || '-'}` : '-' },
      { label: t('location.pickup_address'), value: form.originAddress || '-' },
      { label: t('location.delivery_address'), value: form.destAddress || '-' },
      { label: t('shipmentForm.coord_section_origin'), value: (form.originLat && form.originLng) ? `${form.originLat}, ${form.originLng}` : '-' },
      { label: t('shipmentForm.coord_section_dest'), value: (form.destLat && form.destLng) ? `${form.destLat}, ${form.destLng}` : '-' },
      { label: t('shipmentForm.summary_recipient'), value: recipient || '-' },
      { label: t('shipmentForm.summary_delivery_date'), value: form.desiredDelivery ? form.desiredDelivery.toLocaleDateString(locale) : '-' },
      ...(isBins ? [
        { label: t('shipmentForm.bins_period_label'), value: form.loadingInfo || '-' },
        { label: t('shipmentForm.bins_size_label'), value: binSize ? binSizeLabel(binSize) : '-' },
        { label: t('shipmentForm.bins_duration_label'), value: durationDays ? `${durationDays} ${t('shipmentForm.bins_duration_unit')}` : '-' },
      ] : []),
      { label: t('shipmentForm.summary_dimensions'), value: (form.length && form.width && form.height) ? `${form.length} × ${form.width} × ${form.height} cm` : '-' },
      { label: t('shipmentForm.summary_weight'), value: form.weight ? `${form.weight} kg` : '-' },
      { label: t('shipmentForm.summary_volume'), value: form.volume ? `${Number(form.volume).toLocaleString(locale, { maximumFractionDigits: 3 })} m³` : '-' },
      { label: t('shipmentForm.summary_properties'), value: properties || '-' },
      { label: t('shipmentForm.summary_budget'), value: form.maxBudget ? `≤ €${form.maxBudget}` : '-', accent: true },
    ]
    return rows.filter(r => !(isMove && hiddenForMove.includes(r.label)) && !(isBins && hiddenForBins.includes(r.label)) && !(isRental && hiddenForRental.includes(r.label)))
  })()

  return (
    <KeyboardAvoidingView className="flex-1 bg-surface" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={{ backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800', flex: 1 }}>{headerTitle}</Text>
          <Text style={{ color: '#93C5FD', fontSize: 13 }}>{step}/3</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TouchableOpacity onPress={() => (isEditing ? router.back() : router.replace('/(tabs)' as any))}
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{t('mobile.edit_cancel')}</Text>
          </TouchableOpacity>
          {isEditing && (
            <TouchableOpacity onPress={saveNow} disabled={isSubmitting}
              style={{ backgroundColor: Colors.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, opacity: isSubmitting ? 0.5 : 1 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{isSubmitting ? t('shipmentForm.btn_saving') : t('shipmentForm.btn_save_now')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Step bar */}
      <View className="bg-white px-4 border-b border-slate-100">
        <View className="flex-row items-center justify-center gap-3 py-4">
          {steps.map((label, i) => {
            const n = i + 1
            return (
              <React.Fragment key={n}>
                <View className="items-center">
                  <View className={`w-7 h-7 rounded-full items-center justify-center ${step === n ? 'bg-primary' : step > n ? 'bg-green-500' : 'bg-slate-200'}`}>
                    <Text className={`text-xs font-bold ${step >= n ? 'text-white' : 'text-slate-400'}`}>{step > n ? '✓' : n}</Text>
                  </View>
                  <Text className={`text-[10px] mt-1 font-semibold ${step === n ? 'text-primary' : 'text-slate-400'}`}>{label}</Text>
                </View>
                {n < 3 && <View className={`flex-1 h-px mb-4 ${step > n ? 'bg-green-400' : 'bg-slate-200'}`} />}
              </React.Fragment>
            )
          })}
        </View>
      </View>

      <View className="flex-1 px-4 pt-4">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          {error && step !== 3 ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4"><Text className="text-red-600 text-sm">{error}</Text></View>
          ) : null}

          {/* ── Βήμα 1: κατηγορία ── */}
          {step === 1 && (
            <>
              <Text className="text-base font-bold text-slate-700 mb-1">{t('shipmentForm.step1_title')}</Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>{t('shipmentForm.step1_hint')}</Text>
              <View className="flex-row flex-wrap gap-2 mb-5"
                style={missing('category') ? { borderWidth: 1, borderColor: Colors.danger, borderRadius: 16, padding: 4 } : undefined}>
                {[...FORM_CATEGORY_ORDER, ...(form.categories.includes('COURIER') ? ['COURIER'] : [])].map(id => {
                  const on = form.categories.includes(id)
                  const meta = CATEGORY_META[id]
                  return (
                    <TouchableOpacity key={id} onPress={() => selectCategory(id)} style={{ width: '31%' }}
                      className={`rounded-2xl border p-3 ${on ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                      <Text className="text-2xl mb-1">{meta?.icon}</Text>
                      <Text className={`text-xs font-bold leading-tight ${on ? 'text-amber-700' : 'text-slate-700'}`}>{catLabel(t, id)}</Text>
                      <Text className="text-[10px] text-slate-400 mt-0.5 leading-tight">{meta ? t(`shipmentForm.cat_${meta.key}_sub`) : ''}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Field t={t} label={`${t('shipmentForm.title_label')} *`}>
                <TextInput
                  style={[inputStyle, missing('title') && errorBorder, (isMove || isBins) && { backgroundColor: '#F1F5F9', color: '#64748B' }]}
                  placeholder="π.χ. Καναπές 3θέσιος + πολυθρόνα" placeholderTextColor="#94A3B8"
                  value={form.title} onChangeText={v => update('title', v)} editable={!isMove && !isBins}
                />
                {(isMove || isBins) && <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>🔒 {t('moveCard.title_locked')}</Text>}
              </Field>
              <Field t={t} label={t('shipmentForm.description_label')} optional>
                <TextInput
                  style={[inputStyle, { height: 88, textAlignVertical: 'top', paddingTop: 12 }]}
                  placeholder="Περίγραψε τι στέλνεις με λεπτομέρεια..." placeholderTextColor="#94A3B8"
                  value={form.description} onChangeText={v => update('description', v)} multiline numberOfLines={3}
                />
              </Field>

              {showErrors && issues.length > 0 && <ErrorBox t={t} issues={issues.map(i => i.message)} />}
              <TouchableOpacity className="rounded-2xl py-4 items-center mt-2 bg-primary" onPress={() => tryAdvance(2)} activeOpacity={0.85}>
                <Text className="font-bold text-base text-white">{t('shipmentForm.btn_continue')}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Βήμα 2: διαδρομή ── */}
          {step === 2 && (
            <>
              {!isBins && (
                <>
                  <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3"
                    style={missing('originCity', 'originCityPlaceId', 'originAddress') ? errorBorder : undefined}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text className="text-sm font-bold text-amber-700">📍 {isRental ? t('shipmentForm.rental_pickup_city') : t('location.origin')}</Text>
                      <MyAddressToggle side="origin" />
                    </View>
                    <PlacesInput label={`${t('location.city')} *`} placeholder={t('mobile.city_ph_origin')} type="city"
                      error={missing('originCity', 'originCityPlaceId')} value={form.originCity} placeId={form.originCityPlaceId}
                      onSelect={(city, pid) => setForm(f => ({ ...f, originCity: city, originCityPlaceId: pid }))} />
                    {!isRental && (
                      <>
                        <PlacesInput label={`${t('location.pickup_address')} *`} placeholder={t('mobile.address_ph_origin')} type="address"
                          cityContext={form.originCity} value={form.originAddress} placeId={form.originAddressPlaceId}
                          onSelect={(addr, pid) => setForm(f => ({ ...f, originAddress: addr, originAddressPlaceId: pid }))}
                          error={missing('originAddress')} />
                        <CoordGroup t={t} title={t('shipmentForm.coord_section_origin')} latValue={form.originLat} lngValue={form.originLng}
                          latPh="Lat π.χ. 37.9839" lngPh="Lng π.χ. 23.7275" onLatChange={v => update('originLat', v)} onLngChange={v => update('originLng', v)}
                          onOpenMap={() => setMapTarget('origin')} />
                      </>
                    )}
                  </View>
                  {isMove && (
                    <MoveAddressFields t={t} side="origin" value={form.cardDetails.origin} onChange={origin => setMove(d => ({ ...d, origin }))}
                      squareMeters={form.cardDetails.squareMeters} rooms={form.cardDetails.rooms}
                      onSquareMeters={v => setMove(d => ({ ...d, squareMeters: v }))} onRooms={v => setMove(d => ({ ...d, rooms: v }))} />
                  )}
                  {!isRental && (
                    <View className="items-center my-1">
                      <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                        <Ionicons name="arrow-down" size={16} color={Colors.primary} />
                      </View>
                    </View>
                  )}
                </>
              )}

              {!isRental && (
                <>
                  <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4"
                    style={missing('destCity', 'destCityPlaceId', 'destAddress') ? errorBorder : undefined}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text className="text-sm font-bold text-blue-700">🏁 {t('location.destination')}</Text>
                      {!isMove && <MyAddressToggle side="dest" />}
                    </View>
                    <PlacesInput label={`${t('location.city')} *`} placeholder={t('mobile.city_ph_dest')} type="city"
                      error={missing('destCity', 'destCityPlaceId')} value={form.destCity} placeId={form.destCityPlaceId}
                      onSelect={(city, pid) => setForm(f => ({ ...f, destCity: city, destCityPlaceId: pid }))} />
                    <PlacesInput label={`${t('location.delivery_address')} *`} placeholder={t('mobile.address_ph_dest')} type="address"
                      cityContext={form.destCity} value={form.destAddress} placeId={form.destAddressPlaceId}
                      onSelect={(addr, pid) => setForm(f => ({ ...f, destAddress: addr, destAddressPlaceId: pid }))}
                      error={missing('destAddress')} />
                    <CoordGroup t={t} title={t('shipmentForm.coord_section_dest')} latValue={form.destLat} lngValue={form.destLng}
                      latPh="Lat π.χ. 40.6401" lngPh="Lng π.χ. 22.9444" onLatChange={v => update('destLat', v)} onLngChange={v => update('destLng', v)}
                      onOpenMap={() => setMapTarget('dest')} />
                  </View>
                  {isMove && <MoveAddressFields t={t} side="dest" value={form.cardDetails.dest} onChange={dest => setMove(d => ({ ...d, dest }))} />}
                </>
              )}

              {isBins && dateAndPeriod}
              {isBins && (
                <ChoiceField label={t('shipmentForm.bins_size_label')} value={binSize} options={BIN_SIZES.map(b => b.id)} notSet={t('shipmentForm.bins_size_ph')}
                  labelOf={id => { const b = BIN_SIZES.find(x => x.id === id); return b ? `${binSizeLabel(b.id)} (${b.dimensions})` : id }}
                  onChange={setBinSize} />
              )}

              {/* Παραλήπτης */}
              <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-4"
                style={missing('recipientName', 'recipientPhone', 'recipientEmail') ? errorBorder : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                  <Text className="text-sm font-bold text-slate-700">👤 {t('shipmentForm.recipient_section_title')}</Text>
                  <Checkbox checked={form.recipientSameAsSender} label={t('shipmentForm.recipient_same_as_sender')} onPress={() => {
                    // Το τικ αντιγράφει τα στοιχεία του αποστολέα· το ξετσεκάρισμα τα σβήνει
                    const next = !form.recipientSameAsSender
                    setForm(f => ({
                      ...f, recipientSameAsSender: next,
                      recipientName: next ? senderProfile.name : '', recipientPhone: next ? senderProfile.phone : '', recipientEmail: next ? senderProfile.email : '',
                    }))
                  }} />
                </View>
                {([
                  { key: 'recipientName' as const, label: `${t('shipmentForm.recipient_name_label')} *`, ph: 'π.χ. Μαρία Παπαδοπούλου', kb: 'default' as const },
                  { key: 'recipientPhone' as const, label: `${t('shipmentForm.recipient_phone_label')} *`, ph: 'π.χ. 6912345678', kb: 'phone-pad' as const },
                  { key: 'recipientEmail' as const, label: t('shipmentForm.recipient_email_label'), ph: 'π.χ. maria@example.com', kb: 'email-address' as const, optional: true },
                ]).map(f => (
                  <Field key={f.key} t={t} label={f.label} optional={f.optional}>
                    <TextInput
                      style={[inputStyle, missing(f.key) && errorBorder, form.recipientSameAsSender && { backgroundColor: '#F1F5F9', color: '#94A3B8' }]}
                      placeholder={f.ph} placeholderTextColor="#94A3B8" value={form[f.key]} onChangeText={v => update(f.key, v)}
                      keyboardType={f.kb} autoCapitalize={f.key === 'recipientEmail' ? 'none' : 'words'} editable={!form.recipientSameAsSender}
                    />
                    {fieldErrors[f.key] ? <Text style={{ fontSize: 12, color: Colors.danger, marginTop: 4 }}>{fieldErrors[f.key]}</Text> : null}
                  </Field>
                ))}
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: -6 }}>{t('shipmentForm.recipient_email_hint')}</Text>
              </View>

              {!isBins && dateAndPeriod}

              {showErrors && issues.length > 0 && <ErrorBox t={t} issues={issues.map(i => i.message)} />}
              <BackNext t={t} onBack={() => { setShowErrors(false); setStep(1) }} onNext={() => tryAdvance(3)} />
            </>
          )}

          {/* ── Βήμα 3: στοιχεία ── */}
          {step === 3 && (
            <>
              {inventoryFlow && isEditing && editId && (
                <>
                  <MoveInventoryAnalysis t={t} shipmentId={editId} photos={currentPhotos ?? initialPhotos} details={form.cardDetails} onChange={setMove}
                    onEnabledChange={on => { if (on) setPhotosOpen(true) }} />
                  <Collapsible title={photosTitle} badge={photosBadge} open={photosOpen ?? form.cardDetails.aiEnabled} onOpenChange={setPhotosOpen}>
                    {photoManager(editId, currentPhotos ?? initialPhotos)}
                  </Collapsible>
                </>
              )}
              {inventoryFlow && !isEditing && (
                <Text style={{ fontSize: 12, color: '#64748B', borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 12, marginBottom: 14, backgroundColor: '#fff' }}>
                  {t(isMove ? 'moveCard.ai_after_create' : 'moveCard.cargo_after_create')}
                </Text>
              )}
              {isMove && <MoveItemsSection t={t} value={form.cardDetails} onChange={cardDetails => setMove(() => cardDetails)} />}
              {!isMove && inventoryFlow && (
                <CargoItemsSection t={t} value={form.cardDetails} categories={form.categories} onChange={cardDetails => setMove(() => cardDetails)} defaultOpen={false} />
              )}

              {!isMove && !isBins && hasVehicle && <VehicleSection t={t} value={form.vehicle} onChange={vehicle => setForm(f => ({ ...f, vehicle }))} />}
              {!isMove && !isBins && hasBoat && <BoatSection t={t} value={form.boat} onChange={boat => setForm(f => ({ ...f, boat }))} />}
              {!isMove && !isBins && (hasVehicle || hasBoat) && <TransportSection t={t} value={form.transport} onChange={transport => setForm(f => ({ ...f, transport }))} />}
              {!isMove && !isBins && hasRental && <RentalSection t={t} value={form.rental} onChange={rental => setForm(f => ({ ...f, rental }))} />}

              {/* Μετακόμιση: μεγέθη στις λίστες· κάδοι: δεν ζητούνται· με λίστα αντικειμένων ή κάρτα οχήματος βγαίνουν από εκεί */}
              {!isMove && !isBins && (
                <>
                  {!inventoryFlow && !hasVehicle && !hasBoat && !hasRental && (
                    <>
                      <Field t={t} label={t('shipmentForm.dimensions_label')} optional>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {([['length', 'dim_length'], ['width', 'dim_width'], ['height', 'dim_height']] as const).map(([key, ph]) => (
                            <TextInput key={key} style={[inputStyle, { flex: 1 }, fieldErrors[key] && errorBorder]} placeholder={t(`shipmentForm.${ph}`)} placeholderTextColor="#94A3B8"
                              value={form[key]} onChangeText={v => update(key, v)} keyboardType="decimal-pad" />
                          ))}
                        </View>
                      </Field>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Field t={t} label={t('shipmentForm.weight_label')} optional>
                            <TextInput style={[inputStyle, fieldErrors.weight && errorBorder]} placeholder="π.χ. 120" placeholderTextColor="#94A3B8" value={form.weight} onChangeText={v => update('weight', v)} keyboardType="decimal-pad" />
                          </Field>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Field t={t} label={t('shipmentForm.volume_label')} optional>
                            {(() => {
                              const locked = Boolean(form.length && form.width && form.height)
                              return (
                                <TextInput style={[inputStyle, locked && { backgroundColor: '#F1F5F9', color: '#94A3B8' }]} placeholder="π.χ. 1.5" placeholderTextColor="#94A3B8"
                                  value={locked ? String(Number(form.volume || 0).toFixed(3)) : form.volume} onChangeText={v => { if (!locked) update('volume', v) }} keyboardType="decimal-pad" editable={!locked} />
                              )
                            })()}
                          </Field>
                        </View>
                      </View>
                    </>
                  )}

                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 }}>{t('shipmentForm.properties_label')}</Text>
                  <View style={{ gap: 8, marginBottom: 16 }}>
                    {([
                      { key: 'isFragile' as const, label: 'fragile' },
                      { key: 'requiresCooling' as const, label: 'cooling' },
                      { key: 'isHazardous' as const, label: 'hazardous' },
                    ]).map(f => (
                      <TouchableOpacity key={f.key} onPress={() => update(f.key, !form[f.key])} activeOpacity={0.8}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14, borderColor: form[f.key] ? Colors.accent : Colors.border, backgroundColor: form[f.key] ? '#FFFBEB' : '#fff' }}>
                        <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', borderColor: form[f.key] ? Colors.accent : '#CBD5E1', backgroundColor: form[f.key] ? Colors.accent : 'transparent' }}>
                          {form[f.key] && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{t(`shipmentForm.${f.label}_label`)}</Text>
                          <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{t(`shipmentForm.${f.label}_sub`)}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Field t={t} label={t('shipmentForm.budget_label')}>
                <TextInput style={[inputStyle, fieldErrors.maxBudget && errorBorder]} placeholder="π.χ. 200" placeholderTextColor="#94A3B8" value={form.maxBudget} onChangeText={v => update('maxBudget', v)} keyboardType="decimal-pad" />
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{t('shipmentForm.budget_hint')}</Text>
              </Field>

              {isBins && isEditing && editId && (
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 14, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 10 }}>{t('shipmentForm.photos_label')}</Text>
                  {photoManager(editId, currentPhotos ?? initialPhotos)}
                </View>
              )}

              {/* Περίληψη */}
              <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>{t('shipmentForm.summary_title')}</Text>
                  {!isMove && inventoryFlow && (
                    <TouchableOpacity onPress={() => { const u = cargoUpdateNow(); if (u) applyCargoFields(u) }}
                      style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>↻ {t('shipmentForm.btn_refresh_summary')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {summaryRows.map(r => <Row key={r.label} label={r.label} value={r.value} accent={r.accent} />)}
                {isMove && <MoveCardSummary t={t} details={form.cardDetails} />}
                {!isMove && !isBins && (hasVehicle || hasBoat || hasRental) && (
                  <TransportCardSummary t={t} card={{
                    vehicle: hasVehicle ? form.vehicle : undefined, boat: hasBoat ? form.boat : undefined,
                    transport: hasVehicle || hasBoat ? form.transport : undefined, rental: hasRental ? form.rental : undefined,
                  }} />
                )}
              </View>

              {error ? <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4"><Text className="text-red-600 text-sm">{error}</Text></View> : null}
              <BackNext t={t} onBack={() => setStep(2)} onNext={handleSubmit} busy={isSubmitting}
                nextLabel={isSubmitting
                  ? (isEditing ? t('shipmentForm.btn_saving') : t('shipmentForm.btn_publishing'))
                  : (isEditing ? t('shipmentForm.btn_save') : t('shipmentForm.btn_publish'))} />
            </>
          )}
        </ScrollView>
      </View>

      {/* Χάρτης συντεταγμένων: ανοίγει στις υπάρχουσες συντεταγμένες, αλλιώς στη διεύθυνση της πλευράς */}
      <MapPickerModal
        t={t}
        open={mapTarget !== null}
        title={mapTarget === 'dest' ? t('shipmentForm.coord_section_dest') : t('shipmentForm.coord_section_origin')}
        initialLat={parseFloat(mapTarget === 'dest' ? form.destLat : form.originLat)}
        initialLng={parseFloat(mapTarget === 'dest' ? form.destLng : form.originLng)}
        focusText={(mapTarget === 'dest' ? [form.destAddress, form.destCity] : [form.originAddress, form.originCity]).filter(Boolean).join(', ')}
        onClose={() => setMapTarget(null)}
        onSelect={(lat, lng) => {
          if (mapTarget === 'dest') setForm(f => ({ ...f, destLat: lat.toFixed(6), destLng: lng.toFixed(6) }))
          else setForm(f => ({ ...f, originLat: lat.toFixed(6), originLng: lng.toFixed(6) }))
        }}
      />
    </KeyboardAvoidingView>
  )
}
