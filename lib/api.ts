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
  | 'PENDING' | 'REQUEST' | 'OFFERED' | 'ACCEPTED' | 'LOADED'
  | 'IN_TRANSIT' | 'IN_STORE' | 'DELIVERED' | 'CANCELLED'
  | 'DISPUTED' | 'PARTIAL_DAMAGE' | 'PARTIAL_DELIVERED' | 'FAIL_DELIVERED'

export type OfferStatus =
  | 'REQUEST' | 'OFFERED' | 'ACCEPTED' | 'REJECTED_BY_SENDER' | 'REJECTED_BY_CARRIER'

export type Shipment = {
  id: string
  title: string
  description?: string
  category: string
  originCity: string
  destCity: string
  originPlace?: { name?: string; countryShortName?: string | null } | null
  destPlace?: { name?: string; countryShortName?: string | null } | null
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
  // Owner-only (GET /api/shipments/[id] returns them to the sender only).
  recipientName?: string | null
  recipientPhone?: string | null
  recipientEmail?: string | null
  recipientSameAsSender?: boolean
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
    company?: { id?: string; name?: string; rating?: number; totalTrips?: number }
  }
  route?: {
    id?: string
    routeNumber?: string
    routeCompanyId?: string
    status?: string
    estimatedArrival?: string
    originCity?: string
    destCity?: string
    originPlace?: { name?: string; countryShortName?: string | null } | null
    destPlace?: { name?: string; countryShortName?: string | null } | null
    departureDate?: string
    stops?: { city?: string; estimatedDate?: string }[]
  }
  message?: string
  conditions?: string
  pickupDate?: string
  createdAt?: string
  review?: { id: string; rating: number; comment?: string | null } | null
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
    company?: { rating?: number; totalTrips?: number }
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
  login: async (data: { identifier: string; password: string }) => {
    const isEmail = data.identifier.includes('@')
    const body = isEmail
      ? { email: data.identifier, password: data.password }
      : { username: data.identifier, password: data.password }

    // Use the native Fetch implementation for login. Some standalone Android
    // builds report an Axios "Network Error" even though the request reaches
    // the server successfully.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/mobile/login`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      const payload = await response.json().catch(() => ({})) as {
        token?: string
        user?: AuthUser
        error?: string
      }

      if (!response.ok) {
        throw Object.assign(
          new Error(payload.error || `Σφάλμα σύνδεσης (${response.status})`),
          { response: { status: response.status, data: payload } }
        )
      }

      if (!payload.token || !payload.user) {
        throw new Error('Μη έγκυρη απάντηση από τον server')
      }

      return { data: { token: payload.token, user: payload.user } }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Ο server δεν απάντησε εγκαίρως. Δοκίμασε ξανά.')
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  },

  // POST /api/register was retired server-side — registration now only
  // happens through /api/register/company (Fortio commit "company
  // registration hardening", 2026-09-11). That endpoint requires a
  // `username` and a `role`/`entityType` pair; FortioMobile is sender-only
  // (see CLAUDE.md), so this always registers an individual sender —
  // there's no company-signup flow here.
  register: (data: { username: string; name: string; email: string; password: string }) =>
    api.post<{ ok: boolean }>('/api/register/company', {
      ...data,
      role: 'SENDER',
      entityType: 'INDIVIDUAL',
    }),
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getSender: (sortBy = 'date_desc') =>
    api.get<DashboardData>(`/api/dashboard/sender?sortBy=${sortBy}`),

  getCarrier: () =>
    api.get<{ shipments: Shipment[]; total: number; page: number; pageSize: number }>('/api/shipments'),
}

// ─── Shipment archive (Αρχείο Αποστολών) ───────────────────────────────────────

export type ArchiveShipment = {
  id: string
  title: string
  updatedAt: string
  offers: {
    id: string
    deliveryDate?: string
    carrier: { name?: string; email: string; company?: { name?: string } }
    // The archive endpoint doesn't send the place objects today; fCity then
    // falls back to the country embedded in the city text.
    route?: {
      originCity?: string; destCity?: string; departureDate?: string; estimatedArrival?: string
      originPlace?: { name?: string; countryShortName?: string | null } | null
      destPlace?: { name?: string; countryShortName?: string | null } | null
    }
    review?: { id: string; rating: number; comment?: string | null; reply?: string | null } | null
  }[]
}

export const archiveApi = {
  getSender: () =>
    api.get<{ shipments: ArchiveShipment[] }>('/api/dashboard/sender/archive'),
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviewsApi = {
  create: (data: { offerId: string; rating: number; comment?: string }) =>
    api.post('/api/reviews', data),

  update: (reviewId: string, data: { rating: number; comment?: string }) =>
    api.patch(`/api/reviews/${reviewId}`, data),
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
  recipientName: string; recipientPhone: string; recipientEmail?: string
  recipientSameAsSender?: boolean
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
    api.patch(`/api/offers/${offerId}`, { action: 'ACCEPTED' }),

  reject: (offerId: string) =>
    api.patch(`/api/offers/${offerId}`, { action: 'REJECTED' }),

  // Ακύρωση ήδη αποδεκτής προσφοράς πριν τη φόρτωση
  cancel: (offerId: string) =>
    api.patch(`/api/offers/${offerId}`, { action: 'CANCELLED' }),
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
  routeCompanyId?: string
  status: string
  originCity?: string
  destCity?: string
  originPlace?: { name?: string; countryShortName?: string | null } | null
  destPlace?: { name?: string; countryShortName?: string | null } | null
  departureDate?: string
  estimatedArrival?: string
  isRecurring?: boolean
  recurrence?: { interval?: number; weekdays?: string[] } | null
  recurrenceEndDate?: string | null
  availableWeight?: number
  availableVolume?: number
  pricePerKg?: number
  pricePerM3?: number
  company?: { id?: string; name: string; rating?: number; totalTrips?: number } | null
  vehicle?: { type?: string } | null
  stops: RouteStop[]
  distanceKm?: number | null
  hasExactOriginMatch: boolean
  messageCount?: number
}

export const matchesApi = {
  get: (shipmentId: string, maxDistance = 10, dateWindowDays = 5) =>
    api.get<{ routes: RouteMatch[]; matchCount: number }>(
      `/api/shipments/${shipmentId}/matches?maxDistance=${maxDistance}&dateWindowDays=${dateWindowDays}&proximity=true`
    ),
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messagesApi = {
  // Fetch all messages for a specific offer
  getByOffer: (offerId: string) =>
    api.get<Message[]>(`/api/messages?offerId=${offerId}`),

  // Send a message in an offer context
  send: (offerId: string, content: string, subject?: string) =>
    api.post<Message>('/api/messages', { offerId, content, ...(subject ? { subject } : {}) }),

  // Send an offer request from shipment matches screen
  sendOfferRequest: (data: { shipmentId: string; routeId: string; content: string }) =>
    api.post('/api/messages', { ...data, category: 'Offer Request' }),

  // Send a plain message to a carrier route (not an offer request)
  sendPlainMessage: (data: { shipmentId: string; routeId: string; content: string }) =>
    api.post('/api/messages', { ...data, messageType: 1 }),

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

export type SenderProfile = {
  name?: string; email?: string; username?: string; phone?: string
  vatNumber?: string; country?: string; city?: string; address?: string
}

export const profileApi = {
  get: () =>
    api.get<SenderProfile>('/api/sender/profile'),

  update: (data: SenderProfile) =>
    api.patch<SenderProfile>('/api/sender/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/api/change-password', data),
}
