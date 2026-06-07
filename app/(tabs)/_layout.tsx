import React from 'react'
import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { View, Text } from 'react-native'
import { useI18n } from '@/lib/i18n'

function TabIcon({ name, focused, badge, activeColor, inactiveColor, dangerColor }: {
  name: any; focused: boolean; badge?: number
  activeColor: string; inactiveColor: string; dangerColor: string
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Ionicons name={name} size={24} color={focused ? activeColor : inactiveColor} />
      {badge ? (
        <View style={{
          position: 'absolute', top: -4, right: -10,
          backgroundColor: dangerColor, borderRadius: 8,
          minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </View>
  )
}

export default function TabsLayout() {
  const { isLoading, isAuthenticated, logout } = useAuth()
  const { colors } = useTheme()
  const { t } = useI18n()

  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />

  const iconProps = {
    activeColor: colors.tabBarActive,
    inactiveColor: colors.tabBarInactive,
    dangerColor: colors.danger,
  }

  function handleLogout() {
    Alert.alert(t('profile.logout'), t('profile.logout_q'), [
      { text: t('profile.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          await logout()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

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
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} {...iconProps} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('msg.tab_messages') || 'Μηνύματα',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} {...iconProps} />,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: t('dash.announcements') || 'Ανακοινώσεις',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'megaphone' : 'megaphone-outline'} focused={focused} {...iconProps} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.account') || 'Προφίλ',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} {...iconProps} />,
        }}
      />
      <Tabs.Screen name="shipments" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile-personal" options={{ href: null }} />
      <Tabs.Screen name="profile-password" options={{ href: null }} />
      <Tabs.Screen
        name="logout"
        options={{
          title: t('profile.logout') || 'Έξοδος',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="log-out-outline" focused={focused} {...iconProps} />
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              style={props.style as any}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              {props.children}
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  )
}
