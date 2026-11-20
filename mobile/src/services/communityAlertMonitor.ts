/**
 * ALERA Community Alert Monitor
 *
 * Servicio de monitoreo en primer plano para alertas comunitarias.
 * Funciona de forma independiente a la pantalla activa: polling cada 60 s
 * mientras la app está abierta, en CUALQUIER pantalla.
 *
 * Principios SOLID:
 *  - SRP: responsabilidad única → vigilar incidentes cercanos y disparar notificación.
 *  - OCP: extensible sin modificar CommunityAlertsScreen ni App.tsx.
 *  - DIP: depende de abstracciones (api, notifications) no de implementaciones concretas.
 *
 * Flujo:
 *  1. App.tsx llama startCommunityAlertMonitoring(deviceId) al iniciar.
 *  2. Cada POLL_INTERVAL_MS el monitor:
 *     a. Lee la última posición GPS del AsyncStorage (actualizada por el tracker GPS).
 *     b. Consulta al backend los incidentes dentro de SEARCH_RADIUS_M.
 *     c. Para cada incidente a ≤ PROXIMITY_ALERT_RADIUS_M:
 *        - Si no es del propio usuario y no fue alertado antes → dispara notificación.
 *  3. App.tsx llama stopCommunityAlertMonitoring() al limpiar el efecto.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import {
  triggerLocalProximityAlert,
  isIncidentAlerted,
  markIncidentAsAlerted,
} from './notifications';
import { NearbyCommunityIncident, IncidentType } from '../types';

// ─── Constantes ────────────────────────────────────────────────────────────────

/** Intervalo de polling en ms mientras la app está en primer plano. */
const POLL_INTERVAL_MS = 60_000; // 60 segundos

/** Radio en metros para disparar notificación de alerta comunitaria. */
const PROXIMITY_ALERT_RADIUS_M = 1_500;

/** Radio de búsqueda de incidentes alrededor del usuario. */
const SEARCH_RADIUS_M = 50_000;

// Claves de AsyncStorage compartidas con backgroundTask y location
const LAST_LAT_KEY = '@alera_last_lat';
const LAST_LON_KEY = '@alera_last_lon';
const DEVICE_ID_KEY = '@alera_device_id';

// ─── Estado interno del módulo ─────────────────────────────────────────────────

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

// ─── Helpers puros ─────────────────────────────────────────────────────────────

/** Nombre legible del tipo de incidente (misma lógica que CommunityAlertsScreen). */
function getIncidentTypeName(type: IncidentType): string {
  const names: Partial<Record<IncidentType, string>> = {
    LANDSLIDE: 'Derrumbe / Deslizamiento',
    FIRE: 'Incendio Activo',
    STRUCTURAL_DAMAGE: 'Falla Estructural',
    ROAD_BLOCK: 'Vía Obstruida',
    ACCIDENT: 'Accidente de Tránsito',
    FLOOD: 'Inundación',
    DANGER_ON_ROAD: 'Peligro en Vía',
    OTHER: 'Incidente Comunitario',
  };
  return names[type] ?? 'Incidente Comunitario';
}

/** Texto de distancia compacto: "340 m" o "2.1 km". */
function formatDistance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`;
}

// ─── Lógica de evaluación de proximidad ───────────────────────────────────────

/**
 * Obtiene la última ubicación GPS conocida desde AsyncStorage.
 * El tracker continuo (location.ts) la actualiza cada 20 s o 30 m.
 */
async function getLastKnownLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const [latStr, lonStr] = await Promise.all([
      AsyncStorage.getItem(LAST_LAT_KEY),
      AsyncStorage.getItem(LAST_LON_KEY),
    ]);
    if (!latStr || !lonStr) return null;
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lonStr);
    if (isNaN(latitude) || isNaN(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

/**
 * Evalúa los incidentes recibidos y dispara una notificación local si el
 * usuario está dentro del radio de alerta y el incidente no fue alertado antes.
 *
 * Solo se alerta el primer incidente nuevo encontrado por ciclo para evitar
 * saturar la bandeja de notificaciones.
 */
function evaluateAndNotify(
  incidents: NearbyCommunityIncident[],
  deviceId: string
): void {
  const hazard = incidents.find(
    (item) =>
      item.distanceMeters <= PROXIMITY_ALERT_RADIUS_M &&
      item.incident.status !== 'RESOLVED' &&
      item.incident.status !== 'EXPIRED' &&
      item.incident.reporterDeviceId !== deviceId &&
      !isIncidentAlerted(item.incident.id)
  );

  if (!hazard) return;

  // Registrar como alertado ANTES de disparar para evitar duplicados en caso
  // de que el ciclo se ejecute de forma concurrente
  markIncidentAsAlerted(hazard.incident.id);

  const typeName = getIncidentTypeName(hazard.incident.incidentType);
  const dist = formatDistance(hazard.distanceMeters);

  triggerLocalProximityAlert(
    `ALERTA COMUNITARIA: ${typeName}`,
    `Estás a ${dist} del incidente. ${hazard.incident.description || ''}`.trim(),
    true,
    'community',
    `Radio: ${formatDistance(hazard.incident.radiusMeters)}`
  );
}

// ─── Ciclo de polling ──────────────────────────────────────────────────────────

/**
 * Ejecuta un único ciclo de verificación de alertas comunitarias.
 * Se llama al arrancar el monitor y luego cada POLL_INTERVAL_MS.
 */
async function runPollCycle(): Promise<void> {
  try {
    const location = await getLastKnownLocation();
    if (!location) return; // Sin GPS no hay nada que verificar

    const deviceId = (await AsyncStorage.getItem(DEVICE_ID_KEY)) ?? '';

    const incidents = await api.getNearbyCommunityIncidents(
      location.latitude,
      location.longitude,
      SEARCH_RADIUS_M
    );

    if (incidents && incidents.length > 0) {
      evaluateAndNotify(incidents, deviceId);
    }
  } catch {
    // Falla silenciosa: red caída o backend no disponible → reintentará en el próximo ciclo
  }
}

// ─── API pública ───────────────────────────────────────────────────────────────

/**
 * Inicia el monitor de alertas comunitarias en primer plano.
 * Llama a runPollCycle() inmediatamente y luego cada POLL_INTERVAL_MS.
 *
 * Es idempotente: si ya está corriendo, no crea un segundo timer.
 *
 * @param deviceId UUID del dispositivo (para excluir reportes propios)
 */
export function startCommunityAlertMonitoring(deviceId: string): void {
  if (isRunning) return;
  isRunning = true;

  // Primer ciclo inmediato al abrir la app (detecta incidentes existentes)
  runPollCycle();

  // Ciclos periódicos posteriores
  pollingTimer = setInterval(runPollCycle, POLL_INTERVAL_MS);
}

/**
 * Detiene el monitor y libera el timer.
 * Llamar al desmontar el componente raíz (App.tsx cleanup).
 */
export function stopCommunityAlertMonitoring(): void {
  if (pollingTimer !== null) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  isRunning = false;
}
