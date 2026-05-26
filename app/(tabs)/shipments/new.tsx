import React, { useState } from 'react'
import {
  View, Text, ScrollView, Switch, TouchableOpacity,
  KeyboardAvoidingView, Platform
} from 'react-native'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { shipmentsApi } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const CATEGORIES = [
  'Έπιπλα', 'Ηλεκτρονικά', 'Ρούχα', 'Τρόφιμα', 'Οικοδομικά',
  'Αυτοκίνητα/Μηχανές', 'Χαρτί/Έγγραφα', 'Χύδην', 'Άλλο'
]

export default function NewShipmentScreen() {
  const qc = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle]               = useState('')
  const [description, setDescription]   = useState('')
  const [category, setCategory]         = useState('')
  const [originCity, setOriginCity]     = useState('')
  const [destCity, setDestCity]         = useState('')
  const [originAddress, setOriginAddress] = useState('')
  const [destAddress, setDestAddress]   = useState('')
  const [weight, setWeight]             = useState('')
  const [maxBudget, setMaxBudget]       = useState('')
  const [desiredDelivery, setDesiredDelivery] = useState('')
  const [isFragile, setIsFragile]       = useState(false)
  const [requiresCooling, setRequiresCooling] = useState(false)
  const [isHazardous, setIsHazardous]   = useState(false)

  async function handleSubmit() {
    if (!title.trim() || !category || !originCity.trim() || !destCity.trim()) {
      setError('Τίτλος, κατηγορία, πόλη αποστολής και παράδοσης είναι υποχρεωτικά')
      return
    }
    setLoading(true)
    setError('')
    try {
      await shipmentsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        originCity: originCity.trim(),
        destCity: destCity.trim(),
        originAddress: originAddress.trim() || undefined,
        destAddress: destAddress.trim() || undefined,
        weight: weight ? Number(weight) : undefined,
        maxBudget: maxBudget ? Number(maxBudget) : undefined,
        desiredDelivery: desiredDelivery || undefined,
        isFragile,
        requiresCooling,
        isHazardous,
      })
      await qc.invalidateQueries({ queryKey: ['dashboard-sender'] })
      await qc.invalidateQueries({ queryKey: ['sender-shipments'] })
      router.back()
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Σφάλμα δημιουργίας')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View className="bg-primary pt-14 pb-4 px-5 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Νέα Αποστολή</Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        ) : null}

        <Text className="text-lg font-bold text-slate-800 mb-3">Βασικά Στοιχεία</Text>

        <Input label="Τίτλος *" placeholder="π.χ. Μεταφορά επίπλων" value={title} onChangeText={setTitle} />
        <Input label="Περιγραφή" placeholder="Λεπτομέρειες φορτίου..." value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />

        {/* Category picker */}
        <Text className="text-sm font-medium text-slate-700 mb-2">Κατηγορία *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              className={`mr-2 px-3 py-2 rounded-xl border ${category === cat ? 'bg-primary border-primary' : 'border-slate-200 bg-white'}`}
            >
              <Text className={`text-sm font-medium ${category === cat ? 'text-white' : 'text-slate-600'}`}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View className="h-px bg-slate-100 my-3" />
        <Text className="text-lg font-bold text-slate-800 mb-3">Διαδρομή</Text>

        <Input label="Πόλη Αποστολής *" placeholder="π.χ. Αθήνα" value={originCity} onChangeText={setOriginCity} />
        <Input label="Διεύθυνση Παραλαβής" placeholder="π.χ. Ερμού 5, Αθήνα" value={originAddress} onChangeText={setOriginAddress} />
        <Input label="Πόλη Παράδοσης *" placeholder="π.χ. Θεσσαλονίκη" value={destCity} onChangeText={setDestCity} />
        <Input label="Διεύθυνση Παράδοσης" placeholder="π.χ. Εγνατία 10, Θεσσαλονίκη" value={destAddress} onChangeText={setDestAddress} />

        <View className="h-px bg-slate-100 my-3" />
        <Text className="text-lg font-bold text-slate-800 mb-3">Στοιχεία Φορτίου</Text>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input label="Βάρος (kg)" placeholder="0" keyboardType="numeric" value={weight} onChangeText={setWeight} />
          </View>
          <View className="flex-1">
            <Input label="Μέγιστος Προϋπολογισμός (€)" placeholder="0" keyboardType="numeric" value={maxBudget} onChangeText={setMaxBudget} />
          </View>
        </View>

        <Input label="Επιθυμητή Ημερομηνία Παράδοσης" placeholder="YYYY-MM-DD" value={desiredDelivery} onChangeText={setDesiredDelivery} />

        {/* Flags */}
        <View className="gap-3 mb-6">
          {[
            { label: 'Εύθραυστο', value: isFragile, onChange: setIsFragile },
            { label: 'Απαιτεί Ψύξη', value: requiresCooling, onChange: setRequiresCooling },
            { label: 'Επικίνδυνο Υλικό', value: isHazardous, onChange: setIsHazardous },
          ].map(({ label, value, onChange }) => (
            <View key={label} className="flex-row justify-between items-center bg-slate-50 rounded-xl px-4 py-3">
              <Text className="text-slate-700 font-medium">{label}</Text>
              <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: '#CBD5E1', true: '#1B3A6B' }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        <Button title="Δημιουργία Αποστολής" loading={loading} onPress={handleSubmit} size="lg" />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
