import React from 'react'
import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { View, Text } from 'react-native'

function TabIcon({ name, focused, badge }: { name: any; focused: boolean; badge?: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Ionicons name={name} size={24} color={focused ? Colors.primary : Colors.tabBarInactive} />
      {badge ? (
        <View style={{
          position: 'absolute', top: -4, right: -10,
          backgroundColor: Colors.danger, borderRadius: 8,
          minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </View>
  )
}

export default function TabsLayout() {
  const { isLoading, isAuthenticated } = useAuth()
  const { colors } = useTheme()

  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Μηνύματα',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: 'Ανακοινώσεις',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'megaphone' : 'megaphone-outline'} focused={focused} />,
        }}
      />
      {/* Hidden from tab bar — accessible via router.push */}
      <Tabs.Screen name="shipments" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  )
}
