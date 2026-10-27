import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { API_BASE_URL } from '@/constants/config'
import { api } from './api'
import { getToken } from './storage'

export type ShipmentPhoto = { id: string; url: string }

/** Ίδιο όριο με το Fortio (lib/shipmentPhotoRooms.ts) */
const MAX_ROOM_NAME = 60
export function cleanRoomName(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, MAX_ROOM_NAME) : ''
}

export const photosApi = {
  list: (shipmentId: string) =>
    api.get<ShipmentPhoto[]>(`/api/shipments/${shipmentId}/photos`),

  remove: (shipmentId: string, photoId: string) =>
    api.delete(`/api/shipments/${shipmentId}/photos`, { data: { photoId } }),

  // Μόνο μετακόμιση: σε ποιο δωμάτιο ανήκει η φωτογραφία (null αφαιρεί την αντιστοίχιση)
  setRoom: (shipmentId: string, photoId: string, room: string | null) =>
    api.patch(`/api/shipments/${shipmentId}/photos`, { photoId, room }),

  /**
   * Multipart upload with fetch rather than axios: the same Android builds
   * that needed fetch for login (see authApi.login) are the ones most likely
   * to mishandle an axios FormData body.
   */
  upload: async (shipmentId: string, localUri: string): Promise<ShipmentPhoto> => {
    const token = await getToken()
    const body = new FormData()
    body.append('file', { uri: localUri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob)
    const res = await fetch(`${API_BASE_URL}/api/shipments/${shipmentId}/photos`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`)
    return data as ShipmentPhoto
  },
}

export class PhotoPermissionError extends Error {}

/**
 * Φωτογραφίες από την κάμερα ή τη συλλογή, μικρεμένες ώστε η μεγάλη πλευρά να είναι το πολύ maxEdgePx (όπως το
 * compressImage του web: 800 px, ή 1280 px όπου αναγνωρίζονται αντικείμενα) και σε JPEG — το backend δέχεται έως 4 MB.
 */
export async function pickPhotos(source: 'camera' | 'gallery', maxEdgePx: number, limit: number): Promise<string[]> {
  if (limit <= 0) return []
  const permission = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) throw new PhotoPermissionError()

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 }
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync({ ...options, allowsMultipleSelection: limit > 1, selectionLimit: limit })
  if (result.canceled) return []

  const out: string[] = []
  for (const asset of result.assets.slice(0, limit)) {
    const longest = Math.max(asset.width || 0, asset.height || 0)
    const context = ImageManipulator.manipulate(asset.uri)
    if (longest > maxEdgePx) {
      context.resize(asset.width >= asset.height ? { width: maxEdgePx } : { height: maxEdgePx })
    }
    const image = await context.renderAsync()
    const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG })
    out.push(saved.uri)
  }
  return out
}
