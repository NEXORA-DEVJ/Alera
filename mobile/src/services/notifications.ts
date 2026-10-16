import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, generateUUID } from './api';
import { playEmergencySiren, SirenAlertType } from './sound';

const PUSH_TOKEN_STORAGE_KEY = '@alera_expo_push_token';
const DEVICE_STORAGE_KEY = '@alera_device_id';

// Configuracion visual y acustica para notificaciones en primer plano
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Omitir en entornos sin soporte
}

/**
 * Inicializa los canales de notificacion de alta prioridad en Android
 * con colores de marca, luces de alerta y vibracion continua.
 */
export async function setupNotificationChannelsAsync(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('alera_emergency_channel', {
        name: 'Alertas Criticas ALERA',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 800, 200, 800, 200, 1400],
        lightColor: '#F06A35',
        enableLights: true,
        enableVibrate: true,
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      await Notifications.setNotificationChannelAsync('alera_community_channel', {
        name: 'Incidentes Comunitarios ALERA',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#F06A35',
        enableLights: true,
        enableVibrate: true,
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (err) {
      console.warn('[ALERA PUSH] No se pudieron configurar canales de notificacion:', err);
    }
  }
}

/**
 * Solicita permisos de notificacion, sincroniza el dispositivo en PostgreSQL
 * y configura los canales de Android.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    await setupNotificationChannelsAsync();

    let hasPermission = false;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      hasPermission = finalStatus === 'granted';
    } catch {
      hasPermission = true;
    }

    if (!hasPermission) {
      console.log('[ALERA PUSH] Permisos de notificacion declinados por el usuario.');
    }

    let token: string | null = null;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      token = tokenData.data;
    } catch {
      let storedToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
      if (!storedToken) {
        storedToken = `ExponentPushToken[dev_${generateUUID().substring(0, 16)}]`;
        await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, storedToken);
      }
      token = storedToken;
    }

    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

    const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
    const registeredDevice = await api.registerDevice(token, platform);

    if (registeredDevice && registeredDevice.id) {
      await AsyncStorage.setItem(DEVICE_STORAGE_KEY, registeredDevice.id);
      console.log('[ALERA PUSH] Dispositivo sincronizado en backend con ID:', registeredDevice.id);
    }

    return token;
  } catch (error) {
    console.warn('[ALERA PUSH] Registro push local completado con advertencias:', error);
    return null;
  }
}

type BannerCallback = (alert: {
  title: string;
  body: string;
  type: SirenAlertType;
  subtitle?: string;
}) => void;

let bannerCallback: BannerCallback | null = null;

export function registerBannerListener(cb: BannerCallback) {
  bannerCallback = cb;
  return () => {
    bannerCallback = null;
  };
}

/**
 * Despacha una notificacion visual estetica y elegante con icono de marca
 * y dispara la sirena sonora con control estricto de duracion:
 * - 3 segundos para alertas comunitarias.
 * - 5 segundos para sismos y terremotos.
 */
export async function triggerLocalProximityAlert(
  title: string,
  body: string,
  enableSiren: boolean = true,
  type: SirenAlertType = 'community',
  subtitle?: string
): Promise<void> {
  // 1. Despachar banner visual flotante dentro de la app
  if (bannerCallback) {
    try {
      bannerCallback({ title, body, type, subtitle });
    } catch {
      // Ignorar
    }
  }

  // 2. Despachar notificacion del sistema operativo
  try {
    const channelId = type === 'seismic' ? 'alera_emergency_channel' : 'alera_community_channel';

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        subtitle: subtitle || 'Radio de Afectacion Directa',
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        color: '#F06A35',
        data: { type, isLocalDispatch: true },
      },
      trigger: null,
    });

    if (enableSiren) {
      await playEmergencySiren(type);
    }

    // Registrar incremento en estadísticas ciudadanas
    await incrementAlertsReceivedCount();
  } catch (err) {
    console.warn('[ALERA ALERTA] Fallo al despachar alerta local:', err);
  }
}

// -----------------------------------------------------------------------------
// Registro Global de Desduplicación de Incidentes y Reputación Ciudadana
// -----------------------------------------------------------------------------
const ALERTED_INCIDENTS_STORAGE_KEY = '@alera_alerted_incidents';
const ALERTS_RECEIVED_COUNT_KEY = '@alera_alerts_received_count';
const USER_REPORTS_COUNT_KEY = '@alera_user_reports_count';
const USER_VOTES_COUNT_KEY = '@alera_user_votes_count';

const alertedIncidentsCache = new Set<string>();

AsyncStorage.getItem(ALERTED_INCIDENTS_STORAGE_KEY)
  .then((stored) => {
    if (stored) {
      try {
        const list: string[] = JSON.parse(stored);
        list.forEach((id) => alertedIncidentsCache.add(id));
      } catch {}
    }
  })
  .catch(() => {});

export function markIncidentAsAlerted(incidentId: string): void {
  if (!incidentId) return;
  alertedIncidentsCache.add(incidentId);

  AsyncStorage.getItem(ALERTED_INCIDENTS_STORAGE_KEY)
    .then((stored) => {
      let list: string[] = [];
      if (stored) {
        try {
          list = JSON.parse(stored);
        } catch {}
      }
      if (!list.includes(incidentId)) {
        list.push(incidentId);
        if (list.length > 100) list = list.slice(-100);
        AsyncStorage.setItem(ALERTED_INCIDENTS_STORAGE_KEY, JSON.stringify(list));
      }
    })
    .catch(() => {});
}

export function isIncidentAlerted(incidentId: string): boolean {
  if (!incidentId) return false;
  return alertedIncidentsCache.has(incidentId);
}

export async function getCommunityStats(): Promise<{
  alertsReceived: number;
  reportsCreated: number;
  votesValidated: number;
}> {
  try {
    const [alertsStr, reportsStr, votesStr] = await Promise.all([
      AsyncStorage.getItem(ALERTS_RECEIVED_COUNT_KEY),
      AsyncStorage.getItem(USER_REPORTS_COUNT_KEY),
      AsyncStorage.getItem(USER_VOTES_COUNT_KEY),
    ]);

    return {
      alertsReceived: alertsStr ? Math.max(0, parseInt(alertsStr, 10) || 0) : 0,
      reportsCreated: reportsStr ? Math.max(0, parseInt(reportsStr, 10) || 0) : 0,
      votesValidated: votesStr ? Math.max(0, parseInt(votesStr, 10) || 0) : 0,
    };
  } catch {
    return { alertsReceived: 0, reportsCreated: 0, votesValidated: 0 };
  }
}

export async function incrementAlertsReceivedCount(): Promise<number> {
  try {
    const current = await AsyncStorage.getItem(ALERTS_RECEIVED_COUNT_KEY);
    const count = (current ? parseInt(current, 10) || 0 : 0) + 1;
    await AsyncStorage.setItem(ALERTS_RECEIVED_COUNT_KEY, count.toString());
    return count;
  } catch {
    return 1;
  }
}

export async function incrementUserReportsCount(): Promise<number> {
  try {
    const current = await AsyncStorage.getItem(USER_REPORTS_COUNT_KEY);
    const count = (current ? parseInt(current, 10) || 0 : 0) + 1;
    await AsyncStorage.setItem(USER_REPORTS_COUNT_KEY, count.toString());
    return count;
  } catch {
    return 1;
  }
}

export async function incrementUserVotesCount(): Promise<number> {
  try {
    const current = await AsyncStorage.getItem(USER_VOTES_COUNT_KEY);
    const count = (current ? parseInt(current, 10) || 0 : 0) + 1;
    await AsyncStorage.setItem(USER_VOTES_COUNT_KEY, count.toString());
    return count;
  } catch {
    return 1;
  }
}

export async function clearAlertHistory(): Promise<void> {
  try {
    // 1. Limpiar memoria volátil
    alertedIncidentsCache.clear();

    // 2. Limpiar almacenamiento persistente
    await Promise.all([
      AsyncStorage.removeItem(ALERTED_INCIDENTS_STORAGE_KEY),
      AsyncStorage.setItem(ALERTS_RECEIVED_COUNT_KEY, '0'),
    ]);

    // 3. Cancelar y descartar notificaciones activas en la bandeja del sistema
    await Notifications.dismissAllNotificationsAsync().catch(() => {});
  } catch (err) {
    console.warn('[ALERA] Error al limpiar historial de alertas:', err);
  }
}

