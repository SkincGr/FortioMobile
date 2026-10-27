import React from 'react'
import { View, Text } from 'react-native'
import { moveSummary } from '@/lib/shared/moveCard'
import { transportSummary } from '@/lib/shared/transportCards'
import type { FormT } from '@/lib/useFormT'

type Group = { title: string; rows: { label: string; value: string }[] }

function Groups({ groups }: { groups: Group[] }) {
  if (groups.length === 0) return null
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 10, paddingTop: 10, gap: 12 }}>
      {groups.map(group => (
        <View key={group.title}>
          <Text style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{group.title}</Text>
          {group.rows.map(row => (
            <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
              <Text style={{ fontSize: 13, color: '#64748B', flexShrink: 0 }}>{row.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B', flex: 1, textAlign: 'right' }}>{row.value}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

/** Ό,τι συμπληρώθηκε στην κάρτα μετακόμισης (MoveCardSummary του web) */
export function MoveCardSummary({ t, details }: { t: FormT; details: unknown }) {
  return <Groups groups={moveSummary(details, t)} />
}

/** Ό,τι συμπληρώθηκε στις κάρτες αυτοκινήτου / σκάφους / μεταφοράς / ενοικίασης (TransportCardSummary του web) */
export function TransportCardSummary({ t, card }: { t: FormT; card: { vehicle?: unknown; boat?: unknown; transport?: unknown; rental?: unknown } | null | undefined }) {
  return <Groups groups={transportSummary(card, t)} />
}
