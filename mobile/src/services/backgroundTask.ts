/**
 * ALERA Background Seismic Monitor
 *
 * Este modulo registra una tarea de segundo plano que se ejecuta periodicamente
 * incluso cuando la app esta minimizada o el telefono esta bloqueado.
 * Al detectar sismos nuevos de alta magnitud envia una notificacion local nativa
 * con el canal de maxima prioridad de Android (cabeza de chat/alertas criticas).
 *
 * Funciona exactamente igual que "Mi Terremoto": sondeo del servidor en segundo
 * plano + notificacion local del sistema operativo cuando hay novedades.
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_BASE_URL, generateUUID } from './api';

// Nombre unico de la tarea registrada con el sistema operativo
export const ALERA_BACKGROUND_TASK = 'ALERA_SEISMIC_BACKGROUND_POLL';

// Intervalo de sondeo (segundos). Android Background Fetch impone un minimo de ~15 min
// en produccion, pero lo declaramos en 15 min que es el maximo precision posible.
const TASK_INTERVAL_SECONDS = 15 * 60;

const ALERTED_KEY = '@alera_bg_alerted_ids';
const DEVICE_ID_KEY = '@alera_device_id';

// Magnitud minima para disparar alarma en segundo plano
const MIN_MAGNITUDE_BG = 4.0;

// --- Helpers internos ---

async function getAlertedIds(): Promise<Set<string>> {
  try {
    const stored = await AsyncStorage.getItem(ALERTED_KEY);
    if (stored) {
      const list: string[] = JSON.parse(stored);
      return new Set(list);
    }
  } catch {}
  return new Set();
}

async function saveAlertedId(id: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(ALERTED_KEY);
    let list: string[] = [];
    if (stored) {
      try { list = JSON.parse(stored); } catch {}
    }
    if (!list.includes(id)) {
      list.push(id);
      // Mantener solo los ultimos 200 para no saturar AsyncStorage
      if (list.length > 200) list = list.slice(-200);
      await AsyncStorage.setItem(ALERTED_KEY, JSON.stringify(list));
    }
  } catch {}
}

async function fetchRecentSeismicEvents(): Promise<any[]> {
  try {
    const url = `${API_BASE_URL}/seismic-events?limit=20`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

async function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) return null;
    // No solicitamos permisos en segundo plano para no interrumpir al usuario
    // La ubicacion se toma del ultimo sondeo del servicio de GPS en primer plano
    const latStr = await AsyncStorage.getItem('@alera_last_lat');
    const lonStr = await AsyncStorage.getItem('@alera_last_lon');
    if (latStr && lonStr) {
      return { latitude: parseFloat(latStr), longitude: parseFloat(lonStr) };
    }
  } catch {}
  return null;
}

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

async function sendSeismicNotification(event: any): Promise<void> {
  const mag = event.magnitude ?? 0;
  const location = event.epicenterDescription ?? 'Colombia';
  const channelId = mag >= 5.0 ? 'alera_emergency_channel' : 'alera_community_channel';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `ALERTA SISMICA ALERA - M${mag.toFixed(1)}`,
      body: `Sismo detectado en ${location}. Verifica tu seguridad.`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: '#F06A35',
      data: { type: 'seismic', magnitude: mag, eventId: event.id, isBackgroundAlert: true },
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger: null,
  });
}

// --- Definicion de la tarea con expo-task-manager ---

TaskManager.defineTask(ALERA_BACKGROUND_TASK, async () => {
  try {
    const events = await fetchRecentSeismicEvents();
    if (!events || events.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const alertedIds = await getAlertedIds();
    const userLoc = await getUserLocation();

    // Umbral de distancia: alertar solo si el sismo esta dentro de 500 km del usuario
    // Si no hay ubicacion disponible, alertar de todos los sismos >= 5.0
    const MAX_DISTANCE_KM = 500;

    let hadNewAlert = false;

    // Ordenar por tiempo (mas reciente primero) y procesar solo los de las ultimas 2 horas
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const recentEvents = events
      .filter((e: any) => {
        const t = e.originTime ? new Date(e.originTime).getTime() : 0;
        return t >= twoHoursAgo && (e.magnitude ?? 0) >= MIN_MAGNITUDE_BG;
      })
      .slice(0, 5); // maximo 5 alertas por ciclo

    for (const event of recentEvents) {
      const id = event.id ?? `${event.latitude}-${event.longitude}-${event.originTime}`;
      if (alertedIds.has(id)) continue;

      // Filtro de proximidad si se conoce la ubicacion del usuario
      if (userLoc) {
        const dist = haversineKm(userLoc.latitude, userLoc.longitude, event.latitude, event.longitude);
        if (dist > MAX_DISTANCE_KM && (event.magnitude ?? 0) < 5.0) {
          continue; // Sismo menor lejos del usuario: ignorar
        }
      }

      await sendSeismicNotification(event);
      await saveAlertedId(id);
      hadNewAlert = true;
    }

    return hadNewAlert
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// --- API publica ---

/**
 * Registra la tarea de segundo plano con el sistema operativo.
 * Debe llamarse una sola vez al iniciar la app (en App.tsx).
 */
export async function registerBackgroundSeismicTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(ALERA_BACKGROUND_TASK);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(ALERA_BACKGROUND_TASK, {
      minimumInterval: TASK_INTERVAL_SECONDS,
      stopOnTerminate: false, // Continua aunque el usuario cierre la app
      startOnBoot: true,     // Se reactiva automaticamente al encender el telefono
    });
  } catch (err) {
    // Si falla (Expo Go no soporta background fetch real), registrar sin lanzar excepcion
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
 * Guarda la ultima ubicacion GPS conocida para que la tarea de segundo
 * plano pueda calcular la distancia sin necesitar permisos adicionales.
 */
export async function saveLastKnownLocation(latitude: number, longitude: number): Promise<void> {
  try {
    await AsyncStorage.setItem('@alera_last_lat', latitude.toString());
    await AsyncStorage.setItem('@alera_last_lon', longitude.toString());
  } catch {}
}
