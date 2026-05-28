import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import * as Location from 'expo-location'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router, useLocalSearchParams, Stack } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { shipmentsApi } from '@/lib/api'
import { PlacesInput } from '@/components/PlacesInput'
import { Colors } from '@/constants/colors'

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'FURNITURE',    icon: '🛋️', label: 'Έπιπλα',           sub: 'Καναπέδες, τραπέζια, κρεβάτια' },
  { id: 'HOUSE_MOVE',  icon: '🏠', label: 'Μετακόμιση Οικίας', sub: 'Πλήρης μεταφορά οικοσκευής' },
  { id: 'SMALL_PACKAGE', icon: '📦', label: 'Μικροδέματα',     sub: 'Κουτιά, σακίδια, δέματα' },
  { id: 'COURIER',     icon: '🛵', label: 'Ταχυμεταφορές',     sub: 'Express, courier, άμεση παράδοση' },
  { id: 'ELECTRONICS', icon: '💻', label: 'Ηλεκτρονικά',       sub: 'Συσκευές, εξοπλισμός' },
  { id: 'VEHICLE',     icon: '🚗', label: 'Όχημα',             sub: 'Αυτοκίνητα, μοτοσυκλέτες' },
  { id: 'MACHINERY',   icon: '⚙️', label: 'Μηχανήματα',        sub: 'Βιομηχανικός εξοπλισμός' },
  { id: 'BOAT',        icon: '⛵', label: 'Σκάφος',            sub: 'Σκάφη αναψυχής' },
  { id: 'FOOD',        icon: '🥩', label: 'Τρόφιμα',           sub: 'Ψυγείο / κατεψυγμένα' },
  { id: 'HAZARDOUS',   icon: '⚠️', label: 'Επικίνδυνα',        sub: 'Χημικά, εκρηκτικά' },
  { id: 'OTHER',       icon: '🗃️', label: 'Άλλο',              sub: 'Οτιδήποτε άλλο' },
]

const STEPS = [
  { n: 1, label: 'Κατηγορία' },
  { n: 2, label: 'Διαδρομή' },
  { n: 3, label: 'Στοιχεία' },
]

// ─── Form type ────────────────────────────────────────────────────────────────

type Form = {
  category: string
  title: string
  description: string
  // Route
  originCity: string
  originCityPlaceId: string
  originAddress: string
  originLat: string
  originLng: string
  destCity: string
  destCityPlaceId: string
  destAddress: string
  destLat: string
  destLng: string
  desiredDelivery: Date | null
  loadingInfo: string
  // Cargo
  length: string
  width: string
  height: string
  weight: string
  volume: string
  maxBudget: string
  isFragile: boolean
  requiresCooling: boolean
  isHazardous: boolean
}

const INITIAL: Form = {
  category: '', title: '', description: '',
  originCity: '', originCityPlaceId: '', originAddress: '',
  originLat: '', originLng: '',
  destCity: '', destCityPlaceId: '', destAddress: '',
  destLat: '', destLng: '',
  desiredDelivery: null, loadingInfo: '',
  length: '', width: '', height: '', weight: '', volume: '', maxBudget: '',
  isFragile: false, requiresCooling: false, isHazardous: false,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputStyle = {
  borderWidth: 1, borderColor: Colors.border,
  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  fontSize: 15, color: '#1E293B', backgroundColor: '#FAFAFA',
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
        {label}{optional ? <Text style={{ fontWeight: '400', color: '#94A3B8' }}> (προαιρετικό)</Text> : null}
      </Text>
      {children}
    </View>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ fontSize: 13, color: '#64748B' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: accent ? Colors.accent : '#1E293B' }}>{value}</Text>
    </View>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <View className="flex-row items-center justify-center gap-3 py-4">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.n}>
          <View className="items-center">
            <View className={`w-7 h-7 rounded-full items-center justify-center ${
              current === s.n ? 'bg-primary' : current > s.n ? 'bg-green-500' : 'bg-slate-200'
            }`}>
              {current > s.n
                ? <Text className="text-white text-xs font-bold">✓</Text>
                : <Text className={`text-xs font-bold ${current === s.n ? 'text-white' : 'text-slate-400'}`}>{s.n}</Text>
              }
            </View>
            <Text className={`text-[10px] mt-1 font-semibold ${current === s.n ? 'text-primary' : 'text-slate-400'}`}>
              {s.label}
            </Text>
          </View>
          {i < STEPS.length - 1 && (
            <View className={`flex-1 h-px mb-4 ${current > s.n ? 'bg-green-400' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </View>
  )
}

// ─── Step 1: Category ─────────────────────────────────────────────────────────

function Step1({ form, update, onNext }: {
  form: Form; update: (k: keyof Form, v: any) => void; onNext: () => void
}) {
  const canContinue = !!form.category && !!form.title.trim()

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-base font-bold text-slate-700 mb-3">Τι θέλεις να στείλεις;</Text>

      <View className="flex-row flex-wrap gap-2 mb-5">
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c.id}
            onPress={() => update('category', c.id)}
            style={{ width: '30%' }}
            className={`rounded-2xl border p-3 ${
              form.category === c.id ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'
            }`}
          >
            <Text className="text-2xl mb-1">{c.icon}</Text>
            <Text className={`text-xs font-bold leading-tight ${form.category === c.id ? 'text-amber-700' : 'text-slate-700'}`}>
              {c.label}
            </Text>
            <Text className="text-[10px] text-slate-400 mt-0.5 leading-tight">{c.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="Τίτλος αποστολής *">
        <TextInput
          style={inputStyle}
          placeholder="π.χ. Καναπές 3θέσιος + πολυθρόνα"
          placeholderTextColor="#94A3B8"
          value={form.title}
          onChangeText={v => update('title', v)}
          returnKeyType="next"
        />
      </Field>

      <Field label="Περιγραφή" optional>
        <TextInput
          style={[inputStyle, { height: 88, textAlignVertical: 'top', paddingTop: 12 }]}
          placeholder="Περίγραψε τι στέλνεις με λεπτομέρεια..."
          placeholderTextColor="#94A3B8"
          value={form.description}
          onChangeText={v => update('description', v)}
          multiline
          numberOfLines={3}
        />
      </Field>

      <TouchableOpacity
        className={`rounded-2xl py-4 items-center mt-2 ${canContinue ? 'bg-primary' : 'bg-slate-200'}`}
        onPress={onNext}
        disabled={!canContinue}
        activeOpacity={0.85}
      >
        <Text className={`font-bold text-base ${canContinue ? 'text-white' : 'text-slate-400'}`}>
          Συνέχεια →
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

// ─── CoordGroup ───────────────────────────────────────────────────────────────

function CoordGroup({ locationLabel, latValue, lngValue, latPh, lngPh, onLatChange, onLngChange }: {
  locationLabel: string
  latValue: string; lngValue: string
  latPh: string; lngPh: string
  onLatChange: (v: string) => void; onLngChange: (v: string) => void
}) {
  const latRef = useRef<TextInput>(null)
  const lngRef = useRef<TextInput>(null)
  const skipAlert = useRef<'lat' | 'lng' | null>(null)

  async function showPrompt(field: 'lat' | 'lng') {
    const ref = field === 'lat' ? latRef : lngRef
    ref.current?.blur()

    Alert.alert(
      'Συντεταγμένες',
      `Πώς θέλεις να ορίσεις τις συντεταγμένες ${locationLabel};`,
      [
        {
          text: '📍 Τρέχουσα τοποθεσία',
          onPress: async () => {
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
              Alert.alert('Άδεια τοποθεσίας', 'Δεν δόθηκε πρόσβαση στην τοποθεσία σου.')
              return
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
            onLatChange(loc.coords.latitude.toFixed(6))
            onLngChange(loc.coords.longitude.toFixed(6))
          },
        },
        {
          text: '✏️ Χειροκίνητη εισαγωγή',
          onPress: () => {
            skipAlert.current = field
            setTimeout(() => ref.current?.focus(), 150)
          },
        },
        { text: 'Ακύρωση', style: 'cancel' },
      ]
    )
  }

  return (
    <View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 6 }}>
        Συντεταγμένες {locationLabel}{' '}
        <Text style={{ fontWeight: '400' }}>(προαιρετικό)</Text>
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          ref={latRef}
          style={[inputStyle, { flex: 1, fontSize: 13 }]}
          placeholder={latPh}
          placeholderTextColor="#94A3B8"
          value={latValue}
          onChangeText={onLatChange}
          keyboardType="decimal-pad"
          onFocus={() => {
            if (skipAlert.current === 'lat') { skipAlert.current = null; return }
            showPrompt('lat')
          }}
        />
        <TextInput
          ref={lngRef}
          style={[inputStyle, { flex: 1, fontSize: 13 }]}
          placeholder={lngPh}
          placeholderTextColor="#94A3B8"
          value={lngValue}
          onChangeText={onLngChange}
          keyboardType="decimal-pad"
          onFocus={() => {
            if (skipAlert.current === 'lng') { skipAlert.current = null; return }
            showPrompt('lng')
          }}
        />
      </View>
    </View>
  )
}

// ─── Step 2: Route ────────────────────────────────────────────────────────────

function Step2({ form, update, onBack, onNext }: {
  form: Form; update: (k: keyof Form, v: any) => void; onBack: () => void; onNext: () => void
}) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const canContinue = !!form.originCity.trim() && !!form.destCity.trim()

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Origin */}
      <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3">
        <Text className="text-sm font-bold text-amber-700 mb-2">📍 Σημείο Παραλαβής</Text>

        <PlacesInput
          label="Πόλη *"
          placeholder="π.χ. Αθήνα"
          type="city"
          value={form.originCity}
          placeId={form.originCityPlaceId}
          onSelect={(city, pid) => { update('originCity', city); update('originCityPlaceId', pid) }}
        />

        <PlacesInput
          label="Διεύθυνση"
          placeholder="π.χ. Ερμού 5"
          type="address"
          cityContext={form.originCity}
          value={form.originAddress}
          placeId={''}
          onSelect={(addr) => update('originAddress', addr)}
          optional
        />

        <CoordGroup
          locationLabel="παραλαβής"
          latValue={form.originLat} lngValue={form.originLng}
          latPh="Lat π.χ. 37.9839" lngPh="Lng π.χ. 23.7275"
          onLatChange={v => update('originLat', v)}
          onLngChange={v => update('originLng', v)}
        />
      </View>

      <View className="items-center my-1">
        <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
          <Ionicons name="arrow-down" size={16} color={Colors.primary} />
        </View>
      </View>

      {/* Destination */}
      <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
        <Text className="text-sm font-bold text-blue-700 mb-2">🏁 Σημείο Παράδοσης</Text>

        <PlacesInput
          label="Πόλη *"
          placeholder="π.χ. Θεσσαλονίκη"
          type="city"
          value={form.destCity}
          placeId={form.destCityPlaceId}
          onSelect={(city, pid) => { update('destCity', city); update('destCityPlaceId', pid) }}
        />

        <PlacesInput
          label="Διεύθυνση"
          placeholder="π.χ. Εγνατία 10"
          type="address"
          cityContext={form.destCity}
          value={form.destAddress}
          placeId={''}
          onSelect={(addr) => update('destAddress', addr)}
          optional
        />

        <CoordGroup
          locationLabel="παράδοσης"
          latValue={form.destLat} lngValue={form.destLng}
          latPh="Lat π.χ. 40.6401" lngPh="Lng π.χ. 22.9444"
          onLatChange={v => update('destLat', v)}
          onLngChange={v => update('destLng', v)}
        />
      </View>

      {/* Desired delivery date */}
      <Field label="Επιθυμητή ημερομηνία παράδοσης" optional>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 15, color: form.desiredDelivery ? '#1E293B' : '#94A3B8' }}>
            {form.desiredDelivery
              ? form.desiredDelivery.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : 'Επιλέξτε ημερομηνία'}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        {form.desiredDelivery && (
          <TouchableOpacity onPress={() => update('desiredDelivery', null)} style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: Colors.textMuted }}>✕ Καθαρισμός</Text>
          </TouchableOpacity>
        )}
      </Field>

      {showDatePicker && (
        <DateTimePicker
          value={form.desiredDelivery ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowDatePicker(Platform.OS === 'ios')
            if (date) update('desiredDelivery', date)
          }}
        />
      )}

      <Field label="Περίοδος φόρτωσης / εκφόρτωσης" optional>
        <TextInput
          style={inputStyle}
          placeholder="π.χ. Πρωινές ώρες, 08:00 - 10:00"
          placeholderTextColor="#94A3B8"
          value={form.loadingInfo}
          onChangeText={v => update('loadingInfo', v)}
        />
      </Field>

      <View className="flex-row gap-3 mt-2">
        <TouchableOpacity
          className="flex-1 border border-slate-200 rounded-2xl py-4 items-center bg-white"
          onPress={onBack}
          activeOpacity={0.8}
        >
          <Text className="font-bold text-slate-600">← Πίσω</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 rounded-2xl py-4 items-center ${canContinue ? 'bg-primary' : 'bg-slate-200'}`}
          onPress={onNext}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <Text className={`font-bold ${canContinue ? 'text-white' : 'text-slate-400'}`}>Συνέχεια →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

// ─── Step 3: Details ──────────────────────────────────────────────────────────

function Step3({ form, update, onBack, onSubmit, isSubmitting, error, isEditing }: {
  form: Form; update: (k: keyof Form, v: any) => void
  onBack: () => void; onSubmit: () => void; isSubmitting: boolean; error: string; isEditing: boolean
}) {
  const dimsFilled   = !!form.length && !!form.width && !!form.height
  const displayVolume = dimsFilled
    ? ((parseFloat(form.length) * parseFloat(form.width) * parseFloat(form.height)) / 1000000).toFixed(3)
    : form.volume

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Dimensions */}
      <Field label="Διαστάσεις (cm)" optional>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([
            { key: 'length' as const, ph: 'Μήκος' },
            { key: 'width' as const,  ph: 'Πλάτος' },
            { key: 'height' as const, ph: 'Ύψος' },
          ] as const).map(d => (
            <TextInput
              key={d.key}
              style={[inputStyle, { flex: 1 }]}
              placeholder={d.ph}
              placeholderTextColor="#94A3B8"
              value={form[d.key]}
              onChangeText={v => update(d.key, v)}
              keyboardType="decimal-pad"
            />
          ))}
        </View>
        {dimsFilled && (
          <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 4 }}>
            Αυτόματος υπολογισμός όγκου: {displayVolume} m³
          </Text>
        )}
      </Field>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Βάρος (kg)" optional>
            <TextInput
              style={inputStyle}
              placeholder="π.χ. 120"
              placeholderTextColor="#94A3B8"
              value={form.weight}
              onChangeText={v => update('weight', v)}
              keyboardType="decimal-pad"
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Όγκος (m³)" optional>
            <TextInput
              style={[inputStyle, dimsFilled ? { backgroundColor: '#F1F5F9', color: '#94A3B8' } : {}]}
              placeholder="π.χ. 1.5"
              placeholderTextColor="#94A3B8"
              value={dimsFilled ? displayVolume : form.volume}
              onChangeText={v => { if (!dimsFilled) update('volume', v) }}
              keyboardType="decimal-pad"
              editable={!dimsFilled}
            />
          </Field>
        </View>
      </View>

      {/* Flags */}
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 }}>Ιδιαιτερότητες</Text>
      <View style={{ gap: 8, marginBottom: 16 }}>
        {([
          { key: 'isFragile' as const,      label: '🥚 Εύθραυστο',        sub: 'Χρειάζεται προσεκτική μεταφορά' },
          { key: 'requiresCooling' as const, label: '❄️ Απαιτεί ψύξη',    sub: 'Ψυγείο / κατεψυγμένα' },
          { key: 'isHazardous' as const,     label: '⚠️ Επικίνδυνο υλικό', sub: 'ADR — χημικά, εκρηκτικά' },
        ] as const).map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => update(f.key, !form[f.key])}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              borderWidth: 1, borderRadius: 12, padding: 14,
              borderColor: form[f.key] ? Colors.accent : Colors.border,
              backgroundColor: form[f.key] ? '#FFFBEB' : '#fff',
            }}
            activeOpacity={0.8}
          >
            <View style={{
              width: 20, height: 20, borderRadius: 4, borderWidth: 2,
              alignItems: 'center', justifyContent: 'center',
              borderColor: form[f.key] ? Colors.accent : '#CBD5E1',
              backgroundColor: form[f.key] ? Colors.accent : 'transparent',
            }}>
              {form[f.key] && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{f.label}</Text>
              <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{f.sub}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Budget */}
      <Field label="Μέγιστος προϋπολογισμός (€)" optional>
        <TextInput
          style={inputStyle}
          placeholder="π.χ. 200"
          placeholderTextColor="#94A3B8"
          value={form.maxBudget}
          onChangeText={v => update('maxBudget', v)}
          keyboardType="decimal-pad"
        />
        <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
          Βοηθάει τους μεταφορείς να κάνουν ρεαλιστικές προσφορές
        </Text>
      </Field>

      {/* Summary */}
      <View style={{
        backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
        borderRadius: 16, padding: 16, marginBottom: 20,
      }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Σύνοψη
        </Text>
        <Row label="Τίτλος"      value={form.title} />
        <Row label="Κατηγορία"   value={CATEGORIES.find(c => c.id === form.category)?.label ?? form.category} />
        <Row label="Διαδρομή"    value={`${form.originCity} → ${form.destCity}`} />
        {form.weight      ? <Row label="Βάρος"         value={`${form.weight} kg`} /> : null}
        {displayVolume    ? <Row label="Όγκος"         value={`${displayVolume} m³`} /> : null}
        {form.maxBudget   ? <Row label="Προϋπολογισμός" value={`έως €${form.maxBudget}`} accent /> : null}
        {form.desiredDelivery ? (
          <Row
            label="Παράδοση έως"
            value={form.desiredDelivery.toLocaleDateString('el-GR')}
          />
        ) : null}
      </View>

      {error ? (
        <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <Text className="text-red-600 text-sm">{error}</Text>
        </View>
      ) : null}

      <View className="flex-row gap-3">
        <TouchableOpacity
          className="flex-1 border border-slate-200 rounded-2xl py-4 items-center bg-white"
          onPress={onBack}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text className="font-bold text-slate-600">← Πίσω</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 rounded-2xl py-4 items-center ${isSubmitting ? 'bg-primary/50' : 'bg-primary'}`}
          onPress={onSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          <Text className="text-white font-bold text-base">
            {isSubmitting
              ? (isEditing ? 'Αποθήκευση...' : 'Δημοσίευση...')
              : (isEditing ? 'Αποθήκευση ✓' : 'Δημοσίευση 🚀')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NewShipmentScreen() {
  const qc = useQueryClient()
  const { editId } = useLocalSearchParams<{ editId?: string }>()
  const isEditing = !!editId

  const [step, setStep]               = useState(1)
  const [form, setForm]               = useState<Form>(INITIAL)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]             = useState('')

  const { data: existingShipment } = useQuery({
    queryKey: ['shipment', editId],
    queryFn: () => shipmentsApi.get(editId!).then(r => r.data),
    enabled: !!editId,
  })

  useEffect(() => {
    if (!existingShipment) return
    setForm({
      category:         existingShipment.category ?? '',
      title:            existingShipment.title ?? '',
      description:      existingShipment.description ?? '',
      originCity:       existingShipment.originCity ?? '',
      originCityPlaceId: '',
      originAddress:    existingShipment.originAddress ?? '',
      originLat:        existingShipment.originLat?.toString() ?? '',
      originLng:        existingShipment.originLng?.toString() ?? '',
      destCity:         existingShipment.destCity ?? '',
      destCityPlaceId:  '',
      destAddress:      existingShipment.destAddress ?? '',
      destLat:          existingShipment.destLat?.toString() ?? '',
      destLng:          existingShipment.destLng?.toString() ?? '',
      desiredDelivery:  existingShipment.desiredDelivery ? new Date(existingShipment.desiredDelivery) : null,
      loadingInfo:      existingShipment.loadingInfo ?? '',
      length:           existingShipment.length?.toString() ?? '',
      width:            existingShipment.width?.toString() ?? '',
      height:           existingShipment.height?.toString() ?? '',
      weight:           existingShipment.weight?.toString() ?? '',
      volume:           existingShipment.volume?.toString() ?? '',
      maxBudget:        existingShipment.maxBudget?.toString() ?? '',
      isFragile:        existingShipment.isFragile ?? false,
      requiresCooling:  existingShipment.requiresCooling ?? false,
      isHazardous:      existingShipment.isHazardous ?? false,
    })
  }, [existingShipment])

  const update = (k: keyof Form, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    setIsSubmitting(true)
    setError('')
    try {
      const dimsFilled = !!form.length && !!form.width && !!form.height
      const computedVolume = dimsFilled
        ? (parseFloat(form.length) * parseFloat(form.width) * parseFloat(form.height)) / 1000000
        : form.volume ? parseFloat(form.volume) : undefined

      const desiredDeliveryISO = form.desiredDelivery
        ? form.desiredDelivery.toISOString().split('T')[0]
        : undefined

      const payload = {
        category:          form.category,
        title:             form.title.trim(),
        description:       form.description.trim() || undefined,
        originCity:        form.originCity.trim(),
        originCityPlaceId: form.originCityPlaceId || undefined,
        originAddress:     form.originAddress.trim() || undefined,
        originLat:         form.originLat ? parseFloat(form.originLat) : undefined,
        originLng:         form.originLng ? parseFloat(form.originLng) : undefined,
        destCity:          form.destCity.trim(),
        destCityPlaceId:   form.destCityPlaceId || undefined,
        destAddress:       form.destAddress.trim() || undefined,
        destLat:           form.destLat ? parseFloat(form.destLat) : undefined,
        destLng:           form.destLng ? parseFloat(form.destLng) : undefined,
        desiredDelivery:   desiredDeliveryISO,
        loadingInfo:       form.loadingInfo.trim() || undefined,
        length:            form.length  ? parseFloat(form.length)  : undefined,
        width:             form.width   ? parseFloat(form.width)   : undefined,
        height:            form.height  ? parseFloat(form.height)  : undefined,
        weight:            form.weight  ? parseFloat(form.weight)  : undefined,
        volume:            computedVolume,
        maxBudget:         form.maxBudget ? parseFloat(form.maxBudget) : undefined,
        isFragile:         form.isFragile,
        requiresCooling:   form.requiresCooling,
        isHazardous:       form.isHazardous,
      }

      if (isEditing && editId) {
        await shipmentsApi.update(editId, payload)
      } else {
        await shipmentsApi.create(payload)
      }
      qc.invalidateQueries({ queryKey: ['dashboard-sender'] })
      qc.invalidateQueries({ queryKey: ['sender-shipments'] })
      qc.invalidateQueries({ queryKey: ['shipment', editId] })
      router.back()
    } catch (e: any) {
      setError(e?.response?.data?.error || (isEditing ? 'Σφάλμα αποθήκευσης. Δοκίμασε ξανά.' : 'Σφάλμα δημιουργίας. Δοκίμασε ξανά.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      {isEditing ? (
        <View style={{ backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20 }}>
          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800' }}>Επεξεργασία Αποστολής</Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)' as any)}
            style={{ marginTop: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>✕ Ακύρωση</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="bg-primary pt-14 pb-3 px-5 flex-row items-center gap-3">
          <TouchableOpacity onPress={() => (step > 1 ? setStep(s => s - 1) : router.back())}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1">Νέα Αποστολή</Text>
          <Text className="text-blue-200 text-sm">{step}/3</Text>
        </View>
      )}

      {/* Step bar */}
      <View className="bg-white px-4 border-b border-slate-100">
        <StepBar current={step} />
      </View>

      {/* Step content */}
      <View className="flex-1 px-4 pt-4">
        {step === 1 && (
          <Step1 form={form} update={update} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <Step2 form={form} update={update} onBack={() => setStep(1)} onNext={() => setStep(3)} />
        )}
        {step === 3 && (
          <Step3
            form={form} update={update}
            onBack={() => setStep(2)} onSubmit={handleSubmit}
            isSubmitting={isSubmitting} error={error} isEditing={isEditing}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  )
}
