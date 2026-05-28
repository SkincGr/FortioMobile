import axios from 'axios'
import { API_BASE_URL } from '@/constants/config'
import { getToken } from './storage'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  const token = await getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthUser = { id: string; name: string; email: string; role: string }

export type ShipmentStatus =
  | 'PENDING' | 'OFFERED' | 'ACCEPTED' | 'LOADED'
  | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'

export type OfferStatus =
  | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'COMPLETED' | 'REQUEST'

export type Shipment = {
  id: string
  title: string
  description?: string
  category: string
  originCity: string
  destCity: string
  originAddress?: string
  destAddress?: string
  originLat?: number; originLng?: number
  destLat?: number;   destLng?: number
  weight?: number; volume?: number
  length?: number; width?: number; height?: number
  isFragile: boolean; requiresCooling: boolean; isHazardous: boolean
  desiredDelivery?: string
  loadingInfo?: string
  maxBudget?: number
  roadDistanceKm?: number; roadDurationMinutes?: number
  status: ShipmentStatus
  createdAt: string; updatedAt: string
  sender?: { id: string; name: string }
  offers?: Offer[]
  photos?: { id: string; url: string }[]
  _count?: { offers: number; messages?: number }
}

export type Offer = {
  id: string
  status: OfferStatus
  price?: number
  deliveryDate?: string
  carrierId?: string
  routeId?: string | null
  carrier: {
    id?: string; name?: string; email: string; phone?: string
    carrierProfile?: { companyName?: string; rating?: number; vehicleType?: string }
  }
  route?: {
    id?: string
    routeNumber?: string
    estimatedArrival?: string
    originCity?: string
    destCity?: string
    departureDate?: string
    stops?: { city?: string; estimatedDate?: string }[]
  }
  _count?: { messages: number }
  unreadCount?: number
}

export type Message = {
  id: string
  content: string
  senderId: string
  isRead: boolean
  createdAt: string
  sender?: { id: string; name: string }
  offer?: { id: string; price?: number }
}

export type Notification = {
  id: string; type: string; message: string
  link?: string; isRead: boolean; createdAt: string
}

export type Announcement = {
  id: string
  title: string
  body: string
  status: string
  ctaText?: string
  priority?: number
  createdAt: string
  carrier?: {
    id: string
    name: string
    carrierProfile?: { rating?: number; totalTrips?: number; vehicleType?: string }
  }
}

export type DashboardData = {
  shipments: Shipment[]
  completedShipments: Shipment[]
  announcementCount: number
  inboxMessageCount: number
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: AuthUser }>('/api/auth/mobile/login', data),

  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post<{ message: string }>('/api/register', data),
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getSender: (sortBy = 'date_desc') =>
    api.get<DashboardData>(`/api/dashboard/sender?sortBy=${sortBy}`),

  getCarrier: () =>
    api.get<{ shipments: Shipment[]; total: number; page: number; pageSize: number }>('/api/shipments'),
}

// ─── Shipments ────────────────────────────────────────────────────────────────

export type CreateShipmentPayload = {
  title: string; description?: string; category: string
  originCity: string; originCityPlaceId?: string
  destCity: string;   destCityPlaceId?: string
  originAddress?: string; destAddress?: string
  originLat?: number; originLng?: number
  destLat?: number;   destLng?: number
  weight?: number; volume?: number
  length?: number; width?: number; height?: number
  isFragile?: boolean; requiresCooling?: boolean; isHazardous?: boolean
  desiredDelivery?: string; maxBudget?: number; loadingInfo?: string
}

export const shipmentsApi = {
  get: (id: string) =>
    api.get<Shipment & { offers: Offer[] }>(`/api/shipments/${id}`),

  create: (data: CreateShipmentPayload) =>
    api.post<Shipment>('/api/shipments', data),

  update: (id: string, data: Partial<CreateShipmentPayload>) =>
    api.patch<Shipment>(`/api/shipments/${id}`, data),

  delete: (id: string) =>
    api.delete(`/api/shipments/${id}`),
}

// ─── Offers ───────────────────────────────────────────────────────────────────

export const offersApi = {
  accept: (offerId: string) =>
    api.patch(`/api/offers/${offerId}`, { action: 'accept' }),

  reject: (offerId: string) =>
    api.patch(`/api/offers/${offerId}`, { action: 'reject' }),
}

// ─── Match counts (batch) ─────────────────────────────────────────────────────

export const matchCountsApi = {
  getBatch: (ids: string[], maxDistance = 10) =>
    api.post<{ counts: Record<string, number> }>('/api/shipments/match-counts', { ids, maxDistance }),
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export type RouteStop = {
  id: string
  city?: string
  stopOrder: number
  canPickup: boolean
  canDeliver: boolean
  estimatedDate?: string
  place?: { name: string; latitude: number; longitude: number }
}

export type RouteMatch = {
  id: string
  routeNumber?: string
  status: string
  originCity?: string
  destCity?: string
  departureDate?: string
  estimatedArrival?: string
  isRecurring?: boolean
  availableWeight?: number
  availableVolume?: number
  pricePerKg?: number
  pricePerM3?: number
  carrier: {
    vehicleType?: string
    rating?: number
    user: { id: string; name?: string }
  }
  stops: RouteStop[]
  distanceKm?: number | null
  hasExactOriginMatch: boolean
}

export const matchesApi = {
  get: (shipmentId: string, maxDistance = 10) =>
    api.get<{ routes: RouteMatch[]; matchCount: number }>(
      `/api/shipments/${shipmentId}/matches?maxDistance=${maxDistance}&proximity=true`
    ),
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messagesApi = {
  // Fetch all messages for a specific offer
  getByOffer: (offerId: string) =>
    api.get<Message[]>(`/api/messages?offerId=${offerId}`),

  // Send a message in an offer context
  send: (offerId: string, content: string) =>
    api.post<Message>('/api/messages', { offerId, content }),

  // Send an offer request from shipment matches screen
  sendOfferRequest: (data: { shipmentId: string; routeId: string; content: string }) =>
    api.post('/api/messages', { ...data, category: 'Offer Request' }),

  // Mark a message as read
  markRead: (messageId: string) =>
    api.patch(`/api/messages/${messageId}`, { isRead: true }),
}

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: () =>
    api.get<Notification[]>('/api/notifications'),

  markRead: (id: string) =>
    api.patch(`/api/notifications/${id}`, { isRead: true }),
}

// ─── Announcements ────────────────────────────────────────────────────────────

export const announcementsApi = {
  list: () => api.get<Announcement[]>('/api/announcements'),
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export const profileApi = {
  update: (data: Partial<{ name: string; phone: string }>) =>
    api.patch('/api/sender/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/api/sender/security', data),
}
