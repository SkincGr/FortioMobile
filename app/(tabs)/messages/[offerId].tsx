import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { messagesApi, Message } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Colors } from '@/constants/colors'

export default function ChatScreen() {
  const { offerId } = useLocalSearchParams<{ offerId: string }>()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const flatListRef = useRef<FlatList>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['messages', offerId],
    queryFn: () => messagesApi.getByOffer(offerId).then(r => r.data),
    refetchInterval: 5000,
    enabled: !!offerId,
  })

  const sendMut = useMutation({
    mutationFn: (content: string) => messagesApi.send(offerId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', offerId] })
      setText('')
    },
  })

  const messages: Message[] = Array.isArray(data) ? data : (data ?? [])

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages.length])

  if (isLoading) return <LoadingScreen message="Φόρτωση συνομιλίας..." />

  function handleSend() {
    const content = text.trim()
    if (!content) return
    sendMut.mutate(content)
  }

  function MessageBubble({ msg }: { msg: Message }) {
    const isMine = msg.senderId === user?.id
    return (
      <View className={`mb-2 flex-row ${isMine ? 'justify-end' : 'justify-start'}`}>
        <View className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isMine ? 'bg-primary rounded-tr-sm' : 'bg-white border border-slate-100 rounded-tl-sm'}`}>
          {!isMine && msg.sender?.name && (
            <Text className="text-xs text-slate-400 mb-1">{msg.sender.name}</Text>
          )}
          <Text className={`text-sm ${isMine ? 'text-white' : 'text-slate-800'}`}>{msg.content}</Text>
          <Text className={`text-xs mt-1 ${isMine ? 'text-blue-200' : 'text-slate-400'} text-right`}>
            {new Date(msg.createdAt).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View className="bg-primary pt-14 pb-4 px-5 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white font-bold">Συνομιλία</Text>
          <Text className="text-blue-200 text-xs">Προσφορά #{offerId.slice(-6)}</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={m => m.id}
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 12 }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="chatbubble-outline" size={40} color={Colors.textMuted} />
            <Text className="text-slate-400 mt-3">Ξεκίνα τη συνομιλία</Text>
          </View>
        }
        renderItem={({ item }) => <MessageBubble msg={item} />}
      />

      {/* Input */}
      <View className="bg-white border-t border-slate-100 px-4 py-3 flex-row items-end gap-2">
        <TextInput
          className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 text-slate-800 max-h-32"
          placeholder="Γράψε μήνυμα..."
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || sendMut.isPending}
          className={`rounded-full p-3 ${!text.trim() ? 'bg-slate-200' : 'bg-primary'}`}
        >
          {sendMut.isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={18} color={!text.trim() ? Colors.textMuted : '#fff'} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
