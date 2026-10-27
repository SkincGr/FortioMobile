import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { Colors } from '@/constants/colors'
import {
  FLOORS, HOME_TYPES, LIFT_OBSTACLES, MOVE_SERVICES, SPECIAL_ITEMS_HOME, SPECIAL_ITEMS_OFFICE, addMoveItem, m3FromDims, moveAddressFilled,
  type MoveAddress, type MoveDetails, type MoveItem,
} from '@/lib/shared/moveCard'
import { CATALOG_DIMS_CM, CATALOG_BY_ID, MOVE_CATALOG, MOVING_BOX_IDS, catalogRoot, catalogVariants, findCatalogItem, normalizeItemName, type CatalogCategory } from '@/lib/shared/moveCatalog'
import { itemsOfGroup, visibleGroups, withGroupItems } from '@/lib/shared/itemGroups'
import { LOAD_ALLOWANCE_PCT, computeVolume, unitM3 } from '@/lib/shared/moveVolume'
import { overviewOf, roomsOfDetails } from '@/lib/shared/moveInventoryMerge'
import type { FormT } from '@/lib/useFormT'
import { Check, Chip, ChoiceField, Collapsible, NumberField, TextField, YesNoField, inputStyle, s } from './ui'

// Ίδια λογική με το components/shipment-form/MoveCardFields.tsx του Fortio· αλλάζει μόνο η εμφάνιση (React Native)

const fmtM3 = (n: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)
const fmtBoxM3 = (n: number) => new Intl.NumberFormat(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n)
const toggle = (list: string[], code: string, on: boolean) => (on ? [...new Set([...list, code])] : list.filter(c => c !== code))
const qtyOfItem = (item: MoveItem) => Math.max(1, Math.floor(Number(String(item.qty).replace(',', '.'))) || 1)
const groupTitle = { fontSize: 11, fontWeight: '800' as const, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 8 }
const small = { ...inputStyle, paddingHorizontal: 8, paddingVertical: 8, fontSize: 13, textAlign: 'center' as const }

/**
 * Στοιχεία του χώρου μιας διεύθυνσης: τύπος οικίας, όροφοι, ασανσέρ, κλιμακοστάσιο, ανυψωτικό, στάθμευση φορτηγού. Στην αφετηρία
 * και τετραγωνικά / δωμάτια. Κλειστό από προεπιλογή· όταν έχει στοιχεία, το κλειστό πλαίσιο το λέει.
 */
export function MoveAddressFields({ t, side, value, onChange, squareMeters, rooms, onSquareMeters, onRooms }: {
  t: FormT; side: 'origin' | 'dest'; value: MoveAddress; onChange: (next: MoveAddress) => void
  squareMeters?: string; rooms?: string; onSquareMeters?: (v: string) => void; onRooms?: (v: string) => void
}) {
  const set = <K extends keyof MoveAddress>(key: K, v: MoveAddress[K]) => onChange({ ...value, [key]: v })
  const [open, setOpen] = useState(false)
  const filled = moveAddressFilled(value) || (side === 'origin' && Boolean(squareMeters || rooms))

  if (!open) {
    return (
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.8}
        style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#F59E0B', borderRadius: 16, padding: 12, marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#B45309', textAlign: 'center' }}>{t(`moveCard.${side}_open`)}</Text>
        <Text style={{ fontSize: 12, color: filled ? Colors.success : '#64748B', textAlign: 'center', marginTop: 4 }}>
          {filled ? t('moveCard.site_filled') : t(`moveCard.${side}_hint`)}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={[s.section, { borderColor: '#F59E0B' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={s.sectionTitle}>🏠 {t(side === 'origin' ? 'moveCard.origin_title' : 'moveCard.dest_title')}</Text>
        <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}><Text style={{ color: '#64748B', fontSize: 13 }}>{t('moveCard.site_close')}</Text></TouchableOpacity>
      </View>

      <ChoiceField label={t('moveCard.home_type')} value={value.homeType} options={HOME_TYPES} labelOf={h => t(`moveCard.home_${h}`)} onChange={v => set('homeType', v)} notSet={t('moveCard.not_set')} />
      <NumberField integer label={t('moveCard.floors_count')} value={value.floorsCount} onChangeText={v => set('floorsCount', v)} placeholder="π.χ. 2" />
      <ChoiceField label={t('moveCard.floor')} value={value.floor} options={FLOORS} labelOf={f => t(`moveCard.floor_${f}`)} onChange={v => set('floor', v)} notSet={t('moveCard.not_set')} />
      {side === 'origin' && (
        <View style={s.row}>
          <NumberField style={{ flex: 1 }} integer label={t('moveCard.square_meters_label')} value={squareMeters ?? ''} onChangeText={v => onSquareMeters?.(v)} placeholder="π.χ. 85" />
          <NumberField style={{ flex: 1 }} integer label={t('moveCard.rooms')} value={rooms ?? ''} onChangeText={v => onRooms?.(v)} placeholder="π.χ. 3" />
        </View>
      )}

      <YesNoField t={t} prefix="moveCard" label={t('moveCard.elevator')} value={value.elevator} onChange={v => set('elevator', v)} />
      <TextField label={t('moveCard.elevator_fits')} value={value.elevatorFits} onChangeText={v => set('elevatorFits', v)} placeholder={t('moveCard.elevator_fits_ph')} editable={value.elevator === 'YES'} />

      <View style={s.row}>
        <NumberField style={{ flex: 1 }} integer label={`${t('moveCard.stairs')} — ${t('moveCard.stairs_width_label')}`} value={value.stairsWidthCm} onChangeText={v => set('stairsWidthCm', v)} placeholder="π.χ. 110" />
        <TextField style={{ flex: 1 }} label={`${t('moveCard.stairs')} — ${t('moveCard.stairs_turns')}`} value={value.stairsTurns} onChangeText={v => set('stairsTurns', v)} placeholder={t('moveCard.stairs_turns_ph')} />
      </View>

      <YesNoField t={t} prefix="moveCard" label={t('moveCard.lift')} value={value.lift} onChange={v => set('lift', v)} />
      <Text style={s.labelSmall}>{t('moveCard.lift_access')}</Text>
      <View style={[s.wrap, { marginBottom: 12 }]}>
        <Check checked={value.liftFacade} onChange={v => set('liftFacade', v)} label={t('moveCard.lift_facade')} />
        <Check checked={value.liftBalcony} onChange={v => set('liftBalcony', v)} label={t('moveCard.lift_balcony')} />
        <Check checked={value.liftPrivateYard} onChange={v => set('liftPrivateYard', v)} label={t('moveCard.lift_yard')} />
      </View>
      <Text style={s.labelSmall}>{t('moveCard.lift_obstacles')}</Text>
      <View style={[s.wrap, { marginBottom: 8 }]}>
        {LIFT_OBSTACLES.map(o => (
          <Check key={o} checked={value.liftObstacles.includes(o)} onChange={v => set('liftObstacles', toggle(value.liftObstacles, o, v))} label={t(`moveCard.obstacle_${o}`)} />
        ))}
      </View>
      <TextField value={value.liftNotes} onChangeText={v => set('liftNotes', v)} placeholder={t('moveCard.lift_notes_ph')} />

      <NumberField integer label={`${t('moveCard.parking')} — ${t('moveCard.parking_distance')}`} value={value.parkingDistanceM} onChangeText={v => set('parkingDistanceM', v)} placeholder="π.χ. 20" />
      <Text style={s.labelSmall}>{t('moveCard.parking_street')}</Text>
      <View style={s.wrap}>
        <Check checked={value.parkingNarrowStreet} onChange={v => set('parkingNarrowStreet', v)} label={t('moveCard.parking_narrow')} />
        <Check checked={value.parkingPedestrian} onChange={v => set('parkingPedestrian', v)} label={t('moveCard.parking_pedestrian')} />
      </View>
    </View>
  )
}

/** Λίστα ειδών με ποσότητα: γρήγορη προσθήκη από προτάσεις, ονόματα από τον κατάλογο, διαστάσεις και όγκος ανά τεμάχιο */
function ItemList({ t, items, onChange, suggestions, addLabel, catalogCategories, room }: {
  t: FormT; items: MoveItem[]; onChange: (next: MoveItem[]) => void
  suggestions: string[]; addLabel: string; catalogCategories: CatalogCategory[]
  /** Όταν δίνεται, μόνο τα αντικείμενα αυτού του δωματίου ('' = χωρίς δωμάτιο) και οι νέες γραμμές το παίρνουν */
  room?: string
}) {
  const [focused, setFocused] = useState<number | null>(null)
  const setRow = (index: number, patch: Partial<MoveItem>) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  // Αλλαγή ονόματος: ο όγκος και η αντιστοίχιση του προηγούμενου ονόματος δεν ισχύουν πια (εκτός αν βγαίνει από διαστάσεις)
  const rename = (index: number, name: string, catalogId?: string) => {
    const item = items[index]
    setRow(index, { name, catalogId, ...(m3FromDims(item.length, item.width, item.height) ? {} : { m3: undefined }) })
  }
  const setDim = (index: number, key: 'length' | 'width' | 'height', raw: string) => {
    const item = items[index]
    const next = { ...item, [key]: raw }
    const had = m3FromDims(item.length, item.width, item.height) != null
    const m3 = m3FromDims(next.length, next.width, next.height)
    setRow(index, { [key]: raw, ...(m3 ? { m3 } : had ? { m3: undefined } : {}) })
  }
  const catalog = MOVE_CATALOG.filter(c => catalogCategories.includes(c.category))
  // Αντί για το <datalist> του web: έως 5 είδη του καταλόγου που ταιριάζουν με ό,τι γράφεται
  const matchesFor = (name: string) => {
    const q = normalizeItemName(name)
    if (q.length < 2) return []
    return catalog.filter(c => normalizeItemName(c.name).includes(q) && c.name !== name).slice(0, 5)
  }

  return (
    <View>
      <View style={[s.wrap, { marginBottom: 10 }]}>
        {suggestions.map(name => <Chip key={name} label={`+ ${name}`} onPress={() => onChange(addMoveItem(items, name, room ?? ''))} />)}
      </View>
      {items.map((item, index) => {
        if (room !== undefined && (item.room ?? '') !== room) return null
        const named = item.name.trim() !== ''
        const unit = named ? unitM3(item) : null
        const matched = named ? ((item.catalogId ? CATALOG_BY_ID.get(item.catalogId) : undefined) ?? findCatalogItem(item.name)) : null
        const variants = matched ? catalogVariants(matched) : []
        const hints = focused === index ? matchesFor(item.name) : []
        return (
          <View key={index} style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, marginBottom: 10 }}>
            <View style={[s.row, { alignItems: 'center' }]}>
              <TextInput
                style={[inputStyle, { flex: 1, paddingVertical: 8, fontSize: 14 }]} placeholder={t('moveCard.item_name')} placeholderTextColor="#94A3B8"
                value={item.name} onChangeText={v => rename(index, v)} onFocus={() => setFocused(index)} onBlur={() => setTimeout(() => setFocused(f => (f === index ? null : f)), 200)}
              />
              <TextInput style={[small, { width: 52 }]} keyboardType="number-pad" value={item.qty} onChangeText={v => setRow(index, { qty: v })} />
              <TextInput style={[small, { width: 60 }]} keyboardType="decimal-pad" placeholder={t('moveCard.weight_ph')} placeholderTextColor="#94A3B8"
                value={item.weight ?? ''} onChangeText={v => setRow(index, { weight: v })} />
              <TouchableOpacity onPress={() => onChange(items.filter((_, i) => i !== index))} hitSlop={6}
                style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
                <Text style={{ color: '#94A3B8' }}>✕</Text>
              </TouchableOpacity>
            </View>
            {hints.length > 0 && (
              <View style={[s.wrap, { marginTop: 6 }]}>
                {hints.map(c => <Chip key={c.id} label={c.name} onPress={() => rename(index, c.name, c.id)} />)}
              </View>
            )}
            {matched && variants.length > 1 && (
              <View style={{ marginTop: 8 }}>
                <ChoiceField
                  label={t('moveCard.variant')} value={matched.id} options={variants.map(v => v.id)} notSet={t('moveCard.not_set')}
                  labelOf={id => { const v = CATALOG_BY_ID.get(id); return v ? (v.name.slice(catalogRoot(v).length).trim() || t('moveCard.variant_base')) : id }}
                  onChange={id => { const v = CATALOG_BY_ID.get(id); if (v) rename(index, v.name, v.id) }}
                />
              </View>
            )}
            <View style={[s.row, { alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }]}>
              {(['length', 'width', 'height'] as const).map((key, k) => (
                <React.Fragment key={key}>
                  {k > 0 && <Text style={{ color: '#94A3B8' }}>×</Text>}
                  <TextInput style={[small, { width: 56 }]} keyboardType="decimal-pad" placeholder={t(`moveCard.dim_${'lwh'[k]}`)} placeholderTextColor="#94A3B8"
                    value={item[key] ?? ''} onChangeText={v => setDim(index, key, v)} />
                </React.Fragment>
              ))}
              {unit != null && <Text style={{ fontSize: 12, color: '#64748B' }}>~{fmtM3(unit)} m³ {t('moveCard.volume_each')}</Text>}
            </View>
            {named && unit == null && (
              <View style={[s.row, { alignItems: 'center', marginTop: 6 }]}>
                <Text style={{ flex: 1, fontSize: 12, color: '#B45309' }}>{t('moveCard.volume_unknown')}</Text>
                <TextInput style={[small, { width: 80 }]} keyboardType="decimal-pad" value={item.m3 ?? ''} onChangeText={v => setRow(index, { m3: v })} />
              </View>
            )}
          </View>
        )
      })}
      <TouchableOpacity onPress={() => onChange([...items, { name: '', qty: '1', ...(room ? { room } : {}) }])}
        style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#F59E0B', borderRadius: 12, paddingVertical: 9, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#B45309' }}>{addLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

const ITEM_GROUPS = [
  { id: 'FURNITURE', title: 'moveCard.furniture', suggestions: 'moveCard.furniture_suggestions', add: 'moveCard.add_furniture' },
  { id: 'APPLIANCES', title: 'moveCard.appliances', suggestions: 'moveCard.appliance_suggestions', add: 'moveCard.add_appliance' },
  { id: 'BOXES', title: 'moveCard.boxes_title' },
  { id: 'ELECTRONICS', title: 'moveCard.electronics', suggestions: 'moveCard.electronics_suggestions', add: 'moveCard.add_electronics' },
  { id: 'SMALL_PACKAGE', title: 'moveCard.parcels', suggestions: 'moveCard.parcels_suggestions', add: 'moveCard.add_parcels' },
  { id: 'MACHINERY', title: 'moveCard.machinery', suggestions: 'moveCard.machinery_suggestions', add: 'moveCard.add_machinery' },
  { id: 'FOOD', title: 'moveCard.food', suggestions: 'moveCard.food_suggestions', add: 'moveCard.add_food' },
  { id: 'HAZARDOUS', title: 'moveCard.hazardous', suggestions: 'moveCard.hazardous_suggestions', add: 'moveCard.add_hazardous' },
  { id: 'OTHER', title: 'moveCard.other_items', suggestions: 'moveCard.other_suggestions', add: 'moveCard.add_other' },
] as const

/** «Κουτιά Μετακόμισης»: ένα κουτί ανά τύπο και πόσα τεμάχια (γραμμές των «Άλλων αντικειμένων» με το id του κουτιού) */
function BoxesTable({ t, items, onChange, room }: { t: FormT; items: MoveItem[]; onChange: (next: MoveItem[]) => void; room?: string }) {
  const here = (item: MoveItem) => room === undefined || (item.room ?? '') === room
  const setQty = (id: string, raw: string) => {
    const match = (item: MoveItem) => item.catalogId === id && here(item)
    const first = items.findIndex(match)
    const q = Math.floor(Number(raw.replace(',', '.')))
    if (!(q >= 1)) return onChange(items.filter(item => !match(item)))
    if (first === -1) {
      const name = CATALOG_BY_ID.get(id)?.name ?? id
      return onChange([...items, { name, qty: String(q), catalogId: id, source: 'USER', ...(room ? { room } : {}) }])
    }
    onChange(items.flatMap((item, i) => (i === first ? [{ ...item, qty: String(q) }] : match(item) ? [] : [item])))
  }
  return (
    <View>
      {MOVING_BOX_IDS.map(id => {
        const qty = items.filter(item => item.catalogId === id && here(item)).reduce((n, item) => n + qtyOfItem(item), 0)
        return (
          <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingVertical: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{t(`moveCard.box_label_${id}`)}</Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                {CATALOG_DIMS_CM[id]?.join(' × ')} cm · {fmtBoxM3(CATALOG_BY_ID.get(id)?.m3 ?? 0)} m³
              </Text>
            </View>
            <TextInput style={[small, { width: 60 }]} keyboardType="number-pad" value={qty > 0 ? String(qty) : ''} onChangeText={v => setQty(id, v)} placeholder="0" placeholderTextColor="#CBD5E1" />
          </View>
        )
      })}
    </View>
  )
}

/** Οι κατηγορίες αντικειμένων ως κουμπιά με το πλήθος τους· ένα πάτημα ανοίγει το πλαίσιό τους, δεύτερο το κλείνει */
function ItemGroups({ t, value, onChange, room, categories }: {
  t: FormT; value: MoveDetails; onChange: (next: MoveDetails) => void; categories?: readonly string[]; room?: string
}) {
  const [open, setOpen] = useState<string | null>(null)
  const split = (key: string) => t(key).split('|').map(x => x.trim()).filter(Boolean)
  const shown = categories ? visibleGroups(categories, value) : null
  const groups = ITEM_GROUPS.filter(g => shown === null || shown.includes(g.id))
  const inRoom = (item: MoveItem) => item.name.trim() !== '' && (room === undefined || (item.room ?? '') === room)
  const countOf = (id: CatalogCategory) => {
    const items = itemsOfGroup(value, id).filter(inRoom)
    return id === 'BOXES' ? items.reduce((n, i) => n + qtyOfItem(i), 0) : items.length
  }
  return (
    <View>
      <View style={[s.wrap, { marginBottom: 10 }]}>
        {groups.map(g => <Chip key={g.id} active={open === g.id} label={`${t(g.title)} (${countOf(g.id)})`} onPress={() => setOpen(open === g.id ? null : g.id)} />)}
      </View>
      {groups.map(g => (
        <View key={g.id} style={open === g.id ? { borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 10 } : { display: 'none' }}>
          {g.id === 'BOXES' ? (
            <BoxesTable t={t} items={itemsOfGroup(value, 'BOXES')} onChange={v => onChange(withGroupItems(value, 'BOXES', v))} room={room} />
          ) : (
            <ItemList
              t={t} items={itemsOfGroup(value, g.id)} onChange={v => onChange(withGroupItems(value, g.id, v))}
              suggestions={'suggestions' in g ? split(g.suggestions) : []} addLabel={'add' in g ? t(g.add) : ''} catalogCategories={[g.id]} room={room}
            />
          )}
        </View>
      ))}
    </View>
  )
}

/** Εκτιμώμενος όγκος: καθαρός, όγκος φόρτωσης με το ποσοστό για τα κενά, και ό,τι δεν μετρήθηκε */
function VolumeBox({ t, items }: { t: FormT; items: readonly MoveItem[] }) {
  const named = items.filter(i => i.name.trim() !== '')
  if (named.length === 0) return null
  const volume = computeVolume(named)
  if (volume.netM3 <= 0 && volume.unknown.length === 0) return null
  return (
    <View style={{ borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 12 }}>
      <Text style={groupTitle}>{t('moveCard.volume_title')}</Text>
      <Text style={{ fontSize: 13, color: '#334155' }}>{t('moveCard.volume_net')}: <Text style={{ fontWeight: '700' }}>{fmtM3(volume.netM3)} m³</Text></Text>
      <Text style={{ fontSize: 13, color: '#334155' }}>{t('moveCard.volume_load')} (+{LOAD_ALLOWANCE_PCT}%): <Text style={{ fontWeight: '700', color: '#B45309' }}>{fmtM3(volume.loadM3)} m³</Text></Text>
      {volume.unknown.length > 0 && <Text style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>{t('moveCard.volume_unknown_total')}: {volume.unknown.join(', ')}</Text>}
      <Text style={[s.hint, { marginTop: 4 }]}>{t('moveCard.volume_hint')}</Text>
    </View>
  )
}

const totalPieces = (value: Pick<MoveDetails, 'furniture' | 'appliances' | 'otherItems'>): number =>
  [...value.furniture, ...value.appliances, ...value.otherItems].filter(i => i.name.trim() !== '').reduce((n, i) => n + qtyOfItem(i), 0)

/** Καταγραφή αντικειμένων φορτίου (όχι μετακόμιση): ενημερώνει περιγραφή, όγκο και διαστάσεις (lib/shared/cargoInventory.ts) */
export function CargoItemsSection({ t, value, onChange, defaultOpen = true, categories }: {
  t: FormT; value: MoveDetails; onChange: (next: MoveDetails) => void; defaultOpen?: boolean; categories?: readonly string[]
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} title={`📋 ${t('moveCard.cargo_title')} (${totalPieces(value)})`}>
      <ItemGroups t={t} value={value} onChange={onChange} categories={categories} />
      <VolumeBox t={t} items={[...value.furniture, ...value.appliances, ...value.otherItems]} />
    </Collapsible>
  )
}

const MOVE_CATEGORIES = ['FURNITURE', 'APPLIANCES', 'BOXES', 'ELECTRONICS', 'OTHER'] as const
const OVERVIEW = '__overview__'

/** Συνολική εικόνα: τα αντικείμενα όλων των δωματίων μαζί, μόνο για ανάγνωση */
function MoveOverview({ t, value }: { t: FormT; value: MoveDetails }) {
  const { rows, totalQty } = overviewOf(value)
  if (rows.length === 0) return <Text style={s.hint}>{t('moveCard.overview_empty')}</Text>
  return (
    <View>
      <Text style={[s.hint, { marginBottom: 8 }]}>{t('moveCard.overview_hint')}</Text>
      {rows.map(row => (
        <View key={row.key} style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingVertical: 7 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{row.name}</Text>
            <Text style={{ fontSize: 13, color: '#334155' }}>{row.qty} {t('moveCard.pieces')}</Text>
            <Text style={{ fontSize: 13, color: '#64748B', minWidth: 52, textAlign: 'right' }}>{row.totalM3 != null ? `${fmtM3(row.totalM3)} m³` : '—'}</Text>
          </View>
          <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{row.rooms.map(r => `${r.room || t('photoUpload.no_room')} ${r.qty}`).join(' · ')}</Text>
        </View>
      ))}
      <Text style={{ fontSize: 13, color: '#334155', marginVertical: 8 }}>{t('moveCard.total_pieces')}: <Text style={{ fontWeight: '700' }}>{totalQty}</Text></Text>
      <VolumeBox t={t} items={[...value.furniture, ...value.appliances, ...value.otherItems]} />
    </View>
  )
}

/** «Περιγραφή Αντικειμένων» της μετακόμισης: λίστες ανά δωμάτιο, ειδικά αντικείμενα, υπηρεσίες, άλλες πληροφορίες */
export function MoveItemsSection({ t, value, onChange, defaultOpen = false }: { t: FormT; value: MoveDetails; onChange: (next: MoveDetails) => void; defaultOpen?: boolean }) {
  const set = <K extends keyof MoveDetails>(key: K, v: MoveDetails[K]) => onChange({ ...value, [key]: v })
  const allItems = [...value.furniture, ...value.appliances, ...value.otherItems]
  const rooms = roomsOfDetails(value)
  const hasRoomless = rooms.length > 0 && allItems.some(i => i.name.trim() !== '' && (i.room ?? '').trim() === '')
  const tabs = [...rooms, ...(hasRoomless ? [''] : [])]
  const [view, setView] = useState<string | null>(null)
  const current = tabs.length === 0 ? null : view === OVERVIEW || (view !== null && tabs.includes(view)) ? view : tabs[0]
  const inRoom = (items: readonly MoveItem[]) => (current === null || current === OVERVIEW ? items : items.filter(i => (i.room ?? '') === current))

  return (
    <Collapsible defaultOpen={defaultOpen} title={`📋 ${t('moveCard.items_title')} (${totalPieces(value)})`}>
      {tabs.length > 0 && (
        <View style={[s.wrap, { marginBottom: 12 }]}>
          {tabs.map(room => {
            const count = allItems.filter(i => i.name.trim() !== '' && (i.room ?? '') === room).length
            return <Chip key={room || '__none'} active={current === room} label={`${room || t('photoUpload.no_room')} (${count})`} onPress={() => setView(room)} />
          })}
          <Chip active={current === OVERVIEW} label={t('moveCard.overview')} onPress={() => setView(OVERVIEW)} />
        </View>
      )}

      {current === OVERVIEW ? (
        <MoveOverview t={t} value={value} />
      ) : (
        <>
          <ItemGroups t={t} value={value} onChange={onChange} room={current ?? undefined} categories={MOVE_CATEGORIES} />
          <VolumeBox t={t} items={inRoom(allItems)} />
        </>
      )}

      <Text style={[groupTitle, { marginTop: 6 }]}>{t('moveCard.special')}</Text>
      <View style={[s.wrap, { marginBottom: 8 }]}>
        {SPECIAL_ITEMS_HOME.map(code => (
          <Check key={code} checked={value.specialItems.includes(code)} onChange={v => set('specialItems', toggle(value.specialItems, code, v))} label={t(`moveCard.special_${code}`)} />
        ))}
      </View>
      <Text style={[s.labelSmall, { color: '#64748B' }]}>{t('moveCard.special_office')}</Text>
      <View style={[s.wrap, { marginBottom: 10 }]}>
        {SPECIAL_ITEMS_OFFICE.map(code => (
          <Check key={code} checked={value.specialItems.includes(code)} onChange={v => set('specialItems', toggle(value.specialItems, code, v))} label={t(`moveCard.special_${code}`)} />
        ))}
      </View>
      <NumberField integer label={t('moveCard.workstations')} value={value.workstations} onChangeText={v => set('workstations', v)} placeholder="π.χ. 12" />
      <TextField label={t('moveCard.special_notes')} value={value.specialNotes} onChangeText={v => set('specialNotes', v)} placeholder={t('moveCard.special_notes_ph')} />

      <Text style={groupTitle}>{t('moveCard.services')}</Text>
      <View style={{ gap: 6, marginBottom: 12 }}>
        {MOVE_SERVICES.map(code => (
          <Check key={code} checked={value.services.includes(code)} onChange={v => set('services', toggle(value.services, code, v))} label={t(`moveCard.service_${code}`)} />
        ))}
      </View>

      <TextField multiline label={t('moveCard.other_info')} value={value.otherInfo} onChangeText={v => set('otherInfo', v)} placeholder={t('moveCard.other_info_ph')} />
    </Collapsible>
  )
}
