import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { API_BASE_URL } from '@/constants/config'
import { Colors } from '@/constants/colors'

type Suggestion = { label: string; placeId: string }

type Props = {
  label: string
  value: string
  placeId: string
  onSelect: (label: string, placeId: string) => void
  placeholder?: string
  type?: 'city' | 'address'
  cityContext?: string
  optional?: boolean
}

export function PlacesInput({
  label, value, placeId, onSelect,
  placeholder = 'Αναζήτηση...', type = 'city', cityContext, optional,
}: Props) {
  const [text, setText]               = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading]         = useState(false)
  const [focused, setFocused]         = useState(false)
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external value changes (e.g. form reset)
  useEffect(() => { setText(value) }, [value])

  function handleChange(q: string) {
    setText(q)
    // Clear confirmed placeId when user edits
    if (placeId) onSelect(q, '')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(() => doSearch(q), 350)
  }

  async function doSearch(q: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ input: q, type, lang: 'el' })
      if (cityContext) params.set('city', cityContext)
      const res = await fetch(`${API_BASE_URL}/api/places?${params}`)
      const data = await res.json()
      setSuggestions(data.suggestions ?? [])
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  function select(s: Suggestion) {
    const cityName = type === 'city'
      ? s.label.split(',')[0].trim()
      : s.label
    setText(cityName)
    onSelect(cityName, s.placeId)
    setSuggestions([])
  }

  function handleBlur() {
    setFocused(false)
    // Short delay so TouchableOpacity onPress fires before list disappears
    setTimeout(() => setSuggestions([]), 200)
  }

  const confirmed = !!placeId && text.length > 0
  const borderColor = focused
    ? Colors.primary
    : confirmed
      ? Colors.success
      : Colors.border

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (προαιρετικό)</Text> : null}
      </Text>

      {/* Input row */}
      <View style={[styles.inputRow, { borderColor }]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={text}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {loading && <ActivityIndicator size="small" color={Colors.primary} style={styles.icon} />}
        {confirmed && !loading && (
          <Ionicons name="checkmark-circle" size={18} color={Colors.success} style={styles.icon} />
        )}
      </View>

      {confirmed && (
        <Text style={styles.confirmed}>✓ Επαληθεύτηκε από Google Maps</Text>
      )}

      {/* Inline suggestion list */}
      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.slice(0, 5).map((s, i) => (
            <TouchableOpacity
              key={s.placeId}
              onPress={() => select(s)}
              style={[
                styles.suggestionItem,
                i < Math.min(suggestions.length, 5) - 1 && styles.suggestionBorder,
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.suggestionText} numberOfLines={2}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper:       { marginBottom: 16 },
  label:         { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 },
  optional:      { fontWeight: '400', color: '#94A3B8' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, backgroundColor: '#FAFAFA',
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1E293B' },
  icon:      { marginLeft: 8 },
  confirmed: { fontSize: 11, color: Colors.success, marginTop: 3 },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 8, elevation: 6,
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 8, paddingHorizontal: 14, paddingVertical: 11,
  },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  suggestionText:   { flex: 1, fontSize: 13, color: '#1E293B', lineHeight: 18 },
})
