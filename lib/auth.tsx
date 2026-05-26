import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, AuthUser } from './api'
import { saveToken, saveUser, getToken, getUser, clearAuth } from './storage'

type AuthState = {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    ;(async () => {
      const [token, user] = await Promise.all([getToken(), getUser<AuthUser>()])
      setState({ user, token, isLoading: false, isAuthenticated: !!token && !!user })
    })()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password })
    await Promise.all([saveToken(data.token), saveUser(data.user)])
    setState({ user: data.user, token: data.token, isLoading: false, isAuthenticated: true })
  }, [])

  const logout = useCallback(async () => {
    await clearAuth()
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
