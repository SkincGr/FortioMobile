import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, Pressable, StyleSheet, type KeyboardTypeOptions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import type { YesNo } from '@/lib/shared/moveCard'
import type { FormT } from '@/lib/useFormT'
import { Theme, useStyles, useTheme } from '@/lib/theme'

// Κοινά στοιχεία των καρτών της φόρμας αποστολής (αντίστοιχα των Select / Check / Section / CollapsibleFrame του web)

/** Στυλ πεδίου κειμένου της φόρμας· εξαρτάται από το θέμα */
export const makeInputStyle = (t: Theme) => ({
  borderWidth: 1, borderColor: t.ink(0.12),
  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
  fontSize: 15, color: t.inkSolid, backgroundColor: t.raised,
})
export function useInputStyle() {
  return useStyles(makeInputStyle)
}
/** Τα στυλ της φόρμας (StyleSheet) για τα components των καρτών */
export function useFormStyles() {
  return useStyles(makeStyles)
}
export const errorBorder = { borderColor: Colors.danger }

export function Label({ children, small }: { children: React.ReactNode; small?: boolean }) {
  const s = useFormStyles()

  return <Text style={small ? s.labelSmall : s.label}>{children}</Text>
}

export function TextField({ label, value, onChangeText, placeholder, keyboardType, multiline, editable = true, error, style }: {
  label?: string; value: string; onChangeText: (v: string) => void; placeholder?: string
  keyboardType?: KeyboardTypeOptions; multiline?: boolean; editable?: boolean; error?: boolean; style?: object
}) {
  const inputStyle = useInputStyle()

  const th = useTheme()
  const s = useFormStyles()

  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label ? <Label small>{label}</Label> : null}
      <TextInput
        style={[inputStyle, multiline && { minHeight: 80, textAlignVertical: 'top' }, error && errorBorder, !editable && s.disabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={th.inkText(0.4)}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
      />
    </View>
  )
}

export function NumberField(props: Omit<React.ComponentProps<typeof TextField>, 'keyboardType'> & { integer?: boolean }) {
  return <TextField {...props} keyboardType={props.integer ? 'number-pad' : 'decimal-pad'} />
}

export function Check({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  const s = useFormStyles()

  return (
    <TouchableOpacity onPress={() => onChange(!checked)} activeOpacity={0.8} style={[s.check, checked && s.checkOn]}>
      <View style={[s.box, checked && s.boxOn]}>
        {checked && <Text style={s.tick}>✓</Text>}
      </View>
      <Text style={s.checkTxt}>{label}</Text>
    </TouchableOpacity>
  )
}

export function Chip({ label, active, onPress, onLongPress }: { label: string; active?: boolean; onPress: () => void; onLongPress?: () => void }) {
  const s = useFormStyles()

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} style={[s.chip, active && s.chipOn]} activeOpacity={0.8}>
      <Text style={[s.chipTxt, active && s.chipTxtOn]}>{label}</Text>
    </TouchableOpacity>
  )
}

/** Λίστα επιλογής σε παράθυρο (αντίστοιχο του <Select> του web), με «— Δεν ορίστηκε —» για το κενό */
export function ChoiceField({ label, value, options, labelOf, onChange, notSet }: {
  label: string; value: string; options: readonly string[]; labelOf: (o: string) => string
  onChange: (v: string) => void; notSet: string
}) {
  const inputStyle = useInputStyle()

  const th = useTheme()
  const s = useFormStyles()

  const [open, setOpen] = useState(false)
  return (
    <View style={{ marginBottom: 12 }}>
      <Label small>{label}</Label>
      <TouchableOpacity onPress={() => setOpen(true)} style={[inputStyle, s.select]} activeOpacity={0.8}>
        <Text style={{ flex: 1, fontSize: 15, color: value ? th.inkSolid : th.inkText(0.4) }} numberOfLines={2}>
          {value ? labelOf(value) : notSet}
        </Text>
        <Ionicons name="chevron-down" size={16} color={th.inkText(0.4)} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {['', ...options].map(o => (
                <TouchableOpacity key={o || '__none'} onPress={() => { onChange(o); setOpen(false) }} style={s.option}>
                  <Text style={[s.optionTxt, o === value && s.optionOn]}>{o ? labelOf(o) : notSet}</Text>
                  {o === value && <Ionicons name="checkmark" size={18} color={Colors.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

/** Ναι / Όχι / (κενό): τρία κουμπιά στη σειρά. prefix = η ενότητα των κειμένων (transportCard ή moveCard) */
export function YesNoField({ label, value, onChange, t, prefix = 'transportCard' }: {
  label: string; value: YesNo; onChange: (v: YesNo) => void; t: FormT; prefix?: 'transportCard' | 'moveCard'
}) {
  const s = useFormStyles()

  const options: { v: YesNo; label: string }[] = [
    { v: '', label: '—' }, { v: 'YES', label: t(`${prefix}.yes`) }, { v: 'NO', label: t(`${prefix}.no`) },
  ]
  return (
    <View style={{ marginBottom: 12 }}>
      <Label small>{label}</Label>
      <View style={s.segment}>
        {options.map(o => (
          <TouchableOpacity key={o.v || '__none'} onPress={() => onChange(o.v)} style={[s.segmentBtn, value === o.v && s.segmentOn]}>
            <Text style={[s.segmentTxt, value === o.v && s.segmentTxtOn]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const s = useFormStyles()

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  )
}

/** Πλαίσιο που ανοιγοκλείνει από την επικεφαλίδα του (CollapsibleFrame του web) */
export function Collapsible({ title, badge, open, onOpenChange, defaultOpen = false, children }: {
  title: string; badge?: string; open?: boolean; onOpenChange?: (open: boolean) => void; defaultOpen?: boolean; children: React.ReactNode
}) {
  const s = useFormStyles()

  const [own, setOwn] = useState(defaultOpen)
  const isOpen = open ?? own
  const toggle = () => { const next = !isOpen; setOwn(next); onOpenChange?.(next) }
  return (
    <View style={s.section}>
      <TouchableOpacity onPress={toggle} style={s.collHead} activeOpacity={0.8}>
        <Text style={[s.sectionTitle, { flex: 1 }]}>{title}</Text>
        {badge ? <Text style={s.badge}>{badge}</Text> : null}
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.accent} />
      </TouchableOpacity>
      {/* Κρυμμένο αντί να αφαιρείται, ώστε να μένει ό,τι γράφτηκε (όπως το hidden του web) */}
      <View style={isOpen ? { marginTop: 12 } : { display: 'none' }}>{children}</View>
    </View>
  )
}

export const makeStyles = (t: Theme) => StyleSheet.create({
  label:      { fontSize: 14, fontWeight: '600', color: t.inkText(0.85), marginBottom: 6 },
  labelSmall: { fontSize: 12, fontWeight: '600', color: t.inkText(0.7), marginBottom: 5 },
  hint:       { fontSize: 12, color: t.inkText(0.6), marginTop: 4, lineHeight: 17 },
  disabled:   { backgroundColor: t.raised, color: t.inkText(0.4) },
  row:        { flexDirection: 'row', gap: 8 },
  wrap:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  check:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: t.ink(0.12), backgroundColor: t.surface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  checkOn:  { borderColor: Colors.accent, backgroundColor: 'rgba(245,158,11,0.1)' },
  box:      { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: t.ink(0.18), alignItems: 'center', justifyContent: 'center' },
  boxOn:    { borderColor: Colors.accent, backgroundColor: Colors.accent },
  tick:     { color: t.snow, fontSize: 10, fontWeight: '700' },
  checkTxt: { fontSize: 13, color: t.inkSolid, flexShrink: 1 },

  chip:      { borderWidth: 1, borderColor: t.ink(0.12), backgroundColor: t.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn:    { borderColor: Colors.accent, backgroundColor: Colors.accent },
  chipTxt:   { fontSize: 12, color: t.inkText(0.7), fontWeight: '600' },
  chipTxtOn: { color: '#000' },

  select:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backdrop:   { flex: 1, backgroundColor: t.shade(0.45), justifyContent: 'center', padding: 24 },
  sheet:      { backgroundColor: t.surface, borderRadius: 16, paddingVertical: 12 },
  sheetTitle: { fontSize: 13, fontWeight: '700', color: t.inkText(0.6), paddingHorizontal: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  option:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: t.ink(0.08) },
  optionTxt:  { flex: 1, fontSize: 15, color: t.inkSolid },
  optionOn:   { fontWeight: '700', color: Colors.primary },

  segment:      { flexDirection: 'row', borderWidth: 1, borderColor: t.ink(0.12), borderRadius: 12, overflow: 'hidden' },
  segmentBtn:   { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: t.raised },
  segmentOn:    { backgroundColor: Colors.accent },
  segmentTxt:   { fontSize: 14, color: t.inkText(0.7), fontWeight: '600' },
  segmentTxtOn: { color: '#000' },

  section:      { borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 16, padding: 14, marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: t.accentText },
  collHead:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge:        { fontSize: 11, fontWeight: '700', color: t.accentText, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
})
