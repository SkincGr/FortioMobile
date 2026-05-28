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

function decodeJwtPayload(token: string): Partial<AuthUser> | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

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
      let nextUser = user

      if (token && user && !user.role) {
        const payload = decodeJwtPayload(token)
        if (payload?.role) {
          nextUser = { ...user, role: payload.role }
          await saveUser(nextUser)
        }
      }

      setState({ user: nextUser, token, isLoading: false, isAuthenticated: !!token && !!nextUser })
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
