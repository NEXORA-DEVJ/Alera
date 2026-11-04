/**
 * ALERA Background Monitor
 *
 * Registra una tarea de segundo plano que se ejecuta periódicamente incluso
 * cuando la app está minimizada o el teléfono está bloqueado.
 *
 * Funcionalidades:
 *  1. Sondeo de sismos del SGC → notificación si magnitud ≥ 4.0 y está cerca.
 *  2. Sondeo de incidentes comunitarios → notificación naranja si el usuario
 *     está a ≤ 1500 m del origen (misma regla que en primer plano).
 *  3. GPS: intenta obtener la última posición conocida de expo-location antes
 *     de caer al valor persistido en AsyncStorage.
 *
 * Funciona igual que "Mi Terremoto": sondeo del servidor + notificación local
 * del sistema operativo con sonido y vibración al detectar novedades.
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api';

// ─── Constantes ────────────────────────────────────────────────────────────────

export const ALERA_BACKGROUND_TASK = 'ALERA_SEISMIC_BACKGROUND_POLL';

/** Intervalo mínimo de Android Background Fetch: 15 minutos en producción. */
const TASK_INTERVAL_SECONDS = 15 * 60;

/** Magnitud mínima para disparar alerta sísmica en segundo plano. */
const MIN_SEISMIC_MAGNITUDE = 4.0;

/** Radio máximo en km para alertas sísmicas (si el usuario está más lejos, solo notifica ≥ 5.0). */
const MAX_SEISMIC_DISTANCE_KM = 500;

/** Radio en metros para alertas comunitarias (igual que en primer plano). */
const PROXIMITY_COMMUNITY_RADIUS_M = 1500;

/** Radio de búsqueda de incidentes comunitarios en segundo plano (50 km). */
const COMMUNITY_SEARCH_RADIUS_M = 50_000;

/** Ventana de tiempo para considerar sismos recientes: 2 horas. */
const SEISMIC_RECENCY_MS = 2 * 60 * 60 * 1000;

// Claves de AsyncStorage
const ALERTED_SEISMIC_KEY = '@alera_bg_alerted_ids';
const ALERTED_COMMUNITY_KEY = '@alera_bg_community_alerted_ids';
const DEVICE_ID_KEY = '@alera_device_id';
const LAST_LAT_KEY = '@alera_last_lat';
const LAST_LON_KEY = '@alera_last_lon';

// ─── Helpers de GPS ────────────────────────────────────────────────────────────

/**
 * Obtiene la última posición GPS conocida del dispositivo sin solicitar
 * permisos adicionales.
 * Estrategia:
 *  1. expo-location getLastKnownPositionAsync() — datos frescos del chip GPS.
 *  2. Fallback a valores persistidos en AsyncStorage por el rastreo en primer plano.
 */
async function getBackgroundLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Intento 1: última posición conocida del chip GPS (no requiere permiso explícito)
    const lastPos = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 });
    if (lastPos?.coords) {
      const { latitude, longitude } = lastPos.coords;
      // Persistir para el próximo ciclo
      await Promise.all([
        AsyncStorage.setItem(LAST_LAT_KEY, latitude.toString()),
        AsyncStorage.setItem(LAST_LON_KEY, longitude.toString()),
      ]);
      return { latitude, longitude };
    }
  } catch {
    // expo-location puede fallar si el permiso en segundo plano no fue concedido
  }

  // Intento 2: valores persistidos desde el rastreo continuo en primer plano
  try {
    const latStr = await AsyncStorage.getItem(LAST_LAT_KEY);
    const lonStr = await AsyncStorage.getItem(LAST_LON_KEY);
    if (latStr && lonStr) {
      return { latitude: parseFloat(latStr), longitude: parseFloat(lonStr) };
    }
  } catch {}

  return null;
}

// ─── Helpers de desduplicación ─────────────────────────────────────────────────

async function getAlertedSet(key: string): Promise<Set<string>> {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored) return new Set<string>(JSON.parse(stored));
  } catch {}
  return new Set<string>();
}

async function persistAlertedId(key: string, id: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(key);
    let list: string[] = [];
    if (stored) {
      try { list = JSON.parse(stored); } catch {}
    }
    if (!list.includes(id)) {
      list.push(id);
      // Mantener solo los últimos 200 para no saturar AsyncStorage
      if (list.length > 200) list = list.slice(-200);
      await AsyncStorage.setItem(key, JSON.stringify(list));
    }
  } catch {}
}

// ─── Helpers de Haversine ──────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Fetch de APIs ────────────────────────────────────────────────────────────

async function fetchWithTimeout<T>(url: string, timeoutMs = 10000): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as T;
  } catch {
    return null;
  }
}

async function fetchRecentSeismicEvents(): Promise<any[]> {
  const data = await fetchWithTimeout<any[]>(`${API_BASE_URL}/seismic-events?limit=20`);
  return data || [];
}

async function fetchNearbyCommunityIncidents(
  lat: number,
  lon: number
): Promise<any[]> {
  const url = `${API_BASE_URL}/community-incidents/nearby?lat=${lat}&lon=${lon}&radiusMeters=${COMMUNITY_SEARCH_RADIUS_M}`;
  const data = await fetchWithTimeout<any[]>(url);
  return data || [];
}

// ─── Envío de notificaciones ──────────────────────────────────────────────────

async function sendSeismicNotification(event: any): Promise<void> {
  const mag: number = event.magnitude ?? 0;
  const location: string = event.epicenterDescription ?? 'Colombia';
  const channelId = mag >= 5.0 ? 'alera_emergency_channel' : 'alera_community_channel';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🚨 ALERTA SÍSMICA — M${mag.toFixed(1)}`,
      body: `Sismo detectado en ${location}. Verifica tu seguridad.`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: '#EF4444',
      data: { type: 'seismic', magnitude: mag, eventId: event.id, isBackgroundAlert: true },
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger: null,
  });
}

async function sendCommunityNotification(incident: any, distanceMeters: number): Promise<void> {
  const distText =
    distanceMeters < 1000
      ? `${Math.round(distanceMeters)} m`
      : `${(distanceMeters / 1000).toFixed(1)} km`;

  const typeNames: Record<string, string> = {
    LANDSLIDE: 'Derrumbe / Deslizamiento',
    FIRE: 'Incendio Activo',
    STRUCTURAL_DAMAGE: 'Falla Estructural',
    ROAD_BLOCK: 'Vía Obstruida',
    ACCIDENT: 'Accidente de Tránsito',
    FLOOD: 'Inundación',
    DANGER_ON_ROAD: 'Peligro en Vía',
  };
  const typeName = typeNames[incident.incidentType] ?? 'Incidente Comunitario';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ ALERTA COMUNITARIA — ${typeName}`,
      body: `Estás a ${distText} del incidente. ${incident.description || 'Reporte activo en tu zona.'}`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      color: '#F06A35',
      data: {
        type: 'community',
        incidentId: incident.id,
        incidentType: incident.incidentType,
        isBackgroundAlert: true,
      },
      ...(Platform.OS === 'android' ? { channelId: 'alera_community_channel' } : {}),
    },
    trigger: null,
  });
}

// ─── Lógica principal de la tarea ─────────────────────────────────────────────

TaskManager.defineTask(ALERA_BACKGROUND_TASK, async () => {
  try {
    const userLoc = await getBackgroundLocation();

    // ── 1. Sismos ────────────────────────────────────────────────────────────
    const seismicEvents = await fetchRecentSeismicEvents();
    let hadNewAlert = false;

    if (seismicEvents.length > 0) {
      const alertedSeismic = await getAlertedSet(ALERTED_SEISMIC_KEY);
      const twoHoursAgo = Date.now() - SEISMIC_RECENCY_MS;

      const recentEvents = seismicEvents
        .filter((e: any) => {
          const t = e.originTime ? new Date(e.originTime).getTime() : 0;
          return t >= twoHoursAgo && (e.magnitude ?? 0) >= MIN_SEISMIC_MAGNITUDE;
        })
        .slice(0, 5);

      for (const event of recentEvents) {
        const id: string = event.id ?? `${event.latitude}-${event.longitude}-${event.originTime}`;
        if (alertedSeismic.has(id)) continue;

        // Filtro de proximidad: solo alertar sismos menores si están cerca
        if (userLoc) {
          const dist = haversineKm(
            userLoc.latitude,
            userLoc.longitude,
            event.latitude,
            event.longitude
          );
          if (dist > MAX_SEISMIC_DISTANCE_KM && (event.magnitude ?? 0) < 5.0) continue;
        }

        await sendSeismicNotification(event);
        await persistAlertedId(ALERTED_SEISMIC_KEY, id);
        hadNewAlert = true;
      }
    }

    // ── 2. Incidentes comunitarios ───────────────────────────────────────────
    if (userLoc) {
      const communityIncidents = await fetchNearbyCommunityIncidents(
        userLoc.latitude,
        userLoc.longitude
      );

      if (communityIncidents.length > 0) {
        const alertedCommunity = await getAlertedSet(ALERTED_COMMUNITY_KEY);
        const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY).catch(() => null);

        for (const item of communityIncidents) {
          const inc = item.incident ?? item;
          if (!inc || !inc.id) continue;
          if (alertedCommunity.has(inc.id)) continue;
          if (inc.status === 'RESOLVED' || inc.status === 'EXPIRED') continue;
          if (deviceId && inc.reporterDeviceId === deviceId) continue;

          const distanceMeters: number = item.distanceMeters ?? haversineKm(
            userLoc.latitude,
            userLoc.longitude,
            inc.latitude,
            inc.longitude
          ) * 1000;

          if (distanceMeters > PROXIMITY_COMMUNITY_RADIUS_M) continue;

          await sendCommunityNotification(inc, distanceMeters);
          await persistAlertedId(ALERTED_COMMUNITY_KEY, inc.id);
          hadNewAlert = true;
        }
      }
    }

    return hadNewAlert
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Registra la tarea de segundo plano con el sistema operativo.
 * Debe llamarse una sola vez al iniciar la app (en App.tsx o index.ts).
 */
export async function registerBackgroundSeismicTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(ALERA_BACKGROUND_TASK);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(ALERA_BACKGROUND_TASK, {
      minimumInterval: TASK_INTERVAL_SECONDS,
      stopOnTerminate: false, // Continúa aunque el usuario cierre la app
      startOnBoot: true,     // Se reactiva al encender el teléfono
    });
  } catch (err) {
    console.warn('[ALERA BG] No se pudo registrar la tarea de segundo plano:', err);
  }
}

/**
 * Cancela la tarea de segundo plano.
 */
export async function unregisterBackgroundSeismicTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(ALERA_BACKGROUND_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(ALERA_BACKGROUND_TASK);
    }
  } catch {}
}

/**
 * Persiste la última ubicación GPS conocida.
 * Llamar desde los hooks de rastreo continuo en primer plano para que
 * la tarea de segundo plano tenga coordenadas frescas.
 */
export async function saveLastKnownLocation(
  latitude: number,
  longitude: number
): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(LAST_LAT_KEY, latitude.toString()),
      AsyncStorage.setItem(LAST_LON_KEY, longitude.toString()),
    ]);
  } catch {}
}
