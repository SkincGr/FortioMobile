import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'fortio_auth_token'
const USER_KEY = 'fortio_user'

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function removeToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export async function saveUser(user: object) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
}

export async function getUser<T = any>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export async function removeUser() {
  await SecureStore.deleteItemAsync(USER_KEY)
}

export async function clearAuth() {
  await Promise.all([removeToken(), removeUser()])
}
