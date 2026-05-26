import axios from 'axios'
import { API_BASE_URL } from '@/constants/config'
import { getToken } from './storage'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  const token = await getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Auth ────────────────────────────────────────────────────────────────────

export type LoginPayload = { email: string; password: string }
export type RegisterPayload = { name: string; email: string; password: string; phone?: string }

export const authApi = {
  login: (data: LoginPayload) =>
    api.post<{ token: string; user: AuthUser }>('/api/auth/mobile/login', data),

  register: (data: RegisterPayload) =>
    api.post<{ message: string }>('/api/register', data),
}

export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const dashboardApi = {
  getSender: (sortBy = 'date_desc') =>
    api.get(`/api/dashboard/sender?sortBy=${sortBy}`),
}

// ─── Shipments ───────────────────────────────────────────────────────────────

export type ShipmentStatus =
  | 'PENDING' | 'OFFERED' | 'ACCEPTED' | 'LOADED'
  | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'

export type Shipment = {
  id: string
  title: string
  category: string
  originCity: string
  destCity: string
  originAddress?: string
  destAddress?: string
  weight?: number
  volume?: number
  isFragile: boolean
  requiresCooling: boolean
  isHazardous: boolean
  desiredDelivery?: string
  maxBudget?: number
  status: ShipmentStatus
  roadDistanceKm?: number
  roadDurationMinutes?: number
  createdAt: string
  _count?: { offers: number; messages?: number }
  offers?: Offer[]
}

export type CreateShipmentPayload = {
  title: string
  description?: string
  category: string
  originCity: string
  originCityPlaceId?: string
  destCity: string
  destCityPlaceId?: string
  originAddress?: string
  destAddress?: string
  weight?: number
  volume?: number
  length?: number
  width?: number
  height?: number
  isFragile?: boolean
  requiresCooling?: boolean
  isHazardous?: boolean
  desiredDelivery?: string
  maxBudget?: number
  loadingInfo?: string
}

export const shipmentsApi = {
  list: (params?: { page?: number; sortBy?: string }) =>
    api.get<{ shipments: Shipment[]; total: number }>('/api/dashboard/sender', { params }),

  get: (id: string) =>
    api.get<Shipment>(`/api/shipments/${id}`),

  create: (data: CreateShipmentPayload) =>
    api.post<Shipment>('/api/shipments', data),

  delete: (id: string) =>
    api.delete(`/api/shipments/${id}`),

  getOffers: (shipmentId: string) =>
    api.get(`/api/shipments/${shipmentId}/matches`),
}

// ─── Offers ──────────────────────────────────────────────────────────────────

export type Offer = {
  id: string
  status: string
  price?: number
  deliveryDate?: string
  carrier: {
    id?: string
    email: string
    phone?: string
    carrierProfile?: { companyName: string }
  }
  _count?: { messages: number }
}

export const offersApi = {
  accept: (offerId: string) =>
    api.patch(`/api/offers/${offerId}`, { action: 'accept' }),

  reject: (offerId: string) =>
    api.patch(`/api/offers/${offerId}`, { action: 'reject' }),

  getDetail: (offerId: string) =>
    api.get(`/api/offers/${offerId}/detail`),
}

// ─── Messages ────────────────────────────────────────────────────────────────

export type Message = {
  id: string
  content: string
  senderId: string
  createdAt: string
  sender?: { id: string; name: string }
}

export const messagesApi = {
  getByOffer: (offerId: string) =>
    api.get<{ messages: Message[] }>(`/api/messages/${offerId}`),

  send: (offerId: string, content: string) =>
    api.post('/api/messages', { offerId, content }),
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type Notification = {
  id: string
  type: string
  message: string
  link?: string
  isRead: boolean
  createdAt: string
}

export const notificationsApi = {
  list: () =>
    api.get<Notification[]>('/api/notifications'),

  markRead: (id: string) =>
    api.patch(`/api/notifications/${id}`, { isRead: true }),
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export const profileApi = {
  get: () =>
    api.get('/api/sender/profile'),

  update: (data: Partial<{ name: string; phone: string }>) =>
    api.patch('/api/sender/profile', data),
}
