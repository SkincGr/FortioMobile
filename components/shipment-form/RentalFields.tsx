import React from 'react'
import { View, Text } from 'react-native'
import {
  RENTAL_DAILY_HOURS, RENTAL_DISTANCES, RENTAL_DRIVER_MODES, RENTAL_DURATIONS, RENTAL_HEIGHTS, RENTAL_LENGTHS, RENTAL_LICENSES,
  RENTAL_PAYLOADS, RENTAL_VEHICLE_SPECS, RENTAL_VEHICLE_TYPES, RENTAL_VOLUMES, RENTAL_WIDTHS, type RentalDetails,
} from '@/lib/shared/rentalCard'
import type { FormT } from '@/lib/useFormT'
import { ChoiceField, Section, TextField, YesNoField, s } from './ui'

/** 🚐 Ενοικίαση Van / Οχήματος: το όχημα που ζητά ο αποστολέας και, προαιρετικά, η παροχή οδηγού (όπως το RentalFields του web) */
export function RentalSection({ t, value, onChange }: { t: FormT; value: RentalDetails; onChange: (next: RentalDetails) => void }) {
  const set = <K extends keyof RentalDetails>(key: K, v: RentalDetails[K]) => onChange({ ...value, [key]: v })
  const choice = (field: keyof RentalDetails & string, options: readonly string[], label: string) => (
    <ChoiceField
      label={label} value={value[field]} options={options} notSet={t('transportCard.not_set')}
      labelOf={o => t(`rentalCard.${field}_${o}`)} onChange={v => set(field, v as never)}
    />
  )
  const withDriver = value.driverMode === 'WITH_DRIVER'
  const specs = (RENTAL_VEHICLE_SPECS as Record<string, (typeof RENTAL_VEHICLE_SPECS)[keyof typeof RENTAL_VEHICLE_SPECS] | undefined>)[value.vehicleType]

  return (
    <>
      <Section title={t('rentalCard.title')} hint={t('rentalCard.hint')}>
        {choice('vehicleType', RENTAL_VEHICLE_TYPES, t('rentalCard.vehicle_type'))}

        {/* Ενδεικτικά χαρακτηριστικά του τύπου που διαλέχτηκε */}
        {specs && (
          <View style={{ borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#B45309', marginBottom: 6 }}>{t('rentalCard.specs_title')}</Text>
            {[
              [t('rentalCard.specs_dims'), `${specs.dims} m`],
              [t('rentalCard.specs_volume'), `${specs.volume} m³`],
              [t('rentalCard.specs_payload'), `${specs.payload} kg`],
              [t('rentalCard.specs_license'), t(`rentalCard.licenseShort_${specs.license}`)],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 3 }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>{k}</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E293B' }}>{v}</Text>
              </View>
            ))}
            <Text style={[s.hint, { marginTop: 6 }]}>{t('rentalCard.specs_note')}</Text>
          </View>
        )}

        <Text style={s.labelSmall}>{t('rentalCard.dimensions')} <Text style={{ fontWeight: '400', color: '#94A3B8' }}>— {t('rentalCard.dimensions_or_volume')}</Text></Text>
        {choice('length', RENTAL_LENGTHS, `${t('rentalCard.length')} (m)`)}
        {choice('width', RENTAL_WIDTHS, `${t('rentalCard.width')} (m)`)}
        {choice('height', RENTAL_HEIGHTS, `${t('rentalCard.height')} (m)`)}
        {choice('volume', RENTAL_VOLUMES, t('rentalCard.volume'))}

        {choice('payload', RENTAL_PAYLOADS, t('rentalCard.payload'))}
        {!withDriver && choice('licenseCategory', RENTAL_LICENSES, t('rentalCard.license'))}
        {choice('duration', RENTAL_DURATIONS, t('rentalCard.duration'))}
        {choice('distance', RENTAL_DISTANCES, t('rentalCard.distance'))}
        <YesNoField t={t} label={t('rentalCard.full_insurance')} value={value.fullInsurance} onChange={v => set('fullInsurance', v)} />

        <TextField multiline label={t('rentalCard.notes')} value={value.notes} onChangeText={v => set('notes', v)} placeholder={t('rentalCard.notes_ph')} />
      </Section>

      <Section title={t('rentalCard.driver_title')} hint={t('rentalCard.driver_hint')}>
        {choice('driverMode', RENTAL_DRIVER_MODES, t('rentalCard.driver_mode'))}
        {withDriver && <YesNoField t={t} label={t('rentalCard.co_driver')} value={value.coDriver} onChange={v => set('coDriver', v)} />}
        {withDriver && choice('dailyHours', RENTAL_DAILY_HOURS, t('rentalCard.daily_hours'))}
        {withDriver && <YesNoField t={t} label={t('rentalCard.helps_loading')} value={value.helpsLoading} onChange={v => set('helpsLoading', v)} />}
        {withDriver && <YesNoField t={t} label={t('rentalCard.overnight')} value={value.overnight} onChange={v => set('overnight', v)} />}
      </Section>
    </>
  )
}
