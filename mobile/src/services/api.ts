import {
  ApiResponse,
  CommunityIncident,
  IncidentType,
  NearbyCommunityIncident,
  NearbySeismicEvent,
  SeismicEvent,
} from '../types';

// IP Wi-Fi de tu computador para conectar tu iPhone directamente al backend
export const API_BASE_URL = 'http://192.168.10.11:8085/api/v1';

// Generador de UUID v4 estándar RFC4122 compatible con java.util.UUID
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Resuelve una URL de imagen para garantizar que apunte al host absoluto del backend
 */
export const resolveMediaUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
    return url;
  }
  const cleanBase = API_BASE_URL.replace('/api/v1', '');
  return `${cleanBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      throw new Error(errorBody?.message || `Error HTTP ${res.status}`);
    }

    const json: ApiResponse<T> = await res.json();
    return json.data;
  } catch (err: any) {
    console.warn(`[ALERA API] Fallo en ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Sismos
  getRecentSeismicEvents: (limit: number = 100): Promise<SeismicEvent[]> =>
    request<SeismicEvent[]>(`/seismic-events?limit=${limit}`),

  getNearbySeismicEvents: (
    lat: number,
    lon: number,
    radiusKm: number = 300
  ): Promise<NearbySeismicEvent[]> =>
    request<NearbySeismicEvent[]>(
      `/seismic-events/nearby?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}`
    ),

  getSeismicEventById: (id: string): Promise<SeismicEvent> =>
    request<SeismicEvent>(`/seismic-events/${id}`),

  // Alertas de Emergencia Activas en Vivo (Simulacros y Eventos Críticos)
  getActiveEmergencyAlert: (): Promise<{
    id: string;
    type: 'seismic' | 'community';
    title: string;
    body: string;
    magnitude?: number;
    timestamp: number;
  } | null> => request<any>('/seismic-events/active-emergency'),

  // Incidentes Comunitarios
  getNearbyCommunityIncidents: (
    lat: number,
    lon: number,
    radiusMeters: number = 50000
  ): Promise<NearbyCommunityIncident[]> =>
    request<NearbyCommunityIncident[]>(
      `/community-incidents/nearby?lat=${lat}&lon=${lon}&radiusMeters=${radiusMeters}`
    ),

  createCommunityIncident: (payload: {
    reporterDeviceId: string;
    incidentType: IncidentType;
    description: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    images: string[];
  }): Promise<CommunityIncident> =>
    request<CommunityIncident>('/community-incidents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  confirmIncident: (
    incidentId: string,
    deviceId: string,
    voteType: 'STILL_ACTIVE' | 'RESOLVED'
  ): Promise<CommunityIncident> =>
    request<CommunityIncident>(`/community-incidents/${incidentId}/confirmations`, {
      method: 'POST',
      body: JSON.stringify({ deviceId, voteType }),
    }),

  // Dispositivos
  registerDevice: (
    fcmToken: string,
    platform: 'ANDROID' | 'IOS'
  ): Promise<{ id: string; fcmToken: string }> =>
    request<{ id: string; fcmToken: string }>('/devices', {
      method: 'POST',
      body: JSON.stringify({ fcmToken, platform }),
    }),

  updateLocation: (
    deviceId: string,
    latitude: number,
    longitude: number
  ): Promise<any> =>
    request<any>(`/devices/${deviceId}/location`, {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude }),
    }),

  // Multimedia (Capa 2 de Almacenamiento Desacoplado)
  uploadImageBase64: async (base64Data: string): Promise<string> => {
    const res = await fetch(`${API_BASE_URL}/media/upload-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ data: base64Data }),
    });

    if (!res.ok) {
      throw new Error(`Fallo al subir imagen al servidor (${res.status})`);
    }

    const data = await res.json();
    return `${API_BASE_URL.replace('/api/v1', '')}${data.url}`;
  },

  uploadImage: async (uri: string): Promise<string> => {
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type,
    } as any);

    const res = await fetch(`${API_BASE_URL}/media/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Fallo al subir imagen al servidor (${res.status})`);
    }

    const data = await res.json();
    // Retorna la URL pública absoluta
    return `${API_BASE_URL.replace('/api/v1', '')}${data.url}`;
  },
};