import React from 'react'
import { View, Text } from 'react-native'
import {
  BOAT_TYPES, ENGINE_TYPES, LOADING_METHODS, LOADING_POINTS, VEHICLE_CLASSES,
  type BoatDetails, type TransportDetails, type VehicleDetails,
} from '@/lib/shared/transportCards'
import type { FormT } from '@/lib/useFormT'
import { Check, ChoiceField, NumberField, Section, TextField, YesNoField, s } from './ui'

// Ίδια πεδία και κανόνες εμφάνισης με το components/shipment-form/VehicleBoatFields.tsx του Fortio

/** 🚗 Στοιχεία αυτοκινήτου */
export function VehicleSection({ t, value, onChange }: { t: FormT; value: VehicleDetails; onChange: (next: VehicleDetails) => void }) {
  const set = <K extends keyof VehicleDetails>(key: K, v: VehicleDetails[K]) => onChange({ ...value, [key]: v })
  return (
    <Section title={t('transportCard.vehicle_title')}>
      <TextField label={t('transportCard.make_model')} value={value.makeModel} onChangeText={v => set('makeModel', v)} placeholder={t('transportCard.make_model_ph')} />
      <NumberField integer label={t('transportCard.year')} value={value.year} onChangeText={v => set('year', v)} placeholder="π.χ. 2018" />

      <Text style={s.labelSmall}>{t('transportCard.dimensions_cm')} <Text style={{ fontWeight: '400', color: '#94A3B8' }}>— {t('transportCard.dimensions_or_class')}</Text></Text>
      <View style={s.row}>
        <NumberField style={{ flex: 1 }} label={t('transportCard.length')} value={value.length} onChangeText={v => set('length', v)} />
        <NumberField style={{ flex: 1 }} label={t('transportCard.width')} value={value.width} onChangeText={v => set('width', v)} />
        <NumberField style={{ flex: 1 }} label={t('transportCard.height')} value={value.height} onChangeText={v => set('height', v)} />
      </View>
      <ChoiceField label={t('transportCard.vehicle_class')} value={value.vehicleClass} options={VEHICLE_CLASSES}
        labelOf={o => t(`transportCard.vehicle_class_${o}`)} onChange={v => set('vehicleClass', v)} notSet={t('transportCard.not_set')} />
      <NumberField label={t('transportCard.weight_kg')} value={value.weightKg} onChangeText={v => set('weightKg', v)} placeholder="π.χ. 1200" />

      <YesNoField t={t} label={t('transportCard.operable')} value={value.operable} onChange={v => set('operable', v)} />
      {value.operable === 'NO' && <YesNoField t={t} label={t('transportCard.can_roll')} value={value.canRoll} onChange={v => set('canRoll', v)} />}
      <YesNoField t={t} label={t('transportCard.has_keys')} value={value.hasKeys} onChange={v => set('hasKeys', v)} />
      <YesNoField t={t} label={t('transportCard.damaged')} value={value.damaged} onChange={v => set('damaged', v)} />
      {value.damaged === 'YES' && (
        <TextField multiline label={t('transportCard.damage_notes')} value={value.damageNotes} onChangeText={v => set('damageNotes', v)} placeholder={t('transportCard.damage_notes_ph')} />
      )}
    </Section>
  )
}

/** 🚤 Στοιχεία σκάφους */
export function BoatSection({ t, value, onChange }: { t: FormT; value: BoatDetails; onChange: (next: BoatDetails) => void }) {
  const set = <K extends keyof BoatDetails>(key: K, v: BoatDetails[K]) => onChange({ ...value, [key]: v })
  return (
    <Section title={t('transportCard.boat_title')}>
      <ChoiceField label={t('transportCard.boat_type')} value={value.boatType} options={BOAT_TYPES}
        labelOf={o => t(`transportCard.boat_type_${o}`)} onChange={v => set('boatType', v)} notSet={t('transportCard.not_set')} />
      <NumberField label={t('transportCard.weight_kg')} value={value.weightKg} onChangeText={v => set('weightKg', v)} placeholder="π.χ. 1500" />
      <View style={s.row}>
        <NumberField style={{ flex: 1 }} label={t('transportCard.length_m')} value={value.lengthM} onChangeText={v => set('lengthM', v)} placeholder="6.5" />
        <NumberField style={{ flex: 1 }} label={t('transportCard.width_m')} value={value.widthM} onChangeText={v => set('widthM', v)} placeholder="2.4" />
        <NumberField style={{ flex: 1 }} label={t('transportCard.height_m')} value={value.heightM} onChangeText={v => set('heightM', v)} placeholder="2.5" />
      </View>
      <Text style={[s.hint, { marginTop: -6, marginBottom: 10 }]}>{t('transportCard.height_hint')}</Text>

      <ChoiceField label={t('transportCard.engine')} value={value.engineType} options={ENGINE_TYPES}
        labelOf={o => t(`transportCard.engine_${o}`)} onChange={v => set('engineType', v)} notSet={t('transportCard.not_set')} />
      {value.engineType !== '' && value.engineType !== 'NONE' && (
        <YesNoField t={t} label={t('transportCard.engine_stays')} value={value.engineStays} onChange={v => set('engineStays', v)} />
      )}
      <YesNoField t={t} label={t('transportCard.has_trailer')} value={value.hasTrailer} onChange={v => set('hasTrailer', v)} />
      {value.hasTrailer === 'YES' && <YesNoField t={t} label={t('transportCard.trailer_goes')} value={value.trailerGoes} onChange={v => set('trailerGoes', v)} />}
      {value.hasTrailer === 'YES' && value.trailerGoes === 'YES' && (
        <YesNoField t={t} label={t('transportCard.loaded_on_trailer')} value={value.loadedOnTrailer} onChange={v => set('loadedOnTrailer', v)} />
      )}
    </Section>
  )
}

/** 📍 Στοιχεία μεταφοράς (αυτοκίνητο και σκάφος): σημείο και τρόπος φόρτωσης/εκφόρτωσης, ευελιξία ημερομηνίας */
export function TransportSection({ t, value, onChange }: { t: FormT; value: TransportDetails; onChange: (next: TransportDetails) => void }) {
  const set = <K extends keyof TransportDetails>(key: K, v: TransportDetails[K]) => onChange({ ...value, [key]: v })
  // «Κανένα από αυτά» αποκλείει τα υπόλοιπα, και το αντίστροφο (όπως στο web)
  const toggleMethod = (method: string, on: boolean) => {
    const next = on ? (method === 'NONE' ? ['NONE'] : [...value.loadingMethods.filter(m => m !== 'NONE'), method]) : value.loadingMethods.filter(m => m !== method)
    set('loadingMethods', next)
  }
  return (
    <Section title={t('transportCard.transport_title')} hint={t('transportCard.transport_hint')}>
      <ChoiceField label={t('transportCard.loading_point')} value={value.loadingPoint} options={LOADING_POINTS}
        labelOf={o => t(`transportCard.point_${o}`)} onChange={v => set('loadingPoint', v)} notSet={t('transportCard.not_set')} />
      <ChoiceField label={t('transportCard.unloading_point')} value={value.unloadingPoint} options={LOADING_POINTS}
        labelOf={o => t(`transportCard.point_${o}`)} onChange={v => set('unloadingPoint', v)} notSet={t('transportCard.not_set')} />
      <Text style={s.labelSmall}>{t('transportCard.loading_methods')}</Text>
      <View style={[s.wrap, { marginBottom: 12 }]}>
        {LOADING_METHODS.map(method => (
          <Check key={method} checked={value.loadingMethods.includes(method)} onChange={on => toggleMethod(method, on)} label={t(`transportCard.method_${method}`)} />
        ))}
      </View>
      <NumberField integer label={`${t('transportCard.date_flex')} (± ${t('transportCard.days')})`} value={value.dateFlexDays} onChangeText={v => set('dateFlexDays', v)} placeholder="π.χ. 3" />
    </Section>
  )
}
