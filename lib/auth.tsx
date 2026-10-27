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
  login: (identifier: string, password: string) => Promise<void>
  logout: () => Promise<void>
  // Νέο token από το backend (π.χ. μετά από αλλαγή κωδικού, που ακυρώνει το προηγούμενο)
  replaceToken: (token: string) => Promise<void>
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

      // Η εφαρμογή είναι μόνο για αποστολείς. Συνεδρία μεταφορέα ή admin από login πριν το backend αρχίσει να απορρίπτει
      // τους υπόλοιπους ρόλους (403) σβήνεται, ώστε η επόμενη σύνδεση να δείξει το σχετικό μήνυμα.
      if (token && nextUser?.role && nextUser.role !== 'SENDER') {
        await clearAuth()
        setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
        return
      }

      setState({ user: nextUser, token, isLoading: false, isAuthenticated: !!token && !!nextUser })
    })()
  }, [])

  const login = useCallback(async (identifier: string, password: string) => {
    const { data } = await authApi.login({ identifier, password })
    await Promise.all([saveToken(data.token), saveUser(data.user)])
    setState({ user: data.user, token: data.token, isLoading: false, isAuthenticated: true })
  }, [])

  const logout = useCallback(async () => {
    await clearAuth()
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
  }, [])

  const replaceToken = useCallback(async (token: string) => {
    await saveToken(token)
    setState(prev => ({ ...prev, token }))
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, replaceToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
